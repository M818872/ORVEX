import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cpu } from 'lucide-react';
import { getMaterials } from '../api/client';

const MaterialsPage: React.FC = () => {
  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: getMaterials,
  });

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Header ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        padding: '24px 28px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-primary)', letterSpacing: '0.04em' }}>
            MANUFACTURING MASTER DATA
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
            Materials & Component Inventory
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Component buffer stocks, supplier lead times, and real-time shipment delivery status.
          </p>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Part #</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Category</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Supplier</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Supplier Status</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>On-Hand Stock</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Allocated</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Lead Time</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Unit Cost</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => {
              const isLowStock = m.inventory < 100;
              const isDelayed = m.supplier_status === 'DELAYED';

              return (
                <tr
                  key={m.id}
                  style={{
                    borderBottom: '1px solid var(--border-default)',
                    background: isDelayed ? '#fff5f5' : isLowStock ? '#fffbf0' : '#ffffff'
                  }}
                >
                  <td style={{ padding: '14px 20px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Cpu size={14} style={{ color: isDelayed ? 'var(--status-red)' : isLowStock ? 'var(--status-amber)' : 'var(--brand-primary)' }} />
                      {m.name}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                    {m.category}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {m.supplier_name}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: isDelayed ? 'var(--status-red-bg)' : 'var(--status-green-bg)',
                      color: isDelayed ? 'var(--status-red)' : 'var(--status-green)',
                      letterSpacing: '0.03em'
                    }}>
                      {m.supplier_status || 'ON SCHEDULE'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 700, color: isLowStock ? 'var(--status-amber)' : 'var(--text-primary)' }}>
                    {m.inventory} units {isLowStock ? '(Low Buffer)' : ''}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                    {m.allocated_inventory} units
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                    {m.lead_time} days
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                    ₹{m.unit_cost.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialsPage;
