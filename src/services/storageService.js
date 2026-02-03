import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// FIREBASE INTEGRATION TODO - MIGRATION GUIDE
// ==========================================
//
// IMPORTANT: This file currently uses AsyncStorage for local data persistence.
// When migrating to Firebase Cloud Firestore, follow this guide:
//
// 1. SETUP FIREBASE:
//    - Install packages: @react-native-firebase/app, @react-native-firebase/firestore, @react-native-firebase/auth
//    - Configure Firebase project in Firebase Console
//    - Add google-services.json (Android) and GoogleService-Info.plist (iOS)
//    - Initialize Firebase in index.js or App.jsx
//
// 2. FIRESTORE COLLECTIONS STRUCTURE:
//    - organizations/{orgId}           → Organization data
//    - users/{userId}                  → All user data (Power1, Power2, Power3)
//    - projects/{projectId}            → Project data
//    - attendance/{attendanceId}       → Attendance records
//    - workLogs/{workLogId}            → Work log entries
//    - groups/{groupId}                → Worker groups
//    - designations/{designationId}    → Designation/role definitions
//    - clients/{clientId}              → Client information
//
// 3. FIRESTORE QUERIES TO IMPLEMENT:
//    - getOrganizations: firestore().collection('organizations').orderBy('createdAt', 'desc').get()
//    - getUsersByOrg: firestore().collection('users').where('orgId', '==', orgId).get()
//    - getProjectsByOrg: firestore().collection('projects').where('orgId', '==', orgId).get()
//    - Power1 (Super Admin): .where('role', '==', 'super_admin')
//    - Power2 (Admin): .where('role', '==', 'admin')
//    - Power3 (Workers): .where('role', 'in', ['worker', 'employee'])
//
// 4. REAL-TIME LISTENERS:
//    - Replace get() with onSnapshot() for live updates
//    - Example: firestore().collection('organizations').onSnapshot(snapshot => {...})
//    - Remember to unsubscribe in cleanup functions
//
// 5. AUTHENTICATION:
//    - Replace authenticateUser() with Firebase Auth
//    - Use firestore().collection('users').doc(uid) for user profiles
//    - Implement session management with Firebase Auth state listeners
//
// 6. SECURITY RULES (Firestore):
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        // Only developers can read all organizations
//        match /organizations/{orgId} {
//          allow read: if request.auth != null &&
//                      (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'developer' ||
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.orgId == orgId);
//          allow write: if request.auth != null &&
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin', 'developer'];
//        }
//
//        match /users/{userId} {
//          allow read: if request.auth != null;
//          allow write: if request.auth.uid == userId ||
//                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super_admin', 'admin', 'developer'];
//        }
//
//        // Add similar rules for other collections...
//      }
//    }
//
// 7. DATA MIGRATION STEPS:
//    - Export existing AsyncStorage data
//    - Create Firebase batch writes to migrate data
//    - Verify data integrity after migration
//    - Keep AsyncStorage as fallback during transition
//
// 8. REPLACE generateId():
//    - Use Firestore auto-generated IDs: firestore().collection('users').doc().id
//    - Or use Firebase-provided timestamp: firestore.FieldValue.serverTimestamp()
//
// ==========================================

// Storage Keys
export const STORAGE_KEYS = {
  ORGS: '@workerso_orgs',
  USERS: '@workerso_users',
  GROUPS: '@workerso_groups',
  PROJECTS: '@workerso_projects',
  ATTENDANCE: '@workerso_attendance',
  WORKLOGS: '@workerso_worklogs',
  SESSION: '@workerso_session',
  DEVLOGS: '@workerso_devlogs',
  DESIGNATIONS: '@workerso_designations',
  CLIENTS: '@workerso_clients',
};

