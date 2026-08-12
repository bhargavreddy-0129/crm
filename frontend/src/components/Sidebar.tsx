import React from 'react';
import { LayoutDashboard, Users, Package, FileText, ClipboardList, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout } = useAuth();

  const allNavItems = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[] },
    { id: 'customers', label: 'Customer CRM', icon: Users, roles: ['ADMIN', 'SALES', 'ACCOUNTS'] as UserRole[] },
    { id: 'products', label: 'Inventory & Products', icon: Package, roles: ['ADMIN', 'WAREHOUSE'] as UserRole[] },
    { id: 'challans', label: 'Sales Challans', icon: FileText, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[] },
    { id: 'stock-logs', label: 'Stock Audit Log', icon: ClipboardList, roles: ['ADMIN', 'WAREHOUSE'] as UserRole[] },
  ];

  const userNavItems = user
    ? allNavItems.filter((item) => item.roles.includes(user.role))
    : allNavItems;

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const panelTitles: Record<UserRole, string> = {
    ADMIN: 'Admin Panel',
    SALES: 'Sales Portal',
    WAREHOUSE: 'Warehouse Portal',
    ACCOUNTS: 'Accounts Portal',
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">ERP</div>
        <div>
          <div className="brand-text">Mini ERP + CRM</div>
          <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 700 }}>
            {user ? panelTitles[user.role] : 'Operations Portal'}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {userNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {user && (
        <div className="sidebar-user">
          <div className="user-avatar">{getInitials(user.name)}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <span className={`user-role-badge role-${user.role}`}>{user.role}</span>
          </div>
          <button className="logout-btn" onClick={logout} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      )}
    </aside>
  );
};
