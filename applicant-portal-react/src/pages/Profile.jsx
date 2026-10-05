import { useEffect, useState } from 'react';
import salesforceService from '../services/salesforceService';
import './Profile.css';

const Profile = () => {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profileData, statusData] = await Promise.all([
        salesforceService.getCurrentUserProfile(),
        salesforceService.getProfileStatus()
      ]);
      setProfile(profileData || {});
      setProfileStatus(statusData);
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (profile.Id) {
        // Update existing profile
        await salesforceService.createProfile(profile);
      } else {
        // Create new profile
        const result = await salesforceService.createProfile(profile);
        setProfile(result);
      }
      alert('Profile saved successfully');
    } catch (err) {
      console.error('Failed to save profile', err);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!profile.Id) {
      alert('Please save your profile first');
      return;
    }

    try {
      setSaving(true);
      await salesforceService.submitProfileForApproval(profile.Id);
      alert('Profile submitted for approval');
      await loadProfile();
    } catch (err) {
      console.error('Failed to submit profile', err);
      alert('Failed to submit profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  const getStatusClass = () => {
    if (!profileStatus) return 'incomplete';
    if (profileStatus.includes('Pending')) return 'pending';
    if (profileStatus.includes('Approved')) return 'approved';
    if (profileStatus.includes('Rejected')) return 'rejected';
    return 'incomplete';
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
      </div>

      {profileStatus && (
        <div className={`profile-status-banner ${getStatusClass()}`}>
          Profile Status: {profileStatus}
        </div>
      )}

      <form className="profile-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-section">
          <h2>Basic Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Organization Name *</label>
              <input
                type="text"
                value={profile.Organization_Name__c || ''}
                onChange={(e) => handleChange('Organization_Name__c', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Organization Type *</label>
              <select
                value={profile.Organization_Type__c || ''}
                onChange={(e) => handleChange('Organization_Type__c', e.target.value)}
                required
              >
                <option value="">Select Type</option>
                <option value="Academic Institution">Academic Institution</option>
                <option value="NGO">NGO</option>
                <option value="Startup">Startup</option>
                <option value="Research Organization">Research Organization</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Registration Number</label>
              <input
                type="text"
                value={profile.Registration_Number__c || ''}
                onChange={(e) => handleChange('Registration_Number__c', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Established Date</label>
              <input
                type="date"
                value={profile.Established_Date__c || ''}
                onChange={(e) => handleChange('Established_Date__c', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Contact Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={profile.Email__c || ''}
                onChange={(e) => handleChange('Email__c', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                value={profile.Phone__c || ''}
                onChange={(e) => handleChange('Phone__c', e.target.value)}
                required
              />
            </div>
            <div className="form-group full-width">
              <label>Address</label>
              <textarea
                value={profile.Address__c || ''}
                onChange={(e) => handleChange('Address__c', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                value={profile.City__c || ''}
                onChange={(e) => handleChange('City__c', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>State/Province</label>
              <input
                type="text"
                value={profile.State__c || ''}
                onChange={(e) => handleChange('State__c', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Postal Code</label>
              <input
                type="text"
                value={profile.Postal_Code__c || ''}
                onChange={(e) => handleChange('Postal_Code__c', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                value={profile.Country__c || ''}
                onChange={(e) => handleChange('Country__c', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>About Organization</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Mission Statement</label>
              <textarea
                value={profile.Mission_Statement__c || ''}
                onChange={(e) => handleChange('Mission_Statement__c', e.target.value)}
                placeholder="Describe your organization's mission and objectives..."
              />
            </div>
            <div className="form-group full-width">
              <label>Key Activities</label>
              <textarea
                value={profile.Key_Activities__c || ''}
                onChange={(e) => handleChange('Key_Activities__c', e.target.value)}
                placeholder="List your organization's main activities..."
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            onClick={handleSave} 
            className="btn-save"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          <button 
            type="button" 
            onClick={handleSubmitForApproval} 
            className="btn-submit"
            disabled={saving || !profile.Id || profileStatus?.includes('Pending')}
          >
            Submit for Approval
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
