import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Box,
  Cpu, Zap, ClipboardList, Settings
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/disruptions', label: 'Disruptions', icon: AlertTriangle },
  { to: '/production', label: 'Production', icon: Box },
  { to: '/materials', label: 'Materials', icon: Cpu },
  { to: '/recovery', label: 'Recovery', icon: Zap },
  { to: '/audit', label: 'Audit', icon: ClipboardList },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} />
        </div>
        <div>
          <div className="sidebar-logo-title">ORVEX</div>
          <div className="sidebar-logo-tagline" style={{ fontSize: 9, lineHeight: 1.2, color: 'var(--text-muted)' }}>
            AI Recovery Copilot
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Operations</div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <div className="sidebar-section-label">Enterprise</div>
          <div className="nav-item" style={{ opacity: 0.6, cursor: 'default' }}>
            <Settings size={16} />
            NovaCore Config
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
