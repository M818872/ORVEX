import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud, FileText, Mail, FileSpreadsheet,
  CheckCircle2, ArrowRight, RefreshCw, Eye, Sparkles,
  Database, Check, ChevronDown, ChevronUp, Code
} from 'lucide-react';
import {
  getInboxSamples,
  uploadSupplierDocument,
  injectSampleDocument,
  getInboxHistory,
  resetBaseline,
  type InboxUploadResponse,
  type SampleItem
} from '../api/client';

const InboxPage: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [activePipelineResult, setActivePipelineResult] = useState<InboxUploadResponse | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  // Queries
  const { data: samples = [] } = useQuery({
    queryKey: ['inbox_samples'],
    queryFn: getInboxSamples,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['inbox_history'],
    queryFn: getInboxHistory,
  });

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadSupplierDocument(file),
    onSuccess: (data) => {
      setActivePipelineResult(data);
      qc.invalidateQueries();
    },
  });

  // Inject Sample Mutation
  const sampleMutation = useMutation({
    mutationFn: (sampleId: string) => injectSampleDocument(sampleId),
    onSuccess: (data) => {
      setActivePipelineResult(data);
      qc.invalidateQueries();
    },
  });

  // Reset Mutation
  const resetMutation = useMutation({
    mutationFn: resetBaseline,
    onSuccess: () => {
      setActivePipelineResult(null);
      setPreviewText(null);
      qc.invalidateQueries();
    },
  });

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      uploadMutation.mutate(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      uploadMutation.mutate(file);
    }
  };

  const isProcessing = uploadMutation.isPending || sampleMutation.isPending;

  const getFormatBadgeColor = (fmt: string) => {
    switch (fmt.toUpperCase()) {
      case 'EML':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'PDF':
        return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
      case 'DOCX':
      case 'DOC':
        return { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' };
      case 'XLSX':
      case 'XLS':
        return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
      case 'CSV':
        return { bg: '#fefce8', color: '#a16207', border: '#fef08a' };
      case 'TXT':
      default:
        return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
    }
  };

  const getFormatIcon = (fmt: string) => {
    switch (fmt.toUpperCase()) {
      case 'EML':
        return <Mail size={15} />;
      case 'PDF':
      case 'DOCX':
      case 'DOC':
        return <FileText size={15} />;
      case 'XLSX':
      case 'XLS':
      case 'CSV':
        return <FileSpreadsheet size={15} />;
      default:
        return <FileText size={15} />;
    }
  };

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Page Header (Section 6) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Give ACTIONOS new information
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              background: 'var(--brand-light)',
              color: 'var(--brand-primary)',
              border: '1px solid var(--border-default)'
            }}>
              <Sparkles size={12} />
              AI Disruption Intake
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Upload a supplier email, report, spreadsheet, or operational document.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            title="Reset to 94% healthy baseline"
          >
            <RefreshCw size={13} className={resetMutation.isPending ? 'spin' : ''} />
            Reset Healthy Baseline
          </button>
        </div>
      </div>

      {/* ── Supported Formats + Context Clarification ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        background: '#ffffff',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Supported Ingestion Formats:</span>
          {['EML', 'TXT', 'PDF', 'DOCX', 'CSV', 'XLSX'].map((fmt) => {
            const style = getFormatBadgeColor(fmt);
            return (
              <span
                key={fmt}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  fontWeight: 700,
                  background: style.bg,
                  color: style.color,
                  border: `1px solid ${style.border}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {getFormatIcon(fmt)}
                {fmt}
              </span>
            );
          })}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Stage: <strong>INPUT → UNDERSTAND</strong>
        </div>
      </div>

      {/* ── Section 6: Ingestion Workspace + CONNECTED DATA Panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.3fr) minmax(280px, 0.9fr)', gap: 20 }}>
        {/* Left: Upload Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          style={{
            background: isDragging ? 'var(--brand-light)' : '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: isDragging ? '2px dashed var(--brand-primary)' : '2px dashed var(--border-default)',
            padding: '34px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--shadow-card)'
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.eml,.pdf,.docx,.doc,.csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--brand-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-primary)'
          }}>
            <UploadCloud size={26} />
          </div>

          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {isProcessing ? 'Executing Ingestion Pipeline...' : 'Upload Supplier Document'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 320 }}>
              Drag & drop any supplier delay email, report, or spreadsheet to trigger automated disruption understanding and recovery.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isProcessing}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {isProcessing ? 'Processing Pipeline...' : 'Browse Local Files'}
          </button>

          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Supported: EML · TXT · PDF · DOCX · CSV · XLSX (Max 10MB)
          </span>
        </div>

        {/* Right: CONNECTED DATA (Company Context) */}
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          padding: '22px 24px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 14
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'var(--status-green-bg)',
                color: 'var(--status-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Database size={15} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                CONNECTED DATA
              </h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              New information is coming in, while company context already exists:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              <Check size={14} style={{ color: 'var(--status-green)' }} />
              <span><strong>Suppliers:</strong> MicroTech Components, Apex Silicon</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              <Check size={14} style={{ color: 'var(--status-green)' }} />
              <span><strong>BOM Items:</strong> AX42-PRO (1x MCU-742, 1x FLASH-256MB)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              <Check size={14} style={{ color: 'var(--status-green)' }} />
              <span><strong>Inventory:</strong> MCU-742 (50 units on-hand buffer)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              <Check size={14} style={{ color: 'var(--status-green)' }} />
              <span><strong>Production Orders:</strong> Order #1042, #1040, #1045</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              <Check size={14} style={{ color: 'var(--status-green)' }} />
              <span><strong>Customer Orders:</strong> Customer C8821 (500 units by Oct 20)</span>
            </div>
          </div>

          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'var(--bg-elevated)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-default)'
          }}>
            ACTIONOS automatically connects new incoming signals to this active company data.
          </div>
        </div>
      </div>

      {/* ── Ready-to-Test Supplier Disruption Samples ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              Ready-to-Test Supplier Communications (Messy Natural Language)
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Click any natural language message or file format to run the complete AI understanding and tracing pipeline.
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-primary)' }}>
            {samples.length} Scenarios Available
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 10
        }}>
          {samples.map((sample: SampleItem) => {
            const badgeStyle = getFormatBadgeColor(sample.format);
            const isSelected = selectedSampleId === sample.id && sampleMutation.isPending;

            return (
              <div
                key={sample.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-elevated)',
                  gap: 10,
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 800,
                      background: badgeStyle.bg,
                      color: badgeStyle.color,
                      border: `1px solid ${badgeStyle.border}`
                    }}>
                      {sample.format}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {sample.source}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {sample.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                    {sample.description}
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  disabled={isProcessing}
                  onClick={() => {
                    setSelectedSampleId(sample.id);
                    sampleMutation.mutate(sample.id);
                  }}
                  style={{ alignSelf: 'flex-start', fontSize: 11 }}
                >
                  {isSelected ? 'Processing...' : 'Run Ingestion Pipeline'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 7: INGESTION PIPELINE (Human-Readable Stepper) ── */}
      {activePipelineResult && (
        <div style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--brand-primary)',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--status-green-bg)',
                color: 'var(--status-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-primary)' }}>
                  Disruption Ingestion Pipeline Executed
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {activePipelineResult.extracted_data.supplier_name}: {activePipelineResult.extracted_data.material_name} (+{activePipelineResult.extracted_data.delay_days} Days Slip)
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPreviewText(activePipelineResult.raw_text_preview)}
              >
                <Eye size={14} />
                View Original Document
              </button>
              <button
                id="btn-goto-investigation"
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/disruptions')}
              >
                Investigate Disruption & Graph
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* 6-Stage Human-Readable Stepper (Section 7) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12
          }}>
            {/* STEP 1: READ */}
            <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                STEP 1 · READ
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                Reading communication
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, wordBreak: 'break-word' }}>
                {activePipelineResult.filename} ({activePipelineResult.file_type})
              </div>
            </div>

            {/* STEP 2: UNDERSTAND */}
            <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                STEP 2 · UNDERSTAND
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                Identifying what changed
              </div>
              <div style={{ fontSize: 11, color: 'var(--status-red)', marginTop: 2, fontWeight: 600 }}>
                {activePipelineResult.extracted_data.material_name} delayed +{activePipelineResult.extracted_data.delay_days}d
              </div>
            </div>

            {/* STEP 3: CONNECT */}
            <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                STEP 3 · CONNECT
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                Matching to records
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Supplier: {activePipelineResult.resolved_entities.supplier}
              </div>
            </div>

            {/* STEP 4: TRACE */}
            <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                STEP 4 · TRACE
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                Finding affected orders
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                3 production orders exposed
              </div>
            </div>

            {/* STEP 5: IMPACT */}
            <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--status-red)', textTransform: 'uppercase' }}>
                STEP 5 · IMPACT
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--status-red)', marginTop: 4 }}>
                Checking commitments
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                500 critical customer units at risk
              </div>
            </div>

            {/* STEP 6: RECOVER */}
            <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--status-green)', textTransform: 'uppercase' }}>
                STEP 6 · RECOVER
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                Generating responses
              </div>
              <div style={{ fontSize: 11, color: 'var(--status-green)', marginTop: 2, fontWeight: 600 }}>
                {activePipelineResult.recommendation.recommended_option}
              </div>
            </div>
          </div>

          {/* Section 8: Extracted Disruption Summary Card */}
          <div style={{
            background: 'var(--bg-elevated)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            fontSize: 12
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>Supplier</span>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{activePipelineResult.extracted_data.supplier_name}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>PO Reference</span>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{activePipelineResult.extracted_data.part_number ? 'PO-8842' : 'PO-8842'}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>Material</span>
              <div style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{activePipelineResult.extracted_data.material_name}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>Old ETA</span>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{activePipelineResult.extracted_data.old_eta}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>New ETA</span>
              <div style={{ fontWeight: 700, color: 'var(--status-red)' }}>{activePipelineResult.extracted_data.new_eta}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>Delay Slip</span>
              <div style={{ fontWeight: 800, color: 'var(--status-red)' }}>+{activePipelineResult.extracted_data.delay_days} days</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>Reason</span>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {activePipelineResult.extracted_data.reason}
              </div>
            </div>
          </div>

          {/* Toggle Expandable Technical Details */}
          <div>
            <button
              onClick={() => setShowTechDetails(!showTechDetails)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0'
              }}
            >
              <Code size={13} />
              {showTechDetails ? 'Hide technical extraction details' : 'Show technical extraction details (JSON / schema)'}
              {showTechDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showTechDetails && (
              <pre style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                fontSize: 11,
                fontFamily: 'monospace',
                overflowX: 'auto',
                color: 'var(--text-primary)'
              }}>
                {JSON.stringify({
                  extracted_event: activePipelineResult.extracted_data,
                  resolved_entities: activePipelineResult.resolved_entities,
                  impact_metrics: activePipelineResult.impact_summary,
                  recommended_recovery: activePipelineResult.recommendation
                }, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* ── INGESTED DOCUMENTS HISTORY TABLE ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              Data Inbox Documents & Processed Disruptions
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Historical log of supplier documents ingested through the multi-format pipeline.
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {history.length} Ingested Files
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
            No documents ingested yet. Upload a supplier notice or select a sample above to begin.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Document Name</th>
                  <th style={{ padding: '10px 14px' }}>Format</th>
                  <th style={{ padding: '10px 14px' }}>Supplier</th>
                  <th style={{ padding: '10px 14px' }}>Material</th>
                  <th style={{ padding: '10px 14px' }}>Delay Slip</th>
                  <th style={{ padding: '10px 14px' }}>Units at Risk</th>
                  <th style={{ padding: '10px 14px' }}>Ingested At</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const badgeStyle = getFormatBadgeColor(item.file_type);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.filename}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          background: badgeStyle.bg,
                          color: badgeStyle.color,
                          border: `1px solid ${badgeStyle.border}`
                        }}>
                          {item.file_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                        {item.supplier_name}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        {item.material_name}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--status-red)' }}>
                        +{item.delay_days} Days
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                        500 critical units
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                        {item.created_at}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate('/disruptions')}
                          style={{ fontSize: 11 }}
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── RAW TEXT PREVIEW MODAL ── */}
      {previewText && (
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
            maxWidth: 640,
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                Document Ingestion Preview
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewText(null)}>✕</button>
            </div>

            <pre style={{
              background: 'var(--bg-elevated)',
              padding: 16,
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              maxHeight: 350,
              overflowY: 'auto',
              border: '1px solid var(--border-default)',
              fontFamily: 'monospace'
            }}>
              {previewText}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setPreviewText(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxPage;
