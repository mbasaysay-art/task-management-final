import {FEATURES,PERMISSIONS,DEFAULT_PERMISSION_GRANTS,isRegisteredPermission,type FeatureId,type PermissionId} from '../../shared/featureRegistry';
import { resolveUserRole } from '../utils/accountIdentity.mjs';
export type DroneStatus = 'ACTIVE' | 'CRASHED' | 'UNDER REPAIR' | 'MISSING';

export interface DroneItem {
  id: string;
  model: string;
  droneName: string;
  droneSN: string;
  remoteSN: string;
  email: string;
  department: 'SSOC' | 'SSD' | string;
  status: DroneStatus | string;
  notes?: string;
}

export type SidebarTab = FeatureId;

export type InventorySubTab = 'analytics' | 'all' | 'issued-equipment' | 'accessories' | 'batteries' | 'streaming-devices' | 'excel-manager' | 'excel';

export interface CheckoutRecord {
  id: string;
  droneId: string;
  droneName: string;
  droneSN: string;
  model: string;
  department: string;
  operatorEmail: string;
  operatorName: string;
  purpose: string;
  checkOutTime: string;
  expectedReturnTime: string;
  checkInTime?: string;
  status: 'CHECKED_OUT' | 'RETURNED' | 'OVERDUE';
  batteryLevelOut: number;
  batteryLevelIn?: number;
  remarks?: string;
}

export type UserClass = 'OFFICER' | 'TECHNICIAN' | string;
export type UserRole = 'ADMIN' | 'OFFICER' | 'USER';

export type PrivilegeKey = PermissionId;

export interface PrivilegeItem {
  menuTab?: SidebarTab;
  id: PrivilegeKey;
  label: string;
  category: 'DRONE_REQUEST' | 'OPERATIONS_MENU' | 'INVENTORY' | 'IN_OUT_FORM' | 'INCIDENT_REPORT' | 'CONFISCATED_DRONE' | 'NOTIFICATION_FUNCTIONS';
  categoryLabel: string;
  description: string;
}

export const TAB_VIEW_PRIVILEGES=Object.fromEntries(FEATURES.map(feature=>[feature.id,feature.viewPrivilege])) as Record<SidebarTab,PrivilegeKey>;
export const OPERATIONS_MENU=FEATURES.map(feature=>({id:feature.id,label:feature.label,viewPrivilege:feature.viewPrivilege,permissionGroup:feature.permissionGroup}));
export interface UserGroup {id:string;name:string;baseRole:'OFFICER'|'USER';}
export const SYSTEM_PRIVILEGES:PrivilegeItem[]=PERMISSIONS.map(permission=>({...permission}));

export type GroupPrivileges = Record<string, Record<PrivilegeKey, boolean>>;

export const DEFAULT_GROUP_PRIVILEGES=DEFAULT_PERMISSION_GRANTS as GroupPrivileges;

export const hasPrivilege = (
  privileges: GroupPrivileges | undefined,
  user: UserItem | null | undefined,
  privilege: PrivilegeKey
): boolean => {
  if (!user || !isRegisteredPermission(privilege)) return false;
  const role = getUserRole(user);
  const groupMap = privileges || DEFAULT_GROUP_PRIVILEGES;
  const key = user.groupId ? 'GROUP:' + user.groupId : role;
  if (user.groupId && !groupMap[key]) return false;
  if (groupMap[key] && groupMap[key][privilege] !== undefined) {
    return !!groupMap[key][privilege];
  }
  return role === 'ADMIN';
};

export const canApproveRequests = (privileges: GroupPrivileges | undefined, user: UserItem | null | undefined): boolean => {
  if (!user || user.archivedAt || user.accountStatus === 'SUSPENDED') return false;
  if (getUserRole(user) === 'ADMIN') return true;
  const key = user.groupId ? 'GROUP:' + user.groupId : getUserRole(user);
  if (privileges?.[key]) return privileges[key].APPROVE_REQUESTS === true;
  return user.canApproveRequests === true;
};

