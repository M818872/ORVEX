import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getAuditTrail } from '../api/client';

const AuditPage: React.FC = () => {
  const { data: logs = [] } = useQuery({
    queryKey: ['audit_trail'],
    queryFn: getAuditTrail,
  });

  const timelineSteps = [
    { title: 'Supplier communication received', desc: 'Natural language supplier email parsed via document pipeline' },
    { title: 'MCU-742 delay identified', desc: 'Resolved part # and extracted +5 days arrival slip' },
    { title: 'Affected production identified', desc: 'Traced BOM to 3 exposed production orders' },
    { title: 'Customer commitment identified', desc: 'Flagged Customer C8821 Oct 20 contractual SLA' },
    { title: 'Recovery options generated', desc: 'Modeled Expedite, Alternate & Reschedule scenarios' },
    { title: 'Manager approved recovery', desc: 'Authorized Option A: Expedite Supplier (₹42,000)' },
    { title: 'Production plan updated', desc: 'ERP schedules synchronized & customer commitment protected' },
  ];

  // Check if approval has occurred in logs
  const hasApproved = logs.some(l => l.event.toLowerCase().includes('approved') || l.event.toLowerCase().includes('authorized'));

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Header: WHAT HAPPENED? (Section 17) ── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: 'var(--brand-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-primary)'
          }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-primary)', letterSpacing: '0.04em' }}>
              OPERATIONAL AUDIT & RECORD
            </span>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
              What happened?
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              End-to-end auditability and decision ledger proving complete accountability from raw supplier signal to human manager authorization.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--status-green)', fontWeight: 700 }}>
          <ShieldCheck size={18} /> Tamper-Evident Ledger
        </div>
      </div>

      {/* ── VISUAL ACCOUNTABILITY TIMELINE (Section 17) ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              Operational Decision Timeline
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Proves accountability: AI understands and recommends, human manager decides, system records
            </span>
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 9999,
            background: hasApproved ? 'var(--status-green-bg)' : 'var(--bg-elevated)',
            color: hasApproved ? 'var(--status-green)' : 'var(--text-muted)'
          }}>
            {hasApproved ? '✓ CYCLE COMPLETED' : 'INVESTIGATION / ACTIVE'}
          </span>
        </div>

        {/* 7-Step Visual Progression Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 8,
          padding: '16px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
          alignItems: 'stretch'
        }}>
          {timelineSteps.map((step, idx) => {
            const isCompleted = idx < 5 || (idx >= 5 && hasApproved);
            return (
              <div
                key={idx}
                style={{
                  background: isCompleted ? '#ffffff' : '#f8fafc',
                  border: `1.5px solid ${isCompleted ? 'var(--border-default)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isCompleted ? 'var(--shadow-sm)' : 'none',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6
                  }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: isCompleted ? 'var(--brand-primary)' : 'var(--text-muted)'
                    }}>
                      STEP {idx + 1}
                    </span>
                    {isCompleted && (
                      <CheckCircle2 size={12} style={{ color: 'var(--status-green)' }} />
                    )}
                  </div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isCompleted ? 'var(--text-primary)' : 'var(--text-muted)',
                    lineHeight: 1.3
                  }}>
                    {step.title}
                  </div>
                </div>

                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.3 }}>
                  {step.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── IMMUTABLE AUDIT TRAIL TABLE ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Detailed Event Log
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Synchronized with ERP and AI processing agents
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
            {logs.length} Records Logged
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, width: 120 }}>Timestamp</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Event Name</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Actor</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Source Type</th>
              <th style={{ padding: '12px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr
                key={l.id}
                style={{
                  borderBottom: '1px solid var(--border-default)',
                  background: '#ffffff'
                }}
              >
                <td style={{ padding: '14px 20px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {l.timestamp}
                </td>
                <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {l.event}
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                  {l.actor}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: l.source_type === 'HUMAN' ? 'var(--brand-light)' : 'var(--bg-elevated)',
                    color: l.source_type === 'HUMAN' ? 'var(--brand-primary)' : 'var(--text-muted)'
                  }}>
                    {l.source_type}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
                  {l.details || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditPage;
