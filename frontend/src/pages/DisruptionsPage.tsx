import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, FileText, CheckCircle2, Zap,
  Check, Layers, ChevronDown, ChevronUp, AlertCircle, XCircle, Settings
} from 'lucide-react';
import {
  getInvestigation,
  getImpactGraph,
  approveRecoveryPlan,
  type RecoveryOption
} from '../api/client';

const DisruptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [selectedOption, setSelectedOption] = useState<RecoveryOption | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalResult, setApprovalResult] = useState<string | null>(null);
  const [evidenceExpanded, setEvidenceExpanded] = useState(true);

  // Queries
  const { data: investigation } = useQuery({
    queryKey: ['investigation', 1],
    queryFn: () => getInvestigation(1),
  });

  const { data: graph } = useQuery({
    queryKey: ['impact_graph', 1],
    queryFn: () => getImpactGraph(1),
  });

  // Approval Mutation
  const approveMutation = useMutation({
    mutationFn: (optionId: number) => approveRecoveryPlan(optionId),
    onSuccess: (data) => {
      setApprovalResult(data.message);
      qc.invalidateQueries();
    },
  });

  const whatChanged = investigation?.what_changed;
  const recoveryOptions = investigation?.recovery_options ?? [];
  const recOption = investigation?.recommended_option;

  const activeOption = selectedOption || recOption || recoveryOptions[0];

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/recovery')}
          >
            <Zap size={14} />
            Compare Recovery Options
          </button>
        </div>
      </div>

      {/* ── QUESTION 1: WHAT HAPPENED? (Section 10) ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-danger)',
        padding: '24px 28px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: 'var(--status-red-bg)',
              color: 'var(--status-red)',
              padding: '4px 10px',
              borderRadius: 6,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '0.04em'
            }}>
              🔴 WHAT HAPPENED?
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Supplier: <strong>{whatChanged?.supplier || 'MicroTech Components'}</strong> (STATUS: <span style={{ color: 'var(--status-red)', fontWeight: 700 }}>DELAYED</span>)
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Material: <strong>{whatChanged?.material || 'MCU-742'}</strong>
            </span>
          </div>

          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 9999,
            background: 'var(--status-red-bg)',
            color: 'var(--status-red)'
          }}>
            HIGH PRIORITY DISRUPTION
          </span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          {whatChanged?.supplier || 'MicroTech Components'} delayed {whatChanged?.material || 'MCU-742'} by {whatChanged?.delay_days || 5} days.
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Shipment PO-8842 originally expected on <strong>{whatChanged?.old_eta || 'Oct 12'}</strong> is now expected on <strong>{whatChanged?.new_eta || 'Oct 17'}</strong> (+{whatChanged?.delay_days || 5} days slip). Reason: {whatChanged?.reason || 'Logistics disruption during air freight consolidation'}.
        </p>
      </div>

      {/* ── QUESTION 2: WHAT DOES IT AFFECT? (Section 10) ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-primary)', letterSpacing: '0.04em' }}>
              CONNECTING THIS EVENT TO EXISTING MANUFACTURING RECORDS
            </span>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={20} style={{ color: 'var(--brand-primary)' }} />
              What does it affect?
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Dependency chain traced across Supplier → BOM → SMT Assembly → Customer Commitment
            </span>
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 9999,
            background: 'var(--status-red-bg)',
            color: 'var(--status-red)'
          }}>
            500 CRITICAL UNITS AT RISK
          </span>
        </div>

        {/* Clean Visual Dependency Graph */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
          gap: 8,
          alignItems: 'center',
          padding: '16px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)'
        }}>
          {(graph?.nodes ?? []).map((node, i, arr) => (
            <React.Fragment key={node.id}>
              <div style={{
                background: node.status === 'affected' ? '#fef2f2' : '#ffffff',
                border: `1.5px solid ${node.status === 'affected' ? '#fecaca' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '12px 10px',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: node.status === 'affected' ? 'var(--status-red)' : 'var(--text-muted)',
                  marginBottom: 2
                }}>
                  {node.type}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {node.label}
                </div>
                {node.data?.detail && (
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {node.data.detail}
                  </div>
                )}
              </div>

              {i < arr.length - 1 && (
                <div style={{ textAlign: 'center', color: 'var(--status-red)', fontWeight: 800, fontSize: 14 }}>
                  →
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Impact Summary Pillars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          marginTop: 6
        }}>
          {/* Pillar 1: Material & Buffer */}
          <div style={{ padding: '14px', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-red)', textTransform: 'uppercase' }}>
              1. Material Deficit
            </span>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              MCU-742 for AX42 Build
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Buffer is only <strong>50 units</strong> on-hand vs <strong>500 units</strong> required for production run.
            </div>
          </div>

          {/* Pillar 2: Production Orders */}
          <div style={{ padding: '14px', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-amber)', textTransform: 'uppercase' }}>
              2. Production Exposed
            </span>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              3 Production Orders Exposed
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Order #1042 cannot initiate on SMT Line 2 on Oct 13 without delayed microcontrollers.
            </div>
          </div>

          {/* Pillar 3: Customer Commitment */}
          <div style={{ padding: '14px', background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-red)', textTransform: 'uppercase' }}>
              3. Customer Commitment
            </span>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              500 Critical Customer Units at Risk
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              <strong>Customer C8821</strong> contractual SLA delivery committed for <strong>October 20</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* ── QUESTION 3 / SECTION 11: WHY IS THIS AT RISK? (EVIDENCE) ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: 'var(--brand-primary)' }} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                WHY IS THIS AT RISK?
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Every important conclusion is grounded in verified source data
              </span>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setEvidenceExpanded(!evidenceExpanded)}
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {evidenceExpanded ? <>Hide Evidence <ChevronUp size={14} /></> : <>Show Evidence <ChevronDown size={14} /></>}
          </button>
        </div>

        {evidenceExpanded && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12
          }}>
            {/* Evidence 1: Supplier Email */}
            <div style={{
              padding: '14px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                Supplier Email
              </span>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                "{whatChanged ? `MCU-742 shipment moved from ${whatChanged.old_eta} to ${whatChanged.new_eta}.` : 'MCU-742 shipment moved from Oct 12 to Oct 17.'}"
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'auto' }}>
                Source: Ingested communication from MicroTech Components
              </span>
            </div>

            {/* Evidence 2: BOM */}
            <div style={{
              padding: '14px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                BOM
              </span>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                "AX42 requires MCU-742."
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'auto' }}>
                Source: NovaCore Electronics Engineering Bill of Materials
              </span>
            </div>

            {/* Evidence 3: Inventory */}
            <div style={{
              padding: '14px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                Inventory
              </span>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                "Current available quantity is insufficient for the affected production requirement."
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'auto' }}>
                Source: ERP Warehouse on-hand stock records (50 buffer available)
              </span>
            </div>

            {/* Evidence 4: Customer Order */}
            <div style={{
              padding: '14px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                Customer Order
              </span>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                "500 units committed for Oct 20."
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'auto' }}>
                Source: Sales contract SLA with Customer C8821
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── QUESTION 4 / SECTION 13 & 14 & 15: WHAT CAN WE DO? (RECOVERY & APPROVAL) ── */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid var(--brand-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                color: 'var(--brand-primary)',
                letterSpacing: '0.04em'
              }}>
                WHAT CAN WE DO?
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
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              Recovery Decision & Recommendation
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              AI recommends based on current operational context. Human manager retains final execution authority.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/recovery')}
            >
              Compare All 3 Scenarios
            </button>
          </div>
        </div>

        {/* 3 Synthetic Options Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14
        }}>
          {recoveryOptions.map((opt) => {
            const isSelected = activeOption?.id === opt.id;
            const isRec = opt.recommended;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedOption(opt)}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected
                    ? '2px solid var(--brand-primary)'
                    : '1px solid var(--border-default)',
                  background: isSelected ? 'var(--brand-light)' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-primary)' }}>
                    OPTION {opt.option_code}
                  </span>
                  {isRec && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: 'var(--brand-primary)',
                      color: '#ffffff'
                    }}>
                      RECOMMENDED
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {opt.option_name}
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><strong>Cost:</strong> {opt.cost}</div>
                  <div><strong>Customer impact:</strong> {opt.delay === '0 days' ? '0 days' : opt.delay}</div>
                  <div><strong>Production impact:</strong> {opt.production_impact?.includes('Low') ? 'Low' : opt.production_impact?.includes('Medium') ? 'Medium' : 'High'}</div>
                  <div><strong>Risk:</strong> {opt.risk}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Recommendation Highlight Box (Section 14 & 15) */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                AI RECOMMENDATION: {activeOption?.option_name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Recommended based on current operational context.
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Principle: <span style={{ color: 'var(--brand-primary)' }}>AI recommends. Human decides.</span>
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
            <strong>WHY? </strong>
            "{activeOption?.rationale || 'Preserves the Oct 20 customer commitment while avoiding the qualification delay and customer impact associated with the alternatives.'}"
          </div>

          {/* Action Buttons: APPROVE, MODIFY, REJECT (Section 15) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowRejectModal(true)}
              style={{ color: 'var(--status-red)', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <XCircle size={14} /> REJECT
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/recovery')}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Settings size={14} /> MODIFY
            </button>
            <button
              id="btn-approve-recovery"
              className="btn btn-primary"
              onClick={() => setShowApprovalModal(true)}
              style={{
                background: 'var(--status-green)',
                borderColor: 'var(--status-green)',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Check size={16} /> APPROVE
            </button>
          </div>
        </div>
      </div>

      {/* ── Human Approval Dialog Modal (Section 15 & 16) ── */}
      {showApprovalModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            maxWidth: 540,
            width: '100%',
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-modal)',
            padding: 26,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            {!approvalResult ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                      Manager Approval Decision
                    </h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      AI recommends. Human decides.
                    </span>
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                  <div><strong>Selected Strategy:</strong> {activeOption?.option_name}</div>
                  <div style={{ marginTop: 4 }}><strong>Additional Cost:</strong> {activeOption?.cost}</div>
                  <div style={{ marginTop: 4 }}><strong>Customer Impact:</strong> {activeOption?.customer_impact}</div>
                  <div style={{ marginTop: 4 }}><strong>Production Impact:</strong> {activeOption?.production_impact}</div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Confirming approval will dispatch production rescheduling instructions, lock customer delivery commitments, and append an immutable event to the audit trail.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowApprovalModal(false)}
                    disabled={approveMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-confirm-approval"
                    className="btn btn-primary"
                    onClick={() => activeOption && approveMutation.mutate(activeOption.id)}
                    disabled={approveMutation.isPending}
                    style={{ background: 'var(--status-green)', borderColor: 'var(--status-green)', fontWeight: 800 }}
                  >
                    {approveMutation.isPending ? 'Processing Approval...' : 'APPROVE'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* AFTER APPROVAL STATE (Section 16) */}
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'var(--status-green-bg)',
                    color: 'var(--status-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px auto'
                  }}>
                    <CheckCircle2 size={30} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Recovery Decision Approved
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Operational state synchronized across manufacturing records.
                  </p>
                </div>

                {/* The 4 Checkmarks Required by Section 16 */}
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  fontSize: 13,
                  fontWeight: 600
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--status-green)' }}>
                    <Check size={16} /> Recovery plan approved
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--status-green)' }}>
                    <Check size={16} /> Production plan updated
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--status-green)' }}>
                    <Check size={16} /> Customer commitment protected
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--status-green)' }}>
                    <Check size={16} /> Audit event created
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowApprovalModal(false);
                      navigate('/audit');
                    }}
                  >
                    View Audit Trail
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setShowApprovalModal(false);
                      setApprovalResult(null);
                      navigate('/dashboard');
                    }}
                  >
                    Return to Dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Reject Confirmation Modal ── */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            maxWidth: 480,
            width: '100%',
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-modal)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'var(--status-red-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--status-red)'
              }}>
                <AlertCircle size={20} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                Reject AI Recommendation?
              </h3>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              In accordance with <em>"AI recommends. Human decides."</em>, rejecting this proposal leaves the current manufacturing schedule unchanged. You can select another strategy in the Recovery Simulator or submit an alternate resolution.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                Back
              </button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--status-red)', borderColor: 'var(--status-red)' }}
                onClick={() => {
                  setShowRejectModal(false);
                  navigate('/recovery');
                }}
              >
                Go to Recovery Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisruptionsPage;
