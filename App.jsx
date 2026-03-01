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
import ProjectWorkLogScreen from './src/screens/ProjectWorkLogScreen';
import SiteUpdateHistoryScreen from './src/screens/SiteUpdateHistoryScreen';
import MemberProjectDetailScreen from './src/screens/MemberProjectDetailScreen';
import ProjectGalleryScreen from './src/screens/ProjectGalleryScreen';

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
import ClientsScreen from './src/screens/ClientsScreen';
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

// Report Screens
import ReportScreen from './src/screens/ReportScreen';
import EmployeeSelectionScreen from './src/screens/EmployeeSelectionScreen';
import ProjectSelectionScreen from './src/screens/ProjectSelectionScreen';
import ReportOptionsScreen from './src/screens/ReportOptionsScreen';
import ReportPreviewScreen from './src/screens/ReportPreviewScreen';
import QuickPageScreen from './src/screens/QuickPageScreen';
import DesignationPoolScreen from './src/screens/DesignationPoolScreen';
import EmployeePoolScreen from './src/screens/EmployeePoolScreen';
import ProjectPoolScreen from './src/screens/ProjectPoolScreen';
import QuickProjectDetailsScreen from './src/screens/QuickProjectDetailsScreen';
import QuickProjectGalleryScreen from './src/screens/QuickProjectGalleryScreen';
import EmployeeProjectDetailsScreen from './src/screens/EmployeeProjectDetailsScreen';
import EmployeeQuickDetailsScreen from './src/screens/EmployeeQuickDetailsScreen';
import QuickReportScreen from './src/screens/QuickReportScreen';
import QuickAddWorkLogScreen from './src/screens/QuickAddWorkLogScreen';

