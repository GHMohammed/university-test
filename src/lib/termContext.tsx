import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useActiveTerm, useAcademicTerms } from '@/hooks/useAcademicTerms';

interface TermContextValue {
  activeTermId: string | null;
  selectedTermId: string | null;
  setSelectedTermId: (id: string | null) => void;
  hasTerms: boolean;
  isLoading: boolean;
}

const TermContext = createContext<TermContextValue | null>(null);

const STORAGE_KEY = 'selected_term_id';

export function TermProvider({ children }: { children: React.ReactNode }) {
  const { data: activeTerm, isLoading: activeLoading } = useActiveTerm();
  const { data: allTerms = [], isLoading: allLoading } = useAcademicTerms();

  const [selectedTermId, setSelectedTermIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  const activeTermId = activeTerm?.id ?? null;

  // If user hasn't picked one and one becomes available, default to active
  useEffect(() => {
    if (!selectedTermId && activeTermId) {
      setSelectedTermIdState(activeTermId);
    }
  }, [activeTermId, selectedTermId]);

  // If selected term no longer exists, clear it
  useEffect(() => {
    if (selectedTermId && allTerms.length > 0 && !allTerms.find((t) => t.id === selectedTermId)) {
      setSelectedTermIdState(activeTermId);
    }
  }, [allTerms, selectedTermId, activeTermId]);

  const setSelectedTermId = (id: string | null) => {
    setSelectedTermIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<TermContextValue>(
    () => ({
      activeTermId,
      selectedTermId,
      setSelectedTermId,
      hasTerms: allTerms.length > 0,
      isLoading: activeLoading || allLoading,
    }),
    [activeTermId, selectedTermId, allTerms.length, activeLoading, allLoading]
  );

  return <TermContext.Provider value={value}>{children}</TermContext.Provider>;
}

export function useTermContext() {
  const ctx = useContext(TermContext);
  if (!ctx) throw new Error('useTermContext must be used within TermProvider');
  return ctx;
}
