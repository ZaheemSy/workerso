import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {
  saveSession,
  clearSession,
  authenticateUser,
  initializeDeveloperUser,
  getUserByEmail,
  upsertUser,
  upsertOrganization,
} from '../services/storageService';

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

  const syncProfileToLocalStore = useCallback(async (profile) => {
    if (profile.orgId) {
      await upsertOrganization({
        orgId: profile.orgId,
        companyName: profile.orgName || 'Organization',
        industry: profile.industry || '',
        address: profile.address || '',
        logoUri: profile.logoUri || null,
      });
    }

    await upsertUser({
      userId: profile.userId,
      orgId: profile.orgId || null,
      role: profile.role,
      name: profile.name || '',
      email: profile.email || '',
      username: profile.username || (profile.email ? profile.email.split('@')[0] : ''),
      phone: profile.phone || '',
      designation: profile.designation || '',
      extraDetails: profile.extraDetails || {},
    });
  }, []);

  const buildFirebaseSession = useCallback(async (uid, email) => {
    try {
      let profileDoc = await firestore().collection('users').doc(uid).get();
      let profile = profileDoc.exists ? profileDoc.data() : null;

      if (!profile && email) {
        const localUser = await getUserByEmail(email);
        if (localUser) {
          const fallbackProfile = {
            userId: localUser.userId || uid,
            uid,
            orgId: localUser.orgId || null,
            role: localUser.role || 'employee',
            name: localUser.name || '',
            email: email.toLowerCase(),
            designation: localUser.designation || '',
            username: localUser.username || email.split('@')[0],
          };
          await firestore().collection('users').doc(uid).set({
            ...fallbackProfile,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
          profile = fallbackProfile;
        }
      }

      if (!profile) {
        return null;
      }

      const normalizedProfile = {
        userId: profile.userId || uid,
        uid,
        orgId: profile.orgId || null,
        role: profile.role,
        name: profile.name || '',
        email: profile.email || email || '',
        designation: profile.designation || '',
        username: profile.username || (profile.email ? profile.email.split('@')[0] : ''),
        extraDetails: profile.extraDetails || {},
      };

      await syncProfileToLocalStore(normalizedProfile);

      return {
        userId: normalizedProfile.userId,
        orgId: normalizedProfile.orgId,
        role: normalizedProfile.role,
        name: normalizedProfile.name,
        email: normalizedProfile.email,
        designation: normalizedProfile.designation,
        isLoggedIn: true,
      };
    } catch (error) {
      console.error('Error building Firebase session:', error);
      return null;
    }
  }, [syncProfileToLocalStore]);

  const checkSession = useCallback(async () => {
    try {
      // Initialize developer user on app start
      await initializeDeveloperUser();

      const firebaseUser = auth().currentUser;
      if (firebaseUser) {
        const firebaseSession = await buildFirebaseSession(firebaseUser.uid, firebaseUser.email);
        if (firebaseSession) {
          setSession(firebaseSession);
          await saveSession(firebaseSession);
          return;
        }
      }
      await clearSession();
      setSession(null);
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  }, [buildFirebaseSession]);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async firebaseUser => {
      if (firebaseUser) {
        const firebaseSession = await buildFirebaseSession(firebaseUser.uid, firebaseUser.email);
        if (firebaseSession) {
          setSession(firebaseSession);
          await saveSession(firebaseSession);
        } else {
          setSession(null);
          await clearSession();
        }
      } else {
        setSession(null);
        await clearSession();
      }
    });

    checkSession();
    return unsubscribe;
  }, [buildFirebaseSession, checkSession]);

  const login = async (usernameOrEmail, password) => {
    try {
      const identifier = (usernameOrEmail || '').trim().toLowerCase();

      let email = identifier;
      if (!identifier.includes('@')) {
        const localUser = await authenticateUser(identifier, password);
        if (!localUser?.email) {
          return {
            success: false,
            message: 'Use your email to login. Username login is no longer supported.',
          };
        }
        email = localUser.email.toLowerCase();
      }

      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const firebaseSession = await buildFirebaseSession(
        userCredential.user.uid,
        userCredential.user.email
      );
      if (firebaseSession) {
        await saveSession(firebaseSession);
        setSession(firebaseSession);
        return { success: true, user: firebaseSession };
      }

      // One-time migration path: if firebase user exists but profile is missing, seed from local user by email
      const localUser = await getUserByEmail(email);
      if (localUser) {
        await firestore().collection('users').doc(userCredential.user.uid).set(
          {
            userId: localUser.userId,
            uid: userCredential.user.uid,
            orgId: localUser.orgId || null,
            role: localUser.role || 'employee',
            name: localUser.name || '',
            email,
            designation: localUser.designation || '',
            username: localUser.username || email.split('@')[0],
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        const migratedSession = await buildFirebaseSession(
          userCredential.user.uid,
          userCredential.user.email
        );
        if (migratedSession) {
          await saveSession(migratedSession);
          setSession(migratedSession);
          return { success: true, user: migratedSession };
        }
      }

      return {
        success: false,
        message: 'Profile not found. Contact support to complete account setup.',
      };
    } catch (error) {
      console.error('Login error:', error);
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/invalid-email'
      ) {
        return { success: false, message: 'Invalid credentials' };
      }
      return { success: false, message: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await auth().signOut();
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
