export {TASK_GROUP_WORK_FUNCTIONS} from './taskGroupWork.mjs';
export {TASK_ASSIGNEE_SEARCH_FUNCTIONS} from './taskAssigneeSearch.mjs';
export {TASK_PROJECT_FUNCTIONS} from './taskProjects.mjs';
export {FORM_PDF_FUNCTIONS} from './formPdf.mjs';
export {INTEGRATION_SETTINGS_FUNCTIONS} from './integrations.mjs';
export {OPERATIONAL_INCIDENT_FUNCTIONS,OPERATIONAL_INCIDENT_VIEWS} from './operationalIncidents.mjs';
export {TASK_RELATED_DOCUMENT_FUNCTIONS} from './taskRelatedDocuments.mjs';
export {TASK_REQUIRED_FORM_FUNCTIONS} from './taskRequiredForms.mjs';
export {TASK_DISCUSSION_FUNCTIONS} from './taskDiscussion.mjs';
export {TASK_COMPLETION_ACTIONS} from './taskCompletion.mjs';
// Single registry for navigation, permission metadata, ownership, grouping and default grants.
export {TASK_WORKSPACE_VIEWS} from './taskWorkspaceUi.mjs';
export const MISSION_OPERATION_VIEWS=[{key:'overview',label:'Overview'},{key:'monitoring',label:'Live Monitoring'},{key:'planning',label:'Planning'},{key:'resources',label:'Teams & Resources'}].map(view=>({...view,featureId:'MISSION_OPERATIONS',viewPermission:'VIEW_TAB_MISSION_OPERATIONS'}));
export const FEATURES=[
 {id:'DRONE_COCKPIT',label:'DRONE COCKPIT',viewPrivilege:'VIEW_TAB_DRONE_COCKPIT',icon:'Plane',permissionGroup:'DRONE COCKPIT'},
 {id:'OPERATIONAL_INCIDENTS',label:'OPERATIONAL INCIDENTS',viewPrivilege:'VIEW_TAB_OPERATIONAL_INCIDENTS',icon:'ShieldAlert',permissionGroup:'OPERATIONAL INCIDENTS'},
 {id:'MISSION_OPERATIONS',label:'MISSION OPERATIONS',viewPrivilege:'VIEW_TAB_MISSION_OPERATIONS',icon:'Plane',permissionGroup:'MISSION OPERATIONS'},
 {id:'EVIDENCE_BOOKMARKS',label:'EVIDENCE BOOKMARKS',viewPrivilege:'VIEW_TAB_EVIDENCE_BOOKMARKS',icon:'ClipboardList',permissionGroup:'EVIDENCE BOOKMARKS'},
  {
    "id": "DASHBOARD",
    "label": "DASHBOARD",
    "viewPrivilege": "VIEW_TAB_DASHBOARD",
    "icon": "LayoutDashboard",
    "permissionGroup": "DASHBOARD"
  },
  {
    "id": "FLIGHT_DATA",
    "label": "ANALYTICS",
    "viewPrivilege": "VIEW_TAB_FLIGHT_DATA",
    "icon": "BarChart3",
    "permissionGroup": "ANALYTICS FUNCTIONS"
  },
  {
    "id": "TASK_MANAGEMENT",
    "label": "TASK MANAGEMENT",
    "viewPrivilege": "VIEW_TAB_TASK_MANAGEMENT",
    "icon": "ClipboardList",
    "permissionGroup": "TASK MANAGEMENT"
  },
  {
    "id": "INVENTORY",
    "label": "INVENTORY",
    "viewPrivilege": "VIEW_TAB_INVENTORY",
    "icon": "Layers",
    "permissionGroup": "INVENTORY"
  },
  {
    "id": "VIDEO_PLAYBACK",
    "label": "FLIGHT & VIDEO LOGS",
    "viewPrivilege": "VIEW_TAB_FLIGHT_DATA",
    "icon": "Video",
    "permissionGroup": "FLIGHT & VIDEO LOGS"
  },
  {
    "id": "FLIGHT_REQUEST",
    "label": "FLIGHT REQUEST",
    "viewPrivilege": "VIEW_TAB_FLIGHT_REQUEST",
    "icon": "Plane",
    "permissionGroup": "FLIGHT REQUEST"
  },
  {
    "id": "DRONE_REQUEST",
    "label": "DRONE REQUEST",
    "viewPrivilege": "VIEW_TAB_DRONE_REQUEST",
    "icon": "Plane",
    "permissionGroup": "DRONE REQUEST"
  },
  {
    "id": "USERS",
    "label": "USER MANAGEMENT",
    "viewPrivilege": "VIEW_TAB_USERS",
    "icon": "Users",
    "permissionGroup": "USERS"
  },
  {
    "id": "IN_OUT_FORM",
    "label": "ASSET TRACKING FORM",
    "viewPrivilege": "VIEW_TAB_IN_OUT_FORM",
    "icon": "ArrowLeftRight",
    "permissionGroup": "IN/OUT FUNCTIONS"
  },
  {
    "id": "INCIDENT_REPORT",
    "label": "INCIDENT REPORT",
    "viewPrivilege": "VIEW_TAB_INCIDENT_REPORT",
    "icon": "AlertTriangle",
    "permissionGroup": "INCIDENT REPORT"
  },
  {
    "id": "CONFISCATED_DRONE",
    "label": "CONFISCATED DRONE",
    "viewPrivilege": "VIEW_TAB_CONFISCATED_DRONE",
    "icon": "ShieldAlert",
    "permissionGroup": "CONFISCATED DRONE"
  },
  {
    "id": "NOTIFICATIONS",
    "label": "NOTIFICATIONS",
    "viewPrivilege": "VIEW_TAB_NOTIFICATIONS",
    "icon": "Bell",
    "permissionGroup": "NOTIFICATIONS"
  },
  {
    "id": "SETTINGS",
    "label": "SETTINGS",
    "viewPrivilege": "VIEW_TAB_SETTINGS",
    "icon": "Settings",
    "permissionGroup": "SETTINGS"
  }
] as const;
export const WINDOW_NAVIGATION_FUNCTIONS=FEATURES.map(feature=>({key:feature.id+':open-screen',featureId:feature.id,viewPermission:feature.viewPrivilege}));
export const PERMISSION_DEFINITIONS=[
 ...(['VIEW_TAB_DRONE_COCKPIT','COCKPIT_PREVIEW'] as const).map(id=>({id,label:id==='COCKPIT_PREVIEW'?'Use Cockpit Demonstration':'View Drone Cockpit',category:'OPERATIONS_MENU' as const,categoryLabel:'DRONE COCKPIT',menuTab:'DRONE_COCKPIT' as const,description:'Read-only cockpit. Demonstration controls never send aircraft commands.',featureId:'DRONE_COCKPIT' as const,displayGroup:'DRONE_COCKPIT' as const,defaults:{ADMIN:true,OFFICER:false,USER:false}})),
 ...[{"id":"OP_INCIDENT_CREATE","label":"Create Operational Incident","category":"OPERATIONS_MENU","categoryLabel":"OPERATIONAL INCIDENTS","menuTab":"OPERATIONAL_INCIDENTS","description":"Manage the operational incident workflow. Existing source permissions are also required for related records.","featureId":"OPERATIONAL_INCIDENTS","displayGroup":"OPERATIONAL_INCIDENTS","defaults":{"ADMIN":true,"OFFICER":false,"USER":false}},{"id":"OP_INCIDENT_VERIFY","label":"Verify Operational Incident","category":"OPERATIONS_MENU","categoryLabel":"OPERATIONAL INCIDENTS","menuTab":"OPERATIONAL_INCIDENTS","description":"Manage the operational incident workflow. Existing source permissions are also required for related records.","featureId":"OPERATIONAL_INCIDENTS","displayGroup":"OPERATIONAL_INCIDENTS","defaults":{"ADMIN":true,"OFFICER":false,"USER":false}},{"id":"OP_INCIDENT_DISPATCH","label":"Request Dispatch / Start Response","category":"OPERATIONS_MENU","categoryLabel":"OPERATIONAL INCIDENTS","menuTab":"OPERATIONAL_INCIDENTS","description":"Manage the operational incident workflow. Existing source permissions are also required for related records.","featureId":"OPERATIONAL_INCIDENTS","displayGroup":"OPERATIONAL_INCIDENTS","defaults":{"ADMIN":true,"OFFICER":false,"USER":false}},{"id":"OP_INCIDENT_APPROVE","label":"Approve Dispatch and Closure","category":"OPERATIONS_MENU","categoryLabel":"OPERATIONAL INCIDENTS","menuTab":"OPERATIONAL_INCIDENTS","description":"Manage the operational incident workflow. Existing source permissions are also required for related records.","featureId":"OPERATIONAL_INCIDENTS","displayGroup":"OPERATIONAL_INCIDENTS","defaults":{"ADMIN":true,"OFFICER":false,"USER":false}},{"id":"OP_INCIDENT_LINK","label":"Link Operational Records","category":"OPERATIONS_MENU","categoryLabel":"OPERATIONAL INCIDENTS","menuTab":"OPERATIONAL_INCIDENTS","description":"Manage the operational incident workflow. Existing source permissions are also required for related records.","featureId":"OPERATIONAL_INCIDENTS","displayGroup":"OPERATIONAL_INCIDENTS","defaults":{"ADMIN":true,"OFFICER":false,"USER":false}},{"id":"OP_INCIDENT_EVIDENCE","label":"Preserve Incident Evidence","category":"OPERATIONS_MENU","categoryLabel":"OPERATIONAL INCIDENTS","menuTab":"OPERATIONAL_INCIDENTS","description":"Manage the operational incident workflow. Existing source permissions are also required for related records.","featureId":"OPERATIONAL_INCIDENTS","displayGroup":"OPERATIONAL_INCIDENTS","defaults":{"ADMIN":true,"OFFICER":false,"USER":false}},{"id":"OP_INCIDENT_CLOSE","label":"Submit Incident Closure","category":"OPERATIONS_MENU","categoryLabel":"OPERATIONAL INCIDENTS","menuTab":"OPERATIONAL_INCIDENTS","description":"Manage the operational incident workflow. Existing source permissions are also required for related records.","featureId":"OPERATIONAL_INCIDENTS","displayGroup":"OPERATIONAL_INCIDENTS","defaults":{"ADMIN":true,"OFFICER":false,"USER":false}},{"id":"OP_INCIDENT_SIMULATE","label":"Use Isolated Incident Simulator","category":"OPERATIONS_MENU","categoryLabel":"OPERATIONAL INCIDENTS","menuTab":"OPERATIONAL_INCIDENTS","description":"Manage the operational incident workflow. Existing source permissions are also required for related records.","featureId":"OPERATIONAL_INCIDENTS","displayGroup":"OPERATIONAL_INCIDENTS","defaults":{"ADMIN":true,"OFFICER":false,"USER":false}}] as const,
 ...(['MISSION_CREATE','MISSION_MANAGE','MISSION_APPROVE','MISSION_SIMULATE'] as const).map(id=>({id,label:({MISSION_CREATE:'Create Mission Plans',MISSION_MANAGE:'Manage Assigned Missions',MISSION_APPROVE:'Approve Mission Plans and Closure',MISSION_SIMULATE:'Use Isolated Mission Simulator'})[id],category:'OPERATIONS_MENU' as const,categoryLabel:'MISSION OPERATIONS',menuTab:'MISSION_OPERATIONS' as const,description:'Mission records require membership; simulator controls affect temporary test data only.',featureId:'MISSION_OPERATIONS' as const,displayGroup:'MISSION_OPERATIONS' as const,defaults:{ADMIN:true,OFFICER:false,USER:false}})),
 ...(['EVIDENCE_CREATE','EVIDENCE_EDIT','EVIDENCE_LINK','EVIDENCE_ARCHIVE'] as const).map(id=>({id,label:({EVIDENCE_CREATE:'Create Evidence Bookmark',EVIDENCE_EDIT:'Edit Evidence Bookmark',EVIDENCE_LINK:'Confirm Evidence Links',EVIDENCE_ARCHIVE:'Archive Evidence Bookmark'})[id],category:'OPERATIONS_MENU' as const,categoryLabel:'EVIDENCE BOOKMARKS',menuTab:'EVIDENCE_BOOKMARKS' as const,description:'Manage forensic field bookmarks and their audited flight / recording links.',featureId:'EVIDENCE_BOOKMARKS' as const,displayGroup:'EVIDENCE_BOOKMARKS' as const,defaults:{ADMIN:true,OFFICER:false,USER:false}})),
 ...(['TASK_TEMPLATE_MANAGE','TASK_TEMPLATE_USE','TASK_AUTOMATION_MANAGE','TASK_REMINDER_MANAGE'] as const).map(id=>({id,label:({TASK_TEMPLATE_MANAGE:'Manage Task Templates',TASK_TEMPLATE_USE:'Create Tasks From Templates',TASK_AUTOMATION_MANAGE:'Manage Recurring Tasks',TASK_REMINDER_MANAGE:'Manage Deadline Alerts'})[id],category:'OPERATIONS_MENU' as const,categoryLabel:'TASK MANAGEMENT',menuTab:'TASK_MANAGEMENT' as const,description:id==='TASK_TEMPLATE_USE'?'Generate canonical tasks in projects you own; requires Manage Task Workspace.':'Create, edit and archive your own task templates or automation rules; Admin may manage all.',featureId:'TASK_MANAGEMENT' as const,displayGroup:'TASK_MANAGEMENT' as const,defaults:{ADMIN:true,OFFICER:false,USER:false}})),
 {id:'TASK_WORKSPACE_MANAGE',label:'Manage Task Workspace',category:'OPERATIONS_MENU',categoryLabel:'TASK MANAGEMENT',menuTab:'TASK_MANAGEMENT',description:'Create and edit workspace tasks, projects, events, notes and attachments. Membership and group privileges remain controlled by User Management.',featureId:'TASK_MANAGEMENT',displayGroup:'TASK_MANAGEMENT',defaults:{ADMIN:true,OFFICER:false,USER:false}},
  {
  "id": "MAP_VIEW",
  "label": "Map View",
  "category": "OPERATIONS_MENU",
  "categoryLabel": "FLIGHT_DATA",
  "menuTab": "FLIGHT_DATA",
  "description": "View map backgrounds in Analytics, flight replay, confiscated flight logs and video replay",
  "featureId": "FLIGHT_DATA",
  "displayGroup": "FLIGHT_DATA",
  "defaults": {
    "ADMIN": true,
    "OFFICER": false,
    "USER": false
  }
},
  {
  "id": "MAP_CONFIGURE",
  "label": "Configure Map Sources",
  "category": "OPERATIONS_MENU",
  "categoryLabel": "SETTINGS",
  "menuTab": "SETTINGS",
  "description": "Configure Map Sources",
  "featureId": "SETTINGS",
  "displayGroup": "SETTINGS",
  "defaults": {
    "ADMIN": true,
    "OFFICER": false,
    "USER": false
  }
},
  {
  "id": "MAP_UPLOAD",
  "label": "Upload Offline Maps",
  "category": "OPERATIONS_MENU",
  "categoryLabel": "SETTINGS",
  "menuTab": "SETTINGS",
  "description": "Upload Offline Maps",
  "featureId": "SETTINGS",
  "displayGroup": "SETTINGS",
  "defaults": {
    "ADMIN": true,
    "OFFICER": false,
    "USER": false
  }
},
  {
  "id": "MAP_ACTIVATE",
  "label": "Activate Map Sources",
  "category": "OPERATIONS_MENU",
  "categoryLabel": "SETTINGS",
  "menuTab": "SETTINGS",
  "description": "Activate Map Sources",
  "featureId": "SETTINGS",
  "displayGroup": "SETTINGS",
  "defaults": {
    "ADMIN": true,
    "OFFICER": false,
    "USER": false
  }
},
  {
  "id": "MAP_REMOVE",
  "label": "Remove Map Sources",
  "category": "OPERATIONS_MENU",
  "categoryLabel": "SETTINGS",
  "menuTab": "SETTINGS",
  "description": "Remove Map Sources",
  "featureId": "SETTINGS",
  "displayGroup": "SETTINGS",
  "defaults": {
    "ADMIN": true,
    "OFFICER": false,
    "USER": false
  }
},
  {
    "id": "EVENT_CREATE",
    "label": "Create Events",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "TASK MANAGEMENT",
    "menuTab": "TASK_MANAGEMENT",
    "description": "Create Events",
    "featureId": "TASK_MANAGEMENT",
    "displayGroup": "TASK_MANAGEMENT",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "EVENT_EDIT",
    "label": "Edit Own Events",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "TASK MANAGEMENT",
    "menuTab": "TASK_MANAGEMENT",
    "description": "Edit Own Events",
    "featureId": "TASK_MANAGEMENT",
    "displayGroup": "TASK_MANAGEMENT",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "EVENT_CANCEL",
    "label": "Cancel Own Events",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "TASK MANAGEMENT",
    "menuTab": "TASK_MANAGEMENT",
    "description": "Cancel Own Events",
    "featureId": "TASK_MANAGEMENT",
    "displayGroup": "TASK_MANAGEMENT",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "TASK_MANAGEMENT_CLAIM",
    "label": "Claim Preparation Tasks",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "TASK MANAGEMENT",
    "menuTab": "TASK_MANAGEMENT",
    "description": "Claim preparation tasks assigned to your group",
    "featureId": "TASK_MANAGEMENT",
    "displayGroup": "TASK_MANAGEMENT",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "TASK_MANAGEMENT_MANAGE",
    "label": "Manage Preparation Tasks",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "TASK MANAGEMENT",
    "menuTab": "TASK_MANAGEMENT",
    "description": "Reassign preparation tasks and set priority and due date",
    "featureId": "TASK_MANAGEMENT",
    "displayGroup": "TASK_MANAGEMENT",
    "defaults": {
      "ADMIN": true,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "FLIGHT_DATA_VIEW_TELEMETRY",
    "label": "View Telemetry & Playback",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "ANALYTICS FUNCTIONS",
    "menuTab": "FLIGHT_DATA",
    "description": "View flight charts, maps, calendars and replay",
    "featureId": "FLIGHT_DATA",
    "displayGroup": "FLIGHT_DATA",
    "defaults": {
      "ADMIN": true,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "FLIGHT_DATA_VIEW_CONFISCATED",
    "label": "View Confiscated Flight Logs",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "ANALYTICS FUNCTIONS",
    "menuTab": "FLIGHT_DATA",
    "description": "View external evidence logs and their separate summary",
    "featureId": "FLIGHT_DATA",
    "displayGroup": "FLIGHT_DATA",
    "defaults": {
      "ADMIN": true,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "FLIGHT_DATA_UPLOAD_ASSET",
    "label": "Upload Asset Flight Logs",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "ANALYTICS FUNCTIONS",
    "menuTab": "FLIGHT_DATA",
    "description": "Import flight logs for inventory aircraft",
    "featureId": "FLIGHT_DATA",
    "displayGroup": "FLIGHT_DATA",
    "defaults": {
      "ADMIN": true,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "FLIGHT_DATA_UPLOAD_CONFISCATED",
    "label": "Upload Confiscated Flight Logs",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "ANALYTICS FUNCTIONS",
    "menuTab": "FLIGHT_DATA",
    "description": "Import external flight logs as confiscation evidence",
    "featureId": "FLIGHT_DATA",
    "displayGroup": "FLIGHT_DATA",
    "defaults": {
      "ADMIN": true,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "FLIGHT_DATA_SCAN",
    "label": "Scan Flight Log Folder",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "ANALYTICS FUNCTIONS",
    "menuTab": "FLIGHT_DATA",
    "description": "Run Scan Now",
    "featureId": "FLIGHT_DATA",
    "displayGroup": "FLIGHT_DATA",
    "defaults": {
      "ADMIN": true,
      "OFFICER": false,
      "USER": false
    }
  },
  {"id":"FLIGHT_DATA_IMPORT_DJI","label":"Import DJI TXT and Offline Packages","description":"Decode DJI TXT and import verified offline packages","category":"OPERATIONS_MENU","categoryLabel":"ANALYTICS FUNCTIONS","menuTab":"FLIGHT_DATA","featureId":"FLIGHT_DATA","displayGroup":"FLIGHT_DATA","defaults":{"ADMIN":true,"OFFICER":false,"USER":false}},
  {"id":"FLIGHT_DATA_CONFIGURE_DJI","label":"Configure DJI Parser","description":"Manage the DJI API key, online access and trusted workstation","category":"OPERATIONS_MENU","categoryLabel":"ANALYTICS FUNCTIONS","menuTab":"FLIGHT_DATA","featureId":"FLIGHT_DATA","displayGroup":"FLIGHT_DATA","defaults":{"ADMIN":true,"OFFICER":false,"USER":false}},
  {"id":"FLIGHT_DATA_DJI_KEY_REQUEST","label":"Retrieve DJI Decryption Keys","description":"Allow this user to request flight-specific keys from DJI","category":"OPERATIONS_MENU","categoryLabel":"ANALYTICS FUNCTIONS","menuTab":"FLIGHT_DATA","featureId":"FLIGHT_DATA","displayGroup":"FLIGHT_DATA","defaults":{"ADMIN":true,"OFFICER":false,"USER":false}},
  {
    "id": "FLIGHT_DATA_CONFIGURE",
    "label": "Configure Flight Log Source",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "ANALYTICS FUNCTIONS",
    "menuTab": "FLIGHT_DATA",
    "description": "Change source folder and automatic scan settings",
    "featureId": "FLIGHT_DATA",
    "displayGroup": "FLIGHT_DATA",
    "defaults": {
      "ADMIN": true,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "FLIGHT_DATA_MANAGE_TEST",
    "label": "Manage Test Flight Logs",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "ANALYTICS FUNCTIONS",
    "menuTab": "FLIGHT_DATA",
    "description": "Load or remove test flight datasets",
    "featureId": "FLIGHT_DATA",
    "displayGroup": "FLIGHT_DATA",
    "defaults": {
      "ADMIN": true,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "INVENTORY_CREATE_DEPARTMENT",
    "label": "Create Inventory Departments",
    "category": "INVENTORY",
    "categoryLabel": "INVENTORY",
    "description": "Create new departments for inventory asset assignment",
    "featureId": "INVENTORY",
    "displayGroup": "INVENTORY",
    "defaults": {
      "ADMIN": true,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "IN_OUT_CREATE_FORM",
    "label": "Create IN/OUT Form",
    "category": "IN_OUT_FORM",
    "categoryLabel": "ASSET TRACKING FORM",
    "description": "Create new handovers, including preparation from Drone Requests",
    "featureId": "IN_OUT_FORM",
    "displayGroup": "IN_OUT_FORM",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "IN_OUT_EDIT_FORM",
    "label": "Edit IN/OUT Form / Actions",
    "category": "IN_OUT_FORM",
    "categoryLabel": "ASSET TRACKING FORM",
    "description": "Edit existing drafts and perform issue, receive and return actions",
    "featureId": "IN_OUT_FORM",
    "displayGroup": "IN_OUT_FORM",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "FLIGHT_REQUEST_SEND",
    "label": "Send Flight Requests",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "description": "Send issued IN/OUT mission details to designated groups",
    "menuTab": "FLIGHT_REQUEST",
    "featureId": "FLIGHT_REQUEST",
    "displayGroup": "FLIGHT_REQUEST",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "RECEIVE_FLIGHT_REQUESTS",
    "label": "Receive Flight Requests",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "description": "Receive mission notifications from issued IN/OUT forms (enable for ANTI-DRONE)",
    "menuTab": "FLIGHT_REQUEST",
    "featureId": "FLIGHT_REQUEST",
    "displayGroup": "FLIGHT_REQUEST",
    "defaults": {
      "ADMIN": false,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "VIEW_TAB_DRONE_REQUEST",
    "label": "DRONE REQUEST \u2014 View",
    "category": "DRONE_REQUEST",
    "categoryLabel": "DRONE REQUEST",
    "description": "View the Drone Request tab and saved requests",
    "featureId": "DRONE_REQUEST",
    "displayGroup": "DRONE_REQUEST",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "DRONE_REQUEST_ADD",
    "label": "DRONE REQUEST \u2014 Add Entry",
    "category": "DRONE_REQUEST",
    "categoryLabel": "DRONE REQUEST",
    "description": "Create and submit Drone Requests",
    "featureId": "DRONE_REQUEST",
    "displayGroup": "DRONE_REQUEST",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "DRONE_REQUEST_EDIT",
    "label": "DRONE REQUEST \u2014 Edit Entry",
    "category": "DRONE_REQUEST",
    "categoryLabel": "DRONE REQUEST",
    "description": "Edit accessible Drone Request entries and quantities",
    "featureId": "DRONE_REQUEST",
    "displayGroup": "DRONE_REQUEST",
    "defaults": {
      "ADMIN": true,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "DRONE_REQUEST_DELETE",
    "label": "DRONE REQUEST \u2014 Delete Entry",
    "category": "DRONE_REQUEST",
    "categoryLabel": "DRONE REQUEST",
    "description": "Delete accessible Drone Requests",
    "featureId": "DRONE_REQUEST",
    "displayGroup": "DRONE_REQUEST",
    "defaults": {
      "ADMIN": true,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "RECEIVE_DRONE_REQUESTS",
    "label": "Receive New Drone Request Notifications",
    "category": "DRONE_REQUEST",
    "categoryLabel": "DRONE REQUEST",
    "description": "Receive submitted inventory requests for preparation by this group",
    "featureId": "DRONE_REQUEST",
    "displayGroup": "DRONE_REQUEST",
    "defaults": {
      "ADMIN": false,
      "OFFICER": false,
      "USER": false
    }
  },
  {
    "id": "VIEW_TAB_FLIGHT_DATA",
    "label": "View ANALYTICS Tab",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "description": "View imported flight summaries and read-only aircraft inventory details",
    "featureId": "FLIGHT_DATA",
    "displayGroup": "FLIGHT_DATA",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "APPROVE_REQUESTS",
    "label": "Approve Requests",
    "category": "NOTIFICATION_FUNCTIONS",
    "categoryLabel": "NOTIFICATION FUNCTIONS",
    "description": "Review assigned requests and authorize changes and handovers",
    "featureId": "NOTIFICATIONS",
    "displayGroup": "NOTIFICATIONS",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "VIEW_TAB_DASHBOARD",
    "label": "View DASHBOARD Tab",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "description": "Grant view access to the Fleet Operations Dashboard tab in the operations menu",
    "featureId": "DASHBOARD",
    "displayGroup": "DASHBOARD",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "VIEW_TAB_INVENTORY",
    "label": "View INVENTORY Tab",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "description": "Grant view access to the Fleet Asset Inventory tab in the operations menu",
    "featureId": "INVENTORY",
    "displayGroup": "INVENTORY",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "VIEW_TAB_IN_OUT_FORM",
    "label": "View ASSET TRACKING FORM Tab",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "description": "Grant view access to the UAV Handover Sorties & Custody Form tab in the operations menu",
    "featureId": "IN_OUT_FORM",
    "displayGroup": "IN_OUT_FORM",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "VIEW_TAB_INCIDENT_REPORT",
    "label": "View INCIDENT REPORT Tab",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "description": "Grant view access to the Incident & Accident Reports tab in the operations menu",
    "featureId": "INCIDENT_REPORT",
    "displayGroup": "INCIDENT_REPORT",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "VIEW_TAB_CONFISCATED_DRONE",
    "label": "View CONFISCATED DRONE Tab",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "description": "Grant view access to the Confiscated Drone Report (UAV Team) tab in the operations menu",
    "featureId": "CONFISCATED_DRONE",
    "displayGroup": "CONFISCATED_DRONE",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "VIEW_TAB_USERS",
    "label": "View USER MANAGEMENT Tab",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "description": "Grant view access to the Officers Directory & Personnel Management tab in the operations menu",
    "featureId": "USERS",
    "displayGroup": "USERS",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "VIEW_TAB_NOTIFICATIONS",
    "label": "View NOTIFICATIONS Tab",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "description": "Grant view access to the Notifications, Approvals & Messages tab in the operations menu",
    "featureId": "NOTIFICATIONS",
    "displayGroup": "NOTIFICATIONS",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "INVENTORY_BATCH_UPLOAD",
    "label": "Batch Upload",
    "category": "INVENTORY",
    "categoryLabel": "INVENTORY",
    "description": "Bulk upload multiple drones from CSV or Excel file",
    "featureId": "INVENTORY",
    "displayGroup": "INVENTORY",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "INVENTORY_ADD_DRONE",
    "label": "Add Drone",
    "category": "INVENTORY",
    "categoryLabel": "INVENTORY",
    "description": "Register a single new drone unit into fleet inventory",
    "featureId": "INVENTORY",
    "displayGroup": "INVENTORY",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "INVENTORY_EDIT_DETAILS",
    "label": "Edit details",
    "category": "INVENTORY",
    "categoryLabel": "INVENTORY",
    "description": "Modify drone specifications, callsigns & operational details",
    "featureId": "INVENTORY",
    "displayGroup": "INVENTORY",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "INVENTORY_DELETE_DRONE",
    "label": "Delete Drone",
    "category": "INVENTORY",
    "categoryLabel": "INVENTORY",
    "description": "Decommission and remove drone platform from fleet registry",
    "featureId": "INVENTORY",
    "displayGroup": "INVENTORY",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "INVENTORY_DELETE_STREAMING_DEVICE",
    "label": "Delete streaming device",
    "category": "INVENTORY",
    "categoryLabel": "INVENTORY",
    "description": "Delete streaming devices from inventory",
    "featureId": "INVENTORY",
    "displayGroup": "INVENTORY",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "INVENTORY_DELETE_ACCESSORY",
    "label": "Delete accessory",
    "category": "INVENTORY",
    "categoryLabel": "INVENTORY",
    "description": "Delete accessories from inventory",
    "featureId": "INVENTORY",
    "displayGroup": "INVENTORY",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "INVENTORY_DELETE_BATTERY",
    "label": "Delete battery",
    "category": "INVENTORY",
    "categoryLabel": "INVENTORY",
    "description": "Delete batteries from inventory",
    "featureId": "INVENTORY",
    "displayGroup": "INVENTORY",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "IN_OUT_DELETE_RECORD",
    "label": "Delete Record",
    "category": "IN_OUT_FORM",
    "categoryLabel": "ASSET TRACKING FORM",
    "description": "Permanently delete Handover Custody Form documents and records",
    "featureId": "IN_OUT_FORM",
    "displayGroup": "IN_OUT_FORM",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "INCIDENT_CREATE_REPORT",
    "label": "Create Incident Report",
    "category": "INCIDENT_REPORT",
    "categoryLabel": "INCIDENT REPORT",
    "description": "File, attach photos, and submit new accident & incident investigation records",
    "featureId": "INCIDENT_REPORT",
    "displayGroup": "INCIDENT_REPORT",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "INCIDENT_DELETE_REPORT",
    "label": "Delete Incident Report",
    "category": "INCIDENT_REPORT",
    "categoryLabel": "INCIDENT REPORT",
    "description": "Permanently remove incident and accident report documents",
    "featureId": "INCIDENT_REPORT",
    "displayGroup": "INCIDENT_REPORT",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "CONFISCATED_CREATE_REPORT",
    "label": "Create Confiscated Drone Report",
    "category": "CONFISCATED_DRONE",
    "categoryLabel": "CONFISCATED DRONE",
    "description": "File new Confiscated Drone Reports with flight route logs & telemetry captures",
    "featureId": "CONFISCATED_DRONE",
    "displayGroup": "CONFISCATED_DRONE",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "CONFISCATED_EDIT_REPORT",
    "label": "Edit Confiscated Drone Report",
    "category": "CONFISCATED_DRONE",
    "categoryLabel": "CONFISCATED DRONE",
    "description": "Modify confiscated drone records, sequential flight entries, and evaluation notes",
    "featureId": "CONFISCATED_DRONE",
    "displayGroup": "CONFISCATED_DRONE",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "CONFISCATED_DELETE_REPORT",
    "label": "Delete Confiscated Drone Report",
    "category": "CONFISCATED_DRONE",
    "categoryLabel": "CONFISCATED DRONE",
    "description": "Permanently remove confiscated drone case files and reports",
    "featureId": "CONFISCATED_DRONE",
    "displayGroup": "CONFISCATED_DRONE",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "NOTIFICATIONS_DISMISS_MESSAGE",
    "label": "Dismiss message",
    "category": "NOTIFICATION_FUNCTIONS",
    "categoryLabel": "NOTIFICATION FUNCTIONS",
    "description": "Dismiss, clear or remove notifications, messages, and alert records from the queue",
    "featureId": "NOTIFICATIONS",
    "displayGroup": "NOTIFICATIONS",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": false
    }
  },
  {
    "id": "VIEW_TAB_FLIGHT_REQUEST",
    "label": "View FLIGHT REQUEST Tab",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "menuTab": "FLIGHT_REQUEST",
    "description": "View the FLIGHT REQUEST section in the Operations Menu",
    "featureId": "FLIGHT_REQUEST",
    "displayGroup": "FLIGHT_REQUEST",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  },
  {
    "id": "VIEW_TAB_SETTINGS",
    "label": "View SETTINGS Tab",
    "category": "OPERATIONS_MENU",
    "categoryLabel": "OPERATIONS MENU",
    "menuTab": "SETTINGS",
    "description": "View personal preferences and permitted system settings",
    "featureId": "SETTINGS",
    "displayGroup": "SETTINGS",
    "defaults": {
      "ADMIN": true,
      "OFFICER": true,
      "USER": true
    }
  }
,
{
  "id": "INTEGRATIONS_VIEW",
  "label": "View integrations",
  "category": "OPERATIONS_MENU",
  "categoryLabel": "SETTINGS",
  "menuTab": "SETTINGS",
  "description": "View shared connector configuration and status",
  "featureId": "SETTINGS",
  "displayGroup": "SETTINGS",
  "defaults": {
    "ADMIN": true,
    "OFFICER": false,
    "USER": false
  }
},
{
  "id": "INTEGRATIONS_CONFIGURE",
  "label": "Enable / disable integrations",
  "category": "OPERATIONS_MENU",
  "categoryLabel": "SETTINGS",
  "menuTab": "SETTINGS",
  "description": "Enable or disable registered system connectors",
  "featureId": "SETTINGS",
  "displayGroup": "SETTINGS",
  "defaults": {
    "ADMIN": true,
    "OFFICER": false,
    "USER": false
  }
}
] as const;
export type FeatureId=typeof FEATURES[number]['id'];
export type PermissionId=typeof PERMISSION_DEFINITIONS[number]['id'] | typeof FEATURES[number]['viewPrivilege'];
const generatedViews=FEATURES.filter(feature=>!PERMISSION_DEFINITIONS.some(permission=>String(permission.id)===feature.viewPrivilege)).map(feature=>({id:feature.viewPrivilege,label:'View '+feature.label+' Tab',category:'OPERATIONS_MENU' as const,categoryLabel:'OPERATIONS MENU',menuTab:feature.id,description:'View the '+feature.label+' section',featureId:feature.id,displayGroup:feature.id,defaults:{ADMIN:true,OFFICER:false,USER:false}}));
export const PERMISSIONS=[...PERMISSION_DEFINITIONS,...generatedViews];
export const SERVER_ROUTED_PERMISSIONS=new Set<string>(['RECEIVE_FLIGHT_REQUESTS','RECEIVE_DRONE_REQUESTS']);
export const PERMISSION_IDS=new Set<string>(PERMISSIONS.map(permission=>permission.id));
export const isRegisteredPermission=(id:string)=>PERMISSION_IDS.has(id);
export const DEFAULT_PERMISSION_GRANTS=Object.fromEntries(['ADMIN','OFFICER','USER'].map(role=>[role,Object.fromEntries(PERMISSIONS.map(permission=>[permission.id,permission.defaults[role as keyof typeof permission.defaults]]))]));
export const ENTITY_ACTION_PERMISSIONS={drones:{view:'VIEW_TAB_INVENTORY',create:'INVENTORY_ADD_DRONE',edit:'INVENTORY_EDIT_DETAILS',delete:'INVENTORY_DELETE_DRONE'},batteries:{view:'VIEW_TAB_INVENTORY',create:'INVENTORY_ADD_DRONE',edit:'INVENTORY_EDIT_DETAILS',delete:'INVENTORY_DELETE_BATTERY'},accessories:{view:'VIEW_TAB_INVENTORY',create:'INVENTORY_ADD_DRONE',edit:'INVENTORY_EDIT_DETAILS',delete:'INVENTORY_DELETE_ACCESSORY'},streamingDevices:{view:'VIEW_TAB_INVENTORY',create:'INVENTORY_ADD_DRONE',edit:'INVENTORY_EDIT_DETAILS',delete:'INVENTORY_DELETE_STREAMING_DEVICE'},handoverForms:{view:'VIEW_TAB_IN_OUT_FORM',create:'IN_OUT_CREATE_FORM',edit:'IN_OUT_EDIT_FORM',delete:'IN_OUT_DELETE_RECORD'},incidentReports:{view:'VIEW_TAB_INCIDENT_REPORT',create:'INCIDENT_CREATE_REPORT',edit:'INCIDENT_CREATE_REPORT',delete:'INCIDENT_DELETE_REPORT'},confiscatedDrones:{view:'VIEW_TAB_CONFISCATED_DRONE',create:'CONFISCATED_CREATE_REPORT',edit:'CONFISCATED_EDIT_REPORT',delete:'CONFISCATED_DELETE_REPORT'}} as const satisfies Record<string,Record<'view'|'create'|'edit'|'delete',PermissionId>>;


