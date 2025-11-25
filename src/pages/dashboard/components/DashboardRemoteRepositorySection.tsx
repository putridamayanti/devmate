import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router";
import {useEffect, useState} from "react";
import {load as loadStore} from "@tauri-apps/plugin-store";
import {fetch as httpFetch} from "@tauri-apps/plugin-http";
import {open} from "@tauri-apps/plugin-dialog";
import {invoke} from "@tauri-apps/api/core";
import {useNavigate} from "react-router";
import { Repo } from "@/types/repository";
import {Alert, AlertTitle} from "@/components/ui/alert.tsx";
import {AlertCircleIcon, Funnel} from "lucide-react";
import {Spinner} from "@/components/ui/spinner.tsx";
import {Item, ItemContent, ItemMedia, ItemTitle} from "@/components/ui/item.tsx";
import {Collapsible, CollapsibleContent} from "@/components/ui/collapsible.tsx";
import {ButtonGroup} from "@/components/ui/button-group.tsx";
import { Input } from "@/components/ui/input";

export default function DashboardRemoteRepositorySection() {
    const navigate = useNavigate();
    // const { repositories = [] } = props;
    const [filterOpen, setFilterOpen] = useState(false);
    const [filter, setFilter] = useState({
        sort: "created",
        per_page: 200,
        type: "all"
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [repositories, setRepositories] = useState<Repo[] | []>([]);
    const [cloningRepo, setCloningRepo] = useState<string | null>(null);

    const fetchRepositories = async (filter: any) => {
        setError(null);
        setLoading(true);
        try {
            const store = await loadStore("auth.json", { autoSave: true, defaults: {} });
            const token = await store.get<string>("github_token");
            if (!token) {
                setError("No GitHub token found. Connect your account on the Home page.");
                setRepositories([]);
                return;
            }

            const searchParams = new URLSearchParams(filter);
            const queryString = searchParams.toString();

            const res = await httpFetch(
                `https://api.github.com/user/repos?${queryString}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/vnd.github+json",
                        Authorization: `Bearer ${token}`,
                        "User-Agent": "devmate",
                    },
                }
            );
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Failed to fetch repos (${res.status}): ${txt}`);
            }
            const data = (await res.json()) as Repo[];
            setRepositories(data);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load repositories");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRepositories(filter);
    }, [filter]);

    const handleFilter = (name: string, value: any) => {
        setFilter({...filter, [name]: value});
    };

    const handleClone = async (repo: Repo) => {
        try {
            setCloningRepo(repo.full_name);
            setError(null);
            
            // Open folder selection dialog
            const selectedFolder = await open({
                directory: true,
                multiple: false,
                title: `Select folder to clone ${repo.full_name}`
            });
            
            if (!selectedFolder) {
                setCloningRepo(null);
                return;
            }
            
            // Execute git clone using Rust backend
            console.log('Cloning repo:', JSON.stringify(repo, null, 2));
            console.log('Clone URL:', repo.clone_url);
            console.log('Full name:', repo.full_name);
            console.log('Selected folder:', selectedFolder);
            console.log('Target path:', `${selectedFolder}/${repo.name}`);
            
            // Fallback: construct clone URL if not available
            const cloneUrl = repo.clone_url || `https://github.com/${repo.full_name}.git`;
            console.log('Final clone URL:', cloneUrl);
            
            const targetPath = `${selectedFolder}/${repo.name}`;
            console.log('Target path:', targetPath);
            
            // Call Rust backend git_clone function
            await invoke('git_clone', { 
                url: cloneUrl, 
                targetPath: targetPath 
            });
            
            console.log(`Successfully cloned ${repo.full_name} to ${selectedFolder}/${repo.name}`);
            
            // Add to local repositories store
            const store = await loadStore("auth.json", { autoSave: true, defaults: {} });
            const existingRepos = await store.get<any[]>("local_repos") || [];
            
            const newRepo = {
                name: repo.name,
                path: targetPath,
                added_at: new Date().toISOString()
            };
            
            const updatedRepos = [...existingRepos, newRepo];
            await store.set("local_repos", updatedRepos);
            await store.save();
            
            console.log('Added repository to local store:', newRepo);
            
            // Navigate to the repository page
            navigate(`/repository/changes?path=${encodeURIComponent(targetPath)}`);
            console.log(`Navigated to repository: ${targetPath}`);
        } catch (error: any) {
            console.error('Clone error:', error);
            setError(`Failed to clone ${repo.full_name}: ${error.message}`);
        } finally {
            setCloningRepo(null);
        }
    };

    return (
        <>
            <header className="mt-6 mb-4 flex justify-between items-center">
                <h1 className="text-xl font-semibold">Remote Repository</h1>
                <div className="flex gap-4">
                    <ButtonGroup>
                        <Button variant={filter.type === 'all' ? 'default' : 'outline'} onClick={() => handleFilter('type', 'all')}>All</Button>
                        <Button variant={filter.type === 'public' ? 'default' : 'outline'} onClick={() => handleFilter('type', 'public')}>Public</Button>
                        <Button variant={filter.type === 'private' ? 'default' : 'outline'} onClick={() => handleFilter('type', 'private')}>Private</Button>
                    </ButtonGroup>
                    <Button variant="outline" onClick={() => setFilterOpen(!filterOpen)}>
                        <Funnel/>
                        Filter
                    </Button>
                    <Button onClick={() => fetchRepositories(filter)}>
                        Refresh
                    </Button>
                </div>
            </header>
            <Collapsible open={filterOpen} onOpenChange={() => setFilterOpen(!filterOpen)}>
                <CollapsibleContent>
                    <Card>
                        <CardContent>
                            <Input
                                placeholder="Search repository name ..."/>
                        </CardContent>
                    </Card>
                </CollapsibleContent>
            </Collapsible>
            <main className="pb-8 pt-4 space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircleIcon />
                        <AlertTitle className="line-clamp-10">{error}</AlertTitle>
                    </Alert>
                )}

                {loading ? (
                    <Item variant="muted">
                        <ItemMedia>
                            <Spinner />
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle className="line-clamp-1">Loading repositories...</ItemTitle>
                        </ItemContent>
                    </Item>
                ) : repositories?.length === 0 ? (
                    <Item variant="outline">
                        <ItemContent>
                            <ItemTitle className="line-clamp-1">No repository found</ItemTitle>
                        </ItemContent>
                    </Item>
                ) : repositories?.map((e: any, i: number) => (
                    <Card key={i} className="py-3">
                        <CardContent className="flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-3">
                                    <p className="text-sm font-semibold">{e.full_name}</p>
                                    <Badge
                                        className="max-h-[18px]"
                                        variant={e.private ? 'default' : 'secondary'}>{e.private ? 'Private' : 'Public'}</Badge>
                                </div>
                                <Link to={e.html_url} className="text-[11px] text-gray-400 underline">
                                    {e.html_url}
                                </Link>
                            </div>
                            <Button 
                                size="sm" 
                                onClick={() => handleClone(e)}
                                disabled={cloningRepo === e.full_name}
                            >
                                {cloningRepo === e.full_name ? 'Cloning...' : 'Clone'}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </main>
        </>
    )
}
