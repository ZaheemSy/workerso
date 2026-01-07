import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// ============================================
// AUTHENTICATION SERVICES
// ============================================

/**
 * Sign up new organization with Super Admin
 */
export const signUpWithEmail = async (email, password, userData, orgData) => {
  try {
    // Create Firebase Auth user
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const { uid } = userCredential.user;

    // Create organization document
    const orgRef = firestore().collection('organizations').doc();
    const orgId = orgRef.id;

    await orgRef.set({
      orgId,
      ...orgData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Create user document
    await firestore().collection('users').doc(uid).set({
      userId: uid,
      orgId,
      ...userData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Set custom claims for role-based access
    // Note: This requires Cloud Functions in production
    // For now, we'll store role in Firestore

    return { success: true, userId: uid, orgId };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    const { uid } = userCredential.user;

    // Get user data from Firestore
    const userDoc = await firestore().collection('users').doc(uid).get();

    if (!userDoc.exists) {
      throw new Error('User data not found');
    }

    const userData = userDoc.data();

    return {
      success: true,
      user: {
        userId: uid,
        ...userData,
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  try {
    await auth().signOut();
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current user from Firestore
 */
export const getCurrentUser = async () => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) return null;

    const userDoc = await firestore().collection('users').doc(currentUser.uid).get();

    if (!userDoc.exists) return null;

    return {
      userId: currentUser.uid,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

// ============================================
// USER SERVICES
// ============================================

/**
 * Create new user (Admin or Worker)
 */
export const createUser = async (userData) => {
  try {
    const userRef = firestore().collection('users').doc();
    const userId = userRef.id;

    await userRef.set({
      userId,
      ...userData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, userId, user: { userId, ...userData } };
  } catch (error) {
    console.error('Create user error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId) => {
  try {
    const userDoc = await firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    return {
      userId: userDoc.id,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

/**
 * Get all users by organization
 */
export const getUsersByOrg = async (orgId) => {
  try {
    const snapshot = await firestore()
      .collection('users')
      .where('orgId', '==', orgId)
      .get();

    return snapshot.docs.map(doc => ({
      userId: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Get users by org error:', error);
    return [];
  }
};

/**
 * Get users by admin ID
 */
export const getUsersByAdmin = async (adminId) => {
  try {
    const snapshot = await firestore()
      .collection('users')
      .where('adminId', '==', adminId)
      .get();

    return snapshot.docs.map(doc => ({
      userId: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Get users by admin error:', error);
    return [];
  }
};

/**
 * Update user data
 */
export const updateUser = async (userId, updates) => {
  try {
    await firestore()
      .collection('users')
      .doc(userId)
      .update({
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    return { success: true };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// ORGANIZATION SERVICES
// ============================================

/**
 * Get organization by ID
 */
export const getOrganizationById = async (orgId) => {
  try {
    const orgDoc = await firestore().collection('organizations').doc(orgId).get();

    if (!orgDoc.exists) {
      return null;
    }

    return {
      orgId: orgDoc.id,
      ...orgDoc.data(),
    };
  } catch (error) {
    console.error('Get organization error:', error);
    return null;
  }
};

/**
 * Update organization
 */
export const updateOrganization = async (orgId, updates) => {
  try {
    await firestore()
      .collection('organizations')
      .doc(orgId)
      .update({
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    return { success: true };
  } catch (error) {
    console.error('Update organization error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// ATTENDANCE SERVICES
// ============================================

/**
 * Create attendance record
 */
export const createAttendance = async (attendanceData) => {
  try {
    const attendanceRef = firestore().collection('attendance').doc();

    await attendanceRef.set({
      attendanceId: attendanceRef.id,
      ...attendanceData,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, attendanceId: attendanceRef.id };
  } catch (error) {
    console.error('Create attendance error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get attendance by user and date
 */
export const getAttendanceByUser = async (userId, date) => {
  try {
    const snapshot = await firestore()
      .collection('attendance')
      .where('userId', '==', userId)
      .where('date', '==', date)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      attendanceId: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Get attendance error:', error);
    return [];
  }
};

/**
 * Get attendance by organization
 */
export const getAttendanceByOrg = async (orgId) => {
  try {
    const snapshot = await firestore()
      .collection('attendance')
      .where('orgId', '==', orgId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      attendanceId: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Get attendance by org error:', error);
    return [];
  }
};

// ============================================
// WORKER GROUP SERVICES
// ============================================

/**
 * Create worker group
 */
export const createGroup = async (groupData) => {
  try {
    const groupRef = firestore().collection('groups').doc();

    await groupRef.set({
      groupId: groupRef.id,
      ...groupData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, groupId: groupRef.id };
  } catch (error) {
    console.error('Create group error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get groups by organization
 */
export const getGroupsByOrg = async (orgId) => {
  try {
    const snapshot = await firestore()
      .collection('groups')
      .where('orgId', '==', orgId)
      .get();

    return snapshot.docs.map(doc => ({
      groupId: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Get groups error:', error);
    return [];
  }
};

/**
 * Update group
 */
export const updateGroup = async (groupId, updates) => {
  try {
    await firestore()
      .collection('groups')
      .doc(groupId)
      .update({
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    return { success: true };
  } catch (error) {
    console.error('Update group error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// PROJECT SERVICES
// ============================================

/**
 * Create project
 */
export const createProject = async (projectData) => {
  try {
    const projectRef = firestore().collection('projects').doc();

    await projectRef.set({
      projectId: projectRef.id,
      ...projectData,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, projectId: projectRef.id };
  } catch (error) {
    console.error('Create project error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get projects by organization
 */
export const getProjectsByOrg = async (orgId) => {
  try {
    const snapshot = await firestore()
      .collection('projects')
      .where('orgId', '==', orgId)
      .get();

    return snapshot.docs.map(doc => ({
      projectId: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Get projects error:', error);
    return [];
  }
};

/**
 * Get project by ID
 */
export const getProjectById = async (projectId) => {
  try {
    const projectDoc = await firestore().collection('projects').doc(projectId).get();

    if (!projectDoc.exists) {
      return null;
    }

    return {
      projectId: projectDoc.id,
      ...projectDoc.data(),
    };
  } catch (error) {
    console.error('Get project error:', error);
    return null;
  }
};

/**
 * Update project
 */
export const updateProject = async (projectId, updates) => {
  try {
    await firestore()
      .collection('projects')
      .doc(projectId)
      .update({
        ...updates,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    return { success: true };
  } catch (error) {
    console.error('Update project error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// WORK LOG SERVICES
// ============================================

/**
 * Create work log
 */
export const createWorkLog = async (workLogData) => {
  try {
    const logRef = firestore().collection('worklogs').doc();

    await logRef.set({
      logId: logRef.id,
      ...workLogData,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, logId: logRef.id };
  } catch (error) {
    console.error('Create work log error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get work logs by organization
 */
export const getWorkLogsByOrg = async (orgId) => {
  try {
    const snapshot = await firestore()
      .collection('worklogs')
      .where('orgId', '==', orgId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      logId: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Get work logs error:', error);
    return [];
  }
};

/**
 * Get work logs by user and date
 */
export const getWorkLogsByUser = async (userId, date) => {
  try {
    const snapshot = await firestore()
      .collection('worklogs')
      .where('userId', '==', userId)
      .where('date', '==', date)
      .get();

    return snapshot.docs.map(doc => ({
      logId: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Get work logs by user error:', error);
    return [];
  }
};
