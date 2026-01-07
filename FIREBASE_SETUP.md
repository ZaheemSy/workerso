# Firebase Setup and Migration Guide

This guide walks you through setting up Firebase for your Workerso app.

## Table of Contents
1. [Firebase Console Setup](#firebase-console-setup)
2. [Install Dependencies](#install-dependencies)
3. [iOS Configuration](#ios-configuration)
4. [Android Configuration](#android-configuration)
5. [Code Migration](#code-migration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Firebase Console Setup

### 1. Create Firebase Project

1. Go to [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `Workerso`
4. Click **"Continue"**
5. (Optional) Enable/disable Google Analytics
6. Click **"Create project"**
7. Wait ~30 seconds
8. Click **"Continue"**

### 2. Open Project Settings

1. Click the **⚙️ gear icon** next to "Project Overview"
2. Select **"Project settings"**
3. Scroll to **"Your apps"** section

### 3. Add iOS App

1. Click the **iOS icon (📱)**
2. **iOS bundle ID**:
   - Open `ios/workerso.xcodeproj/project.pbxproj`
   - Search for `PRODUCT_BUNDLE_IDENTIFIER`
   - Copy the value (e.g., `com.yourname.workerso`)
3. **App nickname**: `Workerso iOS`
4. **App Store ID**: Leave blank
5. Click **"Register app"**
6. **Download** the `GoogleService-Info.plist` file
7. Click **"Next"** → **"Next"** → **"Continue to console"**

### 4. Add Android App

1. Back in Project Settings, click the **Android icon (🤖)**
2. **Android package name**:
   - Open `android/app/build.gradle`
   - Find `applicationId` (e.g., `com.workerso`)
3. **App nickname**: `Workerso Android`
4. **Debug signing certificate SHA-1**: Leave blank for now
5. Click **"Register app"**
6. **Download** the `google-services.json` file
7. Click **"Next"** → **"Next"** → **"Next"** → **"Continue to console"**

### 5. Enable Authentication

1. In left sidebar, click **"Authentication"**
2. Click **"Get started"**
3. Click **"Sign-in method"** tab
4. Click **"Email/Password"**
5. Toggle **Enable** (first switch only)
6. Click **"Save"**

### 6. Create Firestore Database

1. In left sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in test mode"**
   - ⚠️ We'll add proper rules later
4. Click **"Next"**
5. Choose **location** (select closest to you)
   - `us-central1` (Iowa)
   - `us-east1` (South Carolina)
   - `europe-west1` (Belgium)
   - `asia-south1` (Mumbai)
6. Click **"Enable"**
7. Wait for database creation

### 7. Set Firestore Security Rules

1. In Firestore Database, click **"Rules"** tab
2. **Replace** all rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check user role
    function hasRole(role) {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }

    // Users collection
    match /users/{userId} {
      // Anyone can read their own user document
      allow read: if isAuthenticated() && request.auth.uid == userId;

      // Super admin can read all users
      allow read: if hasRole('super_admin');

      // Only super admin and admin can create users
      allow create: if hasRole('super_admin') || hasRole('admin');

      // User can update their own document, or super admin can update any
      allow update: if isAuthenticated() &&
        (request.auth.uid == userId || hasRole('super_admin'));

      // Only super admin can delete users
      allow delete: if hasRole('super_admin');
    }

    // Organizations collection
    match /organizations/{orgId} {
      // Users can read their own organization
      allow read: if isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.orgId == orgId;

      // Only super admin can update organization
      allow update: if isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.orgId == orgId &&
        hasRole('super_admin');

      // Anyone can create organization (for signup)
      allow create: if true;
    }

    // Attendance records
    match /attendance/{attendanceId} {
      // Users can read their own attendance
      allow read: if isAuthenticated();

      // Users can create their own attendance
      allow create: if isAuthenticated() &&
        request.resource.data.userId == request.auth.uid;

      // Admin and super admin can read all attendance in their org
      allow read: if isAuthenticated() &&
        (hasRole('admin') || hasRole('super_admin'));
    }

    // Groups collection
    match /groups/{groupId} {
      // Members of the org can read groups
      allow read: if isAuthenticated();

      // Admin and super admin can manage groups
      allow write: if hasRole('admin') || hasRole('super_admin');
    }

    // Projects collection
    match /projects/{projectId} {
      // Members of the org can read projects
      allow read: if isAuthenticated();

      // Admin and super admin can manage projects
      allow write: if hasRole('admin') || hasRole('super_admin');
    }

    // Work logs collection
    match /worklogs/{logId} {
      // Users can read and write their own work logs
      allow read, write: if isAuthenticated() &&
        request.resource.data.userId == request.auth.uid;

      // Admin and super admin can read all work logs
      allow read: if hasRole('admin') || hasRole('super_admin');
    }
  }
}
```

3. Click **"Publish"**
4. **Done!** ✅ Firebase Console setup complete

---

## Install Dependencies

Run these commands in your project root:

```bash
# Install Firebase packages
npm install @react-native-firebase/app
npm install @react-native-firebase/auth
npm install @react-native-firebase/firestore

# For iOS, install pods
cd ios
pod install
cd ..
```

---

## iOS Configuration

### 1. Add GoogleService-Info.plist

**Option A: Using Finder**
1. Open Finder
2. Navigate to `Downloads/GoogleService-Info.plist`
3. Drag and drop into `ios/` folder in your project

**Option B: Using Terminal**
```bash
mv ~/Downloads/GoogleService-Info.plist ios/
```

### 2. Add to Xcode Project

1. Open Xcode workspace:
   ```bash
   open ios/workerso.xcworkspace
   ```

2. In Xcode left sidebar:
   - Right-click on the `workerso` folder (blue icon)
   - Select **"Add Files to 'workerso'"**

3. In the file picker:
   - Navigate to the `GoogleService-Info.plist` file
   - **Check** ✅ "Copy items if needed"
   - **Check** ✅ Add to target: workerso
   - Click **"Add"**

4. Verify it's added:
   - You should see `GoogleService-Info.plist` in the Xcode project navigator

---

## Android Configuration

### 1. Add google-services.json

```bash
mv ~/Downloads/google-services.json android/app/
```

Verify the file is at: `android/app/google-services.json`

### 2. Modify build.gradle Files

**File 1: `android/build.gradle`**

Add the Google Services plugin:

```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 21
        compileSdkVersion = 34
        targetSdkVersion = 34
        ndkVersion = "25.1.8937393"
        kotlinVersion = "1.8.0"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")

        // Add this line 👇
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

**File 2: `android/app/build.gradle`**

At the **top** of the file, add:

```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

// Add this line 👇
apply plugin: 'com.google.gms.google-services'
```

At the **bottom** of dependencies section:

```gradle
dependencies {
    // ... existing dependencies

    // Add Firebase BOM
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-analytics'
}
```

### 3. Rebuild Android

```bash
cd android
./gradlew clean
cd ..
```

---

## Code Migration

### 1. Switch to Firebase Authentication

**Current file:** `src/contexts/AuthContext.js`
**New file:** `src/contexts/AuthContext.firebase.js`

To migrate:

1. **Backup** your current AuthContext:
   ```bash
   mv src/contexts/AuthContext.js src/contexts/AuthContext.backup.js
   ```

2. **Rename** Firebase version to main:
   ```bash
   mv src/contexts/AuthContext.firebase.js src/contexts/AuthContext.js
   ```

### 2. Update Signup Screen

**File:** `src/screens/SignupScreen.js`

Replace imports:
```javascript
// OLD
import { createOrganization, createUser } from '../services/storageService';

// NEW
import { signUpWithEmail } from '../services/firebaseService';
```

Replace `handleSignup` function:
```javascript
const handleSignup = async () => {
  if (!validateForm()) return;

  setLoading(true);
  try {
    const result = await signUpWithEmail(
      formData.email.trim().toLowerCase(),
      formData.password,
      {
        role: ROLES.SUPER_ADMIN,
        name: formData.superAdminName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        username: formData.username.trim().toLowerCase(),
      },
      {
        companyName: formData.companyName.trim(),
        industry: '',
        address: '',
      }
    );

    if (result.success) {
      setLoading(false);
      Alert.alert(
        'Success!',
        'Organization and account created successfully. Please login.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    } else {
      throw new Error(result.error || 'Failed to create account');
    }
  } catch (error) {
    setLoading(false);
    Alert.alert('Error', error.message || 'Failed to create account');
    console.error('Signup error:', error);
  }
};
```

### 3. Update Login Screen

**File:** `src/screens/LoginScreen.js`

No changes needed! The `useAuth` hook handles it.

But update username login to email:
```javascript
// Change username to email in the input
<TextInput
  style={styles.input}
  placeholder="Email"  // Changed from "Username"
  placeholderTextColor={COLORS.gray}
  value={email}  // Changed from username
  onChangeText={setEmail}  // Changed from setUsername
  keyboardType="email-address"  // Added
  autoCapitalize="none"
  autoCorrect={false}
/>
```

### 4. Update Service Imports

Replace ALL imports from `storageService` to `firebaseService`:

**Find files using:**
```bash
grep -r "from.*storageService" src/
```

**Replace in each file:**
```javascript
// OLD
import { getUserById, createUser, ... } from '../services/storageService';

// NEW
import { getUserById, createUser, ... } from '../services/firebaseService';
```

Files to update:
- `src/screens/AddWorkerScreen.js`
- `src/screens/AdminDashboard.js`
- `src/screens/WorkerDashboard.js`
- `src/screens/UserDetailScreen.js`
- `src/screens/AdminsAndWorkersScreen.js`
- `src/screens/CreateWorkerGroupScreen.js`
- And any other files using storage services

---

## Testing

### 1. Test Signup Flow

1. **Clean app data:**
   ```bash
   # iOS
   rm -rf ~/Library/Developer/CoreSimulator/Devices/*/data/Containers/Data/Application/*/Library/Preferences/*

   # Android
   adb shell pm clear com.workerso
   ```

2. **Run app:**
   ```bash
   npm run ios
   # or
   npm run android
   ```

3. **Create account:**
   - Open app
   - Click "Sign Up"
   - Fill form with:
     - Organization: Test Company
     - Name: John Doe
     - Email: john@test.com
     - Phone: 1234567890
     - Username: johndoe (not used anymore)
     - Password: test123

4. **Verify in Firebase:**
   - Go to Firebase Console
   - Click "Authentication"
   - See new user: john@test.com
   - Click "Firestore Database"
   - See `users` collection with user document
   - See `organizations` collection with org document

### 2. Test Login Flow

1. **Login** with:
   - Email: john@test.com
   - Password: test123

2. **Verify:**
   - Should navigate to SuperAdminDashboard
   - Name should appear in header

### 3. Test Data Creation

1. **Create Admin:**
   - Click "Create Admin"
   - Fill form
   - Submit

2. **Verify in Firestore:**
   - Check `users` collection
   - Should see new admin user

---

## Troubleshooting

### iOS Issues

**Error: "GoogleService-Info.plist not found"**
- Make sure plist is added to Xcode project
- Check it's in the right target
- Clean build folder: Product → Clean Build Folder

**Pod install fails:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

### Android Issues

**Error: "google-services.json missing"**
```bash
# Verify file exists
ls android/app/google-services.json

# If missing, re-download from Firebase Console
```

**Build fails:**
```bash
cd android
./gradlew clean
cd ..
```

**Clear cache:**
```bash
cd android
./gradlew clean
./gradlew --stop
cd ..
rm -rf android/.gradle
```

### Firebase Auth Issues

**Error: "auth/network-request-failed"**
- Check internet connection
- Verify Firebase project is active

**Error: "auth/invalid-api-key"**
- Re-download GoogleService-Info.plist or google-services.json
- Make sure correct file for correct platform

**Error: "permission-denied" in Firestore**
- Check Firestore security rules
- Make sure user document has `role` field

---

## Next Steps

After Firebase is working:

1. **Add Password Reset:**
   ```javascript
   import auth from '@react-native-firebase/auth';

   const resetPassword = async (email) => {
     await auth().sendPasswordResetEmail(email);
   };
   ```

2. **Add Email Verification:**
   ```javascript
   const sendVerification = async () => {
     await auth().currentUser.sendEmailVerification();
   };
   ```

3. **Add Cloud Functions** (for creating Auth users for workers/admins)

4. **Add Storage** (for profile pictures, worksite photos)
   ```bash
   npm install @react-native-firebase/storage
   ```

5. **Add Push Notifications:**
   ```bash
   npm install @react-native-firebase/messaging
   ```

---

## Migration Checklist

- [ ] Firebase project created
- [ ] iOS app added to Firebase
- [ ] Android app added to Firebase
- [ ] Authentication enabled
- [ ] Firestore database created
- [ ] Security rules configured
- [ ] Dependencies installed
- [ ] GoogleService-Info.plist added to iOS
- [ ] google-services.json added to Android
- [ ] build.gradle files updated
- [ ] AuthContext migrated
- [ ] Service imports updated
- [ ] Signup screen updated
- [ ] App tested on iOS
- [ ] App tested on Android
- [ ] Data verified in Firestore

---

## Support

If you encounter issues:

1. Check [Firebase Documentation](https://rnfirebase.io/)
2. Check [React Native Firebase Issues](https://github.com/invertase/react-native-firebase/issues)
3. Review Firebase Console logs
4. Check Xcode/Android Studio console for errors

Good luck! 🚀
