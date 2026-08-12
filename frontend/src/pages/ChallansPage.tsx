import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Challan, Customer, Product } from '../types';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Filter, FileText, Download, CheckCircle, XCircle, Trash2, AlertCircle } from 'lucide-react';

interface ChallanItemInput {
  productId: string;
  quantity: number;
}

export const ChallansPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Confirmed'>('Draft');
  const [items, setItems] = useState<ChallanItemInput[]>([{ productId: '', quantity: 1 }]);

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canCreate = hasRole(['ADMIN', 'SALES']);

  useEffect(() => {
    fetchChallans();
  }, [search, statusFilter, page]);

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/challans', {
        params: { search, status: statusFilter, page, limit: 8 },
      });
      if (res.data.success) {
        setChallans(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch challans', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get('/customers?limit=100'),
        api.get('/products?limit=100'),
      ]);
      if (custRes.data.success) setCustomers(custRes.data.data);
      if (prodRes.data.success) setAvailableProducts(prodRes.data.data);
    } catch (err) {
      console.error('Failed to fetch dropdown data', err);
    }
  };

  const handleOpenCreateModal = () => {
    fetchDropdownData();
    setCustomerId('');
    setStatus('Draft');
    setItems([{ productId: '', quantity: 1 }]);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleOpenDetailModal = async (challan: Challan) => {
    setSelectedChallan(challan);
    setIsDetailModalOpen(true);
    try {
      const res = await api.get(`/challans/${challan.id}`);
      if (res.data.success) {
        setSelectedChallan(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch challan details', err);
    }
  };

  const handleAddItemRow = () => {
    setItems([...items, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ChallanItemInput, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    let grandTotal = 0;
    items.forEach((item) => {
      const prod = availableProducts.find((p) => p.id === item.productId);
      if (prod) {
        grandTotal += prod.unitPrice * (item.quantity || 0);
      }
    });
    return grandTotal;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!customerId) {
      setFormError('Please select a customer');
      return;
    }

    const invalidItems = items.some((i) => !i.productId || i.quantity <= 0);
    if (invalidItems) {
      setFormError('All items must have a valid product and positive quantity');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/challans', {
        customerId,
        status,
        items,
      });

      if (res.data.success) {
        setIsCreateModalOpen(false);
        fetchChallans();
      }
    } catch (err: any) {
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        setFormError(err.response.data.errors.join('\n'));
      } else {
        setFormError(err.response?.data?.message || 'Failed to create sales challan');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (challanId: string, newStatus: string) => {
    try {
      const res = await api.put(`/challans/${challanId}/status`, { status: newStatus });
      if (res.data.success) {
        fetchChallans();
        if (selectedChallan && selectedChallan.id === challanId) {
          setSelectedChallan(res.data.data);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update challan status');
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

  return (
    <div>
      <div className="table-container" style={{ marginBottom: '24px' }}>
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by challan number, customer name, business..."
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
                <option value="Draft">Draft</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {canCreate && (
              <button className="btn btn-primary" onClick={handleOpenCreateModal}>
                <Plus size={18} /> Create Sales Challan
              </button>
            )}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Challan Number</th>
              <th>Customer</th>
              <th>Total Qty</th>
              <th>Grand Total</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  Loading sales challans...
                </td>
              </tr>
            ) : challans.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  No sales challans found.
                </td>
              </tr>
            ) : (
              challans.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: '#6366f1', fontFamily: 'monospace' }}>{c.challanNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>By {c.user?.name}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{c.customer?.businessName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{c.customer?.name}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{c.totalQty} items</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: '#34d399' }}>₹{c.totalAmount.toLocaleString()}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleOpenDetailModal(c)} title="View Detail">
                        <FileText size={14} /> Detail
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleDownloadPdf(c.id, c.challanNumber)}
                        title="Download PDF Invoice"
                      >
                        <Download size={14} /> PDF
                      </button>
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

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Sales Challan">
        {formError && (
          <div className="alert-toast alert-toast-error" style={{ whiteSpace: 'pre-line' }}>
            <AlertCircle size={18} /> <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Select Customer *</label>
              <select
                className="form-control"
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.businessName} ({cust.name}) - {cust.customerType}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Initial Status *</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="Draft">Draft (Reserve order without stock deduct)</option>
                <option value="Confirmed">Confirmed (Immediately deduct inventory stock)</option>
              </select>
            </div>
          </div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '16px 0 10px', color: '#e2e8f0' }}>
            Challan Line Items (Products & Quantity)
          </h4>

          {items.map((item, idx) => {
            const selectedProd = availableProducts.find((p) => p.id === item.productId);
            const subtotal = selectedProd ? selectedProd.unitPrice * (item.quantity || 0) : 0;
            const stockAvailable = selectedProd ? selectedProd.currentStock : 0;

            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr auto',
                  gap: '12px',
                  alignItems: 'center',
                  marginBottom: '10px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <select
                    className="form-control"
                    required
                    value={item.productId}
                    onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                  >
                    <option value="">-- Select Product --</option>
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.currentStock}) - ₹{p.unitPrice}
                      </option>
                    ))}
                  </select>
                  {selectedProd && (
                    <div style={{ fontSize: '0.72rem', color: selectedProd.currentStock < item.quantity ? '#ef4444' : '#64748b', marginTop: '2px' }}>
                      SKU: {selectedProd.sku} | Avail Stock: {stockAvailable}
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    required
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                  />
                </div>

                <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem', textAlign: 'right' }}>
                  ₹{subtotal.toFixed(2)}
                </div>

                <button
                  type="button"
                  className="logout-btn"
                  onClick={() => handleRemoveItemRow(idx)}
                  disabled={items.length <= 1}
                  title="Remove Item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <button type="button" className="btn btn-sm btn-secondary" onClick={handleAddItemRow}>
              <Plus size={14} /> Add Product Item
            </button>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
              Calculated Total: <span style={{ color: '#34d399' }}>₹{calculateTotal().toLocaleString()}</span>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Generating...' : `Save Challan as ${status}`}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Sales Challan Details">
        {selectedChallan && (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6366f1' }}>
                  {selectedChallan.challanNumber}
                </div>
                <span className={`badge badge-${selectedChallan.status.toLowerCase()}`}>{selectedChallan.status}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <div><strong>Customer:</strong> {selectedChallan.customer?.businessName} ({selectedChallan.customer?.name})</div>
                <div><strong>Contact Phone:</strong> {selectedChallan.customer?.mobile}</div>
                <div><strong>Created Date:</strong> {new Date(selectedChallan.createdAt).toLocaleString()}</div>
                <div><strong>Created By:</strong> {selectedChallan.user?.name}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>
              Snapshot Product Line Items
            </h4>
            <table className="data-table" style={{ marginBottom: '20px' }}>
              <thead>
                <tr>
                  <th>Product / SKU (Snapshot)</th>
                  <th>Unit Price</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedChallan.items?.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#f8fafc' }}>{item.productName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>SKU: {item.sku}</div>
                    </td>
                    <td>₹{item.unitPrice.toFixed(2)}</td>
                    <td>{item.quantity}</td>
                    <td style={{ fontWeight: 700, color: '#34d399' }}>₹{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                Grand Total: <span style={{ color: '#34d399' }}>₹{selectedChallan.totalAmount.toLocaleString()}</span>
              </div>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleDownloadPdf(selectedChallan.id, selectedChallan.challanNumber)}
              >
                <Download size={14} /> Download PDF Invoice
              </button>
            </div>

            {selectedChallan.status === 'Draft' && (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#fbbf24' }}>
                  This challan is currently in <strong>Draft</strong>. Confirming will deduct stock from inventory.
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleUpdateStatus(selectedChallan.id, 'Cancelled')}
                  >
                    <XCircle size={14} /> Cancel
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleUpdateStatus(selectedChallan.id, 'Confirmed')}
                  >
                    <CheckCircle size={14} /> Confirm & Deduct Stock
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
