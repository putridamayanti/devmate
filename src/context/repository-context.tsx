import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import type { ActiveRepo } from "@/types/repository";

export type RepositoryContextValue = {
  activeRepo: ActiveRepo | null;
  setActiveRepo: (repo: ActiveRepo | null) => void;
};

const STORAGE_KEY = "devmate_active_repo";

const RepositoryContext = createContext<RepositoryContextValue | undefined>(undefined);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [activeRepo, setActiveRepoState] = useState<ActiveRepo | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ActiveRepo;
      if (parsed && (parsed as any).path) {
        setActiveRepoState(parsed);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  const setActiveRepo = (repo: ActiveRepo | null) => {
    setActiveRepoState(repo);
    try {
      if (repo) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(repo));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  };

  return (
    <RepositoryContext.Provider value={{ activeRepo, setActiveRepo }}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepositoryContext(): RepositoryContextValue {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error("useRepositoryContext must be used within a RepositoryProvider");
  }
  return ctx;
}