export const canViewTab = (
  privileges: GroupPrivileges | undefined,
  user: UserItem | null | undefined,
  tab: SidebarTab
): boolean => {
  if (!user) return true;
  if(tab==='SETTINGS')return true;
  const role = getUserRole(user);
  // Safety: Admin cannot lock themselves out of USERS tab where privileges are configured
  if (role === 'ADMIN' && tab === 'USERS') return true;
  const privKey = TAB_VIEW_PRIVILEGES[tab];
  if (!privKey) return true;
  return hasPrivilege(privileges, user, privKey);
};

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole?: string;
  action: string;
  targetType: 'USER' | 'ROLE' | 'FLEET' | 'AUTH' | 'SECURITY' | 'SYSTEM';
  targetId?: string;
  details: string;
  ipAddress?: string;
}

export interface UserItem {
  id: string;
  employeeId: string;
  qatarId: string;
  rank: 'MAJOR' | 'CAPTAIN' | '1st LT' | string;
  userClass?: 'OFFICER' | 'TECHNICIAN' | string;
  userRole?: UserRole;
  groupId?: string;
  name: string;
  mobileNumber: string;
  passwordHash?: string;
  canApproveRequests?: boolean;
  identityConflict?: boolean;
  archivedAt?: string;
  email: string;
  department: 'SSOC' | 'SSD' | string;
  status: 'ACTIVE' | 'ON_DUTY' | 'OFF_DUTY';
  role?: string;
  accountStatus?: 'ACTIVE' | 'SUSPENDED';
  mustChangePassword?: boolean;
  requiresPasswordSetup?: boolean;
  lastPasswordChange?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export const getUserRole = (user?: UserItem | null): UserRole => resolveUserRole(user) as UserRole;

export interface BatteryItem {
  id: string;
  serialNumber: string;
  batteryModel: string;
  compatibleDrone: string;
  department: 'SSOC' | 'SSD' | string;
  cycleCount: number;
  healthPercent: number;
  status: 'READY' | 'IN_USE' | 'CHARGING' | 'DEPLETED' | 'MAINTENANCE' | 'CRASHED' | 'MISSING' | string;
  location?: string;
  notes?: string;
}

export interface AccessoryItem {
  id: string;
  name: string;
  serialNumber: string;
  category: 'PAYLOAD_CAMERA' | 'REMOTE_CONTROLLER' | 'GNSS_RTK' | 'SEARCHLIGHT_SPEAKER' | 'CHARGER_DOCK' | 'SAFETY_PROP' | 'OTHER';
  compatibleDrone: string;
  department: 'SSOC' | 'SSD' | string;
  condition: 'EXCELLENT' | 'GOOD' | 'NEEDS_INSPECTION' | 'DAMAGED';
  status: 'AVAILABLE' | 'DEPLOYED' | 'MAINTENANCE' | 'STORAGE' | 'CRASHED' | 'MISSING' | string;
  location?: string;
  notes?: string;
}

export interface StreamingDeviceItem {
  id: string;
  deviceName: string;
  serialNumber: string;
  deviceType: 'CELLULAR_BONDED' | 'HDMI_SDI_ENCODER' | '4G_5G_DONGLE' | 'WIRELESS_TRANSMITTER' | 'DECODER_RECEIVER';
  assignedDroneOrUnit: string;
  streamProtocol: 'RTMP / RTSP' | 'SRT (Secure Reliable Transport)' | 'LiveU LRT' | 'NDI|HX' | 'WebRTC';
  department: 'SSOC' | 'SSD' | string;
  status: 'ONLINE_STREAMING' | 'STANDBY_READY' | 'OFFLINE' | 'MAINTENANCE' | 'CRASHED' | 'MISSING' | string;
  ipAddress?: string;
  simCardNumber?: string;
  location?: string;
  notes?: string;
}

// Notification & Approval Types
export type NotificationType =
  | 'EVENT_ASSIGNED'
  | 'EVENT_UPDATED'
  | 'EVENT_CANCELLED'
  | 'FLIGHT_REQUEST'
  | 'DRONE_REQUEST'
  | 'CHANGE_APPROVAL_REQUEST'
  | 'CHANGE_APPROVED'
  | 'CHANGE_REJECTED'
  | 'HANDOVER_APPROVAL_REQUEST'
  | 'HANDOVER_APPROVED'
  | 'HANDOVER_REJECTED'
  | 'INCIDENT_APPROVAL_REQUEST'
  | 'INCIDENT_APPROVED'
  | 'INCIDENT_REJECTED'
  | 'SYSTEM_MESSAGE';
export type NotificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'READ' | 'UNREAD';
export type InventoryItemType = 'DRONE' | 'BATTERY' | 'ACCESSORY' | 'STREAMING_DEVICE' | 'HANDOVER_FORM' | 'USER' | 'BATCH_DRONES' | 'INCIDENT_REPORT';
export type ChangeActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';

export interface InventoryFieldDiff {
  fieldName: string;
  label: string;
  oldValue: any;
  newValue: any;
}

export interface InventoryChangeDetails {
  itemType: InventoryItemType;
  action: ChangeActionType;
  itemId: string;
  itemIdentifier: string;
  summary: string;
  diffs?: InventoryFieldDiff[];
  previousData?: any;
  proposedData: any;
}

export interface ExternalFlightRequest {
 id:string;requestNumber:string;drones?:{droneNameModel:string;droneSerialNumber:string}[];droneNameModel?:string;droneSerialNumber:string;location:string;startAt:string;endAt:string;operatorName:string;operatorQid:string;operatorPhone:string;createdAt:string;senderId:string;
}export interface NotificationMessage {
  workspaceTaskId?:string;
  eventId?:string;
  workspaceRecordKind?:string;
  externalFlightRequest?: ExternalFlightRequest;
  missionStatus?: 'MISSION SCHEDULED' | 'MISSION ON-GOING' | 'MISSION COMPLETED';
  droneRequest?: { notes?:string;requestForm?:HandoverFormRecord; id:string; status?:string; handoverId?:string; entries:{category:string;model:string;deviceName:string;quantity:number}[]; createdAt:string; requestedBy:string; recipientCount:number; recipientGroups:string[] };
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  senderId: string;
  senderName: string;
  senderClass: 'TECHNICIAN' | 'OFFICER' | string;
  senderEmail: string;
  targetOfficerId: string;
  targetOfficerName: string;
  targetOfficerEmail: string;
  timestamp: string;
  status: NotificationStatus;
  changeDetails?: InventoryChangeDetails;
  reviewComment?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  handoverForm?: HandoverFormRecord;
  incidentReport?: IncidentReportRecord;
}

// Handover Form Types (UAV Team Equipment Handover Form)
export type HandoverFormStatus = 'ISSUED' | 'RETURNED' | 'PENDING' | 'DRAFT' | 'ARCHIVED' | 'PENDING_APPROVAL' | 'REJECTED';
export type HandoverAssetReturnStatus = 'RETURNED' | 'CRASHED' | 'MISSING' | 'PENDING';

export interface HandoverEquipmentItem {
  requestedModel?: string;
  requestedCategory?: string;
  requestedName?: string;
  assetId?: string;
  assetEntity?: 'drones' | 'batteries' | 'accessories' | 'streamingDevices';
  id: string;
  no: number;
  description: string;
  serialNumber: string;
  returned?: boolean;
  returnStatus?: HandoverAssetReturnStatus;
  returnedAt?: string;
  conditionOnReturn?: string;
}

export interface HandoverAccessoryItem {
  requestedModel?: string;
  requestedCategory?: string;
  requestedName?: string;
  assetId?: string;
  assetEntity?: 'drones' | 'batteries' | 'accessories' | 'streamingDevices';
  id: string;
  no: number;
  description: string;
  qty: string | number;
  returned?: boolean;
  returnStatus?: HandoverAssetReturnStatus;
  returnedAt?: string;
}

export interface HandoverFormRecord {
  operationalIncidentId?: string;
  operationalIncidentReference?: string;
  requestPreparationInitialized?: boolean;
  droneRequestId?: string;
  droneRequestNumber?: string;
  requesterNotes?: string;
  approvalExemption?: 'OFFICER_REQUESTER';
  id: string;
  srNumber: string;
  status: HandoverFormStatus;
  date: string;
  purpose: string;
  recipientName: string;
  recipientEmpId: string;
  recipientQid: string;
  recipientPhone: string;
  recipientJobId: string;
  recipientSignature?: string;
  issuedAuthorityName: string;
  dateIssued: string;
  timeIssued: string;
  equipment: HandoverEquipmentItem[];
  accessories: HandoverAccessoryItem[];
  receivedOfficerName?: string;
  dateReceived?: string;
  timeReceived?: string;
  returnNotes?: string;
  createdAt?: string;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  employeeId: string;
  name: string;
  rank?: string;
  userClass?: string;
  department?: string;
  ipAddress?: string;
  deviceInfo?: string;
  loginTime: string;
  lastActiveTime: string;
}

export type IncidentPhotoCategory =
  | 'Hardware Crash Photo'
  | 'Drone Battery & Frame Imagery'
  | 'Detailed Log Sheet Excerpt'
  | 'Other Supporting Evidence';

export interface IncidentPhotoAttachment {
  id: string;
  dataUrl: string; // Base64 or URL
  fileName: string;
  category: IncidentPhotoCategory;
  caption?: string;
  uploadedAt: string;
  fileSize?: number;
}

export type IncidentSeverity = 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
export type IncidentStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_INVESTIGATION' | 'CLOSED';

export interface IncidentReportRecord {
  operationalIncidentId?: string;
  operationalIncidentReference?: string;
  sourceHandoverId?: string;
  sourceHandoverReference?: string;
  returnIncidentKey?: string;
  unlinkedAsset?: boolean;
  sourceEntryId?: string;
  assetModel?: string;
  sourceHandoverDetails?: {purpose?:string;droneRequestId?:string;droneRequestNumber?:string;issuedBy?:string;issuedDate?:string;issuedTime?:string;receivedBy?:string;returnDate?:string;returnTime?:string;returnNotes?:string;recipientEmployeeId?:string;conditionOnReturn?:string};
  entries?: IncidentReportEntry[];
  id: string;
  srReference: string; // e.g. "SAN-EXAMPLE"
  droneId?: string;
  droneName: string; // e.g. "SAN-EXAMPLE"
  aircraftSN: string; // e.g. "SAN-EXAMPLE"
  remoteSN: string; // e.g. "SAN-EXAMPLE"
  location: string; // e.g. "SAN-EXAMPLE"
  date: string; // e.g. "SAN-EXAMPLE"
  detailsSummary: string; // Accident Details Summary
  photos: IncidentPhotoAttachment[];
  reportedBy: string; // Officer/Technician name & rank
  reporterId?: string;
  department?: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  markDroneStatus?: DroneStatus;
  createdAt: string;
  updatedAt?: string;

