import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import InboxPage from './pages/InboxPage';
import DisruptionsPage from './pages/DisruptionsPage';
import ProductionPage from './pages/ProductionPage';
import MaterialsPage from './pages/MaterialsPage';
import RecoveryPage from './pages/RecoveryPage';
import AuditPage from './pages/AuditPage';
import AIChatDrawer from './components/AIChatDrawer';
import ProcessIndicator from './components/ProcessIndicator';
import { StageProvider } from './context/StageContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 10000 },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <StageProvider>
        <BrowserRouter>
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <Navbar />
              <ProcessIndicator />
            <div className="page-container">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/disruptions" element={<DisruptionsPage />} />
                <Route path="/production" element={<ProductionPage />} />
                <Route path="/materials" element={<MaterialsPage />} />
                <Route path="/recovery" element={<RecoveryPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </div>
          {/* Operations Copilot Assistant */}
          <AIChatDrawer />
        </div>
      </BrowserRouter>
      </StageProvider>
    </QueryClientProvider>
  );
};

export default App;
