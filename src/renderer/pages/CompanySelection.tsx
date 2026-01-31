import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Company } from '@shared/types';
import './CompanySelection.css';

interface Props {
  onSelectCompany: (companyId: string) => void;
}

const CompanySelection: React.FC<Props> = ({ onSelectCompany }) => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await window.electronAPI.getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Failed to load companies:', error);
      alert('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      alert('Please enter a company name');
      return;
    }

    try {
      await window.electronAPI.addCompany({ name: newCompanyName.trim() });
      setNewCompanyName('');
      setShowAddModal(false);
      await loadCompanies();
    } catch (error) {
      console.error('Failed to add company:', error);
      alert('Failed to add company');
    }
  };

  const handleEditCompany = async () => {
    if (!editingCompany || !editingCompany.name.trim()) {
      alert('Please enter a company name');
      return;
    }
    try {
      await window.electronAPI.updateCompany({
        id: editingCompany.id,
        name: editingCompany.name.trim(),
      });
      setEditingCompany(null);
      setShowEditModal(false);
      await loadCompanies();
    } catch (error) {
      console.error('Failed to update company:', error);
      alert('Failed to update company');
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!confirm(`Are you sure you want to delete "${companyName}"? This will delete all associated data.`)) {
      return;
    }
    try {
      await window.electronAPI.deleteCompany({ id: companyId });
      await loadCompanies();
    } catch (error) {
      console.error('Failed to delete company:', error);
      alert('Failed to delete company');
    }
  };

  const openEditModal = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCompany({ ...company });
    setShowEditModal(true);
  };

  const openDeleteConfirm = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    handleDeleteCompany(company.id, company.name);
  };

  const handleSelectCompany = (companyId: string) => {
    onSelectCompany(companyId);
    navigate('/dashboard');
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="company-selection-container">
        <div className="loading">Loading companies...</div>
      </div>
    );
  }

  return (
    <div className="company-selection-container">
      <div className="company-selection-content">
        <h1 className="app-title">Vivekananda Battery Centre</h1>
        <p className="app-subtitle">Select a company to continue</p>

        <div className="companies-grid">
          {companies.map((company) => (
            <div
              key={company.id}
              className="company-card"
              onClick={() => handleSelectCompany(company.id)}
            >
              <div className="company-card-actions">
                <button
                  className="icon-btn edit-btn"
                  onClick={(e) => openEditModal(company, e)}
                  title="Edit company"
                >
                  ✎
                </button>
                <button
                  className="icon-btn delete-btn"
                  onClick={(e) => openDeleteConfirm(company, e)}
                  title="Delete company"
                >
                  🗑
                </button>
              </div>
              <div className="company-initials">{getInitials(company.name)}</div>
              <div className="company-name">{company.name}</div>
            </div>
          ))}
        </div>

        <div className="action-buttons">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Company
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/profile')}>
            My Profile
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Company</h2>
              <button
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCompany()}
                  autoFocus
                  placeholder="Enter company name"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddCompany}>
                Add Company
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingCompany && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Company</h2>
              <button
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleEditCompany()}
                  autoFocus
                  placeholder="Enter company name"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleEditCompany}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySelection;
