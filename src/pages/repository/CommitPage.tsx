import { useRepository } from "@/hooks/use-repository";
import { Commit } from "@/types/repository";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";

export default function CommitPage() {
    const { activeRepo } = useRepository();
    const repoPath = activeRepo?.path ?? null;
    console.log('Repo path', repoPath, activeRepo)
    const [loading, setLoading] = useState<boolean>(false);
  const [commits, setCommits] = useState<Commit[] | null>(null);
    const [error, setError] = useState<string | null>(null);

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
        <main className="p-8">
            {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && <div className="text-sm opacity-70">Loading…</div>}


      <section className="space-y-2">
        <h2 className="text-lg font-medium">Commits</h2>
        {!commits && !loading && <div className="text-sm opacity-70">No commits loaded.</div>}
        {commits && commits.length > 0 && (
          <ul className="space-y-2">
            {commits.map((c) => (
              <li key={c.hash} className="text-sm">
                <div className="font-medium">{c.subject}</div>
                <div className="text-xs opacity-70">{c.hash.slice(0, 7)} • {c.author} • {c.date}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
        </main>
    )
}