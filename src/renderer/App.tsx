import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CompanySelection from './pages/CompanySelection';
import Dashboard from './pages/Dashboard';
import ItemMaster from './pages/ItemMaster';
import PurchaseItem from './pages/PurchaseItem';
import StockManagement from './pages/StockManagement';
import MakeBill from './pages/MakeBill';
import MyProfile from './pages/MyProfile';

const App: React.FC = () => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    localStorage.getItem('selectedCompanyId')
  );

  useEffect(() => {
    if (selectedCompanyId) {
      localStorage.setItem('selectedCompanyId', selectedCompanyId);
    } else {
      localStorage.removeItem('selectedCompanyId');
    }
  }, [selectedCompanyId]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <CompanySelection onSelectCompany={setSelectedCompanyId} />
        }
      />
      <Route
        path="/dashboard"
        element={
          selectedCompanyId ? (
            <Dashboard companyId={selectedCompanyId} onLogout={() => setSelectedCompanyId(null)} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/item-master"
        element={
          selectedCompanyId ? (
            <ItemMaster companyId={selectedCompanyId} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/purchase"
        element={
          selectedCompanyId ? (
            <PurchaseItem companyId={selectedCompanyId} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/stock"
        element={
          selectedCompanyId ? (
            <StockManagement companyId={selectedCompanyId} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/make-bill"
        element={
          selectedCompanyId ? (
            <MakeBill companyId={selectedCompanyId} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="/profile" element={<MyProfile />} />
    </Routes>
  );
};

export default App;
