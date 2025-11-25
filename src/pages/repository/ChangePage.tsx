import { useRepository } from "@/hooks/use-repository";
import { useEffect, useState } from "react";
import type { Change } from "@/types/repository";
import { invoke } from "@tauri-apps/api/core";
import { load as loadStore } from "@tauri-apps/plugin-store";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import ChangeUnstagedSection from "@/pages/repository/components/ChangeUnstagedSection.tsx";
import ChangePreviewSection from "@/pages/repository/components/ChangePreviewSection.tsx";
import ChangeStagedSection from "@/pages/repository/components/ChangeStagedSection.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Badge} from "@/components/ui/badge.tsx";

type DiffLine = {
  raw: string;
  type: "add" | "remove" | "context" | "meta";
};

function parseUnifiedDiff(diffText: string): DiffLine[] {
  const lines = diffText.split(/\r?\n/);
  return lines
    .filter((line) => line.length > 0)
    .map((line) => {
      if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("@@")) {
        return { raw: line, type: "meta" as const };
      }
      if (line.startsWith("+")) return { raw: line, type: "add" as const };
      if (line.startsWith("-")) return { raw: line, type: "remove" as const };
      return { raw: line, type: "context" as const };
    });
}

export default function ChangePage() {
  const { activeRepo } = useRepository();
  const repoPath = activeRepo?.path ?? null;

  const [loading, setLoading] = useState<boolean>(false);
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [stagedChanges, setStagedChanges] = useState<Change[]>([]);
  const [unstagedChanges, setUnstagedChanges] = useState<Change[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [, setDiffText] = useState<string | null>(null);
  const [diffLines, setDiffLines] = useState<DiffLine[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const [staging, setStaging] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [lastCommitMessage, setLastCommitMessage] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [hasUnpushedCommit, setHasUnpushedCommit] = useState(false);
  const [unpushedCommitCount, setUnpushedCommitCount] = useState<number | null>(null);

  const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const status = await invoke<Change[]>("git_status", { path: repoPath });
        console.log(status)
        setStagedChanges(status.filter(e => e.status === "A"));
        setUnstagedChanges(status.filter(e => e.status !== "A"));
        setChanges(status);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load repository data");
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (!repoPath) return;
    (async () => {
      fetch()
    })();
  }, [repoPath]);

  useEffect(() => {
    if (!repoPath) return;
    (async () => {
      try {
        const count = await invoke<number>("git_has_unpushed", { path: repoPath });
        setHasUnpushedCommit(count > 0);
      } catch (e) {
        console.log("Error", e)
        // ignore; falling back to local state
      }
    })();
  }, [repoPath]);

  const toggleFileSelected = (path: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const stageSelected = async () => {
    if (!repoPath || selectedFiles.size === 0) return;
    setStaging(true);
    setStageError(null);
    try {
      await invoke("git_stage_files", { path: repoPath, files: Array.from(selectedFiles) });
      const status = await invoke<Change[]>("git_status", { path: repoPath });
      setStagedChanges(status.filter((e) => e.status === "A"));
      setUnstagedChanges(status.filter((e) => e.status !== "A"));
      setChanges(status);
      setHasUnpushedCommit(false);
      setSelectedFiles(new Set());
      fetch();
    } catch (e: any) {
      setStageError(e?.message ?? "Failed to stage files");
    } finally {
      setStaging(false);
    }
  };

  const handleCommit = async () => {
    if (!repoPath) return;
    const msg = commitMessage.trim();
    if (!msg || stagedChanges.length === 0) return;

    setCommitting(true);
    setCommitError(null);
    try {
      await invoke("git_commit", { path: repoPath, message: msg });
      setLastCommitMessage(msg);
      setCommitMessage("");
      setHasUnpushedCommit(true);
      setUnpushedCommitCount(1);

      const status = await invoke<Change[]>("git_status", { path: repoPath });
      setStagedChanges(status.filter((e) => e.status === "A"));
      setUnstagedChanges(status.filter((e) => e.status !== "A"));
      setChanges(status);
      setSelectedFiles(new Set());
    } catch (e: any) {
      setCommitError(e?.message ?? "Failed to commit changes");
    } finally {
      setCommitting(false);
    }
  };

  const handlePush = async () => {
    if (!repoPath) return;

    setPushing(true);
    setPushError(null);
    try {
      // Try to use GitHub token if available
      let usedToken = false;
      try {
        const store = await loadStore("auth.json", { autoSave: true, defaults: {} });
        const token = await store.get<string>("github_token");
        console.log(token);
        if (token) {
          await invoke("git_push_with_token", { path: repoPath, remote: "origin", token })
          .then(res => console.log(res))
          .catch(err => console.log(err));
          usedToken = true;
        } else {
          setPushError("Token not found")
        }
      } catch (e) {
        console.log(e);
        setPushError(String(e));
        // ignore and fall back to plain push
      }

      if (!usedToken) {
        await invoke("git_push", { path: repoPath });
      }

      const status = await invoke<Change[]>("git_status", { path: repoPath });
      setStagedChanges(status.filter((e) => e.status === "A"));
      setUnstagedChanges(status.filter((e) => e.status !== "A"));
      setChanges(status);
      // assume push succeeded, clear unpushed flag and re-sync from git if possible
      setHasUnpushedCommit(false);
      try {
        const count = await invoke<number>("git_has_unpushed", { path: repoPath });
        setHasUnpushedCommit(count > 0);
        setUnpushedCommitCount(count);
      } catch {
        // ignore; keep optimistic false state
      }
    } catch (e: any) {
      console.log(e);
      setPushError(e?.message ?? String(e) ?? "Failed to push");
    } finally {
      setPushing(false);
    }
  };

  useEffect(() => {
    if (!repoPath || !selectedPath) return;
    (async () => {
      setDiffLoading(true);
      setDiffError(null);
      try {
        const diff = await invoke<string>("git_diff_file", { path: repoPath, filePath: selectedPath });
        setDiffText(diff);
        setDiffLines(parseUnifiedDiff(diff));
      } catch (e: any) {
        setDiffError(e?.message ?? "Failed to load diff");
        setDiffText(null);
        setDiffLines(null);
      } finally {
        setDiffLoading(false);
      }
    })();
  }, [repoPath, selectedPath]);

  return (
    <main className="h-full">
      <PageTitle title="Changes">
        <div className="flex items-center gap-2">
          {!hasUnpushedCommit && (
            <>
              <Button
                  type="button"
                  onClick={stageSelected}
                  disabled={staging || selectedFiles.size === 0}
              >
                {staging ? "Staging..." : "Add to stage"}
              </Button>
              <Button
                  type="button"
                  variant="outline"
                  onClick={handleCommit}
                  disabled={
                      committing ||
                      stagedChanges.length === 0 ||
                      commitMessage.trim().length === 0
                  }
              >
                {committing ? "Committing..." : "Commit"}
              </Button>
            </>
          )}
          {hasUnpushedCommit && (
            <>
              {lastCommitMessage && (
                <div className="text-[10px] opacity-70">
                  Last commit: {lastCommitMessage}
                </div>
              )}
              {pushError && (
                  <p className="text-sm text-destructive">
                    {pushError}
                  </p>
              )}
              <Button
                  type="button"
                  variant="outline"
                  onClick={handlePush}
                  disabled={pushing}
                  className="relative"
              >
                <Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums absolute -top-2 -right-2">
                  {unpushedCommitCount}
                </Badge>
                {pushing ? "Pushing..." : "Push"}
              </Button>
            </>
          )}
        </div>
      </PageTitle>

      <div className="min-h-[85vh] grid grid-cols-5">
        <section className="col-span-2 flex-shrink-0 space-y-2 border-r">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {stageError && <div className="text-xs text-red-600">{stageError}</div>}
          {commitError && <div className="text-xs text-red-600">{commitError}</div>}
          {lastCommitMessage && (
            <div className="text-[10px] opacity-70">
              Last commit: {lastCommitMessage}
            </div>
          )}
          {!changes && !loading && <div className="text-sm opacity-70">No changes data.</div>}
          {changes && changes.length === 0 && (
              <div className="text-sm opacity-70">Working tree clean.</div>
          )}
          {changes && changes.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-1">
                  {loading && <div className="text-[10px] opacity-70">Refreshing…</div>}
                </div>

                <ChangeUnstagedSection
                    changes={unstagedChanges}
                    selectedPath={selectedPath}
                    selectedFiles={selectedFiles}
                    onSelect={(path: string) => setSelectedPath(path)}
                    onCheck={(path: string) => toggleFileSelected(path)}/>

                <hr className="h-1 w-full"/>

                <ChangeStagedSection
                    changes={stagedChanges}
                    selectedPath={selectedPath}
                    selectedFiles={selectedFiles}
                    onSelect={(path: string) => setSelectedPath(path)}
                    onCheck={(path: string) => toggleFileSelected(path)}/>

                {stagedChanges.length > 0 && (
                    <div className="p-4 space-y-4">
                      <Textarea
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          rows={5}
                          placeholder="Type commit messages ..."/>
                      <Button
                        type="button"
                        onClick={handleCommit}
                        disabled={
                          committing ||
                          commitMessage.trim().length === 0 ||
                          stagedChanges.length === 0
                        }
                      >
                        {committing ? "Committing..." : "Commit"}
                      </Button>
                    </div>
                )}
              </>
          )}
        </section>

        <section className="col-span-3 p-4">
          <ChangePreviewSection
              selectedPath={selectedPath}
            loading={diffLoading}
            diffError={diffError}
            diffLines={diffLines}/>
        </section>
      </div>
    </main>
  );
}
