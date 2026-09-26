import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, ArrowRight, ArrowLeft, CheckCircle2,
  Check, Sparkles, XCircle, Settings, AlertCircle
} from 'lucide-react';
import {
  getRecoveryOptions,
  approveRecoveryPlan
} from '../api/client';

const RecoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [approvedOptionId, setApprovedOptionId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rejectedMsg, setRejectedMsg] = useState<string | null>(null);

  const { data: options = [] } = useQuery({
    queryKey: ['recovery_options'],
    queryFn: getRecoveryOptions,
  });

  const approveMutation = useMutation({
    mutationFn: (optId: number) => approveRecoveryPlan(optId),
    onSuccess: (data, optId) => {
      setApprovedOptionId(optId);
      setSuccessMsg(data.message);
      setRejectedMsg(null);
      qc.invalidateQueries();
    },
  });

  const optA = options.find(o => o.option_code === 'A') || options[0];
  const optB = options.find(o => o.option_code === 'B') || options[1];
  const optC = options.find(o => o.option_code === 'C') || options[2];

  const comparisonRows = [
    {
      metric: 'Estimated Additional Cost',
      a: optA?.cost || '₹42,000',
      b: optB?.cost || '₹85,000',
      c: optC?.cost || '₹12,000',
      winner: 'a'
    },
    {
      metric: 'Customer Delivery Impact',
      a: '0 Days (Oct 20 Preserved)',
      b: '3 Days (Delivery slips to Oct 23)',
      c: '5 Days (Delivery slips to Oct 25)',
      winner: 'a'
    },
    {
      metric: 'Production Impact',
      a: 'Low (1 overtime shift on Line 2)',
      b: 'Medium (PPAP re-qualification)',
      c: 'High (36h line idle penalty)',
      winner: 'a'
    },
    {
      metric: 'Execution Risk Level',
      a: 'Low',
      b: 'Medium',
      c: 'High',
      winner: 'a'
    }
  ];

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/disruptions')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={14} /> Back to Disruption Investigation
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard <ArrowRight size={14} />
        </button>
      </div>

      {/* ── Header: WHAT CAN WE DO? (Section 13) ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        padding: '24px 28px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--brand-light-indigo)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-indigo)'
            }}>
              <Zap size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--brand-primary)',
                  letterSpacing: '0.04em'
                }}>
                  RECOVERY SIMULATOR
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-default)'
                }}>
                  Synthetic demo scenario
                </span>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                What can we do?
              </h1>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            Core Principle: <span style={{ color: 'var(--brand-primary)' }}>AI recommends. Human decides.</span>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>
          Evaluate 3 realistic synthetic mitigation strategies to resolve the MCU-742 delivery delay without compromising the October 20 customer commitment.
        </p>
      </div>

      {/* ── AI Recommendation Highlight Box (Section 14 & 15) ── */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid var(--brand-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 9999,
              background: 'var(--brand-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <Sparkles size={12} /> RECOMMENDED
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              Option A: Expedite Supplier
            </span>
          </div>

          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Recommended based on current operational context.
          </span>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
          <strong>WHY? </strong>
          "Preserves the Oct 20 customer commitment while avoiding the qualification delay and customer impact associated with the alternatives."
        </div>

        {/* Action Buttons: APPROVE, MODIFY, REJECT (Section 15) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setRejectedMsg("Recommendation rejected. You can choose Option B or C below.");
              setSuccessMsg(null);
            }}
            style={{ color: 'var(--status-red)', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <XCircle size={14} /> REJECT
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const el = document.getElementById('options-matrix');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Settings size={14} /> MODIFY / TWEAK
          </button>
          <button
            id="btn-approve-option-a-hero"
            className="btn btn-primary"
            onClick={() => optA && approveMutation.mutate(optA.id)}
            disabled={approveMutation.isPending || approvedOptionId === optA?.id}
            style={{
              background: 'var(--status-green)',
              borderColor: 'var(--status-green)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Check size={16} /> {approvedOptionId === optA?.id ? 'APPROVED' : 'APPROVE'}
          </button>
        </div>
      </div>

      {/* ── Rejection Notice ── */}
      {rejectedMsg && (
        <div style={{
          padding: '14px 18px',
          background: 'var(--status-amber-bg)',
          border: '1px solid var(--border-warning)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: 'var(--text-primary)'
        }}>
          <AlertCircle size={18} style={{ color: 'var(--status-amber)' }} />
          <span>{rejectedMsg}</span>
        </div>
      )}

      {/* ── Success Banner after Approval (Section 16) ── */}
      {successMsg && (
        <div style={{
          padding: '20px 24px',
          background: 'var(--status-green-bg)',
          border: '1px solid var(--border-success)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={24} style={{ color: 'var(--status-green)' }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--status-green)' }}>
                  Recovery Plan Approved by Production Planner
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {successMsg}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/audit')}>
                View Audit Trail
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </button>
            </div>
          </div>

          {/* The 4 Checkmarks Required by Section 16 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 8,
            paddingTop: 10,
            borderTop: '1px solid rgba(22, 101, 52, 0.15)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--status-green)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={16} /> Recovery plan approved
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={16} /> Production plan updated
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={16} /> Customer commitment protected
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={16} /> Audit event created
            </div>
          </div>
        </div>
      )}

      {/* ── 3 STRATEGY COMPARISON CARDS (Section 13) ── */}
      <div id="options-matrix" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20
      }}>
        {/* OPTION A */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--brand-primary)',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.1)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: -12,
            right: 20,
            background: 'var(--brand-primary)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            padding: '2px 10px',
            borderRadius: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <Sparkles size={11} /> AI RECOMMENDED
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
              OPTION A · Synthetic demo scenario
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              Expedite Supplier
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Charter priority air express cargo to maintain initial arrival schedule.
            </p>

            <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div><strong>Cost:</strong> ₹42,000</div>
              <div><strong>Customer impact:</strong> <span style={{ color: 'var(--status-green)', fontWeight: 700 }}>0 days (Oct 20 preserved)</span></div>
              <div><strong>Production impact:</strong> <span style={{ fontWeight: 600 }}>Low</span> (1 overtime shift on Line 2)</div>
              <div><strong>Risk:</strong> <span style={{ color: 'var(--status-green)', fontWeight: 700 }}>Low</span></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              id="btn-approve-option-a"
              className="btn btn-primary"
              onClick={() => optA && approveMutation.mutate(optA.id)}
              disabled={approveMutation.isPending || approvedOptionId === optA?.id}
              style={{
                width: '100%',
                background: 'var(--status-green)',
                borderColor: 'var(--status-green)',
                fontWeight: 800
              }}
            >
              <Check size={14} />
              {approvedOptionId === optA?.id ? 'APPROVED' : 'APPROVE OPTION A'}
            </button>
          </div>
        </div>

        {/* OPTION B */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              OPTION B · Synthetic demo scenario
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              Alternate Supplier
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Procure equivalent microcontrollers from secondary regional vendor.
            </p>

            <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div><strong>Cost:</strong> ₹85,000</div>
              <div><strong>Customer impact:</strong> <span style={{ color: 'var(--status-amber)', fontWeight: 700 }}>3 days (Delivery slips to Oct 23)</span></div>
              <div><strong>Production impact:</strong> <span style={{ fontWeight: 600 }}>Medium</span> (10-day PPAP qualification)</div>
              <div><strong>Risk:</strong> <span style={{ color: 'var(--status-amber)', fontWeight: 700 }}>Medium</span></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => optB && approveMutation.mutate(optB.id)}
              disabled={approveMutation.isPending || approvedOptionId === optB?.id}
              style={{ width: '100%', fontWeight: 700 }}
            >
              {approvedOptionId === optB?.id ? 'APPROVED' : 'APPROVE OPTION B'}
            </button>
          </div>
        </div>

        {/* OPTION C */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              OPTION C · Synthetic demo scenario
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              Reschedule Production
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Wait for delayed shipment and push line schedule accordingly.
            </p>

            <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div><strong>Cost:</strong> ₹12,000</div>
              <div><strong>Customer impact:</strong> <span style={{ color: 'var(--status-red)', fontWeight: 700 }}>5 days (Delivery slips to Oct 25)</span></div>
              <div><strong>Production impact:</strong> <span style={{ fontWeight: 600 }}>High</span> (36h line idle penalty)</div>
              <div><strong>Risk:</strong> <span style={{ color: 'var(--status-red)', fontWeight: 700 }}>High</span></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => optC && approveMutation.mutate(optC.id)}
              disabled={approveMutation.isPending || approvedOptionId === optC?.id}
              style={{ width: '100%', fontWeight: 700 }}
            >
              {approvedOptionId === optC?.id ? 'APPROVED' : 'APPROVE OPTION C'}
            </button>
          </div>
        </div>
      </div>

      {/* ── STRUCTURED MATRIX COMPARISON TABLE ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            Tradeoff Comparison Matrix
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Direct side-by-side evaluation of recovery parameters
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#ffffff', borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Metric</th>
                <th style={{ padding: '14px 20px', color: 'var(--brand-primary)', fontWeight: 800, textTransform: 'uppercase', fontSize: 11 }}>Option A: Expedite</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Option B: Alternate</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Option C: Reschedule</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: '1px solid var(--border-default)',
                    background: i % 2 === 0 ? '#ffffff' : 'var(--bg-hover)'
                  }}
                >
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {row.metric}
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                    {row.a}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                    {row.b}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                    {row.c}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecoveryPage;
