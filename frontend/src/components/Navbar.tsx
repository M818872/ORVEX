import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api/client';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Production Disruption & Operations Command',
  '/disruptions': 'Disruption Investigation & Impact Tracing',
  '/production': 'SMT Production Orders & Line Schedule',
  '/materials': 'Component Inventory & Supplier Buffer',
  '/recovery': 'Recovery Strategy Simulator & Tradeoffs',
  '/audit': 'Operational Audit Trail & Approvals',
};

const Navbar: React.FC = () => {
  const { pathname } = useLocation();

  const { data: dashboard } = useQuery({
    queryKey: ['manufacturing_dashboard'],
    queryFn: getDashboard,
    refetchInterval: 5000,
  });

  const isHealthy = (dashboard?.status ?? 'healthy') === 'healthy';
  const title = PAGE_TITLES[pathname] || 'Manufacturing Operations';

  return (
    <header className="navbar">
      <div>
        <div className="navbar-company">NovaCore Electronics · Plant #4</div>
        <div className="navbar-title">ORVEX · {title}</div>
      </div>

      <div>
        <div className={`navbar-badge ${isHealthy ? 'healthy' : 'at_risk'}`}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: isHealthy ? 'var(--status-green)' : 'var(--status-red)'
          }} />
          {isHealthy
            ? `Production Health: ${dashboard?.production_health ?? 94}% (Optimal)`
            : `Production Health: ${dashboard?.production_health ?? 78}% (At Risk)`}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
