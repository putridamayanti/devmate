export type BranchItem = {
  name: string;
  commit: string;
  upstream?: string | null;
  current: boolean;
};

export type LocalRepo = {
  path: string;
  name: string;
  vcs: "git";
  remoteUrl?: string;
  pinned?: boolean;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
};

export type Change = {
  path: string;
  status: string; // e.g. M, A, D, ??
};

export type Commit = {
  hash: string;
  author: string;
  date: string;
  subject: string;
};

export type ActiveRepo = LocalRepo;

export type Repo = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  description: string | null;
};
