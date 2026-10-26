import {ENTITY_ACTION_PERMISSIONS,isRegisteredPermission} from '../shared/featureRegistry.ts';
import { resolveUserRole } from '../src/utils/accountIdentity.mjs';
import { DataError } from './database.mjs';

export const entityView = Object.freeze({ operationalIncidents:'VIEW_TAB_OPERATIONAL_INCIDENTS', drones:'VIEW_TAB_INVENTORY', batteries:'VIEW_TAB_INVENTORY', accessories:'VIEW_TAB_INVENTORY', streamingDevices:'VIEW_TAB_INVENTORY', checkouts:'VIEW_TAB_IN_OUT_FORM', handoverForms:'VIEW_TAB_IN_OUT_FORM', incidentReports:'VIEW_TAB_INCIDENT_REPORT', confiscatedDrones:'VIEW_TAB_CONFISCATED_DRONE', notifications:'VIEW_TAB_NOTIFICATIONS', users:'VIEW_TAB_USERS' });
/** @returns {'ADMIN'|'OFFICER'|'USER'} */
export const roleOf = resolveUserRole;
export const allowed = (user,state,key) => isRegisteredPermission(key) && (roleOf(user)==='ADMIN' || state.groupPrivileges?.[user.groupId ? 'GROUP:'+user.groupId : roleOf(user)]?.[key]===true);
export const canRead = (user,state,entity) => ['auditLogs','activeSessions'].includes(entity) ? roleOf(user)==='ADMIN' : ['groupPrivileges','userGroups'].includes(entity) || allowed(user,state,entityView[entity]);
const designated = (user,record) => record.targetOfficerId===user.id || record.targetOfficerId===user.employeeId;
const actorMatches = (user,id) => id===user.id || id===user.employeeId;
const assert = (condition,message) => { if (!condition) throw new DataError(message,403,'FORBIDDEN'); };

export function officerRequesterExemption(user,record,state) {
  if(!record?.droneRequestId || record.status!=='ISSUED') return false;
  const request=state.auditLogs?.find(a=>a.droneRequest?.id===record.droneRequestId)?.droneRequest || state.notifications.find(n=>n.droneRequest?.id===record.droneRequestId)?.droneRequest;
  if(!request || request.status==='DELETED') return false;
  const requester=state.users.find(u=>u.id===request.senderId);
  return Boolean(requester && !requester.archivedAt && !requester.identityConflict && requester.accountStatus!=='SUSPENDED' && allowed(requester,state,'APPROVE_REQUESTS') && (roleOf(user)==='ADMIN' || request.recipientIds?.includes(user.id)));
}

