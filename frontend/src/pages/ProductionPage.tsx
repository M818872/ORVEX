import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, AlertCircle } from 'lucide-react';
import { getProductionOrders } from '../api/client';

const ProductionPage: React.FC = () => {
  const { data: orders = [] } = useQuery({
    queryKey: ['production_orders'],
    queryFn: getProductionOrders,
  });

  const atRiskOrders = orders.filter(o => o.status === 'At Risk' || o.status === 'Delayed');
  const hasRisks = atRiskOrders.length > 0;

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
            MANUFACTURING OPERATIONS
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
            Production Orders & Line Schedules
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Real-time status across SMT surface-mount lines, component allocations, and customer commitments.
          </p>
        </div>

        {hasRisks && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--status-red-bg)',
            border: '1px solid var(--border-danger)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--status-red)'
          }}>
            <AlertCircle size={16} />
            <span>3 production orders exposed · 500 critical customer units at risk</span>
          </div>
        )}
      </div>

      {/* ── Summary Metrics ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12
      }}>
        <div className="card" style={{ padding: '16px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Production Orders Exposed
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, color: hasRisks ? 'var(--status-red)' : 'var(--text-primary)', marginTop: 4 }}>
            {atRiskOrders.length} Orders Exposed
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Order #1042, #1040, #1045 in pipeline
          </span>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Customer Units at Risk
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, color: hasRisks ? 'var(--status-red)' : 'var(--text-primary)', marginTop: 4 }}>
            500 Critical Units
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Contractual SLA for Customer C8821
          </span>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Pipeline Volume
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            1,000 Units
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Across SMT Line 1 and Line 2
          </span>
        </div>
      </div>

      {/* ── Orders Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Order #</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Product Name</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Quantity</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Line</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Start Date</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Due Date</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const isAtRisk = o.status === 'At Risk' || o.status === 'Delayed';
              return (
                <tr
                  key={o.id}
                  style={{
                    borderBottom: '1px solid var(--border-default)',
                    background: isAtRisk ? '#fff5f5' : '#ffffff'
                  }}
                >
                  <td style={{ padding: '14px 20px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Box size={14} style={{ color: isAtRisk ? 'var(--status-red)' : 'var(--brand-primary)' }} />
                      {o.order_number}
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {o.product_name}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                    <strong>{o.quantity}</strong> units
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                    {o.line_name}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                    {o.start_date}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                    {o.due_date}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: isAtRisk ? 'var(--status-red-bg)' : 'var(--status-green-bg)',
                      color: isAtRisk ? 'var(--status-red)' : 'var(--status-green)'
                    }}>
                      {o.status.toUpperCase()}
                    </span>
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

export default ProductionPage;
