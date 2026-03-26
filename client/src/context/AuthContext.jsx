import React, { createContext, useState, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('jjlove_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const loading = false;

  const login = async (userId, pin) => {
    try {
      const response = await api.login({ userId, pin });
      if (response.data.success) {
        setUser(response.data.user);
        localStorage.setItem('jjlove_user', JSON.stringify(response.data.user));
        return { success: true };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jjlove_user');
  };

  const updateUser = (userData) => {
    setUser(prev => {
      const updatedUser = { ...prev, ...userData };
      localStorage.setItem('jjlove_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
