import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useStage, type StageKey } from '../context/StageContext';

interface Stage {
  key: StageKey;
  label: string;
  step: number;
}

const STAGES: Stage[] = [
  { key: 'INPUT', label: 'INPUT', step: 1 },
  { key: 'UNDERSTAND', label: 'UNDERSTAND', step: 2 },
  { key: 'CONNECT', label: 'CONNECT', step: 3 },
  { key: 'IMPACT', label: 'IMPACT', step: 4 },
  { key: 'RECOVER', label: 'RECOVER', step: 5 },
  { key: 'APPROVE', label: 'APPROVE', step: 6 },
  { key: 'RECORD', label: 'RECORD', step: 7 },
];

const ProcessIndicator: React.FC = () => {
  const navigate = useNavigate();
  const { activeStage, completedStages } = useStage();

  const handleStageClick = (stage: Stage) => {
    if (stage.key === 'INPUT' || stage.key === 'UNDERSTAND') {
      navigate('/dashboard');
    } else if (stage.key === 'CONNECT' || stage.key === 'IMPACT') {
      navigate('/disruptions');
    } else if (stage.key === 'RECOVER' || stage.key === 'APPROVE') {
      navigate('/recovery');
    } else if (stage.key === 'RECORD') {
      navigate('/audit');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '7px 18px',
      background: '#ffffff',
      borderBottom: '1px solid var(--border-default)',
      overflowX: 'auto',
      gap: 6
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em'
      }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 4, letterSpacing: '0.06em' }}>
          WORKFLOW:
        </span>

        {STAGES.map((stage, idx) => {
          const isActive = stage.key === activeStage;
          const isCompleted = completedStages.includes(stage.key);

          return (
            <React.Fragment key={stage.key}>
              <button
                onClick={() => handleStageClick(stage)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: isActive ? 800 : isCompleted ? 700 : 500,
                  cursor: 'pointer',
                  border: isActive
                    ? '1.5px solid var(--brand-primary)'
                    : isCompleted
                    ? '1px solid var(--border-success)'
                    : '1px solid transparent',
                  background: isActive
                    ? 'var(--brand-light)'
                    : isCompleted
                    ? 'var(--status-green-bg)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--brand-primary)'
                    : isCompleted
                    ? 'var(--status-green)'
                    : 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{stage.step}. {stage.label}</span>
                {isCompleted && !isActive && <Check size={12} style={{ strokeWidth: 3 }} />}
              </button>

              {idx < STAGES.length - 1 && (
                <span style={{
                  color: isCompleted ? 'var(--status-green)' : 'var(--border-default)',
                  fontSize: 11,
                  userSelect: 'none'
                }}>
                  →
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ProcessIndicator;
