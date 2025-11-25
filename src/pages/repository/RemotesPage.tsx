import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useRepository } from "@/hooks/use-repository";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";

interface RemoteItem {
  name: string;
  url: string;
}

export default function RemotesPage() {
  const { activeRepo } = useRepository();
  const repoPath = activeRepo?.path ?? null;

  const [remotes, setRemotes] = useState<RemoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoPath) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await invoke<RemoteItem[]>("git_remotes", { path: repoPath });
        setRemotes(data);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load remotes");
      } finally {
        setLoading(false);
      }
    })();
  }, [repoPath]);

  const handleUrlChange = (name: string, url: string) => {
    setRemotes((prev) => prev.map((r) => (r.name === name ? { ...r, url } : r)));
  };

  const handleSave = async (remote: RemoteItem) => {
    if (!repoPath) return;
    setSaving(true);
    setSaveError(null);
    try {
      await invoke("git_set_remote_url", { path: repoPath, name: remote.name, url: remote.url });
    } catch (e: any) {
      setSaveError(e?.message ?? "Failed to update remote");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="h-full">
      <PageTitle title="Remotes" />

      <div className="p-4 space-y-4">
        {error && <div className="text-sm text-red-600">{error}</div>}
        {saveError && <div className="text-xs text-red-600">{saveError}</div>}
        {!repoPath && <div className="text-sm opacity-70">No active repository selected.</div>}
        {repoPath && (
          <>
            <div className="text-xs opacity-70 break-all">{repoPath}</div>
            {loading && <div className="text-sm opacity-70">Loading remotes</div>}
            {!loading && remotes.length === 0 && (
              <div className="text-sm opacity-70">No remotes configured.</div>
            )}
            {!loading && remotes.length > 0 && (
              <div className="space-y-3 max-w-xl">
                {remotes.map((r) => (
                  <div key={r.name} className="border rounded p-3 space-y-2">
                    <div className="text-xs font-medium">{r.name}</div>
                    <input
                      className="w-full border rounded px-2 py-1 text-sm"
                      value={r.url}
                      onChange={(e) => handleUrlChange(r.name, e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => handleSave(r)}
                      >
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
