import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { load as loadStore } from "@tauri-apps/plugin-store";
import type { Store } from "@tauri-apps/plugin-store";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Trash } from "lucide-react";
import { useNavigate } from "react-router";
import { useRepository } from "@/hooks/use-repository";
import type { LocalRepo } from "@/types/repository";
import {Card, CardContent} from "@/components/ui/card.tsx";

export default function DashboardLocalRepositorySection() {
  const [repos, setRepos] = useState<LocalRepo[]>([]);
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const storeRef = useRef<Store | null>(null);
  const navigate = useNavigate();
  const { setActiveRepo } = useRepository();

  useEffect(() => {
    (async () => {
      try {
        const store = await loadStore("auth.json", { autoSave: true, defaults: {} });
        storeRef.current = store;
        const saved = (await store.get<LocalRepo[]>("local_repos")) || [];
        setRepos(saved);
      } catch (_) {
        // ignore
      }
    })();
  }, []);

  function inferNameFromPath(p: string) {
    if (!p) return "";
    const normalized = p.replace(/\\+/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  async function addRepository() {
    setError(null);
    const trimmedPath = path.trim();
    const repoName = (name || inferNameFromPath(trimmedPath)).trim();
    if (!trimmedPath) {
      setError("Path is required");
      return;
    }
    if (!repoName) {
      setError("Name is required");
      return;
    }
    const now = Date.now();
    const entry: LocalRepo = {
      path: trimmedPath,
      name: repoName,
      vcs: "git",
      createdAt: now,
      updatedAt: now,
    };
    const next = [...repos, entry];
    setRepos(next);
    try {
      if (storeRef.current) {
        await storeRef.current.set("local_repos", next);
        await storeRef.current.save();
      }
      setOpen(false);
      setPath("");
      setName("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save repository");
    }
  }

  async function removeRepository(idx: number) {
    const next = repos.filter((_, i) => i !== idx);
    setRepos(next);
    try {
      if (storeRef.current) {
        await storeRef.current.set("local_repos", next);
        await storeRef.current.save();
      }
    } catch (_) {
      // ignore
    }
  }

  const handleOpenRepository = (repository: any) => {
    setActiveRepo(repository);
    navigate(`/repository/changes?path=${encodeURIComponent(repository.path)}`);
  };

  return (
    <main className="py-8">
      <header className="my-6 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Local Repository</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Repository</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Local Repository</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm">Path</label>
                <div className="flex gap-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="C:\\Projects\\my-repo"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        const selected = await openDialog({ directory: true, multiple: false });
                        if (typeof selected === "string") {
                          setPath(selected);
                          if (!name) {
                            setName(inferNameFromPath(selected));
                          }
                        }
                      } catch (_) {
                        // ignore
                      }
                    }}
                  >
                    Browse
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm">Name (optional)</label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="my-repo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="text-xs opacity-60">Will default to the folder name if left blank.</div>
              </div>
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
            <DialogFooter>
              <Button onClick={addRepository}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="space-y-2">
        {repos.length === 0 && (
          <div className="text-sm opacity-70">No local repositories added yet.</div>
        )}
        {repos.length > 0 && (
          <ul className="space-y-2">
            {repos.map((r, i) => (
                <Card key={r.path ?? i} className="shadow-none border border-gray-200 ">
                  <CardContent className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.name}</div>
                      <div className="text-xs opacity-70 break-all">{r.path}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                          variant="tonal"
                          color="info"
                          type="button"
                          size="icon"
                          onClick={() => handleOpenRepository(r)}>
                        <FolderOpen/>
                      </Button>
                      <Button
                          color="destructive"
                          variant="tonal"
                          size="icon"
                          onClick={() => removeRepository(i)}><Trash/></Button>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
