# Firebase Data Structure - Ready for Integration

This document outlines the data structure currently stored in AsyncStorage that is ready for Firebase/Firestore migration.

## Current Storage Keys (AsyncStorage → Firebase Collections)

### 1. Organizations
**Key:** `orgs`
**Firebase Path:** `/organizations/{orgId}`

```javascript
{
  orgId: "org_xxx",
  companyName: "Company Name",
  industry: "",
  address: "",
  logoUri: null,
  createdAt: "ISO timestamp"
}
```

### 2. Users
**Key:** `users`
**Firebase Path:** `/organizations/{orgId}/users/{userId}`

```javascript
{
  userId: "user_xxx",
  orgId: "org_xxx",
  role: "super_admin" | "admin" | "employee" | "worker",
  name: "Full Name",
  email: "email@example.com",
  phone: "+1234567890",
  username: "username",
  password: "hashed_password", // Hash before Firebase migration
  designation: "CEO" | "Owner" | "Director" | "Super Admin" | custom,
  designationId: "designation_xxx", // For workers/employees
  adminId: "user_xxx", // null for direct under Super Admin
  createdBy: "user_xxx",
  extraDetails: {
    hierarchyRole: "Admin" | "Manager" | "Field Employee" | etc
  },
  createdAt: "ISO timestamp"
}
```

**Important for Firebase:**
- Store `hierarchyRole` in `extraDetails.hierarchyRole`
- This allows role from hierarchy manager to be synced
- Passwords should be hashed before migration (use Firebase Auth instead)

### 3. Hierarchy Manager
**Key:** `hierarchy_{orgId}`
**Firebase Path:** `/organizations/{orgId}/hierarchy`

```javascript
{
  id: "root",
  name: "Owner", // Super Admin's designation
  level: 0,
  children: [
    {
      id: "role_xxx",
      name: "Admin",
      level: 1,
      children: [
        {
          id: "role_yyy",
          name: "Field Employee",
          level: 2,
          children: []
        },
        {
          id: "role_zzz",
          name: "Office Employee",
          level: 2,
          children: []
        }
      ]
    },
    {
      id: "role_aaa",
      name: "Manager",
      level: 1,
      children: []
    }
  ]
}
```

**Important for Firebase:**
- Entire tree structure stored as single document
- Organization-specific (scoped by orgId)
- Roles extracted recursively and used in employee creation

### 4. Designations
**Key:** `designations`
**Firebase Path:** `/organizations/{orgId}/designations/{designationId}`

```javascript
{
  designationId: "designation_xxx",
  orgId: "org_xxx",
  name: "Carpenter" | "Painter" | "Designer" | etc,
  createdBy: "user_xxx",
  createdAt: "ISO timestamp"
}
```

### 5. Projects
**Key:** `projects`
**Firebase Path:** `/organizations/{orgId}/projects/{projectId}`

```javascript
{
  projectId: "project_xxx",
  orgId: "org_xxx",
  projectName: "Project Name",
  description: "Description",
  projectFrom: "Client Name",
  broughtBy: "Sales Person Name",
  startDate: "ISO timestamp",
  endDate: "ISO timestamp",
  workers: ["user_id1", "user_id2"],
  groups: ["group_id1", "group_id2"],
  siteLogs: [],
  createdBy: "user_xxx",
  createdAt: "ISO timestamp"
}
```

### 6. Worker Groups
**Key:** `workerGroups`
**Firebase Path:** `/organizations/{orgId}/workerGroups/{groupId}`

```javascript
{
  groupId: "group_xxx",
  orgId: "org_xxx",
  groupName: "Group Name",
  workers: ["user_id1", "user_id2"],
  createdBy: "user_xxx",
  createdAt: "ISO timestamp"
}
```

## Migration Strategy (When Ready)

### Phase 1: Dual Write (Recommended)
1. Keep AsyncStorage as primary
2. Add Firebase writes alongside AsyncStorage
3. Verify data sync for 2-3 days
4. Switch reads to Firebase

