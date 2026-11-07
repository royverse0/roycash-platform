import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState({ isOpen: false, initialMode: 'login' });

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res.success && res.user) {
      if (res.token) {
        localStorage.setItem('roycash_token', res.token);
      }
      setUser(res.user);
      setAuthModal({ isOpen: false, initialMode: 'login' });
      await refreshUser();
      return res.user;
    }
  };

  const register = async (data) => {
    const res = await api.register(data);
    if (res.success && res.user) {
      if (res.token) {
        localStorage.setItem('roycash_token', res.token);
      }
      setUser(res.user);
      setAuthModal({ isOpen: false, initialMode: 'login' });
      await refreshUser();
      return res.user;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('roycash_token');
    setUser(null);
  };

  const openAuth = (mode = 'login') => {
    setAuthModal({ isOpen: true, initialMode: mode });
  };

  const closeAuth = () => {
    setAuthModal({ isOpen: false, initialMode: 'login' });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        openAuth,
        closeAuth,
        authModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
