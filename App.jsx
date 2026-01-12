import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ROLES } from './src/constants/roles';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import WorkerDashboard from './src/screens/WorkerDashboard';
import AdminDashboard from './src/screens/AdminDashboard';
import SuperAdminDashboard from './src/screens/SuperAdminDashboard';
import DeveloperDashboard from './src/screens/DeveloperDashboard';
import AttendanceCameraScreen from './src/screens/AttendanceCameraScreen';
import WorkLogScreen from './src/screens/WorkLogScreen';

// Worker Group screens
import WorkerGroupListScreen from './src/screens/WorkerGroupListScreen';
import WorkerGroupDetailScreen from './src/screens/WorkerGroupDetailScreen';
import CreateWorkerGroupScreen from './src/screens/CreateWorkerGroupScreen';

// Project screens
import CreateProjectScreen from './src/screens/CreateProjectScreen';
import ProjectListScreen from './src/screens/ProjectListScreen';
import ProjectDetailScreen from './src/screens/ProjectDetailScreen';
import WorkerChecklistScreen from './src/screens/WorkerChecklistScreen';
import WorksitePhotoUploadScreen from './src/screens/WorksitePhotoUploadScreen';

// Admin tools
import AddWorkerScreen from './src/screens/AddWorkerScreen';
import AddEmployeeScreen from './src/screens/AddEmployeeScreen';
import CreateAdminScreen from './src/screens/CreateAdminScreen';
import AttendanceRecordsScreen from './src/screens/AttendanceRecordsScreen';
import WorkLogsViewScreen from './src/screens/WorkLogsViewScreen';

// New Screens - Workers, Groups, and Designations
import EmployeesScreen from './src/screens/EmployeesScreen';
import WorkerGroupsListScreen from './src/screens/WorkerGroupsListScreen';
import DesignationsScreen from './src/screens/DesignationsScreen';
import SupportDevScreen from './src/screens/SupportDevScreen';

// Profile screens
import OrganizationProfileScreen from './src/screens/OrganizationProfileScreen';
import AdminProfileScreen from './src/screens/AdminProfileScreen';
import WorkerProfileScreen from './src/screens/WorkerProfileScreen';

// Reports and Settings
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Admin and Worker Management
import UserDetailScreen from './src/screens/UserDetailScreen';

// Hierarchy Management
import HierarchyManagerScreen from './src/screens/HierarchyManagerScreen';

// Pending Screen
import PendingScreen from './src/screens/PendingScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {!session?.isLoggedIn ? (
        // Auth Stack
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        // Main App Stack - Role-based routing
        <>
          {session.role === ROLES.DEVELOPER && (
            <>
              <Stack.Screen name="DeveloperDashboard" component={DeveloperDashboard} />
              <Stack.Screen name="OrganizationProfile" component={OrganizationProfileScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          )}

          {session.role === ROLES.WORKER && (
            <>
              <Stack.Screen name="WorkerDashboard" component={WorkerDashboard} />
              <Stack.Screen name="SupportDevScreen" component={SupportDevScreen} />
              <Stack.Screen name="AttendanceCamera" component={AttendanceCameraScreen} />
              <Stack.Screen name="WorkLog" component={WorkLogScreen} />
              <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} />
              <Stack.Screen name="ProjectList" component={ProjectListScreen} />
              <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
            </>
          )}

          {session.role === ROLES.ADMIN && (
            <>
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
              <Stack.Screen name="SupportDevScreen" component={SupportDevScreen} />
              <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />

              {/* Worker Management */}
              <Stack.Screen name="Employees" component={EmployeesScreen} />
              <Stack.Screen name="UserDetail" component={UserDetailScreen} />
              <Stack.Screen name="AddWorker" component={AddWorkerScreen} />
              <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} />
              <Stack.Screen name="WorkerGroupsList" component={WorkerGroupsListScreen} />
              <Stack.Screen name="WorkerGroupList" component={WorkerGroupListScreen} />
              <Stack.Screen name="WorkerGroupDetail" component={WorkerGroupDetailScreen} />
              <Stack.Screen name="CreateWorkerGroup" component={CreateWorkerGroupScreen} />
              <Stack.Screen name="Designations" component={DesignationsScreen} />

              {/* Project Management */}
              <Stack.Screen name="CreateProject" component={CreateProjectScreen} />
              <Stack.Screen name="ProjectList" component={ProjectListScreen} />
              <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
              <Stack.Screen name="WorkerChecklist" component={WorkerChecklistScreen} />
              <Stack.Screen name="WorksitePhotoUpload" component={WorksitePhotoUploadScreen} />

              {/* Records & Logs */}
              <Stack.Screen name="AttendanceRecords" component={AttendanceRecordsScreen} />
              <Stack.Screen name="WorkLogsView" component={WorkLogsViewScreen} />

              {/* Attendance & Work */}
              <Stack.Screen name="AttendanceCamera" component={AttendanceCameraScreen} />
              <Stack.Screen name="WorkLog" component={WorkLogScreen} />

              {/* Settings */}
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          )}

          {session.role === ROLES.SUPER_ADMIN && (
            <>
              <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} />
              <Stack.Screen name="SupportDevScreen" component={SupportDevScreen} />
              <Stack.Screen name="Pending" component={PendingScreen} />
              <Stack.Screen name="HierarchyManager" component={HierarchyManagerScreen} />

              {/* Admin and Worker Management */}
              <Stack.Screen name="Employees" component={EmployeesScreen} />
              <Stack.Screen name="UserDetail" component={UserDetailScreen} />
              <Stack.Screen name="CreateAdmin" component={CreateAdminScreen} />
              <Stack.Screen name="AddWorker" component={AddWorkerScreen} />
              <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} />

              {/* Worker Groups */}
              <Stack.Screen name="WorkerGroupsList" component={WorkerGroupsListScreen} />
              <Stack.Screen name="WorkerGroupList" component={WorkerGroupListScreen} />
              <Stack.Screen name="WorkerGroupDetail" component={WorkerGroupDetailScreen} />
              <Stack.Screen name="CreateWorkerGroup" component={CreateWorkerGroupScreen} />
              <Stack.Screen name="Designations" component={DesignationsScreen} />

              {/* Projects */}
              <Stack.Screen name="CreateProject" component={CreateProjectScreen} />
              <Stack.Screen name="ProjectList" component={ProjectListScreen} />
              <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
              <Stack.Screen name="WorkerChecklist" component={WorkerChecklistScreen} />
              <Stack.Screen name="WorksitePhotoUpload" component={WorksitePhotoUploadScreen} />

              {/* Records & Reports */}
              <Stack.Screen name="AttendanceRecords" component={AttendanceRecordsScreen} />
              <Stack.Screen name="WorkLogsView" component={WorkLogsViewScreen} />
              <Stack.Screen name="Reports" component={ReportsScreen} />

              {/* Profile & Settings */}
              <Stack.Screen name="OrganizationProfile" component={OrganizationProfileScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
            </>
          )}
        </>
      )}
    </Stack.Navigator>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
