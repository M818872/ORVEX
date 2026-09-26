import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare, X, Send, Sparkles, FileText, ChevronRight,
  RotateCcw, ShieldCheck, ArrowRight, Network, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  getDashboard,
  sendCopilotMessage,
  type CopilotChatResponse,
  type SourceItem,
  type CopilotActionGuardrail
} from '../api/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceItem[];
  entities?: string[];
  visualTrace?: string | null;
  actionGuardrail?: CopilotActionGuardrail | null;
  suggestedFollowups?: string[];
  timestamp?: string;
}

const REASONING_STEPS = [
  'ORVEX is analyzing...',
  'Retrieving operational context...',
  'Checking relevant records...',
  'Generating grounded answer...'
];

const AIChatDrawer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reasoningStepIndex, setReasoningStepIndex] = useState(0);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  // Poll current manufacturing dashboard state to know if disruption is active
  const { data: dashboard } = useQuery({
    queryKey: ['manufacturing_dashboard'],
    queryFn: getDashboard,
    refetchInterval: 5000,
  });

  const hasDisruption = !!dashboard?.active_disruption && (dashboard?.status !== 'healthy');

  // Context-aware suggested quick questions
  const getContextualSuggestions = (): string[] => {
    const path = location.pathname.toLowerCase();
    if (path.includes('recovery')) {
      return [
        'Compare these recovery options',
        'What are the trade-offs of Option A?',
        'Why was Option A recommended?',
        'Has a recovery plan been approved?'
      ];
    }
    if (hasDisruption) {
      return [
        'Why is Order #1042 at risk?',
        'Trace the impact of MCU-742',
        'Which customers are affected?',
        'What recovery options exist?',
        'Show supporting evidence'
      ];
    }
    return [
      'What needs my attention?',
      'Are there active disruptions?',
      'What is the current production health?',
      'How much MCU-742 is available?'
    ];
  };

  const initialGreeting: ChatMessage = {
    id: 'msg-init',
    role: 'assistant',
    content: hasDisruption
      ? 'Hello Alex. I am ORVEX Copilot. An active supplier disruption is currently impacting MCU-742 for Order #1042 on SMT Line 2. How can I assist your operational decisions?'
      : 'Hello Alex. I am ORVEX Copilot, connected to NovaCore Electronics operational records. All systems are currently operating at 94% optimal health. How can I help you today?',
    suggestedFollowups: getContextualSuggestions(),
    timestamp: 'Just now'
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

  // Keep greeting synchronized if disruption changes while conversation hasn't started
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'msg-init') {
      setMessages([initialGreeting]);
    }
  }, [hasDisruption]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, reasoningStepIndex]);

  const toggleSourceExpand = (msgId: string) => {
    setExpandedSources(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleClearChat = () => {
    setMessages([
      {
        ...initialGreeting,
        id: `msg-reset-${Date.now()}`,
        suggestedFollowups: getContextualSuggestions()
      }
    ]);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessageText = text.trim();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setReasoningStepIndex(0);

    // Staged reasoning visualization (Prompt Section 13)
    const t1 = setTimeout(() => setReasoningStepIndex(1), 350);
    const t2 = setTimeout(() => setReasoningStepIndex(2), 700);
    const t3 = setTimeout(() => setReasoningStepIndex(3), 1050);

    try {
      const resp: CopilotChatResponse = await sendCopilotMessage({
        message: userMessageText,
        current_page: location.pathname,
        conversation_id: 'active_session'
      });

      // Clear any pending timers
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      const botMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: resp.reply,
        sources: resp.sources,
        entities: resp.entities,
        visualTrace: resp.visual_trace,
        actionGuardrail: resp.action_guardrail,
        suggestedFollowups: resp.suggested_followups,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Unable to reach the ORVEX operational reasoning engine. Please verify the backend connection.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
      setReasoningStepIndex(0);
    }
  };

  return (
    <>
      {/* ── Floating ORVEX Copilot Trigger Button ── */}
      {!isOpen && (
        <button
          id="btn-open-orvex-copilot"
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 28,
            zIndex: 900,
            background: 'var(--brand-primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 9999,
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.45)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.35)';
          }}
          title="Ask about your operations"
        >
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: hasDisruption ? '#f87171' : '#4ade80',
            boxShadow: hasDisruption ? '0 0 8px #ef4444' : '0 0 8px #22c55e'
          }} />
          <Sparkles size={16} />
          <span>ORVEX Copilot</span>
        </button>
      )}

      {/* ── Context-Aware Chat Panel Drawer ── */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 410,
          height: 620,
          maxHeight: 'calc(100vh - 48px)',
          background: '#ffffff',
          borderRadius: 14,
          border: '1px solid var(--border-default)',
          boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.05)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease'
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'var(--brand-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)'
              }}>
                <MessageSquare size={17} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                    ORVEX COPILOT
                  </span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 5px',
                    borderRadius: 4,
                    background: hasDisruption ? 'var(--status-red-bg)' : 'var(--status-green-bg)',
                    color: hasDisruption ? 'var(--status-red)' : 'var(--status-green)'
                  }}>
                    {hasDisruption ? 'Disrupted' : 'Optimal'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--status-green)',
                    display: 'inline-block'
                  }} />
                  Connected to operational data
                </div>
              </div>
            </div>

            {/* Header Utility Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={handleClearChat}
                title="Clear conversation"
                style={{ color: 'var(--text-muted)', padding: 6 }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setIsOpen(false)}
                title="Close Copilot"
                style={{ color: 'var(--text-muted)', padding: 6 }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Subheader Context Strip */}
          <div style={{
            padding: '6px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid var(--border-default)',
            fontSize: 11,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Context: <strong>NovaCore Electronics (Plant #4)</strong></span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
              {location.pathname}
            </span>
          </div>

          {/* Messages Feed */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: '#ffffff'
          }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: 6
                }}
              >
                {/* Bubble */}
                <div style={{
                  maxWidth: '92%',
                  padding: '12px 15px',
                  borderRadius: 10,
                  fontSize: 13,
                  lineHeight: 1.55,
                  background: m.role === 'user' ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                  color: m.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border-default)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {m.content}
                </div>

                {/* Visual Trace ASCII Box (Prompt Section 15) */}
                {m.visualTrace && (
                  <div style={{
                    maxWidth: '92%',
                    width: '100%',
                    background: '#0f172a',
                    color: '#38bdf8',
                    padding: '12px 14px',
                    borderRadius: 8,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    lineHeight: 1.45,
                    border: '1px solid #1e293b',
                    whiteSpace: 'pre'
                  }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Network size={11} /> DEPENDENCY CHAIN:
                    </div>
                    {m.visualTrace}
                  </div>
                )}

                {/* Action Guardrail Box (Prompt Section 16) */}
                {m.actionGuardrail && (
                  <div style={{
                    maxWidth: '92%',
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--brand-light)',
                    border: '1px solid var(--border-brand)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--brand-primary)' }}>
                      <ShieldCheck size={16} />
                      Action Guardrail Enforced
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        navigate(m.actionGuardrail!.url);
                        setIsOpen(false);
                      }}
                      style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px' }}
                    >
                      {m.actionGuardrail.label}
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}

                {/* Grounded Sources Accordion (Prompt Section 8) */}
                {m.sources && m.sources.length > 0 && (
                  <div style={{
                    maxWidth: '92%',
                    width: '100%',
                    marginTop: 2,
                    border: '1px solid var(--border-default)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: '#f8fafc'
                  }}>
                    <button
                      onClick={() => toggleSourceExpand(m.id)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FileText size={12} style={{ color: 'var(--brand-primary)' }} />
                        Grounded Sources ({m.sources.length})
                      </span>
                      {expandedSources[m.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {expandedSources[m.id] && (
                      <div style={{
                        padding: '8px 10px',
                        borderTop: '1px solid var(--border-default)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}>
                        {m.sources.map((src, sIdx) => (
                          <div key={sIdx} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>• {src.document}</strong>
                            {src.type && <span style={{ color: 'var(--brand-primary)', marginLeft: 4 }}>({src.type})</span>}
                            {src.detail && <div style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 10 }}>{src.detail}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Contextual Suggested Follow-ups */}
                {m.suggestedFollowups && m.suggestedFollowups.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, maxWidth: '92%' }}>
                    {m.suggestedFollowups.map((q, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => handleSend(q)}
                        disabled={loading}
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--border-default)',
                          borderRadius: 9999,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--brand-primary)';
                          e.currentTarget.style.color = 'var(--brand-primary)';
                          e.currentTarget.style.background = 'var(--brand-light)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--border-default)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.background = '#ffffff';
                        }}
                      >
                        {q} <ChevronRight size={10} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Staged Reasoning / Typing Indicator (Prompt Section 13) */}
            {loading && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--brand-primary)',
                width: 'fit-content'
              }}>
                <Sparkles size={14} className="spin" />
                <span>{REASONING_STEPS[reasoningStepIndex]}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-default)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}>
            <input
              ref={inputRef}
              type="text"
              className="form-control"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask ORVEX about MCU-742, Order #1042..."
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              disabled={loading}
              style={{
                flex: 1,
                background: '#ffffff',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13
              }}
            />
            <button
              id="btn-send-copilot-msg"
              className="btn btn-primary"
              onClick={() => handleSend(input)}
              disabled={loading || !input.trim()}
              style={{
                padding: '9px 14px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0
              }}
            >
              <span>Send</span>
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatDrawer;
