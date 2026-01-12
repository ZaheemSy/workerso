# 🔥 Firebase Integration Guide - Workerso App

## 📌 Overview
This app supports **TWO MODES**:
1. **Local Only** - Data stored locally using AsyncStorage (current flow)
2. **Local + Cloud** - Data synced with Firebase for real-time collaboration

---

## 🚀 STEP-BY-STEP SETUP

### ✅ STEP 1: Place google-services.json
**Action:** Copy your downloaded `google-services.json` file to:
```
android/app/google-services.json
```

**Verify:** Run this command to check:
```bash
ls android/app/google-services.json
```

---

### ✅ STEP 2: Firebase Dependencies (DONE ✓)
Already installed:
- @react-native-firebase/app
- @react-native-firebase/auth
- @react-native-firebase/firestore

---

### ✅ STEP 3: Android Configuration (DONE ✓)
Updated files:
- `android/build.gradle` - Added Google Services plugin
- `android/app/build.gradle` - Applied plugin

---

### 🔧 STEP 4: Firebase Console Setup

#### 4.1 Enable Authentication
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Click **Authentication** → **Get Started**
4. Enable **Email/Password** sign-in method

#### 4.2 Create Firestore Database
1. Click **Firestore Database** → **Create database**
2. Choose **Start in test mode** (we'll add security rules later)
3. Select location (choose closest to your users)

#### 4.3 Firestore Collections Structure
Create these collections:

```
organizations/
  {orgId}/
    - name
    - plan: "local" | "cloud"
    - createdAt
    - settings

users/
  {userId}/
    - name
    - email
    - role: "super_admin" | "admin" | "worker"
    - orgId
    - designationId
    - createdAt

projects/
  {projectId}/
    - name
    - description
    - orgId
    - status
    - createdAt

attendance/
  {attendanceId}/
    - userId
    - orgId
    - date
    - clockInTime
    - clockOutTime
    - type

workLogs/
  {logId}/
    - userId
    - orgId
    - projectId
    - date
    - hoursWorked
    - breaks
    - notes

designations/
  {designationId}/
    - name
    - orgId
    - createdAt
```

#### 4.4 Security Rules
Go to **Firestore Database** → **Rules** and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function isSuperAdmin() {
      return isSignedIn() && getUserData().role == 'super_admin';
    }

    function isAdmin() {
      return isSignedIn() && (getUserData().role == 'admin' || getUserData().role == 'super_admin');
    }

    function belongsToOrg(orgId) {
      return isSignedIn() && getUserData().orgId == orgId;
    }

    // Organizations
    match /organizations/{orgId} {
      allow read: if belongsToOrg(orgId);
      allow write: if isSuperAdmin() && belongsToOrg(orgId);
    }

    // Users
    match /users/{userId} {
      allow read: if isSignedIn() && (belongsToOrg(resource.data.orgId) || request.auth.uid == userId);
      allow create: if isSignedIn();
      allow update: if isAdmin() && belongsToOrg(resource.data.orgId) || request.auth.uid == userId;
      allow delete: if isSuperAdmin() && belongsToOrg(resource.data.orgId);
    }

    // Projects
    match /projects/{projectId} {
      allow read: if belongsToOrg(resource.data.orgId);
      allow write: if isAdmin() && belongsToOrg(resource.data.orgId);
    }

    // Attendance
    match /attendance/{attendanceId} {
      allow read: if belongsToOrg(resource.data.orgId);
      allow create: if isSignedIn() && belongsToOrg(request.resource.data.orgId);
      allow update, delete: if isAdmin() && belongsToOrg(resource.data.orgId);
    }

    // Work Logs
    match /workLogs/{logId} {
      allow read: if belongsToOrg(resource.data.orgId);
      allow create: if isSignedIn() && belongsToOrg(request.resource.data.orgId);
      allow update, delete: if isAdmin() && belongsToOrg(resource.data.orgId);
    }

    // Designations
    match /designations/{designationId} {
      allow read: if belongsToOrg(resource.data.orgId);
      allow write: if isAdmin() && belongsToOrg(resource.data.orgId);
    }
  }
}
```

---

## 💻 CODE IMPLEMENTATION

### STEP 5: Create Firebase Service

File: `src/services/firebaseService.js`

```javascript
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SYNC_MODE: '@workerso_sync_mode',
};

// Check if cloud sync is enabled
export const isCloudSyncEnabled = async () => {
  const mode = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_MODE);
  return mode === 'cloud';
};

// Set sync mode
export const setSyncMode = async (mode) => {
  await AsyncStorage.setItem(STORAGE_KEYS.SYNC_MODE, mode);
};

