import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Customer, FollowUp } from '../types';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Filter, Phone, Mail, Building, Eye, Edit, Calendar, MessageSquare, AlertCircle } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerFollowUps, setCustomerFollowUps] = useState<FollowUp[]>([]);
  const [newFollowUpNote, setNewFollowUpNote] = useState('');
  const [newFollowUpDate, setNewFollowUpDate] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'Retail',
    address: '',
    status: 'Lead',
    followUpDate: '',
    notes: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canEdit = hasRole(['ADMIN', 'SALES']);

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, typeFilter, page]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: {
          search,
          status: statusFilter,
          customerType: typeFilter,
          page,
          limit: 8,
        },
      });
      if (res.data.success) {
        setCustomers(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      customerType: 'Retail',
      address: '',
      status: 'Lead',
      followUpDate: '',
      notes: '',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      businessName: customer.businessName,
      gstNumber: customer.gstNumber || '',
      customerType: customer.customerType,
      address: customer.address,
      status: customer.status,
      followUpDate: customer.followUpDate ? customer.followUpDate.split('T')[0] : '',
      notes: customer.notes || '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenDetailModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
    try {
      const res = await api.get(`/customers/${customer.id}`);
      if (res.data.success) {
        setSelectedCustomer(res.data.data);
        setCustomerFollowUps(res.data.data.followUps || []);
      }
    } catch (err) {
      console.error('Failed to load customer details', err);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.post('/customers', formData);
      if (res.data.success) {
        setIsAddModalOpen(false);
        fetchCustomers();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to add customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.put(`/customers/${selectedCustomer.id}`, formData);
      if (res.data.success) {
        setIsEditModalOpen(false);
        fetchCustomers();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFollowUpNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !newFollowUpNote.trim()) return;

    try {
      const res = await api.post(`/customers/${selectedCustomer.id}/followups`, {
        note: newFollowUpNote,
        followUpDate: newFollowUpDate || undefined,
      });

      if (res.data.success) {
        setCustomerFollowUps([res.data.data, ...customerFollowUps]);
        setNewFollowUpNote('');
        setNewFollowUpDate('');
        fetchCustomers();
      }
    } catch (err) {
      console.error('Failed to add follow-up note', err);
    }
  };

  return (
    <div>
      <div className="table-container" style={{ marginBottom: '24px' }}>
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by customer name, business, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={16} style={{ color: '#64748b' }} />
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Lead">Lead</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Distributor">Distributor</option>
            </select>

            {canEdit && (
              <button className="btn btn-primary" onClick={handleOpenAddModal}>
                <Plus size={18} /> Add Customer
              </button>
            )}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Customer / Business</th>
              <th>Contact Info</th>
              <th>Type</th>
              <th>Status</th>
              <th>Follow-up Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  Loading customer records...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  No customers found matching search/filter criteria.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building size={12} /> {c.businessName}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} style={{ color: '#6366f1' }} /> {c.mobile}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={12} /> {c.email}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.customerType}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td>
                    {c.followUpDate ? (
                      <span style={{ fontSize: '0.84rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} /> {new Date(c.followUpDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>None</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleOpenDetailModal(c)} title="View Detail & Notes">
                        <Eye size={14} /> Details
                      </button>
                      {canEdit && (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleOpenEditModal(c)} title="Edit Customer">
                          <Edit size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Customer">
        {formError && (
          <div className="alert-toast alert-toast-error">
            <AlertCircle size={16} /> <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleAddSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Customer Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Business Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Mobile Number *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                className="form-control"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Customer Type</label>
              <select
                className="form-control"
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value as any })}
              >
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Distributor">Distributor</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="Lead">Lead</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>GST Number (Optional)</label>
              <input
                type="text"
                className="form-control"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Next Follow-up Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Address *</label>
            <textarea
              className="form-control"
              rows={2}
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Initial Notes / Requirement Overview</label>
            <textarea
              className="form-control"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Customer">
        {formError && (
          <div className="alert-toast alert-toast-error">
            <AlertCircle size={16} /> <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleEditSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Customer Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Business Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Mobile Number *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                className="form-control"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Customer Type</label>
              <select
                className="form-control"
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value as any })}
              >
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Distributor">Distributor</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="Lead">Lead</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>GST Number</label>
              <input
                type="text"
                className="form-control"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Next Follow-up Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Address *</label>
            <textarea
              className="form-control"
              rows={2}
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Customer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Customer Details & CRM History">
        {selectedCustomer && (
          <div>
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedCustomer.name}</h4>
                <span className={`badge badge-${selectedCustomer.status.toLowerCase()}`}>{selectedCustomer.status}</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '8px' }}>
                <strong>Business:</strong> {selectedCustomer.businessName} ({selectedCustomer.customerType})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.84rem', color: '#cbd5e1' }}>
                <div><strong>Mobile:</strong> {selectedCustomer.mobile}</div>
                <div><strong>Email:</strong> {selectedCustomer.email}</div>
                <div><strong>GST No:</strong> {selectedCustomer.gstNumber || 'N/A'}</div>
                <div><strong>Address:</strong> {selectedCustomer.address}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={16} style={{ color: '#6366f1' }} /> CRM Follow-Up Notes Timeline
            </h4>

            {canEdit && (
              <form onSubmit={handleAddFollowUpNote} style={{ marginBottom: '20px' }}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Log a call, meeting result, or follow-up note..."
                    required
                    value={newFollowUpNote}
                    onChange={(e) => setNewFollowUpNote(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="date"
                    className="form-control"
                    style={{ width: '200px' }}
                    value={newFollowUpDate}
                    onChange={(e) => setNewFollowUpDate(e.target.value)}
                  />
                  <button type="submit" className="btn btn-sm btn-primary">
                    Log Note
                  </button>
                </div>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
              {customerFollowUps.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>No follow-up notes logged yet.</div>
              ) : (
                customerFollowUps.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.5)',
                      borderLeft: '3px solid #6366f1',
                      borderRadius: '6px',
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ fontSize: '0.88rem', color: '#f8fafc', marginBottom: '4px' }}>{f.note}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                      <span>By {f.user?.name} ({f.user?.role})</span>
                      <span>{new Date(f.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
