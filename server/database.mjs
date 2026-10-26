import { inventoryEntities, sanitizeAssetEmail } from './asset-emails.mjs';
import { normalizeLegacyAccount } from '../src/utils/accountIdentity.mjs';
import { DatabaseSync, backup } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const TABLES = Object.freeze({ drones: 'drones', batteries: 'batteries', accessories: 'accessories', streamingDevices: 'streaming_devices', checkouts: 'checkouts', handoverForms: 'handovers', incidentReports: 'incidents', confiscatedDrones: 'confiscations', users: 'users', notifications: 'notifications', auditLogs: 'audit_events' });
export const OPERATIONAL_ENTITIES = Object.keys(TABLES).filter(k => !['users', 'auditLogs'].includes(k));
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export class DataError extends Error {
  constructor(message, status = 400, code = 'INVALID_DATA') { super(message); this.status = status; this.code = code; }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

export function validateRecord(entity, record) {
  if (!own(TABLES, entity) || !record || typeof record !== 'object' || Array.isArray(record) || typeof record.id !== 'string' || !record.id.trim() || record.id.length > 200) throw new DataError('A valid entity and record ID are required.');
  const required = { drones: ['droneName', 'droneSN', 'status'], batteries: ['serialNumber', 'status'], accessories: ['name', 'status'], streamingDevices: ['deviceName', 'serialNumber', 'status'], users: ['employeeId', 'name', 'qatarId'], checkouts: ['droneId', 'status'], handoverForms: ['srNumber', 'status'], incidentReports: ['srReference', 'status'], confiscatedDrones: ['srNumber'], notifications: ['type', 'status'], auditLogs: ['timestamp', 'action'] }[entity];
  for (const key of required) if (typeof record[key] !== 'string' || !record[key].trim()) throw new DataError(`${entity}: ${key} is required.`);
  const statuses = { checkouts: ['CHECKED_OUT', 'RETURNED', 'OVERDUE'], handoverForms: ['ISSUED', 'RETURNED', 'PENDING', 'DRAFT', 'ARCHIVED', 'PENDING_APPROVAL', 'REJECTED'], incidentReports: ['DRAFT', 'SUBMITTED', 'UNDER_INVESTIGATION', 'CLOSED'], notifications: ['PENDING', 'APPROVED', 'REJECTED', 'READ', 'UNREAD'] };
  if (statuses[entity] && !statuses[entity].includes(record.status)) throw new DataError(`${entity}: invalid status.`);
  if(entity==='confiscatedDrones' && record.custodyStatus!==undefined) {
    if(!['IN_CUSTODY','RETURNED','NOT_RECORDED'].includes(record.custodyStatus)) throw new DataError('Invalid confiscated drone custody status.');
    if(record.custodyStatus==='RETURNED') {
      if(typeof record.returnedDate!=='string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(record.returnedDate) || !Number.isFinite(Date.parse(record.returnedDate)) || new Date(record.returnedDate).toISOString().slice(0,10)!==record.returnedDate) throw new DataError('A valid return date is required.');
      if(typeof record.returnedTo!=='string' || !record.returnedTo.trim() || record.returnedTo.length>200) throw new DataError('Enter the owner or department receiving the returned drone.');
    }
    if(record.returnRemarks!==undefined && (typeof record.returnRemarks!=='string' || record.returnRemarks.length>2000)) throw new DataError('Return remarks must be text of up to 2,000 characters.');
  }  if (entity === 'users' && record.userRole && !['ADMIN', 'OFFICER', 'USER'].includes(record.userRole)) throw new DataError('Invalid account role.');
  for (const key of ['cycleCount', 'healthPercent', 'batteryLevelOut', 'batteryLevelIn']) if (record[key] !== undefined && (!Number.isFinite(record[key]) || record[key] < 0 || (key !== 'cycleCount' && record[key] > 100))) throw new DataError(`Invalid ${key}.`);
  if (entity === 'handoverForms' && (!Array.isArray(record.equipment) || !Array.isArray(record.accessories))) throw new DataError('Handover equipment and accessories must be arrays.');
}

// Flexible report payloads are retained while IDs, versions, uniqueness, relationships,
// permissions and attachment references are enforced relationally.
export class FleetStore {
  constructor(directory) {
    this.directory = path.resolve(directory);
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    this.attachmentDirectory = path.join(this.directory, 'attachments');
    fs.mkdirSync(this.attachmentDirectory, { recursive: true, mode: 0o700 });
    this.filename = path.join(this.directory, 'fleet.sqlite');
    this.db = new DatabaseSync(this.filename);
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
    this.db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS security_state(scope TEXT NOT NULL, key TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)), PRIMARY KEY(scope,key));
      CREATE TABLE IF NOT EXISTS role_permissions(role TEXT NOT NULL CHECK(role IN ('ADMIN','OFFICER','USER')), privilege TEXT NOT NULL, allowed INTEGER NOT NULL CHECK(allowed IN (0,1)), PRIMARY KEY(role,privilege));
      CREATE TABLE IF NOT EXISTS user_groups(id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, base_role TEXT NOT NULL CHECK(base_role IN ('OFFICER','USER')));
      CREATE TABLE IF NOT EXISTS group_permissions(group_id TEXT NOT NULL REFERENCES user_groups(id), privilege TEXT NOT NULL, allowed INTEGER NOT NULL CHECK(allowed IN (0,1)), PRIMARY KEY(group_id,privilege));
      CREATE TABLE IF NOT EXISTS record_registry(entity TEXT NOT NULL, id TEXT NOT NULL, PRIMARY KEY(entity,id));
      CREATE TABLE IF NOT EXISTS record_links(source_entity TEXT NOT NULL, source_id TEXT NOT NULL, field TEXT NOT NULL, target_entity TEXT NOT NULL, target_id TEXT NOT NULL,
        PRIMARY KEY(source_entity,source_id,field), FOREIGN KEY(source_entity,source_id) REFERENCES record_registry(entity,id), FOREIGN KEY(target_entity,target_id) REFERENCES record_registry(entity,id));
      CREATE TABLE IF NOT EXISTS attachments(hash TEXT PRIMARY KEY, mime_type TEXT NOT NULL, size INTEGER NOT NULL CHECK(size>=0));
      CREATE TABLE IF NOT EXISTS attachment_links(entity TEXT NOT NULL,id TEXT NOT NULL,hash TEXT NOT NULL REFERENCES attachments(hash), PRIMARY KEY(entity,id,hash), FOREIGN KEY(entity,id) REFERENCES record_registry(entity,id));`);
    for (const table of Object.values(TABLES)) {
      this.db.exec(`CREATE TABLE IF NOT EXISTS ${table}(id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)), version INTEGER NOT NULL CHECK(version>0), position INTEGER NOT NULL, deleted_at TEXT);
        CREATE INDEX IF NOT EXISTS ${table}_status ON ${table}(json_extract(payload,'$.status')) WHERE deleted_at IS NULL;`);
    }
    if (!this.db.prepare('SELECT version FROM schema_migrations WHERE version=4').get()) this.transaction(()=>{
      const hasAssignments=this.db.prepare('PRAGMA table_info(user_groups)').all().some(column=>column.name==='role_id');
      const hasRolePermissions=!!this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='custom_role_permissions'").get();
      if (hasAssignments) for (const group of this.db.prepare('SELECT id,role_id FROM user_groups').all()) {
        if (!group.role_id) continue;
        let grants;
        if (['USER','OFFICER'].includes(group.role_id)) grants=this.db.prepare('SELECT privilege,allowed FROM role_permissions WHERE role=?').all(group.role_id);
        else if (group.role_id.startsWith('ROLE:') && hasRolePermissions) {
          if (!this.db.prepare('SELECT id FROM permission_roles WHERE id=?').get(group.role_id.slice(5))) throw new DataError('Cannot migrate group with a missing assigned role.');
          grants=this.db.prepare('SELECT privilege,allowed FROM custom_role_permissions WHERE role_id=?').all(group.role_id.slice(5));
        } else throw new DataError('Cannot migrate an invalid group role assignment.');
        this.db.prepare('DELETE FROM group_permissions WHERE group_id=?').run(group.id);
        for (const grant of grants) this.db.prepare('INSERT INTO group_permissions VALUES(?,?,?)').run(group.id,grant.privilege,grant.allowed);
      }
      if (hasAssignments) this.db.exec('ALTER TABLE user_groups DROP COLUMN role_id');
      this.db.exec('DROP TABLE IF EXISTS custom_role_permissions; DROP TABLE IF EXISTS permission_roles;');
      this.db.prepare('INSERT INTO schema_migrations VALUES(4,?)').run(new Date().toISOString());
    });
    if (!this.db.prepare('SELECT version FROM schema_migrations WHERE version=5').get()) this.transaction(()=>{
      for (const key of ['INVENTORY_DELETE_STREAMING_DEVICE','INVENTORY_DELETE_ACCESSORY','INVENTORY_DELETE_BATTERY']) {
        this.db.prepare("INSERT OR IGNORE INTO role_permissions SELECT role,?,allowed FROM role_permissions WHERE privilege='INVENTORY_DELETE_DRONE'").run(key);
        this.db.prepare("INSERT OR IGNORE INTO group_permissions SELECT group_id,?,allowed FROM group_permissions WHERE privilege='INVENTORY_DELETE_DRONE'").run(key);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(5,?)').run(new Date().toISOString());
    });
    if (!this.db.prepare('SELECT version FROM schema_migrations WHERE version=6').get()) this.transaction(()=>{
      for (const role of ['ADMIN','OFFICER','USER']) this.db.prepare("INSERT OR IGNORE INTO role_permissions VALUES(?,'APPROVE_REQUESTS',?)").run(role,role==='USER'?0:1);
      this.db.exec("INSERT OR IGNORE INTO group_permissions SELECT id,'APPROVE_REQUESTS',CASE WHEN base_role='OFFICER' THEN 1 ELSE 0 END FROM user_groups");
      this.db.prepare('INSERT INTO schema_migrations VALUES(6,?)').run(new Date().toISOString());
    });
    if (!this.db.prepare('SELECT version FROM schema_migrations WHERE version=7').get()) this.transaction(()=>{
      const groups=this.db.prepare('SELECT id,name,base_role AS baseRole FROM user_groups').all();
      for (const row of this.db.prepare('SELECT id,payload,position,deleted_at FROM users').all()) {
        const account=JSON.parse(row.payload),normalized=normalizeLegacyAccount(row.deleted_at && !account.archivedAt ? {...account,archivedAt:row.deleted_at} : account,groups);
        if (!same(account,normalized)) {
          // Preserve archive markers, positions, references and credentials.
          this.db.prepare('UPDATE users SET payload=?,version=version+1 WHERE id=?').run(JSON.stringify(normalized),row.id);
        }
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(7,?)').run(new Date().toISOString());
    });
    if (!this.db.prepare('SELECT version FROM schema_migrations WHERE version=8').get()) this.transaction(()=>{
      this.db.exec("INSERT OR IGNORE INTO group_permissions SELECT id,'RECEIVE_DRONE_REQUESTS',0 FROM user_groups");
      this.db.prepare('INSERT INTO schema_migrations VALUES(8,?)').run(new Date().toISOString());
    });
    if (!this.db.prepare('SELECT version FROM schema_migrations WHERE version=9').get()) this.transaction(()=>{
      for (const key of ['VIEW_TAB_DRONE_REQUEST','DRONE_REQUEST_ADD']) {
        this.db.prepare("INSERT OR IGNORE INTO group_permissions SELECT id,?,coalesce((SELECT allowed FROM group_permissions WHERE group_id=user_groups.id AND privilege='VIEW_TAB_IN_OUT_FORM'),0) FROM user_groups").run(key);
        this.db.prepare("INSERT OR IGNORE INTO role_permissions SELECT role,?,allowed FROM role_permissions WHERE privilege='VIEW_TAB_IN_OUT_FORM'").run(key);
      }
      for (const key of ['DRONE_REQUEST_EDIT','DRONE_REQUEST_DELETE']) {
        this.db.prepare('INSERT OR IGNORE INTO group_permissions SELECT id,?,0 FROM user_groups').run(key);
        this.db.prepare("INSERT OR IGNORE INTO role_permissions SELECT role,?,CASE WHEN role='ADMIN' THEN 1 ELSE 0 END FROM role_permissions GROUP BY role").run(key);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(9,?)').run(new Date().toISOString());
    });
    if(!this.db.prepare('SELECT version FROM schema_migrations WHERE version=10').get()) this.transaction(()=>{
      for(const entity of inventoryEntities) for(const row of this.db.prepare(`SELECT id,payload FROM ${TABLES[entity]}`).all()) {
        const original=JSON.parse(row.payload),clean=sanitizeAssetEmail(entity,original);
        if(clean.email!==original.email) this.db.prepare(`UPDATE ${TABLES[entity]} SET payload=?,version=version+1 WHERE id=?`).run(JSON.stringify(clean),row.id);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(10,?)').run(new Date().toISOString());
    });    if(!this.db.prepare('SELECT version FROM schema_migrations WHERE version=11').get()) this.transaction(()=>{
      for(const key of ['VIEW_TAB_FLIGHT_REQUEST','FLIGHT_REQUEST_SEND']) {
        this.db.prepare("INSERT OR IGNORE INTO group_permissions SELECT id,?,coalesce((SELECT allowed FROM group_permissions WHERE group_id=user_groups.id AND privilege='VIEW_TAB_IN_OUT_FORM'),0) FROM user_groups").run(key);
        this.db.prepare("INSERT OR IGNORE INTO role_permissions SELECT role,?,allowed FROM role_permissions WHERE privilege='VIEW_TAB_IN_OUT_FORM'").run(key);
      }
      this.db.prepare("INSERT OR IGNORE INTO group_permissions SELECT id,'RECEIVE_FLIGHT_REQUESTS',0 FROM user_groups").run();
      this.db.prepare("INSERT OR IGNORE INTO role_permissions SELECT DISTINCT role,'RECEIVE_FLIGHT_REQUESTS',0 FROM role_permissions").run();
      this.db.prepare('INSERT INTO schema_migrations VALUES(11,?)').run(new Date().toISOString());
    });    if(!this.db.prepare('SELECT version FROM schema_migrations WHERE version=12').get()) this.transaction(()=>{
      for(const key of ['IN_OUT_CREATE_FORM','IN_OUT_EDIT_FORM']) {
        this.db.prepare("INSERT OR IGNORE INTO group_permissions SELECT id,?,coalesce((SELECT allowed FROM group_permissions WHERE group_id=user_groups.id AND privilege='VIEW_TAB_IN_OUT_FORM'),0) FROM user_groups").run(key);
        this.db.prepare("INSERT OR IGNORE INTO role_permissions SELECT role,?,allowed FROM role_permissions WHERE privilege='VIEW_TAB_IN_OUT_FORM'").run(key);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(12,?)').run(new Date().toISOString());
    });
    if(!this.db.prepare('SELECT version FROM schema_migrations WHERE version=13').get()) this.transaction(()=>{
      this.db.exec('CREATE TABLE IF NOT EXISTS video_wall_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, version INTEGER NOT NULL)');
      for(const key of ['VIEW_TAB_VIDEO_WALL','VIDEO_WALL_CREATE','VIDEO_WALL_EDIT','VIDEO_WALL_DELETE','VIDEO_WALL_PUBLISH']){
        this.db.prepare('INSERT OR IGNORE INTO group_permissions SELECT id,?,0 FROM user_groups').run(key);
        this.db.prepare("INSERT OR IGNORE INTO role_permissions(role,privilege,allowed) VALUES('ADMIN',?,1),('OFFICER',?,0),('USER',?,0)").run(key,key,key);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(13,?)').run(new Date().toISOString());
    });
    if(!this.db.prepare('SELECT version FROM schema_migrations WHERE version=14').get()) this.transaction(()=>{
      this.db.exec(`CREATE TABLE task_automation_items(kind TEXT NOT NULL CHECK(kind IN ('template','schedule','rule')),id TEXT NOT NULL,owner_id TEXT NOT NULL REFERENCES users(id),payload TEXT NOT NULL CHECK(json_valid(payload)),version INTEGER NOT NULL,archived_at TEXT,PRIMARY KEY(kind,id));
      CREATE TABLE task_template_versions(template_id TEXT NOT NULL,version INTEGER NOT NULL,payload TEXT NOT NULL CHECK(json_valid(payload)),PRIMARY KEY(template_id,version));
      CREATE TABLE task_automation_occurrences(schedule_id TEXT NOT NULL,occurrence_date TEXT NOT NULL,task_id TEXT NOT NULL,skipped_count INTEGER NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(schedule_id,occurrence_date));
      CREATE TABLE task_automation_deliveries(id TEXT PRIMARY KEY,rule_id TEXT NOT NULL,task_id TEXT NOT NULL,recipient_id TEXT NOT NULL,phase TEXT NOT NULL,delivered_at TEXT NOT NULL);`);
      for(const key of ['TASK_TEMPLATE_MANAGE','TASK_TEMPLATE_USE','TASK_AUTOMATION_MANAGE','TASK_REMINDER_MANAGE']){
        this.db.prepare('INSERT OR IGNORE INTO group_permissions SELECT id,?,0 FROM user_groups').run(key);
        this.db.prepare("INSERT OR IGNORE INTO role_permissions(role,privilege,allowed) VALUES('ADMIN',?,1),('OFFICER',?,0),('USER',?,0)").run(key,key,key);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(14,?)').run(new Date().toISOString());
    });    if(!this.db.prepare('SELECT version FROM schema_migrations WHERE version=15').get()) this.transaction(()=>{
      this.db.exec(`CREATE TABLE evidence_bookmarks(id TEXT PRIMARY KEY,payload TEXT NOT NULL CHECK(json_valid(payload)),version INTEGER NOT NULL);
      CREATE TABLE evidence_bookmark_history(bookmark_id TEXT NOT NULL REFERENCES evidence_bookmarks(id),version INTEGER NOT NULL,payload TEXT NOT NULL CHECK(json_valid(payload)),PRIMARY KEY(bookmark_id,version));`);
      for(const key of ['VIEW_TAB_EVIDENCE_BOOKMARKS','EVIDENCE_CREATE','EVIDENCE_EDIT','EVIDENCE_LINK','EVIDENCE_ARCHIVE']){
        this.db.prepare('INSERT OR IGNORE INTO group_permissions SELECT id,?,0 FROM user_groups').run(key);
        this.db.prepare("INSERT OR IGNORE INTO role_permissions(role,privilege,allowed) VALUES('ADMIN',?,1),('OFFICER',?,0),('USER',?,0)").run(key,key,key);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(15,?)').run(new Date().toISOString());
    });
    if(!this.db.prepare('SELECT version FROM schema_migrations WHERE version=16').get()) this.transaction(()=>{
      this.db.exec(`CREATE TABLE mission_operations(id TEXT PRIMARY KEY,payload TEXT NOT NULL CHECK(json_valid(payload)),version INTEGER NOT NULL CHECK(version>0));
      CREATE TABLE mission_operation_events(id INTEGER PRIMARY KEY,mission_id TEXT NOT NULL REFERENCES mission_operations(id),actor_id TEXT NOT NULL,action TEXT NOT NULL,at TEXT NOT NULL);`);
      for(const key of ['VIEW_TAB_MISSION_OPERATIONS','MISSION_CREATE','MISSION_MANAGE','MISSION_APPROVE','MISSION_SIMULATE']){
        this.db.prepare('INSERT OR IGNORE INTO group_permissions SELECT id,?,0 FROM user_groups').run(key);
        this.db.prepare("INSERT OR IGNORE INTO role_permissions VALUES('ADMIN',?,1),('OFFICER',?,0),('USER',?,0)").run(key,key,key);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(16,?)').run(new Date().toISOString());
    });
    if(!this.db.prepare('SELECT version FROM schema_migrations WHERE version=17').get()) this.transaction(()=>{
      this.db.exec(`CREATE TABLE operational_incidents(id TEXT PRIMARY KEY,reference TEXT NOT NULL UNIQUE,payload TEXT NOT NULL CHECK(json_valid(payload)),version INTEGER NOT NULL CHECK(version>0));
      CREATE TABLE operational_incident_events(id INTEGER PRIMARY KEY,case_id TEXT NOT NULL REFERENCES operational_incidents(id),actor_id TEXT NOT NULL,action TEXT NOT NULL,note TEXT NOT NULL,at TEXT NOT NULL);
      CREATE TABLE operational_incident_links(case_id TEXT NOT NULL REFERENCES operational_incidents(id),kind TEXT NOT NULL,target_id TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL,PRIMARY KEY(case_id,kind,target_id),UNIQUE(kind,target_id));
      CREATE TABLE operational_incident_evidence(id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES operational_incidents(id),hash TEXT NOT NULL REFERENCES attachments(hash),filename TEXT NOT NULL,caption TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL,UNIQUE(case_id,hash));`);
      for(const key of ["VIEW_TAB_OPERATIONAL_INCIDENTS","OP_INCIDENT_CREATE","OP_INCIDENT_VERIFY","OP_INCIDENT_DISPATCH","OP_INCIDENT_APPROVE","OP_INCIDENT_LINK","OP_INCIDENT_EVIDENCE","OP_INCIDENT_CLOSE","OP_INCIDENT_SIMULATE"]){
        this.db.prepare('INSERT OR IGNORE INTO group_permissions SELECT id,?,0 FROM user_groups').run(key);
        this.db.prepare("INSERT OR IGNORE INTO role_permissions VALUES('ADMIN',?,1),('OFFICER',?,0),('USER',?,0)").run(key,key,key);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(17,?)').run(new Date().toISOString());
    });
    if(!this.db.prepare('SELECT version FROM schema_migrations WHERE version=18').get()) this.transaction(()=>{
      for(const key of ['INTEGRATIONS_VIEW','INTEGRATIONS_CONFIGURE']){
        this.db.prepare('INSERT OR IGNORE INTO group_permissions SELECT id,?,0 FROM user_groups').run(key);
        this.db.prepare("INSERT OR IGNORE INTO role_permissions VALUES('ADMIN',?,1),('OFFICER',?,0),('USER',?,0)").run(key,key,key);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(18,?)').run(new Date().toISOString());
    });
    if(!this.db.prepare('SELECT version FROM schema_migrations WHERE version=19').get()) this.transaction(()=>{
      this.db.exec(`CREATE TABLE dji_import_sources(hash TEXT PRIMARY KEY,raw_txt BLOB NOT NULL,domain TEXT NOT NULL CHECK(domain IN ('INVENTORY_ASSET','CONFISCATION_EVIDENCE')),flight_id TEXT NOT NULL,parser TEXT NOT NULL,log_version INTEGER NOT NULL,actor_id TEXT NOT NULL,imported_at TEXT NOT NULL,package BLOB);
        CREATE TABLE dji_keychains(hash TEXT PRIMARY KEY,ciphertext TEXT NOT NULL,created_at TEXT NOT NULL);
        CREATE TABLE dji_import_events(id INTEGER PRIMARY KEY,source_hash TEXT NOT NULL REFERENCES dji_import_sources(hash),actor_id TEXT NOT NULL,action TEXT NOT NULL,at TEXT NOT NULL);
        CREATE TRIGGER dji_source_immutable BEFORE UPDATE ON dji_import_sources BEGIN SELECT RAISE(ABORT,'DJI original evidence is immutable'); END;
        CREATE TRIGGER dji_source_no_delete BEFORE DELETE ON dji_import_sources BEGIN SELECT RAISE(ABORT,'DJI original evidence is immutable'); END;
        CREATE TRIGGER dji_events_no_update BEFORE UPDATE ON dji_import_events BEGIN SELECT RAISE(ABORT,'DJI custody events are immutable'); END;
        CREATE TRIGGER dji_events_no_delete BEFORE DELETE ON dji_import_events BEGIN SELECT RAISE(ABORT,'DJI custody events are immutable'); END;`);
      for(const key of ['FLIGHT_DATA_IMPORT_DJI','FLIGHT_DATA_CONFIGURE_DJI','FLIGHT_DATA_DJI_KEY_REQUEST']){
        this.db.prepare('INSERT OR IGNORE INTO group_permissions SELECT id,?,0 FROM user_groups').run(key);
        this.db.prepare("INSERT OR IGNORE INTO role_permissions VALUES('ADMIN',?,1),('OFFICER',?,0),('USER',?,0)").run(key,key,key);
      }
      this.db.prepare('INSERT INTO schema_migrations VALUES(19,?)').run(new Date().toISOString());
    });
    const uniques = { users: ['employeeId', 'qatarId'], drones: ['droneSN'], batteries: ['serialNumber'], streaming_devices: ['serialNumber'], handovers: ['srNumber'], incidents: ['srReference'], confiscations: ['srNumber'] };
    for (const [table, fields] of Object.entries(uniques)) for (const field of fields) this.db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${table}_${field}_unique ON ${table}(lower(trim(json_extract(payload,'$.${field}')))) WHERE deleted_at IS NULL AND coalesce(json_extract(payload,'$.identityConflict'),0)=0 AND trim(coalesce(json_extract(payload,'$.${field}'),''))<>'';`);
    this.db.prepare('INSERT OR IGNORE INTO schema_migrations VALUES(1,?)').run(new Date().toISOString());
    if (this.db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') throw new Error('Database integrity check failed. Restore a verified backup before starting.');
  }

  transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = work(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); if (error instanceof DataError) throw error; if (String(error.message).includes('UNIQUE constraint')) throw new DataError('A duplicate employee, serial number or report reference exists.', 409, 'DUPLICATE_RECORD'); throw error; }
  }

  initialize(legacyFile, initialState) {
    if (this.db.prepare("SELECT value FROM settings WHERE key='initialized'").get()) return this.load();
    let source = initialState;
    if (fs.existsSync(legacyFile)) {
      // Parsing/validation failures deliberately stop startup. Never overwrite the source.
      source = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
      if (!source || typeof source !== 'object' || !Array.isArray(source.users)) throw new DataError('Legacy data is malformed; restore or repair it before migration.');
      const archive = path.join(this.directory, `legacy-before-migration-${Date.now()}.json`);
      fs.copyFileSync(legacyFile, archive, fs.constants.COPYFILE_EXCL);
      fs.chmodSync(archive, 0o600);
      // Older versions did not persist confiscations. Missing collections are empty,
      // never seeded on restart. Explicit empty arrays are preserved.
      source = { ...source, ...Object.fromEntries(Object.keys(TABLES).filter(k => source[k] === undefined).map(k => [k, []])) };
    }
    // Preserve conflicting legacy personnel without inventing identity numbers.
    // Suspend ALL accounts sharing an identity until an administrator corrects it.
    source=structuredClone(source);
    if (source.userGroups) {
      const grants=source.groupPrivileges || initialState.groupPrivileges;
      source.groupPrivileges={...grants};
      source.userGroups=source.userGroups.map(({roleId,...group})=>{
        if (roleId) source.groupPrivileges['GROUP:'+group.id]={...(grants[roleId] || {})};
        return group;
      });
    }
    source.users=source.users.map(user=>normalizeLegacyAccount(user,source.userGroups || []));
    const legacyGrants=source.groupPrivileges || initialState.groupPrivileges;
    source.groupPrivileges=Object.fromEntries(Object.entries(legacyGrants).map(([key,grants])=>{
      const classification=key.startsWith('GROUP:') ? source.userGroups?.find(group=>group.id===key.slice(6))?.baseRole : key;
      return [key,{APPROVE_REQUESTS:classification==='ADMIN'||classification==='OFFICER',...grants}];
    }));
    const conflicts=new Set();
    for (const field of ['employeeId','qatarId']) {
      const seen=new Map();
      for (const user of source.users) {
        const key=String(user[field] || '').trim().toLowerCase();
        if (key && seen.has(key)) { conflicts.add(user.id); conflicts.add(seen.get(key)); }
        else seen.set(key,user.id);
      }
    }
    for (const user of source.users) if (conflicts.has(user.id)) { user.identityConflict=true; user.accountStatus='SUSPENDED'; }
    if (conflicts.size) console.warn('[Migration] Suspended personnel with duplicate identity fields; administrator correction required:',[...conflicts].join(', '));
    this.transaction(() => {
      if (source.userGroups) this.writeGroups(source.userGroups);
      for (const entity of Object.keys(TABLES)) {
        if (!Array.isArray(source[entity])) throw new DataError(`Migration: ${entity} must be an array.`);
        const seen = new Set();
        source[entity].forEach((record, index) => {
          validateRecord(entity, record);
          if (seen.has(record.id)) throw new DataError(`Migration: duplicate ID in ${entity}.`);
          seen.add(record.id); this.writeRecord(entity, record, index);
        });
      }
      this.writePrivileges(source.groupPrivileges || initialState.groupPrivileges);
      this.rebuildLinks();
      this.db.prepare("INSERT INTO settings VALUES('initialized',?)").run(new Date().toISOString());
    });
    return this.load();
  }

  load() {
    /** @type {Record<string, any>} */
    const state = {};
    for (const [entity, table] of Object.entries(TABLES)) state[entity] = this.db.prepare(`SELECT payload FROM ${table} WHERE deleted_at IS NULL ORDER BY position,id`).all().map(row => JSON.parse(row.payload));
    state.groupPrivileges = { ADMIN: {}, OFFICER: {}, USER: {} };
    for (const row of this.db.prepare('SELECT * FROM role_permissions').all()) state.groupPrivileges[row.role][row.privilege] = !!row.allowed;
    state.userGroups = this.db.prepare('SELECT id,name,base_role AS baseRole FROM user_groups ORDER BY name').all();
    for (const group of state.userGroups) state.groupPrivileges['GROUP:'+group.id] = {};
    for (const row of this.db.prepare('SELECT * FROM group_permissions').all()) state.groupPrivileges['GROUP:'+row.group_id][row.privilege] = !!row.allowed;
    return state;
  }

  versions() {
    return Object.fromEntries(Object.entries(TABLES).map(([entity, table]) => [entity, Object.fromEntries(this.db.prepare(`SELECT id,version FROM ${table} WHERE deleted_at IS NULL`).all().map(row => [row.id, row.version]))]));
  }

  externalize(value, hashes) {
    if (typeof value === 'string' && value.startsWith('data:')) {
      const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif|svg\+xml)|application\/pdf);(base64|utf8),(.*)$/s.exec(value);
      if (!match || (match[2]==='utf8' && match[1]!=='image/svg+xml')) throw new DataError('Unsupported attachment format.');
      const data = match[2]==='base64' ? Buffer.from(match[3],'base64') : Buffer.from(match[3].trim().startsWith('<')?match[3]:decodeURIComponent(match[3]),'utf8');
      if (data.length > 15 * 1024 * 1024) throw new DataError('An attachment exceeds 15 MB.');
      const digest = hash(data), filename = path.join(this.attachmentDirectory, digest);
      if (!fs.existsSync(filename)) fs.writeFileSync(filename, data, { flag: 'wx', mode: 0o600 });
      this.db.prepare('INSERT OR IGNORE INTO attachments VALUES(?,?,?)').run(digest, match[1], data.length);
      hashes.add(digest); return `/api/attachments/${digest}`;
    }
    if (typeof value === 'string' && /^\/api\/attachments\/[a-f0-9]{64}$/.test(value)) {
      const digest = value.split('/').pop();
      if (!this.db.prepare('SELECT hash FROM attachments WHERE hash=?').get(digest)) throw new DataError('Attachment does not exist.');
      hashes.add(digest); return value;
    }
    if (Array.isArray(value)) return value.map(item => this.externalize(item, hashes));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, this.externalize(v, hashes)]));
    return value;
  }

  writeRecord(entity, record, position = 0) {
    record=sanitizeAssetEmail(entity,record);
    if(entity==='incidentReports' && record.returnIncidentKey !== undefined){
      if(typeof record.returnIncidentKey!=='string' || !record.returnIncidentKey || record.returnIncidentKey.length>512 || !record.sourceHandoverId || !['CRASHED','MISSING'].includes(record.markDroneStatus)) throw new DataError('Invalid intake incident reference.');
      const duplicate=this.db.prepare("SELECT id FROM incidents WHERE deleted_at IS NULL AND id<>? AND json_extract(payload,'$.returnIncidentKey')=?").get(record.id,record.returnIncidentKey);
      if(duplicate)throw new DataError('An incident already exists for this asset return.',409,'DUPLICATE_RETURN_INCIDENT');
      const prior=this.db.prepare('SELECT payload FROM incidents WHERE id=?').get(record.id);
      if(!prior)record={...record,status:'UNDER_INVESTIGATION'};
      else if(JSON.parse(prior.payload).returnIncidentKey!==record.returnIncidentKey)throw new DataError('The asset return incident reference cannot change.',409);
    }
    if(entity==='incidentReports'){
      const prior=this.db.prepare('SELECT payload FROM incidents WHERE id=?').get(record.id);
      if(prior && JSON.parse(prior.payload).returnIncidentKey && !record.returnIncidentKey)throw new DataError('The asset return incident reference cannot be removed.',409);
    }
    if (entity === 'incidentReports' && record.sourceHandoverId !== undefined) {
      if (typeof record.sourceHandoverId !== 'string' || !record.sourceHandoverId.trim()) throw new DataError('Invalid source IN/OUT form ID.');
      const source = this.db.prepare('SELECT payload,deleted_at FROM handovers WHERE id=?').get(record.sourceHandoverId);
      const prior = this.db.prepare('SELECT payload FROM incidents WHERE id=?').get(record.id);
      const existingSource = prior && JSON.parse(prior.payload).sourceHandoverId;
      if (!source || (source.deleted_at && existingSource !== record.sourceHandoverId)) throw new DataError('Source IN/OUT form does not exist or is deleted.');
      if (existingSource && existingSource !== record.sourceHandoverId) throw new DataError('The source IN/OUT form cannot be changed.',409,'IMMUTABLE_INCIDENT_SOURCE');
      const reference=JSON.parse(source.payload).srNumber;
      if(record.entries?.some(entry=>entry.sourceHandoverId && entry.sourceHandoverId!==record.sourceHandoverId)) throw new DataError('Incident entries must use the report source IN/OUT form.');
      record={...record,sourceHandoverReference:reference,operationalIncidentId:JSON.parse(source.payload).operationalIncidentId,operationalIncidentReference:JSON.parse(source.payload).operationalIncidentReference,...(record.entries?.length ? {entries:record.entries.map(entry=>({...entry,sourceHandoverId:record.sourceHandoverId,sourceHandoverReference:reference}))} : {})};
    }
    if (entity === 'incidentReports') {
      if(!record.sourceHandoverId && record.entries?.some(entry=>entry.sourceHandoverId)) throw new DataError('Incident entries require a source IN/OUT form on their report.');
      const prior=this.db.prepare('SELECT payload FROM incidents WHERE id=?').get(record.id);
      if (prior && JSON.parse(prior.payload).sourceHandoverId && !record.sourceHandoverId) throw new DataError('The source IN/OUT form cannot be removed.',409,'IMMUTABLE_INCIDENT_SOURCE');
    }
    validateRecord(entity, record);
    const table = TABLES[entity], existing = this.db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(record.id);
    const referenceField = { handoverForms: 'srNumber', incidentReports: 'srReference', confiscatedDrones: 'srNumber' }[entity];
    if (referenceField && existing && JSON.parse(existing.payload)[referenceField] !== record[referenceField]) {
      throw new DataError('Generated SR numbers cannot be changed.', 409, 'IMMUTABLE_SR');
    }
    if (entity === 'incidentReports' && record.entries?.some(entry => entry.srReference !== record.srReference)) {
      throw new DataError('Incident entries must retain the generated report SR number.', 409, 'IMMUTABLE_SR');
    }
    if (['drones','batteries','accessories','streamingDevices'].includes(entity) && existing && JSON.parse(existing.payload).status === 'CRASHED' && record.status !== 'CRASHED') {
      throw new DataError('CRASHED is a permanent asset status and cannot be changed, including by an administrator.',409,'PERMANENT_CRASHED_STATUS');
    }
    if (entity === 'users' && record.groupId && !record.archivedAt) {
      const group = this.db.prepare('SELECT base_role FROM user_groups WHERE id=?').get(record.groupId);
      if (!group || group.base_role !== record.userRole) throw new DataError('Account group metadata is inconsistent; select the group again in Users.');
    }
    const hashes = new Set(), payload = JSON.stringify(this.externalize(record, hashes));
    this.db.prepare('INSERT OR IGNORE INTO record_registry VALUES(?,?)').run(entity, record.id);
    this.db.prepare(`INSERT INTO ${table} VALUES(?,?,1,?,NULL) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=${table}.version+1,position=excluded.position,deleted_at=NULL`).run(record.id, payload, position);
    this.db.prepare('DELETE FROM attachment_links WHERE entity=? AND id=?').run(entity,record.id);
    for (const digest of hashes) this.db.prepare('INSERT INTO attachment_links VALUES(?,?,?)').run(entity,record.id,digest);
    return existing ? Number(existing.version) + 1 : 1;
  }

  writePrivileges(privileges) {
    // Expand legacy grants without overwriting the new independent permissions.
    privileges=Object.fromEntries(Object.entries(privileges).map(([group,grants])=>[group,{...(grants.INVENTORY_DELETE_DRONE!==undefined?Object.fromEntries(['INVENTORY_DELETE_STREAMING_DEVICE','INVENTORY_DELETE_ACCESSORY','INVENTORY_DELETE_BATTERY'].map(key=>[key,grants.INVENTORY_DELETE_DRONE])):{}),...grants}]));
    privileges=structuredClone(privileges);
    for (const grants of Object.values(privileges)) {
      if (grants.VIEW_TAB_IN_OUT_FORM !== undefined) {
        grants.VIEW_TAB_FLIGHT_REQUEST ??= grants.VIEW_TAB_IN_OUT_FORM === true;
        grants.FLIGHT_REQUEST_SEND ??= grants.VIEW_TAB_FLIGHT_REQUEST;
        grants.RECEIVE_FLIGHT_REQUESTS ??= false;
        grants.IN_OUT_CREATE_FORM ??= grants.VIEW_TAB_IN_OUT_FORM === true;
        grants.IN_OUT_EDIT_FORM ??= grants.VIEW_TAB_IN_OUT_FORM === true;
        grants.VIEW_TAB_DRONE_REQUEST ??= grants.VIEW_TAB_IN_OUT_FORM === true;
        grants.DRONE_REQUEST_ADD ??= grants.VIEW_TAB_DRONE_REQUEST;
      }
    }
    for (const role of ['ADMIN','OFFICER','USER']) privileges[role]={APPROVE_REQUESTS:role==='ADMIN',...privileges[role]};
    for (const group of this.db.prepare('SELECT id,name,base_role FROM user_groups').all()) privileges['GROUP:'+group.id]={APPROVE_REQUESTS:false,RECEIVE_DRONE_REQUESTS:false,...privileges['GROUP:'+group.id]};
    this.db.exec('DELETE FROM role_permissions; DELETE FROM group_permissions');
    for (const role of ['ADMIN','OFFICER','USER']) for (const [key,value] of Object.entries(privileges[role] || {})) this.db.prepare('INSERT INTO role_permissions VALUES(?,?,?)').run(role,key,value ? 1 : 0);
    for (const group of this.db.prepare('SELECT id FROM user_groups').all()) for (const [key,value] of Object.entries(privileges['GROUP:'+group.id] || {})) this.db.prepare('INSERT INTO group_permissions VALUES(?,?,?)').run(group.id,key,value ? 1 : 0);
  }

  writeGroups(groups) {
    for (const group of groups) {
      if (!group || typeof group.id !== 'string' || typeof group.name !== 'string' || !group.name.trim() || !['OFFICER','USER'].includes(group.baseRole)) throw new DataError('Invalid user group.');
      if (group.roleId) throw new DataError('Groups manage permissions directly; role assignments are no longer supported.');
      this.db.prepare('INSERT INTO user_groups VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,base_role=excluded.base_role').run(group.id,group.name.trim(),group.baseRole);
      this.db.prepare('INSERT OR IGNORE INTO group_permissions VALUES(?,?,?)').run(group.id,'RECEIVE_DRONE_REQUESTS',0);
    }
  }

  rebuildLinks() {
    this.db.exec('DELETE FROM record_links');
    const state = this.load(), assets = ['drones','batteries','accessories','streamingDevices'];
    const link = (entity,id,field,targetEntity,targetId) => {
      if (!this.db.prepare('SELECT id FROM record_registry WHERE entity=? AND id=?').get(targetEntity,targetId)) throw new DataError(`${entity}: referenced ${targetEntity} record does not exist.`);
      this.db.prepare('INSERT INTO record_links VALUES(?,?,?,?,?)').run(entity,id,field,targetEntity,targetId);
    };
    for (const entity of ['checkouts','incidentReports']) for (const record of state[entity]) if (record.droneId) link(entity,record.id,'droneId','drones',record.droneId);
    for (const record of state.incidentReports) if(record.sourceHandoverId) link('incidentReports',record.id,'sourceHandoverId','handoverForms',record.sourceHandoverId);
    for (const record of state.handoverForms) {
      const recipient = state.users.find(u => u.employeeId === record.recipientEmpId);
      if (recipient) link('handoverForms',record.id,'recipient','users',recipient.id);
      for (const [index,item] of [...record.equipment,...record.accessories].entries()) {
        if (item.assetId && assets.includes(item.assetEntity)) { link('handoverForms',record.id,`item:${index}`,item.assetEntity,item.assetId); continue; }
        // Legacy descriptions are not guessed. Only an unambiguous exact serial match
        // becomes a relational link; historical text remains available in the report.
        const serial = String(item.serialNumber || '').trim().toLowerCase();
        if (!serial) continue;
        const matches = assets.flatMap(entity => state[entity].filter(a => [a.droneSN,a.remoteSN,a.serialNumber].some(s => s && String(s).trim().toLowerCase() === serial)).map(a => ({entity,id:a.id})));
        if (matches.length === 1) link('handoverForms',record.id,`item:${index}`,matches[0].entity,matches[0].id);
      }
    }
  }

  // Compatibility path for dedicated account endpoints. Writes only changed records,
  // and restores authoritative memory if validation or disk persistence fails.
  save(state) {
    const before = this.load();
    this.transaction(() => {
      if (state.userGroups) this.writeGroups(state.userGroups);
      for (const [entity, table] of Object.entries(TABLES)) {
        const prior = new Map(before[entity].map(r => [r.id,r])), seen = new Set();
        state[entity].forEach((record,index) => {
          if (seen.has(record.id)) throw new DataError(`Duplicate ID in ${entity}.`);
          seen.add(record.id);
          if (!same(prior.get(record.id),record)) {
            if (entity === 'auditLogs' && prior.has(record.id)) throw new DataError('Audit events cannot be modified.');
            this.writeRecord(entity,record,index);
          }
        });
        for (const id of prior.keys()) if (!seen.has(id)) {
          if (entity === 'auditLogs') throw new DataError('Audit events cannot be removed.');
          this.db.prepare(`UPDATE ${table} SET deleted_at=?,version=version+1 WHERE id=?`).run(new Date().toISOString(),id);
        }
      }
      if (!same(before.groupPrivileges,state.groupPrivileges)) this.writePrivileges(state.groupPrivileges);
      // Remove absent metadata only after personnel and permission references are updated.
      if (state.userGroups) {
        const ids=new Set(state.userGroups.map(group=>group.id));
        for (const row of this.db.prepare('SELECT id FROM user_groups').all()) if (!ids.has(row.id)) {
          if (state.users.some(user=>user.groupId===row.id)) throw new DataError('Move group members before deleting their group.',409);
          if(this.db.prepare("SELECT 1 FROM sqlite_master WHERE name='workspace_group_assignments'").get()&&this.db.prepare('SELECT 1 FROM workspace_group_assignments WHERE group_id=? LIMIT 1').get(row.id))throw new DataError('This group is referenced by shared tasks or events. Keep the group for record history, or remove its workspace assignments before deletion.',409);
          this.db.prepare('DELETE FROM group_permissions WHERE group_id=?').run(row.id);
          this.db.prepare('DELETE FROM user_groups WHERE id=?').run(row.id);
        }
      }
      this.rebuildLinks();
    });
    return this.load();
  }

  apply(operations, actor, authorize, afterWrite) {
    if (!Array.isArray(operations) || !operations.length || operations.length > 1000) throw new DataError('Provide 1 to 1000 record operations.');
    const submitted = operations;
    this.transaction(() => {
      for (const op of operations) if (!op || !OPERATIONAL_ENTITIES.includes(op.entity) || typeof op.id !== 'string' || !Number.isInteger(op.version) || op.version < 0) throw new DataError('Invalid record operation.');
      operations = this.allocateReportReferences(operations);
      const state = this.load(), seen = new Set();
      for (const op of operations) {
        if (!op || !OPERATIONAL_ENTITIES.includes(op.entity) || typeof op.id !== 'string' || !Number.isInteger(op.version) || op.version < 0) throw new DataError('Invalid record operation.');
        const key = `${op.entity}:${op.id}`;
        if (seen.has(key)) throw new DataError('Duplicate record operation.'); seen.add(key);
        const row = this.db.prepare(`SELECT * FROM ${TABLES[op.entity]} WHERE id=?`).get(op.id);
        const version = row ? Number(row.version) : 0;
        if (version !== op.version || row?.deleted_at) throw new DataError('This record changed on another workstation. The latest data has been reloaded; review and reapply your change.',409,'STALE_RECORD');
        const previous = row ? JSON.parse(row.payload) : null;
        // Validate the officer's unchanged proposal before replacing its
        // browser reference with the server-assigned reference.
        const authorizationOp = op.entity === 'notifications' ? submitted.find(input => input.entity === op.entity && input.id === op.id) : op;
        authorize(authorizationOp,previous,state,operations);
        if (op.record === null) {
          if (!previous) throw new DataError('Record not found.',404);
          this.db.prepare(`UPDATE ${TABLES[op.entity]} SET deleted_at=?,version=version+1 WHERE id=?`).run(new Date().toISOString(),op.id);
        } else {
          if (op.record?.id !== op.id) throw new DataError('Record ID cannot change.');
          this.writeRecord(op.entity,op.record,row?.position ?? -Date.now());
        }
      }
      this.rebuildLinks();
      const event = { id: `audit-${crypto.randomUUID()}`, timestamp: new Date().toISOString(), actorId: actor.employeeId || actor.id, actorName: actor.name, actorRole: actor.userRole, action: 'OPERATION_COMMITTED', targetType: 'FLEET', details: operations.map(op => `${op.entity}/${op.id}: ${op.record===null?'deleted':op.version?'updated':'created'}`).join('; ') };
      this.writeRecord('auditLogs',event,-Date.now());
      afterWrite?.(this.load());
    });
    return this.load();
  }

  // Browser references are previews. Allocate against all saved records under
  // the write transaction, including deleted references and this batch.
  allocateReportReferences(input) {
    const operations = structuredClone(input), assigned = new Map(), sequences = new Map();
    const fields = { handoverForms: 'srNumber', incidentReports: 'srReference', confiscatedDrones: 'srNumber' };
    const patterns = { handoverForms: /^UAV-\d{4}-/, incidentReports: /^UAV-IAR-\d{4}-/, confiscatedDrones: /^UAV-CDR-\d{4}-/ };
    for (const op of operations) {
      const field = fields[op?.entity], reference = op?.record?.[field];
      if (!field || op.version !== 0 || typeof reference !== 'string' || this.db.prepare(`SELECT id FROM ${TABLES[op.entity]} WHERE id=?`).get(op.id)) continue;
      const prefix = op.entity==='handoverForms'?`UAV-${new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Qatar'}).format(new Date())}-`:reference.match(patterns[op.entity])?.[0];
      if (!prefix || (op.entity!=='handoverForms' && !/^\d+$/.test(reference.slice(prefix.length)))) continue;
      const key = op.entity + ':' + prefix;
      if (!sequences.has(key)) {
        const records = this.db.prepare(`SELECT payload FROM ${TABLES[op.entity]}`).all();
        sequences.set(key, records.reduce((highest, row) => {
          const saved = JSON.parse(row.payload)[field];
          const suffix = typeof saved === 'string' && saved.startsWith(prefix) ? saved.slice(prefix.length) : '';
          return /^\d+$/.test(suffix) ? Math.max(highest, Number(suffix)) : highest;
        }, 0));
      }
      const next = sequences.get(key) + 1;
      sequences.set(key, next);
      const savedReference = prefix + String(next).padStart(op.entity === 'handoverForms' ? 4 : 2, '0');
      assigned.set(op.id, { field, before: reference, after: savedReference });
      op.record[field] = savedReference;
      if (op.entity === 'incidentReports' && Array.isArray(op.record.entries)) for (const entry of op.record.entries) entry.srReference = savedReference;
    }
    for (const op of operations) if (op?.entity === 'notifications' && op.record) {
      for (const field of ['handoverForm', 'incidentReport']) {
        const proposal = op.record[field], allocation = assigned.get(proposal?.id);
        if (!allocation) continue;
        proposal[allocation.field] = allocation.after;
        if (Array.isArray(proposal.entries)) for (const entry of proposal.entries) entry.srReference = allocation.after;
        for (const text of ['title', 'message']) if (typeof op.record[text] === 'string') op.record[text] = op.record[text].replaceAll(allocation.before, allocation.after);
      }
    }
    return operations;
  }

  attachment(digest) { return this.db.prepare('SELECT * FROM attachments WHERE hash=?').get(digest); }
  attachmentOwners(digest) { return this.db.prepare('SELECT entity,id FROM attachment_links WHERE hash=?').all(digest); }
  close() { this.db.close(); }

  async backup(destination) {
    fs.mkdirSync(destination,{recursive:true,mode:0o700});
    const stamp = new Date().toISOString().replace(/[:.]/g,'-'), complete = path.join(destination,`fleet-backup-${stamp}-${crypto.randomUUID()}`), temporary=complete;
    fs.mkdirSync(temporary,{mode:0o700});
    await backup(this.db,path.join(temporary,'fleet.sqlite'));
    const check = new DatabaseSync(path.join(temporary,'fleet.sqlite'),{readOnly:true});
    try {
      if (check.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || check.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Backup integrity verification failed.');
      fs.mkdirSync(path.join(temporary,'attachments'));
      for (const row of check.prepare('SELECT hash FROM attachments').all()) {
        const source = path.join(this.attachmentDirectory,row.hash), target = path.join(temporary,'attachments',row.hash);
        fs.copyFileSync(source,target);
        if (hash(fs.readFileSync(target)) !== row.hash) throw new Error('Backup attachment verification failed.');
      }
    } finally { check.close(); }
    fs.writeFileSync(path.join(temporary,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),schemaVersion:1},null,2));
    return complete;
  }
}

// Sessions/revocations survive restart; socket handles remain process-local.
export class PersistentMap extends Map {
  constructor(store,scope) {
    super(); this.store=store; this.scope=scope;
    for (const row of store.db.prepare('SELECT key,payload FROM security_state WHERE scope=?').all(scope)) super.set(row.key,JSON.parse(row.payload));
  }
  set(key,value) { this.store.db.prepare('INSERT INTO security_state VALUES(?,?,?) ON CONFLICT(scope,key) DO UPDATE SET payload=excluded.payload').run(this.scope,key,JSON.stringify(value)); return super.set(key,value); }
  delete(key) { this.store.db.prepare('DELETE FROM security_state WHERE scope=? AND key=?').run(this.scope,key); return super.delete(key); }
  clear() { this.store.db.prepare('DELETE FROM security_state WHERE scope=?').run(this.scope); super.clear(); }
}

