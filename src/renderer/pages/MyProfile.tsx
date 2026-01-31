import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Profile } from '@shared/types';
import './MyProfile.css';

const MyProfile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Profile>({
    businessName: '',
    address: '',
    phone: '',
    gstNumber: '',
    pan: '',
    email: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await window.electronAPI.getProfile();
      if (profile) {
        setFormData(profile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.businessName.trim()) {
      alert('Business name is required');
      return;
    }

    try {
      await window.electronAPI.updateProfile({ profile: formData });
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    }
  };

  if (loading) {
    return <div className="page-container loading">Loading profile...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          ← Back
        </button>
      </div>

      <div className="profile-container">
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Business Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea
                className="form-input"
                rows={3}
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.gstNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, gstNumber: e.target.value })
                  }
                  placeholder="e.g., 22AAAAA0000A1Z5"
                />
              </div>
              <div className="form-group">
                <label className="form-label">PAN</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.pan}
                  onChange={(e) =>
                    setFormData({ ...formData, pan: e.target.value })
                  }
                  placeholder="e.g., AAAAA0000A"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Save Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
