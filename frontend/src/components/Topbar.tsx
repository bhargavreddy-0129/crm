import React from 'react';
import { Calendar, Shield, Briefcase, Package, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface TopbarProps {
  title: string;
  subtitle: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle }) => {
  const { user } = useAuth();
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const getRolePanelBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return { label: '👑 Admin Control Panel', color: '#ef4444', icon: Shield };
      case 'SALES':
        return { label: '💼 Sales & CRM Panel', color: '#3b82f6', icon: Briefcase };
      case 'WAREHOUSE':
        return { label: '📦 Warehouse Operations Panel', color: '#f59e0b', icon: Package };
      case 'ACCOUNTS':
        return { label: '📊 Accounts & Finance Panel', color: '#10b981', icon: Receipt };
    }
  };

  const badgeInfo = user ? getRolePanelBadge(user.role) : null;
  const BadgeIcon = badgeInfo?.icon;

  return (
    <header className="topbar">
      <div className="page-title-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1>{title}</h1>
          {badgeInfo && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '12px',
                background: `${badgeInfo.color}20`,
                color: badgeInfo.color,
                border: `1px solid ${badgeInfo.color}40`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {BadgeIcon && <BadgeIcon size={12} />}
              {badgeInfo.label}
            </span>
          )}
        </div>
        <p>{subtitle}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            color: '#94a3b8',
            background: 'rgba(30, 41, 59, 0.6)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Calendar size={14} />
          <span>{todayFormatted}</span>
        </div>
      </div>
    </header>
  );
};