// Organization Screens (Developer)
import OrganizationsScreen from './src/screens/OrganizationsScreen';
import OrganizationDetailScreen from './src/screens/OrganizationDetailScreen';

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
              <Stack.Screen name="Organizations" component={OrganizationsScreen} />
              <Stack.Screen name="OrganizationDetail" component={OrganizationDetailScreen} />
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
              <Stack.Screen name="ProjectWorkLog" component={ProjectWorkLogScreen} />
              <Stack.Screen name="SiteUpdateHistory" component={SiteUpdateHistoryScreen} />
              <Stack.Screen name="ProjectGallery" component={ProjectGalleryScreen} />
              <Stack.Screen name="MemberProjectDetail" component={MemberProjectDetailScreen} />
            </>
          )}

          {session.role === ROLES.ADMIN && (
            <>
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
              <Stack.Screen name="SupportDevScreen" component={SupportDevScreen} />
              <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />

              {/* Reports */}
              <Stack.Screen name="Report" component={ReportScreen} />
              <Stack.Screen name="EmployeeSelection" component={EmployeeSelectionScreen} />
              <Stack.Screen name="ProjectSelection" component={ProjectSelectionScreen} />
              <Stack.Screen name="ReportOptions" component={ReportOptionsScreen} />
              <Stack.Screen name="ReportPreview" component={ReportPreviewScreen} />

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

              {/* Clients */}
              <Stack.Screen name="Clients" component={ClientsScreen} />

              {/* Project Management */}
              <Stack.Screen name="CreateProject" component={CreateProjectScreen} />
              <Stack.Screen name="ProjectList" component={ProjectListScreen} />
              <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
              <Stack.Screen name="WorkerChecklist" component={WorkerChecklistScreen} />
              <Stack.Screen name="WorksitePhotoUpload" component={WorksitePhotoUploadScreen} />
              <Stack.Screen name="ProjectWorkLog" component={ProjectWorkLogScreen} />
              <Stack.Screen name="SiteUpdateHistory" component={SiteUpdateHistoryScreen} />
              <Stack.Screen name="ProjectGallery" component={ProjectGalleryScreen} />
              <Stack.Screen name="MemberProjectDetail" component={MemberProjectDetailScreen} />

              {/* Records & Logs */}
              <Stack.Screen name="AttendanceRecords" component={AttendanceRecordsScreen} />
              <Stack.Screen name="WorkLogsView" component={WorkLogsViewScreen} />

              {/* Attendance & Work */}
              <Stack.Screen name="AttendanceCamera" component={AttendanceCameraScreen} />
              <Stack.Screen name="WorkLog" component={WorkLogScreen} />

              {/* Settings */}
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="QuickPage" component={QuickPageScreen} />
              <Stack.Screen name="DesignationPool" component={DesignationPoolScreen} />
              <Stack.Screen name="EmployeePool" component={EmployeePoolScreen} />
              <Stack.Screen name="ProjectPool" component={ProjectPoolScreen} />
              <Stack.Screen name="QuickProjectDetails" component={QuickProjectDetailsScreen} />
              <Stack.Screen name="QuickProjectGallery" component={QuickProjectGalleryScreen} />
              <Stack.Screen name="EmployeeProjectDetails" component={EmployeeProjectDetailsScreen} />
              <Stack.Screen name="EmployeeQuickDetails" component={EmployeeQuickDetailsScreen} />
              <Stack.Screen name="QuickReport" component={QuickReportScreen} />
              <Stack.Screen name="QuickAddWorkLog" component={QuickAddWorkLogScreen} />
            </>
          )}

          {session.role === ROLES.SUPER_ADMIN && (
            <>
              <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} />
              <Stack.Screen name="SupportDevScreen" component={SupportDevScreen} />
              <Stack.Screen name="Report" component={ReportScreen} />
              <Stack.Screen name="EmployeeSelection" component={EmployeeSelectionScreen} />
              <Stack.Screen name="ProjectSelection" component={ProjectSelectionScreen} />
              <Stack.Screen name="ReportOptions" component={ReportOptionsScreen} />
              <Stack.Screen name="ReportPreview" component={ReportPreviewScreen} />
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

              {/* Clients */}
              <Stack.Screen name="Clients" component={ClientsScreen} />

              {/* Projects */}
              <Stack.Screen name="CreateProject" component={CreateProjectScreen} />
              <Stack.Screen name="ProjectList" component={ProjectListScreen} />
              <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
              <Stack.Screen name="WorkerChecklist" component={WorkerChecklistScreen} />
              <Stack.Screen name="WorksitePhotoUpload" component={WorksitePhotoUploadScreen} />
              <Stack.Screen name="ProjectWorkLog" component={ProjectWorkLogScreen} />
              <Stack.Screen name="SiteUpdateHistory" component={SiteUpdateHistoryScreen} />
              <Stack.Screen name="ProjectGallery" component={ProjectGalleryScreen} />
              <Stack.Screen name="MemberProjectDetail" component={MemberProjectDetailScreen} />

              {/* Records & Reports */}
              <Stack.Screen name="AttendanceRecords" component={AttendanceRecordsScreen} />
              <Stack.Screen name="WorkLogsView" component={WorkLogsViewScreen} />
              <Stack.Screen name="Reports" component={ReportsScreen} />

              {/* Profile & Settings */}
              <Stack.Screen name="OrganizationProfile" component={OrganizationProfileScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="QuickPage" component={QuickPageScreen} />
              <Stack.Screen name="DesignationPool" component={DesignationPoolScreen} />
              <Stack.Screen name="EmployeePool" component={EmployeePoolScreen} />
              <Stack.Screen name="ProjectPool" component={ProjectPoolScreen} />
              <Stack.Screen name="QuickProjectDetails" component={QuickProjectDetailsScreen} />
              <Stack.Screen name="QuickProjectGallery" component={QuickProjectGalleryScreen} />
              <Stack.Screen name="EmployeeProjectDetails" component={EmployeeProjectDetailsScreen} />
              <Stack.Screen name="EmployeeQuickDetails" component={EmployeeQuickDetailsScreen} />
              <Stack.Screen name="QuickReport" component={QuickReportScreen} />
              <Stack.Screen name="QuickAddWorkLog" component={QuickAddWorkLogScreen} />
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
