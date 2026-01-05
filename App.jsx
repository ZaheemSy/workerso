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
import AttendanceCameraScreen from './src/screens/AttendanceCameraScreen';
import WorkLogScreen from './src/screens/WorkLogScreen';

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
          {session.role === ROLES.WORKER && (
            <>
              <Stack.Screen name="WorkerDashboard" component={WorkerDashboard} />
              <Stack.Screen name="AttendanceCamera" component={AttendanceCameraScreen} />
              <Stack.Screen name="WorkLog" component={WorkLogScreen} />
            </>
          )}

          {session.role === ROLES.ADMIN && (
            <>
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
              <Stack.Screen name="AttendanceCamera" component={AttendanceCameraScreen} />
              <Stack.Screen name="WorkLog" component={WorkLogScreen} />
            </>
          )}

          {session.role === ROLES.SUPER_ADMIN && (
            <>
              <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} />
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