// ORGANIZATIONS
export const createOrganizationCloud = async (orgData) => {
  const docRef = await firestore().collection('organizations').add({
    ...orgData,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  return { orgId: docRef.id, ...orgData };
};

export const getOrganizationCloud = async (orgId) => {
  const doc = await firestore().collection('organizations').doc(orgId).get();
  return doc.exists ? { orgId: doc.id, ...doc.data() } : null;
};

// USERS
export const createUserCloud = async (userData) => {
  const docRef = await firestore().collection('users').add({
    ...userData,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  return { userId: docRef.id, ...userData };
};

export const getUsersByOrgCloud = async (orgId) => {
  const snapshot = await firestore()
    .collection('users')
    .where('orgId', '==', orgId)
    .get();
  return snapshot.docs.map(doc => ({ userId: doc.id, ...doc.data() }));
};

export const updateUserCloud = async (userId, updates) => {
  await firestore().collection('users').doc(userId).update(updates);
};

// PROJECTS
export const createProjectCloud = async (projectData) => {
  const docRef = await firestore().collection('projects').add({
    ...projectData,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  return { projectId: docRef.id, ...projectData };
};

export const getProjectsByOrgCloud = async (orgId) => {
  const snapshot = await firestore()
    .collection('projects')
    .where('orgId', '==', orgId)
    .get();
  return snapshot.docs.map(doc => ({ projectId: doc.id, ...doc.data() }));
};

// ATTENDANCE
export const createAttendanceCloud = async (attendanceData) => {
  const docRef = await firestore().collection('attendance').add({
    ...attendanceData,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  return { attendanceId: docRef.id, ...attendanceData };
};

export const getAttendanceByOrgCloud = async (orgId, date) => {
  const snapshot = await firestore()
    .collection('attendance')
    .where('orgId', '==', orgId)
    .where('date', '==', date)
    .get();
  return snapshot.docs.map(doc => ({ attendanceId: doc.id, ...doc.data() }));
};

// WORK LOGS
export const createWorkLogCloud = async (logData) => {
  const docRef = await firestore().collection('workLogs').add({
    ...logData,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  return { logId: docRef.id, ...logData };
};

export const getWorkLogsByOrgCloud = async (orgId, date) => {
  const snapshot = await firestore()
    .collection('workLogs')
    .where('orgId', '==', orgId)
    .where('date', '==', date)
    .get();
  return snapshot.docs.map(doc => ({ logId: doc.id, ...doc.data() }));
};

// DESIGNATIONS
export const createDesignationCloud = async (designationData) => {
  const docRef = await firestore().collection('designations').add({
    ...designationData,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  return { designationId: docRef.id, ...designationData };
};

export const getDesignationsByOrgCloud = async (orgId) => {
  const snapshot = await firestore()
    .collection('designations')
    .where('orgId', '==', orgId)
    .get();
  return snapshot.docs.map(doc => ({ designationId: doc.id, ...doc.data() }));
};

// REAL-TIME LISTENERS
export const subscribeToUsers = (orgId, callback) => {
  return firestore()
    .collection('users')
    .where('orgId', '==', orgId)
    .onSnapshot(snapshot => {
      const users = snapshot.docs.map(doc => ({ userId: doc.id, ...doc.data() }));
      callback(users);
    });
};

export const subscribeToAttendance = (orgId, date, callback) => {
  return firestore()
    .collection('attendance')
    .where('orgId', '==', orgId)
    .where('date', '==', date)
    .onSnapshot(snapshot => {
      const attendance = snapshot.docs.map(doc => ({ attendanceId: doc.id, ...doc.data() }));
      callback(attendance);
    });
};
```

---

### STEP 6: Update storageService.js

Add dual-mode support to existing service:

```javascript
import { isCloudSyncEnabled } from './firebaseService';
import * as FirebaseService from './firebaseService';

// Example: Create User with dual mode
export const createUser = async (userData) => {
  // Always store locally
  const localUser = await createUserLocal(userData);

  // If cloud sync enabled, also store in Firebase
  if (await isCloudSyncEnabled()) {
    try {
      await FirebaseService.createUserCloud(userData);
    } catch (error) {
      console.error('Cloud sync failed:', error);
      // Continue with local data
    }
  }

  return localUser;
};

// Similar pattern for other operations...
```

---

### STEP 7: Add Plan Selection in Signup

Update signup screen to include plan selection:

```javascript
const [selectedPlan, setSelectedPlan] = useState('local');

// In signup handler
const handleSignup = async () => {
  // Create organization with plan
  const org = await createOrganization({
    name: orgName,
    plan: selectedPlan, // 'local' or 'cloud'
  });

  // Set sync mode
  await setSyncMode(selectedPlan);

  // Continue with signup...
};
```

---

## 🎯 NEXT STEPS

1. **Copy google-services.json** to `android/app/`
2. **Setup Firebase Console** (Step 4)
3. **Create firebaseService.js** (Step 5)
4. **Update storageService.js** (Step 6)
5. **Add plan selection** to signup (Step 7)
6. **Rebuild Android app**: `cd android && ./gradlew clean && cd .. && npx react-native run-android`

---

## 🔐 Security Checklist

- [ ] Enable Firebase Authentication
- [ ] Add Firestore security rules
- [ ] Implement proper error handling
- [ ] Add offline support (Firestore persistence)
- [ ] Test both local and cloud modes
- [ ] Add data migration tool (local → cloud)

---

## 📱 Testing

### Test Local Mode:
1. Sign up with "Local Only" plan
2. Verify data stored in AsyncStorage
3. No Firebase calls should be made

### Test Cloud Mode:
1. Sign up with "Local + Cloud" plan
2. Verify data in Firestore Console
3. Test real-time updates between devices
4. Verify super admin sees all org data

---

## 🆘 Troubleshooting

### Build errors:
```bash
cd android && ./gradlew clean
cd ..
npx react-native run-android
```

### Firebase not connecting:
- Verify google-services.json is in `android/app/`
- Check Firebase Console for project status
- Ensure internet connection for cloud mode

### Security rule errors:
- Test rules in Firebase Console Rules Playground
- Ensure user has proper role field
- Check orgId matches

---

## 📚 Resources

- Firebase Console: https://console.firebase.google.com
- React Native Firebase Docs: https://rnfirebase.io
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started

---

**Created:** January 2026
**Version:** 1.0
