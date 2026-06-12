import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { DashboardDataProvider } from '../../contexts/DashboardDataContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayoutInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isLg, setIsLg] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const tabletMq = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const lgMq = window.matchMedia('(min-width: 1024px)');
    const update = () => {
      setCollapsed(tabletMq.matches);
      setIsLg(lgMq.matches);
    };
    update();
    tabletMq.addEventListener('change', update);
    lgMq.addEventListener('change', update);
    return () => {
      tabletMq.removeEventListener('change', update);
      lgMq.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  const sidebarWidth = collapsed ? 72 : 260;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className="flex min-h-screen flex-col transition-all duration-200 ease-out"
        style={{ marginLeft: isLg ? sidebarWidth : 0 }}
      >
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          showReportActions={location.pathname === '/'}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-screen-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => (
  <DashboardDataProvider>
    <AppLayoutInner>{children}</AppLayoutInner>
  </DashboardDataProvider>
);

export default AppLayout;
