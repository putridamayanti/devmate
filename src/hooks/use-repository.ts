import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useRepositoryContext } from "@/context/repository-context";
import type { BranchItem } from "@/types/repository";

export function useRepository(path?: string | null) {
  const { activeRepo, setActiveRepo } = useRepositoryContext();
  const repoPath = useMemo(() => (path ?? "").trim(), [path]);
  const [localBranches, setLocalBranches] = useState<BranchItem[] | null>(null);
  const [remoteBranches, setRemoteBranches] = useState<BranchItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);
    try {
      const locals = await invoke<BranchItem[]>("git_local_branches", { path: repoPath });
      setLocalBranches(locals);
      const remotes = await invoke<BranchItem[]>("git_remote_branches", { path: repoPath });
      setRemoteBranches(remotes);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    if (repoPath) void refresh();
  }, [repoPath, refresh]);

  return { repoPath, localBranches, remoteBranches, loading, error, refresh, activeRepo, setActiveRepo };
}
