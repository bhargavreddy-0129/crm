import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { StockLog } from '../types';
import { ClipboardList, Filter, ArrowDownRight, ArrowUpRight, Calendar, User, Package } from 'lucide-react';

export const StockLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementFilter, setMovementFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [movementFilter, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stock/logs', {
        params: { movementType: movementFilter, page, limit: 10 },
      });
      if (res.data.success) {
        setLogs(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch stock logs', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="table-container">
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', fontWeight: 700 }}>
            <ClipboardList size={20} style={{ color: '#6366f1' }} />
            Stock Movement Audit Trail
          </div>

          <div className="filter-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={16} style={{ color: '#64748b' }} />
              <select
                className="filter-select"
                value={movementFilter}
                onChange={(e) => setMovementFilter(e.target.value)}
              >
                <option value="">All Movement Types</option>
                <option value="IN">IN (+ Stock Added)</option>
                <option value="OUT">OUT (- Stock Reduced)</option>
              </select>
            </div>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Movement</th>
              <th>Product Details</th>
              <th>Quantity Changed</th>
              <th>Reason / Reference</th>
              <th>Logged By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  Loading stock movement audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                  No stock logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div style={{ fontSize: '0.84rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} style={{ color: '#64748b' }} />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${log.movementType.toLowerCase()}`}>
                      {log.movementType === 'IN' ? (
                        <>
                          <ArrowDownRight size={14} /> IN (+ stock)
                        </>
                      ) : (
                        <>
                          <ArrowUpRight size={14} /> OUT (- stock)
                        </>
                      )}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={14} style={{ color: '#6366f1' }} />
                      {log.product?.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      SKU: {log.product?.sku}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        color: log.movementType === 'IN' ? '#34d399' : '#f87171',
                      }}
                    >
                      {log.movementType === 'IN' ? `+${log.changeQty}` : `-${log.changeQty}`} units
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.86rem', color: '#e2e8f0' }}>{log.reason}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={13} style={{ color: '#64748b' }} />
                      {log.user?.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{log.user?.role}</div>
                  </td>
                </tr>
              ))
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
    </div>
  );
};
