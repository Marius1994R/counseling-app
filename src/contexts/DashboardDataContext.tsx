import React, { createContext, useContext } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';

type DashboardData = ReturnType<typeof useDashboardData>;

const DashboardDataContext = createContext<DashboardData | null>(null);

export const DashboardDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const data = useDashboardData();
  return <DashboardDataContext.Provider value={data}>{children}</DashboardDataContext.Provider>;
};

export function useDashboardDataContext(): DashboardData {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error('useDashboardDataContext must be used within DashboardDataProvider');
  }
  return ctx;
}
