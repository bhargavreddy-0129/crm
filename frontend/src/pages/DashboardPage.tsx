import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { DashboardStats, Challan, FollowUp } from '../types';
import { useAuth } from '../context/AuthContext';
import { Users, Package, AlertTriangle, FileText, IndianRupee, ArrowUpRight, Clock, Plus, Download, Shield, Briefcase, Receipt } from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentChallans, setRecentChallans] = useState<Challan[]>([]);
  const [recentFollowUps, setRecentFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.stats);
        setRecentChallans(res.data.recentChallans || []);
        setRecentFollowUps(res.data.recentFollowUps || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (challanId: string, challanNumber?: string) => {
    try {
      const res = await api.get(`/challans/${challanId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${challanNumber || 'Sales_Challan'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF', err);
      alert('Failed to download PDF. Please try again.');
    }
  };

  if (loading) {
    return <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Loading panel dashboard data...</div>;
  }

  const role = user?.role || 'ADMIN';

  return (
    <div>
      {/* ROLE 1: ADMIN PANEL DASHBOARD */}
      {role === 'ADMIN' && (
        <>
          <div className="card-grid">
            <div className="stat-card" onClick={() => onNavigate('customers')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <Users size={26} />
              </div>
              <div>
                <div className="stat-value">{stats?.totalCustomers || 0}</div>
                <div className="stat-label">Total Customers ({stats?.activeCustomers} Active, {stats?.leadCustomers} Leads)</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => onNavigate('products')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                <Package size={26} />
              </div>
              <div>
                <div className="stat-value">{stats?.totalProducts || 0}</div>
                <div className="stat-label">Products in Inventory</div>
              </div>
            </div>

            <div
              className="stat-card"
              onClick={() => onNavigate('products')}
              style={{
                cursor: 'pointer',
                border: stats && stats.lowStockCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
              }}
            >
              <div
                className="stat-icon-wrapper"
                style={{
                  background: stats && stats.lowStockCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                  color: stats && stats.lowStockCount > 0 ? '#ef4444' : '#10b981',
                }}
              >
                <AlertTriangle size={26} />
              </div>
              <div>
                <div className="stat-value" style={{ color: stats && stats.lowStockCount > 0 ? '#ef4444' : '#f8fafc' }}>
                  {stats?.lowStockCount || 0}
                </div>
                <div className="stat-label">Low Stock Alerts</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => onNavigate('challans')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <IndianRupee size={26} />
              </div>
              <div>
                <div className="stat-value">₹{(stats?.totalRevenue || 0).toLocaleString()}</div>
                <div className="stat-label">Total Confirmed Revenue</div>
              </div>
            </div>
          </div>

          {stats && stats.lowStockCount > 0 && (
            <div className="alert-toast alert-toast-error" style={{ marginBottom: '24px' }}>
              <AlertTriangle size={20} />
              <div style={{ flex: 1 }}>
                <strong>Attention: {stats.lowStockCount} product(s) are below minimum stock alert thresholds!</strong>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('products')}>
                Manage Inventory
              </button>
            </div>
          )}
        </>
      )}

      {/* ROLE 2: SALES PANEL DASHBOARD */}
      {role === 'SALES' && (
        <>
          <div className="card-grid">
            <div className="stat-card" onClick={() => onNavigate('customers')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <Briefcase size={26} />
              </div>
              <div>
                <div className="stat-value">{stats?.totalCustomers || 0}</div>
                <div className="stat-label">Assigned Accounts ({stats?.leadCustomers} Pending Leads)</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => onNavigate('challans')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                <FileText size={26} />
              </div>
              <div>
                <div className="stat-value">{stats?.totalChallans || 0}</div>
                <div className="stat-label">Sales Challans ({stats?.draftChallansCount} Drafts)</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <IndianRupee size={26} />
              </div>
              <div>
                <div className="stat-value">₹{(stats?.totalRevenue || 0).toLocaleString()}</div>
                <div className="stat-label">Sales Revenue Pipeline</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('customers')}>
              <Plus size={18} /> Add New Lead / Customer
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('challans')}>
              <Plus size={18} /> Generate Sales Challan
            </button>
          </div>
        </>
      )}

      {/* ROLE 3: WAREHOUSE PANEL DASHBOARD */}
      {role === 'WAREHOUSE' && (
        <>
          <div className="card-grid">
            <div className="stat-card" onClick={() => onNavigate('products')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <Package size={26} />
              </div>
              <div>
                <div className="stat-value">{stats?.totalProducts || 0}</div>
                <div className="stat-label">Stock SKUs Tracked</div>
              </div>
            </div>

            <div
              className="stat-card"
              onClick={() => onNavigate('products')}
              style={{
                cursor: 'pointer',
                border: stats && stats.lowStockCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
              }}
            >
              <div
                className="stat-icon-wrapper"
                style={{
                  background: stats && stats.lowStockCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                  color: stats && stats.lowStockCount > 0 ? '#ef4444' : '#10b981',
                }}
              >
                <AlertTriangle size={26} />
              </div>
              <div>
                <div className="stat-value" style={{ color: stats && stats.lowStockCount > 0 ? '#ef4444' : '#f8fafc' }}>
                  {stats?.lowStockCount || 0}
                </div>
                <div className="stat-label">Stock Re-order Alerts</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => onNavigate('stock-logs')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                <Clock size={26} />
              </div>
              <div>
                <div className="stat-value">{stats?.confirmedChallansCount || 0}</div>
                <div className="stat-label">Dispatched Challans</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('products')}>
              <Package size={18} /> Manage Inventory Stock (IN/OUT)
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate('stock-logs')}>
              <Clock size={18} /> View Stock Audit Logs
            </button>
          </div>
        </>
      )}

      {/* ROLE 4: ACCOUNTS PANEL DASHBOARD */}
      {role === 'ACCOUNTS' && (
        <>
          <div className="card-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <Receipt size={26} />
              </div>
              <div>
                <div className="stat-value">₹{(stats?.totalRevenue || 0).toLocaleString()}</div>
                <div className="stat-label">Total Confirmed Revenue</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => onNavigate('challans')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <FileText size={26} />
              </div>
              <div>
                <div className="stat-value">{stats?.confirmedChallansCount || 0}</div>
                <div className="stat-label">Confirmed Paid Invoices</div>
              </div>
            </div>

            <div className="stat-card" onClick={() => onNavigate('challans')} style={{ cursor: 'pointer' }}>
              <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <Clock size={26} />
              </div>
              <div>
                <div className="stat-value">{stats?.draftChallansCount || 0}</div>
                <div className="stat-label">Pending / Draft Invoices</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Shared Activity & History Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: role === 'ACCOUNTS' ? '1fr' : '1fr 1fr', gap: '24px' }}>
        {/* Recent Challans / Invoices Table */}
        <div className="table-container" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#6366f1' }} />
              {role === 'ACCOUNTS' ? 'Sales Invoices & Revenue Billing' : 'Recent Sales Challans'}
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('challans')}>
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentChallans.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.88rem' }}>No recent challans found.</div>
            ) : (
              recentChallans.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.challanNumber}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {c.customer?.businessName || c.customer?.name} • {c.totalQty} items
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>
                        ₹{c.totalAmount.toLocaleString()}
                      </div>
                      <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                    </div>
                    {role === 'ACCOUNTS' && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleDownloadPdf(c.id)}
                        title="Download PDF Invoice"
                      >
                        <Download size={14} /> PDF
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent CRM Follow-ups (Only for Admin, Sales, Warehouse) */}
        {role !== 'ACCOUNTS' && (
          <div className="table-container" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} style={{ color: '#3b82f6' }} />
                Recent CRM Follow-Up Activity
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('customers')}>
                Manage Leads <ArrowUpRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentFollowUps.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No recent follow-ups logged.</div>
              ) : (
                recentFollowUps.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#6366f1' }}>{f.customer?.businessName}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>{f.note}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      By {f.user?.name} ({f.user?.role})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
