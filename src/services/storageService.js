import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const getWorkLogsByUser = async (userId, date) => {
  const worklogs = (await getItem(STORAGE_KEYS.WORKLOGS)) || [];
  return worklogs.filter(log => log.userId === userId && log.date === date);
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