export function authorizeOperation(user,op,previous,state,operations) {
  assert(canRead(user,state,op.entity),'You do not have access to this section.');
  const creating=!previous, deleting=op.record===null, role=roleOf(user);
  if (op.entity==='notifications') {
    if (deleting) { assert(allowed(user,state,'NOTIFICATIONS_DISMISS_MESSAGE'),'You cannot dismiss notifications.'); return; }
    if (creating) {
      assert(!['DRONE_REQUEST','FLIGHT_REQUEST'].includes(op.record.type),'Submit Drone Requests through their dedicated form.');
      assert(actorMatches(user,op.record.senderId),'Notification sender must match the signed-in account.');
      if (/APPROVAL_REQUEST$/.test(op.record.type)) {
        assert(op.record.changeDetails?.itemType!=='USER','Account changes must be made directly by an administrator in Users.');
        assert(op.record.status==='PENDING','New approval requests must be pending.');
        const target=state.users.find(u=>u.id===op.record.targetOfficerId || u.employeeId===op.record.targetOfficerId);
        assert(target && allowed(target,state,'APPROVE_REQUESTS') && !target.archivedAt && target.accountStatus!=='SUSPENDED','Select an active approving officer.');
      } else assert(allowed(user,state,'APPROVE_REQUESTS'),'Only officers can create approval confirmations.');
    } else {
      if (previous.type==='DRONE_REQUEST') assert(JSON.stringify(previous.droneRequest)===JSON.stringify(op.record.droneRequest),'Edit Drone Requests through their dedicated form.');
      assert(previous.senderId===op.record.senderId && previous.targetOfficerId===op.record.targetOfficerId && previous.type===op.record.type,'Notification ownership cannot change.');
      if (['APPROVED','REJECTED'].includes(op.record.status) && previous.status!==op.record.status) {
        assert(op.record.status!=='APPROVED' || previous.changeDetails?.itemType!=='USER','This legacy account request cannot be approved. Manage the account in Users and reject the old request.');
        assert(previous.status==='PENDING' && designated(user,previous) && allowed(user,state,'APPROVE_REQUESTS'),'Only the designated officer can review a pending request.');
        assert(JSON.stringify(previous.changeDetails)===JSON.stringify(op.record.changeDetails) && JSON.stringify(previous.handoverForm)===JSON.stringify(op.record.handoverForm) && JSON.stringify(previous.incidentReport)===JSON.stringify(op.record.incidentReport),'An approval proposal cannot change during review.');
      } else assert(designated(user,previous) || actorMatches(user,previous.senderId) || role==='ADMIN','You cannot update another user’s notification.');
    }
    return;
  }
  const inventory=['drones','batteries','accessories','streamingDevices'].includes(op.entity);
  let privilege;
  if (inventory) {
    privilege=ENTITY_ACTION_PERMISSIONS[op.entity]?.[deleting?'delete':creating?'create':'edit'];
    if (creating && operations.filter(o=>['drones','batteries','accessories','streamingDevices'].includes(o.entity) && o.version===0 && o.record).length>1) assert(allowed(user,state,'INVENTORY_BATCH_UPLOAD'),'Batch registration is restricted for your group.');
  }
  if (op.entity==='handoverForms' || op.entity==='checkouts') {
    assert(allowed(user,state,'APPROVE_REQUESTS') || (!deleting && op.entity==='handoverForms' && officerRequesterExemption(user,op.record,state)) || (!deleting && (op.entity==='checkouts' || !['ISSUED','ARCHIVED'].includes(op.record.status))),'Only officers can issue or archive handovers.');
    privilege=deleting?'IN_OUT_DELETE_RECORD':op.entity==='handoverForms'?ENTITY_ACTION_PERMISSIONS.handoverForms[creating?'create':'edit']:entityView[op.entity];
  }
  if (op.entity==='incidentReports' && op.record?.sourceHandoverId && op.record.sourceHandoverId !== previous?.sourceHandoverId) {
    assert(allowed(user,state,'VIEW_TAB_IN_OUT_FORM'),'Viewing the source IN/OUT form is required to attach it to an incident.');
  }
  if (op.entity==='incidentReports') privilege=ENTITY_ACTION_PERMISSIONS.incidentReports[deleting?'delete':creating?'create':'edit'];
  if (op.entity==='confiscatedDrones') privilege=ENTITY_ACTION_PERMISSIONS.confiscatedDrones[deleting?'delete':creating?'create':'edit'];
  assert(privilege && allowed(user,state,privilege),'Your group does not have permission for this change.');
  // A record linked to a pending approval may only be finalized together with its
  // designated officer's review, in this same database transaction.
  const pending=state.notifications.filter(n=>n.status==='PENDING' && (n.changeDetails?.itemId===op.id || n.handoverForm?.id===op.id || n.incidentReport?.id===op.id));
  for (const notice of pending) {
    const review=operations.find(o=>o.entity==='notifications' && o.id===notice.id && ['APPROVED','REJECTED'].includes(o.record?.status));
    assert(review && designated(user,notice) && allowed(user,state,'APPROVE_REQUESTS'),'Review the pending request as its designated officer before changing this record.');
  }
}

export function projectState(user,state,versions) {
  /** @type {Record<string, any>} */
  const result={};
  for (const [entity,data] of Object.entries(state)) {
    if (entity==='groupPrivileges') result[entity]=roleOf(user)==='ADMIN'?data:{[roleOf(user)]:data[roleOf(user)],...(user.groupId?{['GROUP:'+user.groupId]:data['GROUP:'+user.groupId]}:{})};
    else if (canRead(user,state,entity)) result[entity]=entity==='users'?data.filter(user=>!user.archivedAt).map(({passwordHash,...safe})=>({...safe,canApproveRequests:allowed(safe,state,'APPROVE_REQUESTS') && safe.accountStatus!=='SUSPENDED'})):entity==='notifications'?data.filter(n=>roleOf(user)==='ADMIN' || designated(user,n) || actorMatches(user,n.senderId)):data;
    else result[entity]=[];
  }
  result.recordVersions=Object.fromEntries(Object.entries(versions).filter(([entity])=>canRead(user,state,entity)));
  return result;
}

export function authenticateToken(token,verify,state,sessions,revoked) {
  if (!token || revoked(token)) throw new DataError('Sign in to continue.',401,'AUTH_REQUIRED');
  let decoded; try { decoded=verify(token); } catch { throw new DataError('Your session expired. Please sign in again.',401,'AUTH_EXPIRED'); }
  const user=state.users.find(u=>u.id===decoded.userId && u.employeeId===decoded.employeeId);
  const session=sessions.get(decoded.sessionId);
  if (!user || user.identityConflict || user.archivedAt || user.accountStatus==='SUSPENDED' || !session || session.userId!==user.id || !Number.isFinite(Date.parse(session.loginTime)) || !Number.isFinite(Date.parse(session.lastActiveTime)) || Date.now()-Date.parse(session.loginTime)>86400000 || Date.now()-Date.parse(session.lastActiveTime)>28800000) throw new DataError('Your session is no longer active. Please sign in again.',401,'SESSION_INACTIVE');
  return {...user,userId:user.id,sessionId:decoded.sessionId,userRole:roleOf(user)};
}

