import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

const AuthStateContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ask the server "who am I?" using the login cookie/token. If it fails,
  // treat the user as logged out. Runs once when the app first loads.
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Send email/password to the server and store the returned user on success.
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    return data.user;
  };

  // Create a new account, then log the user in with the returned user data.
  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    setUser(data.user);
    return data.user;
  };

  // Hands the ID token Google gave us to the server, which verifies it and
  // logs us into the matching (or newly created) account.
  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    setUser(data.user);
    return data.user;
  };

  // Tell the server to end the session, then clear the user locally.
  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  // Merge new fields into the current user without needing another API call.
  const updateUser = (patch) => setUser((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <AuthStateContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isStaff: user?.role === 'staff',
        isStaffOrAdmin: user?.role === 'admin' || user?.role === 'staff',
        login,
        register,
        loginWithGoogle,
        logout,
        refresh,
        updateUser,
      }}
    >
      {children}
    </AuthStateContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthStateContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
