import React, { createContext, useContext, useState, useCallback } from 'react';

interface AppState {
  workspaceId: number | null;
  analysisId: number | null;
  setWorkspaceId: (id: number | null) => void;
  setAnalysisId: (id: number | null) => void;
}

const AppContext = createContext<AppState>({
  workspaceId: null,
  analysisId: null,
  setWorkspaceId: () => {},
  setAnalysisId: () => {},
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workspaceId, setWorkspaceIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem('actionos_workspace_id');
    return saved ? parseInt(saved) : null;
  });
  const [analysisId, setAnalysisIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem('actionos_analysis_id');
    return saved ? parseInt(saved) : null;
  });

  const setWorkspaceId = useCallback((id: number | null) => {
    setWorkspaceIdState(id);
    if (id) localStorage.setItem('actionos_workspace_id', String(id));
    else localStorage.removeItem('actionos_workspace_id');
  }, []);

  const setAnalysisId = useCallback((id: number | null) => {
    setAnalysisIdState(id);
    if (id) localStorage.setItem('actionos_analysis_id', String(id));
    else localStorage.removeItem('actionos_analysis_id');
  }, []);

  return (
    <AppContext.Provider value={{ workspaceId, analysisId, setWorkspaceId, setAnalysisId }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
