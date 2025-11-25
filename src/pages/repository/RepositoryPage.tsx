import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { invoke } from "@tauri-apps/api/core";
import { useRepository } from "@/hooks/use-repository";
import type { Commit } from "@/types/repository";

export default function RepositoryPage() {
  const [params] = useSearchParams();

  const { activeRepo } = useRepository();
  console.log(activeRepo);

  const repoPath = useMemo(() => params.get("path") || "", [params]);

  const [, setCommits] = useState<Commit[] | null>(null);
  const [, setError] = useState<string | null>(null);
  const [, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!repoPath) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const commits = await invoke<Commit[]>("git_commits", { path: repoPath, limit: 50 });
        setCommits(commits);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load repository data");
      } finally {
        setLoading(false);
      }
    })();
  }, [repoPath]);

  return (
    <main className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Repository</h1>
        {repoPath && (
          <div className="text-xs opacity-70 break-all">{repoPath}</div>
        )}
      </div>

      
    </main>
  );
}