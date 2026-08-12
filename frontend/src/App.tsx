import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { ProductsPage } from './pages/ProductsPage';
import { ChallansPage } from './pages/ChallansPage';
import { StockLogsPage } from './pages/StockLogsPage';
import { UserRole } from './types';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  const roleAllowedTabs: Record<UserRole, string[]> = {
    ADMIN: ['dashboard', 'customers', 'products', 'challans', 'stock-logs'],
    SALES: ['dashboard', 'customers', 'challans'],
    WAREHOUSE: ['dashboard', 'products', 'challans', 'stock-logs'],
    ACCOUNTS: ['dashboard', 'customers', 'challans'],
  };

  useEffect(() => {
    if (user) {
      const allowed = roleAllowedTabs[user.role] || ['dashboard'];
      if (!allowed.includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    }
  }, [user, currentTab]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Loading Operations Portal...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Operational Dashboard', subtitle: 'Overview of metrics and activities tailored for your role' },
    customers: { title: 'Customer CRM Module', subtitle: 'Manage leads, active accounts, contact info, and follow-up notes' },
    products: { title: 'Product & Inventory Module', subtitle: 'Manage products, pricing, stock alerts, and manual inventory adjustments' },
    challans: { title: 'Sales Delivery Challans', subtitle: 'Generate sales challans, track dispatches, and export PDF invoices' },
    'stock-logs': { title: 'Stock Movement Audit Log', subtitle: 'Full audit history of all inventory IN/OUT operations' },
  };

  const activeHeader = tabTitles[currentTab] || tabTitles.dashboard;

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="main-content">
        <Topbar title={activeHeader.title} subtitle={activeHeader.subtitle} />

        <div className="content-body">
          {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
          {currentTab === 'customers' && <CustomersPage />}
          {currentTab === 'products' && <ProductsPage />}
          {currentTab === 'challans' && <ChallansPage />}
          {currentTab === 'stock-logs' && <StockLogsPage />}
        </div>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