### Phase 2: Data Migration
```javascript
// Example migration function
const migrateToFirebase = async () => {
  // 1. Read all data from AsyncStorage
  const orgs = await AsyncStorage.getItem('orgs');
  const users = await AsyncStorage.getItem('users');
  // ... etc

  // 2. Parse and upload to Firestore
  const batch = firestore().batch();

  // Organizations
  JSON.parse(orgs).forEach(org => {
    const ref = firestore()
      .collection('organizations')
      .doc(org.orgId);
    batch.set(ref, org);
  });

  // Users (per organization)
  JSON.parse(users).forEach(user => {
    const ref = firestore()
      .collection('organizations')
      .doc(user.orgId)
      .collection('users')
      .doc(user.userId);
    batch.set(ref, {
      ...user,
      password: null // Remove password, use Firebase Auth
    });
  });

  // Commit batch
  await batch.commit();
};
```

### Phase 3: Real-time Sync
```javascript
// Listen to changes
firestore()
  .collection('organizations')
  .doc(orgId)
  .collection('users')
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        // Handle new user
      }
      if (change.type === 'modified') {
        // Handle updated user
      }
      if (change.type === 'removed') {
        // Handle deleted user
      }
    });
  });
```

## Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Organizations - only authenticated users can read their org
    match /organizations/{orgId} {
      allow read: if request.auth != null &&
        request.auth.token.orgId == orgId;
      allow write: if request.auth != null &&
        request.auth.token.role == 'super_admin' &&
        request.auth.token.orgId == orgId;

      // Users within organization
      match /users/{userId} {
        allow read: if request.auth != null &&
          request.auth.token.orgId == orgId;
        allow create: if request.auth != null &&
          (request.auth.token.role == 'super_admin' ||
           request.auth.token.role == 'admin') &&
          request.auth.token.orgId == orgId;
        allow update, delete: if request.auth != null &&
          request.auth.token.role == 'super_admin' &&
          request.auth.token.orgId == orgId;
      }

      // Hierarchy
      match /hierarchy {
        allow read: if request.auth != null &&
          request.auth.token.orgId == orgId;
        allow write: if request.auth != null &&
          request.auth.token.role == 'super_admin' &&
          request.auth.token.orgId == orgId;
      }

      // Designations
      match /designations/{designationId} {
        allow read: if request.auth != null &&
          request.auth.token.orgId == orgId;
        allow create: if request.auth != null &&
          (request.auth.token.role == 'super_admin' ||
           request.auth.token.role == 'admin') &&
          request.auth.token.orgId == orgId;
        allow update, delete: if request.auth != null &&
          request.auth.token.role == 'super_admin' &&
          request.auth.token.orgId == orgId;
      }

      // Projects
      match /projects/{projectId} {
        allow read: if request.auth != null &&
          request.auth.token.orgId == orgId;
        allow create: if request.auth != null &&
          (request.auth.token.role == 'super_admin' ||
           request.auth.token.role == 'admin') &&
          request.auth.token.orgId == orgId;
        allow update, delete: if request.auth != null &&
          (request.auth.token.role == 'super_admin' ||
           request.auth.token.role == 'admin') &&
          request.auth.token.orgId == orgId;
      }
    }
  }
}
```

## Notes

1. **Organization Scoping**: All data is scoped by `orgId` - ready for multi-tenancy
2. **Role-Based Access**: Data structure supports role-based permissions
3. **Hierarchy Sync**: Roles from hierarchy manager stored in `extraDetails.hierarchyRole`
4. **Timestamps**: All created timestamps in ISO format, easy to convert to Firestore timestamps
5. **IDs**: Using prefixed IDs (`org_`, `user_`, etc.) - can keep or switch to Firestore auto-IDs

## When You're Ready (2-3 Days)

1. Set up Firebase project
2. Add Firebase SDK to React Native app
3. Configure Firebase Auth for user authentication
4. Run migration script to move data
5. Update storage service to use Firestore instead of AsyncStorage
6. Test thoroughly
7. Deploy!

All data structures are already Firebase-compatible. No schema changes needed!