  // Official UAV Team Incident Accident Report form fields
  latitude?: string; // e.g. "SAN-EXAMPLE"
  longitude?: string; // e.g. "SAN-EXAMPLE"
  operatorName?: string; // e.g. "SAN-EXAMPLE"
  operatorQid?: string; // e.g. "SAN-EXAMPLE"
  operatorPhone?: string; // e.g. "SAN-EXAMPLE"
  operatorJobId?: string; // e.g. "SAN-EXAMPLE"
  operatorSignature?: string;
  logDate?: string; // e.g. "SAN-EXAMPLE"
  logTime?: string; // e.g. "SAN-EXAMPLE"
  reportPreparedBy?: string; // e.g. "SAN-EXAMPLE"
  reviewDate?: string; // e.g. "SAN-EXAMPLE"
  evaluationStatus?: string; // e.g. "SAN-EXAMPLE"
  receivedEvaluatedBy?: string; // e.g. "SAN-EXAMPLE"
  evalDateTime?: string; // e.g. "SAN-EXAMPLE"
  fieldSystemNotes?: string;
}

export type IncidentReportEntry = Omit<IncidentReportRecord, 'entries'>;

export interface ConfiscatedFlightRecord {
  id: string;
  flightIndex?: number;
  date: string; // e.g. "SAN-EXAMPLE"
  location: string; // e.g. "SAN-EXAMPLE"
  coordinates: string; // e.g. "SAN-EXAMPLE"
  flightCount: number | string; // e.g. 1
  flightDuration: string; // e.g. "SAN-EXAMPLE"
  photos?: string[]; // Evidence photo(s) attached directly to this specific flight entry
  evidenceNotes?: string;
  notes?: string;
}

export type ConfiscatedDroneStatus = 'ACTIVE' | 'CONFISCATED' | 'UNDER_INVESTIGATION' | 'LEGAL_REVIEW' | 'ARCHIVED';

export interface ConfiscatedDroneReport {
  evidenceLogIds?:string[];
  linkedFlightRequests?:{id:string;requestNumber:string;operatorName:string;operatorQid:string;operatorPhone:string;location:string;startAt:string;endAt:string}[];
  custodyStatus?: 'IN_CUSTODY' | 'RETURNED' | 'NOT_RECORDED';
  returnedDate?: string;
  returnedTo?: string;
  returnRemarks?: string;
  id: string; // e.g. "SAN-EXAMPLE"
  srNumber: string; // e.g. "SAN-EXAMPLE"
  lrNumber: string; // e.g. "SAN-EXAMPLE"
  date: string; // e.g. "SAN-EXAMPLE"
  droneModel: string; // e.g. "SAN-EXAMPLE"
  droneSN: string; // e.g. "SAN-EXAMPLE"
  remoteSN: string; // e.g. "SAN-EXAMPLE"
  hasMultipleEntries: boolean;
  flightRecords: ConfiscatedFlightRecord[];
  evidencePhotos: string[]; // Base64 data URLs or asset URLs
  evidenceNotes?: string;
  // Correspondence letter attachment (prints as additional page in print preview)
  correspondencePhotos?: string[]; // Array of letter image data URLs
  correspondenceLetterRef?: string; // e.g. "SAN-EXAMPLE"
  correspondenceLetterDate?: string; // e.g. "SAN-EXAMPLE"
  correspondenceNotes?: string;
  imageStretchMode?: 'stretch' | 'fit'; // Stretch / change ratio to fill area
  receivedBy: string; // e.g. "SAN-EXAMPLE"
  evalDateTime: string; // e.g. "SAN-EXAMPLE"
  fieldSystemNotes: string;
  status: ConfiscatedDroneStatus;
  department?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface FleetServerState {
  authenticatedUser?: UserItem;
  recordVersions?: Record<string, Record<string, number>>;
  drones: DroneItem[];
  batteries: BatteryItem[];
  accessories: AccessoryItem[];
  streamingDevices: StreamingDeviceItem[];
  checkouts: CheckoutRecord[];
  handoverForms: HandoverFormRecord[];
  users: UserItem[];
  notifications: NotificationMessage[];
  activeSessions: ActiveSession[];
  incidentReports?: IncidentReportRecord[];
  confiscatedDrones?: ConfiscatedDroneReport[];
  groupPrivileges?: GroupPrivileges;
  userGroups?: UserGroup[];
  auditLogs?: AuditLogEntry[];
}

