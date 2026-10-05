import { createContext, useContext, useEffect, useState } from 'react';
import salesforceService from '../services/salesforceService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [profileStatus, setProfileStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Salesforce service
    salesforceService.initialize();
    
    // Get initial data
    setIsLoggedIn(salesforceService.isLoggedIn);
    setUserName(salesforceService.userName);
    setProfileStatus(salesforceService.profileStatus);
    setLoading(false);
  }, []);

  const logout = () => {
    salesforceService.logout();
  };

  const value = {
    isLoggedIn,
    userName,
    profileStatus,
    loading,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