// Helper function to generate unique IDs
export const generateId = (prefix) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generic get function
const getItem = async (key) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error getting ${key}:`, error);
    return null;
  }
};

// Generic set function
const setItem = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    return false;
  }
};

// Organization Operations
export const createOrganization = async (orgData) => {
  const orgs = (await getItem(STORAGE_KEYS.ORGS)) || [];
  const orgId = generateId('org');
  const newOrg = {
    orgId,
    ...orgData,
    createdAt: new Date().toISOString(),
  };
  orgs.push(newOrg);
  await setItem(STORAGE_KEYS.ORGS, orgs);
  return newOrg;
};

export const getOrganizations = async () => {
  return (await getItem(STORAGE_KEYS.ORGS)) || [];
};

export const getOrganizationById = async (orgId) => {
  const orgs = await getOrganizations();
  return orgs.find(org => org.orgId === orgId);
};

// User Operations
export const createUser = async (userData) => {
  const users = (await getItem(STORAGE_KEYS.USERS)) || [];
  const userId = generateId('user');
  const newUser = {
    userId,
    ...userData,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  await setItem(STORAGE_KEYS.USERS, users);
  return newUser;
};

export const getUsers = async () => {
  return (await getItem(STORAGE_KEYS.USERS)) || [];
};

export const getUsersByOrg = async (orgId) => {
  const users = await getUsers();
  return users.filter(user => user.orgId === orgId);
};

export const getUsersByAdmin = async (adminId) => {
  const users = await getUsers();
  return users.filter(user => user.adminId === adminId);
};

export const getUserById = async (userId) => {
  const users = await getUsers();
  return users.find(user => user.userId === userId);
};

export const updateUser = async (userId, updates) => {
  const users = await getUsers();
  const index = users.findIndex(user => user.userId === userId);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
    await setItem(STORAGE_KEYS.USERS, users);
    return users[index];
  }
  return null;
};

export const authenticateUser = async (username, password) => {
  const users = await getUsers();
  return users.find(user => user.username === username && user.password === password);
};

// Initialize Developer User
export const initializeDeveloperUser = async () => {
  const users = await getUsers();
  const developerExists = users.find(user => user.username === 'Zaheem' && user.role === 'developer');

  if (!developerExists) {
    const developerUser = {
      userId: generateId('user'),
      username: 'Zaheem',
      password: '407033',
      name: 'Zaheem',
      role: 'developer',
      designation: 'App Developer',
      orgId: null,
      createdAt: new Date().toISOString(),
    };
    users.push(developerUser);
    await setItem(STORAGE_KEYS.USERS, users);
    console.log('Developer user initialized');
    return developerUser;
  }
  return developerExists;
};

// Session Operations
export const saveSession = async (sessionData) => {
  return await setItem(STORAGE_KEYS.SESSION, sessionData);
};

export const getSession = async () => {
  return await getItem(STORAGE_KEYS.SESSION);
};

export const clearSession = async () => {
  return await setItem(STORAGE_KEYS.SESSION, null);
};

// Worker Group Operations
export const createGroup = async (groupData) => {
  const groups = (await getItem(STORAGE_KEYS.GROUPS)) || [];
  const groupId = generateId('group');
  const newGroup = {
    groupId,
    ...groupData,
    workers: groupData.workers || [],
    createdAt: new Date().toISOString(),
  };
  groups.push(newGroup);
  await setItem(STORAGE_KEYS.GROUPS, groups);
  return newGroup;
};

export const getGroupsByOrg = async (orgId) => {
  const groups = (await getItem(STORAGE_KEYS.GROUPS)) || [];
  return groups.filter(group => group.orgId === orgId);
};

export const updateGroup = async (groupId, updates) => {
  const groups = (await getItem(STORAGE_KEYS.GROUPS)) || [];
  const index = groups.findIndex(group => group.groupId === groupId);
  if (index !== -1) {
    groups[index] = { ...groups[index], ...updates, updatedAt: new Date().toISOString() };
    await setItem(STORAGE_KEYS.GROUPS, groups);
    return groups[index];
  }
  return null;
};

// Project Operations
export const createProject = async (projectData) => {
  const projects = (await getItem(STORAGE_KEYS.PROJECTS)) || [];
  const projectId = generateId('project');
  const newProject = {
    projectId,
    ...projectData,
    workers: projectData.workers || [],
    siteLogs: projectData.siteLogs || [],
    createdAt: new Date().toISOString(),
  };
  projects.push(newProject);
  await setItem(STORAGE_KEYS.PROJECTS, projects);
  return newProject;
};

export const getProjects = async () => {
  return (await getItem(STORAGE_KEYS.PROJECTS)) || [];
};

export const getProjectsByOrg = async (orgId) => {
  const projects = (await getItem(STORAGE_KEYS.PROJECTS)) || [];
  return projects.filter(project => project.orgId === orgId);
};

export const getProjectById = async (projectId) => {
  const projects = (await getItem(STORAGE_KEYS.PROJECTS)) || [];
  return projects.find(project => project.projectId === projectId);
};

export const updateProject = async (projectId, updates) => {
  const projects = (await getItem(STORAGE_KEYS.PROJECTS)) || [];
  const index = projects.findIndex(project => project.projectId === projectId);
  if (index !== -1) {
    projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
    await setItem(STORAGE_KEYS.PROJECTS, projects);
    return projects[index];
  }
  return null;
};

// Attendance Operations
export const createAttendance = async (attendanceData) => {
  const attendance = (await getItem(STORAGE_KEYS.ATTENDANCE)) || [];
  const attendanceId = generateId('attendance');
  const newAttendance = {
    attendanceId,
    ...attendanceData,
    createdAt: new Date().toISOString(),
  };
  attendance.push(newAttendance);
  await setItem(STORAGE_KEYS.ATTENDANCE, attendance);
  return newAttendance;
};

export const getAttendanceByOrg = async (orgId) => {
  const attendance = (await getItem(STORAGE_KEYS.ATTENDANCE)) || [];
  return attendance.filter(att => att.orgId === orgId);
};

export const getAttendanceByUser = async (userId, date) => {
  const attendance = (await getItem(STORAGE_KEYS.ATTENDANCE)) || [];
  return attendance.filter(att => att.userId === userId && att.date === date);
};

// Work Log Operations
export const createWorkLog = async (workLogData) => {
  const worklogs = (await getItem(STORAGE_KEYS.WORKLOGS)) || [];
  const logId = generateId('worklog');
  const newWorkLog = {
    logId,
    ...workLogData,
    createdAt: new Date().toISOString(),
  };
  worklogs.push(newWorkLog);
  await setItem(STORAGE_KEYS.WORKLOGS, worklogs);
  return newWorkLog;
};

export const getWorkLogsByOrg = async (orgId) => {
  const worklogs = (await getItem(STORAGE_KEYS.WORKLOGS)) || [];
  return worklogs.filter(log => log.orgId === orgId);
};

export const getWorkLogsByUser = async (userId, date = null) => {
  const worklogs = (await getItem(STORAGE_KEYS.WORKLOGS)) || [];
  if (date) {
    return worklogs.filter(log => log.userId === userId && log.date === date);
  }
  return worklogs.filter(log => log.userId === userId);
};

// Dev Logs (for global oversight)
export const createDevLog = async (logData) => {
  const devLogs = (await getItem(STORAGE_KEYS.DEVLOGS)) || [];
  const logId = generateId('devlog');
  const newLog = {
    logId,
    ...logData,
    timestamp: new Date().toISOString(),
  };
  devLogs.push(newLog);
  await setItem(STORAGE_KEYS.DEVLOGS, devLogs);
  return newLog;
};

export const getDevLogs = async () => {
  return (await getItem(STORAGE_KEYS.DEVLOGS)) || [];
};

// ============================================
// DESIGNATION SERVICES
// ============================================

/**
 * Create designation
 */
export const createDesignation = async (designationData) => {
  const designations = (await getItem(STORAGE_KEYS.DESIGNATIONS)) || [];
  const designationId = generateId('designation');
  const newDesignation = {
    designationId,
    ...designationData,
    createdAt: new Date().toISOString(),
  };
  designations.push(newDesignation);
  await setItem(STORAGE_KEYS.DESIGNATIONS, designations);
  return newDesignation;
};

/**
 * Get designations by organization
 */
export const getDesignationsByOrg = async (orgId) => {
  const designations = (await getItem(STORAGE_KEYS.DESIGNATIONS)) || [];
  return designations.filter(designation => designation.orgId === orgId);
};

/**
 * Get designation by ID
 */
export const getDesignationById = async (designationId) => {
  const designations = (await getItem(STORAGE_KEYS.DESIGNATIONS)) || [];
  return designations.find(designation => designation.designationId === designationId);
};

/**
 * Update designation
 */
export const updateDesignation = async (designationId, updates) => {
  const designations = (await getItem(STORAGE_KEYS.DESIGNATIONS)) || [];
  const index = designations.findIndex(designation => designation.designationId === designationId);
  if (index !== -1) {
    designations[index] = { ...designations[index], ...updates, updatedAt: new Date().toISOString() };
    await setItem(STORAGE_KEYS.DESIGNATIONS, designations);
    return designations[index];
  }
  return null;
};

/**
 * Delete designation
 */
export const deleteDesignation = async (designationId) => {
  const designations = (await getItem(STORAGE_KEYS.DESIGNATIONS)) || [];
  const filtered = designations.filter(designation => designation.designationId !== designationId);
  await setItem(STORAGE_KEYS.DESIGNATIONS, filtered);
  return true;
};

// ============================================
// CLIENT SERVICES
// ============================================

/**
 * Create client
 */
export const createClient = async (clientData) => {
  const clients = (await getItem(STORAGE_KEYS.CLIENTS)) || [];
  const clientId = generateId('client');
  const newClient = {
    clientId,
    ...clientData,
    createdAt: new Date().toISOString(),
  };
  clients.push(newClient);
  await setItem(STORAGE_KEYS.CLIENTS, clients);
  return newClient;
};

/**
 * Get clients by organization
 */
export const getClientsByOrg = async (orgId) => {
  const clients = (await getItem(STORAGE_KEYS.CLIENTS)) || [];
  return clients.filter(client => client.orgId === orgId);
};

/**
 * Get client by ID
 */
export const getClientById = async (clientId) => {
  const clients = (await getItem(STORAGE_KEYS.CLIENTS)) || [];
  return clients.find(client => client.clientId === clientId);
};

/**
 * Update client
 */
export const updateClient = async (clientId, updates) => {
  const clients = (await getItem(STORAGE_KEYS.CLIENTS)) || [];
  const index = clients.findIndex(client => client.clientId === clientId);
  if (index !== -1) {
    clients[index] = { ...clients[index], ...updates, updatedAt: new Date().toISOString() };
    await setItem(STORAGE_KEYS.CLIENTS, clients);
    return clients[index];
  }
  return null;
};

/**
 * Delete client
 */
export const deleteClient = async (clientId) => {
  const clients = (await getItem(STORAGE_KEYS.CLIENTS)) || [];
  const filtered = clients.filter(client => client.clientId !== clientId);
  await setItem(STORAGE_KEYS.CLIENTS, filtered);
  return true;
};

// Clear all data (for development/testing)
export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
};
