import React, { createContext, useState, useEffect, useContext } from 'react';
import auth from '@react-native-firebase/auth';
import { getUserById } from '../services/firebaseService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Handle user state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in, fetch their data from Firestore
        try {
          const userData = await getUserById(user.uid);
          if (userData) {
            setSession({
              userId: user.uid,
              orgId: userData.orgId,
              role: userData.role,
              name: userData.name,
              email: userData.email,
              isLoggedIn: true,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        // User is signed out
        setSession(null);
      }

      if (initializing) {
        setInitializing(false);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [initializing]);

  const login = async (email, password) => {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const { uid } = userCredential.user;

      // Get user data from Firestore
      const userData = await getUserById(uid);

      if (userData) {
        const newSession = {
          userId: uid,
          orgId: userData.orgId,
          role: userData.role,
          name: userData.name,
          email: userData.email,
          isLoggedIn: true,
        };
        setSession(newSession);
        return { success: true, user: newSession };
      }

      return { success: false, message: 'User data not found' };
    } catch (error) {
      console.error('Login error:', error);
      let message = 'Login failed';

      if (error.code === 'auth/user-not-found') {
        message = 'No user found with this email';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address';
      } else if (error.code === 'auth/user-disabled') {
        message = 'This account has been disabled';
      }

      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await auth().signOut();
      setSession(null);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  const value = {
    session,
    loading: loading || initializing,
    login,
    logout,
    isAuthenticated: !!session?.isLoggedIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
