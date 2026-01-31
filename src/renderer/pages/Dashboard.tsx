import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

interface Props {
  companyId: string;
  onLogout: () => void;
}

const Dashboard: React.FC<Props> = ({ onLogout }) => {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Make New Bill',
      icon: '📝',
      path: '/make-bill',
      color: '#10b981',
    },
    {
      title: 'Item Master',
      icon: '📦',
      path: '/item-master',
      color: '#3b82f6',
    },
    {
      title: 'Purchase Item',
      icon: '🛒',
      path: '/purchase',
      color: '#f59e0b',
    },
    {
      title: 'Stock',
      icon: '📊',
      path: '/stock',
      color: '#8b5cf6',
    },
  ];

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <button className="btn btn-secondary" onClick={handleLogout}>
          ← Back to Companies
        </button>
      </div>

      <div className="dashboard-grid">
        {menuItems.map((item) => (
          <div
            key={item.path}
            className="dashboard-card"
            onClick={() => navigate(item.path)}
            style={{ borderTop: `4px solid ${item.color}` }}
          >
            <div className="dashboard-card-icon" style={{ background: item.color }}>
              {item.icon}
            </div>
            <h3 className="dashboard-card-title">{item.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
