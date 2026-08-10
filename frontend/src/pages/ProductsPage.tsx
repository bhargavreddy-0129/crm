import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Product } from '../types';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Filter, AlertTriangle, Edit, ArrowDownUp, Package, MapPin, AlertCircle } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form State for Product Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: 0,
    currentStock: 0,
    minStockAlert: 5,
    location: '',
    imageUrl: '',
  });

  // Stock Adjust State
  const [adjustData, setAdjustData] = useState({
    changeQty: 1,
    movementType: 'IN' as 'IN' | 'OUT',
    reason: '',
  });

  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canManageInventory = hasRole(['ADMIN', 'WAREHOUSE']);

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter, lowStockFilter, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: {
          search,
          category: categoryFilter,
          lowStock: lowStockFilter ? 'true' : undefined,
          page,
          limit: 8,
        },
      });
      if (res.data.success) {
        setProducts(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      sku: `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Electronics',
      unitPrice: 0,
      currentStock: 10,
      minStockAlert: 5,
      location: 'Warehouse A',
      imageUrl: '',
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unitPrice: product.unitPrice,
      currentStock: product.currentStock,
      minStockAlert: product.minStockAlert,
      location: product.location,
      imageUrl: product.imageUrl || '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustData({
      changeQty: 1,
      movementType: 'IN',
      reason: 'Manual Stock Inventory Audit',
    });
    setFormError('');
    setIsAdjustModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.post('/products', formData);
      if (res.data.success) {
        setIsAddModalOpen(false);
        fetchProducts();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.put(`/products/${selectedProduct.id}`, formData);
      if (res.data.success) {
        setIsEditModalOpen(false);
        fetchProducts();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.post(`/products/${selectedProduct.id}/adjust-stock`, adjustData);
      if (res.data.success) {
        setIsAdjustModalOpen(false);
        fetchProducts();
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Table Toolbar */}
      <div className="table-container" style={{ marginBottom: '24px' }}>
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search product name, SKU, category, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={16} style={{ color: '#64748b' }} />
              <select
                className="filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Accessories">Accessories</option>
                <option value="Displays">Displays</option>
                <option value="Hardware">Hardware</option>
              </select>
            </div>

            <button
              className={`btn btn-sm ${lowStockFilter ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setLowStockFilter(!lowStockFilter)}
            >
              <AlertTriangle size={15} /> Low Stock Only
            </button>

            {canManageInventory && (
              <button className="btn btn-primary" onClick={handleOpenAddModal}>
                <Plus size={18} /> Add Product
              </button>
            )}
          </div>
        </div>

        {/* Product Table */}
        <table className="data-table">
          <thead>
            <tr>
              <th>Product Details</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Unit Price</th>
              <th>Current Stock</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  Loading inventory data...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const isLowStock = p.currentStock <= p.minStockAlert;
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '8px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#6366f1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Package size={20} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: '#f8fafc' }}>{p.name}</div>
                          {isLowStock && <span className="low-stock-pill">LOW STOCK WARNING</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontFamily: 'monospace' }}>{p.sku}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{p.category}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#34d399' }}>₹{p.unitPrice.toLocaleString()}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: isLowStock ? '#ef4444' : '#f8fafc' }}>
                        {p.currentStock} units
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Min Alert: {p.minStockAlert}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} /> {p.location}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {canManageInventory && (
                          <>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleOpenAdjustModal(p)}
                              title="Adjust Stock (IN/OUT)"
                            >
                              <ArrowDownUp size={14} /> Stock
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleOpenEditModal(p)}
                              title="Edit Product"
                            >
                              <Edit size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
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

      {/* Add Product Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Product">
        {formError && (
          <div className="alert-toast alert-toast-error">
            <AlertCircle size={16} /> <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleAddSubmit}>
          <div className="form-group">
            <label>Product Name *</label>
            <input
              type="text"
              className="form-control"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>SKU / Code *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Unit Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                required
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Initial Current Stock *</label>
              <input
                type="number"
                className="form-control"
                required
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Min Stock Alert Quantity *</label>
              <input
                type="number"
                className="form-control"
                required
                value={formData.minStockAlert}
                onChange={(e) => setFormData({ ...formData, minStockAlert: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Location / Warehouse *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Product Image URL (Optional)</label>
            <input
              type="url"
              className="form-control"
              placeholder="https://..."
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Product">
        {formError && (
          <div className="alert-toast alert-toast-error">
            <AlertCircle size={16} /> <span>{formError}</span>
          </div>
        )}
        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label>Product Name *</label>
            <input
              type="text"
              className="form-control"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>SKU / Code *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <input
                type="text"
                className="form-control"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Unit Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                required
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Min Stock Alert Quantity *</label>
              <input
                type="number"
                className="form-control"
                required
                value={formData.minStockAlert}
                onChange={(e) => setFormData({ ...formData, minStockAlert: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location / Warehouse *</label>
            <input
              type="text"
              className="form-control"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Adjust Inventory Stock">
        {selectedProduct && (
          <div>
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.88rem',
              }}
            >
              <strong>{selectedProduct.name}</strong> ({selectedProduct.sku})
              <div style={{ color: '#94a3b8', marginTop: '2px' }}>
                Current Available Stock: <strong>{selectedProduct.currentStock} units</strong>
              </div>
            </div>

            {formError && (
              <div className="alert-toast alert-toast-error">
                <AlertCircle size={16} /> <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Movement Type</label>
                  <select
                    className="form-control"
                    value={adjustData.movementType}
                    onChange={(e) => setAdjustData({ ...adjustData, movementType: e.target.value as any })}
                  >
                    <option value="IN">IN (+ Add Stock)</option>
                    <option value="OUT">OUT (- Reduce Stock)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    required
                    value={adjustData.changeQty}
                    onChange={(e) => setAdjustData({ ...adjustData, changeQty: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reason / Audit Note *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. Vendor Shipment Received / Damage Loss"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Submit Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};
