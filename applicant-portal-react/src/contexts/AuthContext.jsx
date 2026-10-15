import { createContext, useContext, useEffect, useState } from 'react';
import salesforceService from '../services/salesforceService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children, initialData }) => {
  salesforceService.initialize();

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (initialData?.isLoggedIn !== undefined) return initialData.isLoggedIn;
    return salesforceService.isLoggedIn;
  });
  const [userName, setUserName] = useState(() => {
    if (initialData?.userName) return initialData.userName;
    return salesforceService.userName || 'Applicant User';
  });
  const [profileStatus, setProfileStatus] = useState(() => {
    if (initialData?.profileStatus) return initialData.profileStatus;
    return salesforceService.profileStatus || null;
  });
  const [loading, setLoading] = useState(false);

  const refreshProfileStatus = async () => {
    try {
      const status = await salesforceService.getProfileStatus();
      if (status && status !== 'NO_PROFILE') {
        setProfileStatus(status);
        return status;
      }
      const profile = await salesforceService.getCurrentUserProfile();
      if (profile?.Profile_Status__c) {
        setProfileStatus(profile.Profile_Status__c);
        return profile.Profile_Status__c;
      }
      setProfileStatus(status || 'NO_PROFILE');
      return status || 'NO_PROFILE';
    } catch (e) {
      console.warn('Failed to refresh profile status:', e);
      return profileStatus;
    }
  };

  useEffect(() => {
    if (initialData) {
      if (initialData.isLoggedIn !== undefined) setIsLoggedIn(initialData.isLoggedIn);
      if (initialData.userName !== undefined) setUserName(initialData.userName);
      if (initialData.profileStatus !== undefined) setProfileStatus(initialData.profileStatus);
    }
  }, [initialData]);

  useEffect(() => {
    if (!profileStatus && isLoggedIn) {
      refreshProfileStatus();
    }
  }, [isLoggedIn]);

  const logout = () => {
    salesforceService.logout();
  };

  const userInitials = (userName || 'Applicant User')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isVerified = profileStatus === 'Approved';

  const value = {
    isLoggedIn,
    userName,
    profileStatus,
    setProfileStatus,
    refreshProfileStatus,
    userInitials,
    isVerified,
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
