import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSession, saveSession, clearSession, authenticateUser, initializeDeveloperUser } from '../services/storageService';

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

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // Initialize developer user on app start
      await initializeDeveloperUser();

      const savedSession = await getSession();
      if (savedSession && savedSession.isLoggedIn) {
        setSession(savedSession);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const user = await authenticateUser(username, password);
      if (user) {
        const newSession = {
          userId: user.userId,
          orgId: user.orgId,
          role: user.role,
          name: user.name,
          designation: user.designation,
          isLoggedIn: true,
        };
        await saveSession(newSession);
        setSession(newSession);
        return { success: true, user: newSession };
      }
      return { success: false, message: 'Invalid credentials' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await clearSession();
      setSession(null);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  };

  const value = {
    session,
    loading,
    login,
    logout,
    isAuthenticated: !!session?.isLoggedIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
