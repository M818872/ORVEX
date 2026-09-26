import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboard, getAuditTrail } from '../api/client';

export type StageKey = 'INPUT' | 'UNDERSTAND' | 'CONNECT' | 'IMPACT' | 'RECOVER' | 'APPROVE' | 'RECORD';

interface StageContextType {
  activeStage: StageKey;
  completedStages: StageKey[];
  setStage: (stage: StageKey) => void;
  markCompleted: (stage: StageKey) => void;
  resetStages: () => void;
}

const StageContext = createContext<StageContextType | undefined>(undefined);

export const StageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeStage, setActiveStage] = useState<StageKey>('INPUT');
  const [completedStages, setCompletedStages] = useState<StageKey[]>([]);

  // Query dashboard & audit to calibrate baseline vs disruption vs approved
  const { data: dashboard } = useQuery({
    queryKey: ['manufacturing_dashboard'],
    queryFn: getDashboard,
    refetchInterval: 4000,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit_trail'],
    queryFn: getAuditTrail,
    refetchInterval: 4000,
  });

  const isHealthy = (dashboard?.status ?? 'healthy') === 'healthy';
  const hasApproved = auditLogs.some(
    l => l.event.toLowerCase().includes('approved') || l.event.toLowerCase().includes('authorized')
  );

  useEffect(() => {
    if (isHealthy) {
      setActiveStage('INPUT');
      setCompletedStages([]);
    } else if (hasApproved) {
      setActiveStage('RECORD');
      setCompletedStages(['INPUT', 'UNDERSTAND', 'CONNECT', 'IMPACT', 'RECOVER', 'APPROVE']);
    } else if (dashboard?.active_disruption) {
      setActiveStage('RECOVER');
      setCompletedStages(['INPUT', 'UNDERSTAND', 'CONNECT', 'IMPACT']);
    }
  }, [isHealthy, hasApproved, dashboard?.active_disruption]);

  const setStage = (stage: StageKey) => {
    setActiveStage(stage);
  };

  const markCompleted = (stage: StageKey) => {
    setCompletedStages(prev => (prev.includes(stage) ? prev : [...prev, stage]));
  };

  const resetStages = () => {
    setActiveStage('INPUT');
    setCompletedStages([]);
  };

  return (
    <StageContext.Provider value={{ activeStage, completedStages, setStage, markCompleted, resetStages }}>
      {children}
    </StageContext.Provider>
  );
};

export const useStage = () => {
  const ctx = useContext(StageContext);
  if (!ctx) {
    throw new Error('useStage must be used within a StageProvider');
  }
  return ctx;
};
