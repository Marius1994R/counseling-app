import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';

interface DashboardReportContextValue {
  openCaseReportModal: () => void;
  registerOpenCaseReportModal: (handler: (() => void) | null) => void;
}

const DashboardReportContext = createContext<DashboardReportContextValue | null>(null);

export const DashboardReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handlerRef = useRef<(() => void) | null>(null);

  const registerOpenCaseReportModal = useCallback((handler: (() => void) | null) => {
    handlerRef.current = handler;
  }, []);

  const openCaseReportModal = useCallback(() => {
    handlerRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ openCaseReportModal, registerOpenCaseReportModal }),
    [openCaseReportModal, registerOpenCaseReportModal]
  );

  return (
    <DashboardReportContext.Provider value={value}>{children}</DashboardReportContext.Provider>
  );
};

export function useDashboardReport(): DashboardReportContextValue {
  const ctx = useContext(DashboardReportContext);
  if (!ctx) {
    throw new Error('useDashboardReport must be used within DashboardReportProvider');
  }
  return ctx;
}
