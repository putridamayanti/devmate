// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn git_local_branches(path: String) -> Result<Vec<BranchItem>, String> {
    let format = "%(refname:short)|%(objectname:short)|%(upstream:short)";
    let output = StdCommand::new("git")
        .args([
            "-C",
            &path,
            "for-each-ref",
            "--format",
            format,
            "refs/heads",
        ])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;
    if !output.status.success() {
        return Err(format!(
            "git for-each-ref failed (code {:?})",
            output.status.code()
        ));
    }
    // determine current branch
    let head_out = StdCommand::new("git")
        .args(["-C", &path, "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;
    let current = if head_out.status.success() {
        String::from_utf8_lossy(&head_out.stdout).trim().to_string()
    } else {
        String::new()
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let items = text
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let mut parts = line.splitn(3, '|');
            let name = parts.next().unwrap_or("").to_string();
            let commit = parts.next().unwrap_or("").to_string();
            let upstream = parts.next().and_then(|s| {
                let v = s.trim();
                if v.is_empty() { None } else { Some(v.to_string()) }
            });
            BranchItem {
                name: name.clone(),
                commit,
                upstream,
                current: name == current,
            }
        })
        .collect::<Vec<_>>();
    Ok(items)
}

#[tauri::command]
fn git_remotes(path: String) -> Result<Vec<RemoteItem>, String> {
    let output = StdCommand::new("git")
        .args(["-C", &path, "remote", "-v"])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "git remote -v failed (code {:?})",
            output.status.code()
        ));
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let mut remotes: Vec<RemoteItem> = Vec::new();

    for line in text.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }
        let name = parts[0].to_string();
        let url = parts[1].to_string();

        if let Some(existing) = remotes.iter_mut().find(|r| r.name == name) {
            existing.url = url;
        } else {
            remotes.push(RemoteItem { name, url });
        }
    }

    Ok(remotes)
}

#[tauri::command]
fn git_has_unpushed(path: String) -> Result<i32, String> {
    let output = StdCommand::new("git")
        .args(["-C", &path, "rev-list", "--count", "@{u}..HEAD"])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "git rev-list failed (code {:?})",
            output.status.code()
        ));
    }

    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let count: i32 = text.parse().unwrap_or(0);

    Ok(count)
}

#[tauri::command]
fn git_remote_branches(path: String) -> Result<Vec<BranchItem>, String> {
    let format = "%(refname:short)|%(objectname:short)|"; // no upstream for remote refs
    let output = StdCommand::new("git")
        .args([
            "-C",
            &path,
            "for-each-ref",
            "--format",
            format,
            "refs/remotes",
        ])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;
    if !output.status.success() {
        return Err(format!(
            "git for-each-ref failed (code {:?})",
            output.status.code()
        ));
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let items = text
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let mut parts = line.splitn(3, '|');
            let name = parts.next().unwrap_or("").to_string();
            let commit = parts.next().unwrap_or("").to_string();
            BranchItem {
                name,
                commit,
                upstream: None,
                current: false,
            }
        })
        .collect::<Vec<_>>();
    Ok(items)
}

use std::process::Command as StdCommand;

#[derive(serde::Serialize)]
struct ChangeItem {
    path: String,
    status: String,
}

#[derive(serde::Serialize)]
struct CommitItem {
    hash: String,
    author: String,
    date: String,
    subject: String,
}

#[derive(serde::Serialize)]
struct BranchItem {
    name: String,
    commit: String,
    upstream: Option<String>,
    current: bool,
}

#[derive(serde::Serialize)]
struct RemoteItem {
    name: String,
    url: String,
}

#[tauri::command]
fn git_status(path: String) -> Result<Vec<ChangeItem>, String> {
    let output = StdCommand::new("git")
        .args(["-C", &path, "status", "--porcelain"])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;
    if !output.status.success() {
        return Err(format!("git status failed (code {:?})", output.status.code()));
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let items = text
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            let status = line.chars().take(2).collect::<String>().trim().to_string();
            let path = line.chars().skip(3).collect::<String>().trim().to_string();
            ChangeItem { path, status }
        })
        .collect::<Vec<_>>();
    Ok(items)
}

#[tauri::command]
fn git_commits(path: String, limit: Option<u32>) -> Result<Vec<CommitItem>, String> {
    let n = limit.unwrap_or(50).to_string();
    let format = "%H|%an|%ad|%s";
    let output = StdCommand::new("git")
        .args(["-C", &path, "log", "-n", &n, "--date=iso", &format!("--pretty=format:{}", format)])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;
    if !output.status.success() {
        return Err(format!("git log failed (code {:?})", output.status.code()));
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let items = text
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|line| {
            let mut parts = line.splitn(4, '|');
            let hash = parts.next()?.to_string();
            let author = parts.next()?.to_string();
            let date = parts.next()?.to_string();
            let subject = parts.next().unwrap_or("").to_string();
            Some(CommitItem { hash, author, date, subject })
        })
        .collect::<Vec<_>>();
    Ok(items)
}

#[tauri::command]
fn git_diff_file(path: String, file_path: String) -> Result<String, String> {
    let output = StdCommand::new("git")
        .args(["-C", &path, "diff", "--unified=0", "--", &file_path])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;
    if !output.status.success() {
        return Err(format!("git diff failed (code {:?})", output.status.code()));
    }
    let text = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(text)
}

#[tauri::command]
fn git_commit(path: String, message: String) -> Result<(), String> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err("Commit message cannot be empty".to_string());
    }

    let status = StdCommand::new("git")
        .args(["-C", &path, "commit", "-m", trimmed])
        .status()
        .map_err(|e| format!("failed to run git: {}", e))?;

    if !status.success() {
        return Err(format!("git commit failed (code {:?})", status.code()));
    }

    Ok(())
}

#[tauri::command]
fn git_push_with_token(path: String, remote: String, token: String) -> Result<(), String> {
    // Read the configured remote URL
    let cfg = StdCommand::new("git")
        .args(["-C", &path, "config", "--get", &format!("remote.{}.url", remote)])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;

    if !cfg.status.success() {
        return Err(format!(
            "git config --get remote.{}.url failed (code {:?})",
            remote,
            cfg.status.code()
        ));
    }

    let url = String::from_utf8_lossy(&cfg.stdout).trim().to_string();

    // Only handle GitHub HTTPS URLs for now
    let github_prefix = "https://github.com/";
    if !url.starts_with(github_prefix) {
        return Err("Only GitHub HTTPS remotes are supported for token-based push".to_string());
    }

    let suffix = &url[github_prefix.len()..];
    let authed_url = format!("https://x-access-token:{}@github.com/{}", token, suffix);

    let output = StdCommand::new("git")
        .args(["-C", &path, "push", &authed_url])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            return Err(format!("git push failed (code {:?})", output.status.code()));
        }
        return Err(stderr);
    }

    Ok(())
}

#[tauri::command]
fn git_set_remote_url(path: String, name: String, url: String) -> Result<(), String> {
    let status = StdCommand::new("git")
        .args(["-C", &path, "remote", "set-url", &name, &url])
        .status()
        .map_err(|e| format!("failed to run git: {}", e))?;

    if !status.success() {
        return Err(format!("git remote set-url failed (code {:?})", status.code()));
    }

    Ok(())
}

#[tauri::command]
fn git_push(path: String) -> Result<(), String> {
    let output = StdCommand::new("git")
        .args(["-C", &path, "push"])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            return Err(format!("git push failed (code {:?})", output.status.code()));
        }
        return Err(stderr);
    }

    Ok(())
}

#[tauri::command]
fn git_stage_files(path: String, files: Vec<String>) -> Result<(), String> {
    if files.is_empty() {
        return Ok(());
    }

    let mut cmd = StdCommand::new("git");
    cmd.args(["-C", &path, "add", "--"]);
    for f in files {
        cmd.arg(f);
    }

    let status = cmd
        .status()
        .map_err(|e| format!("failed to run git: {}", e))?;
    if !status.success() {
        return Err(format!("git add failed (code {:?})", status.code()));
    }

    Ok(())
}

#[tauri::command]
fn git_clone(url: String, target_path: String) -> Result<(), String> {
    let output = StdCommand::new("git")
        .args(["clone", &url, &target_path])
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            return Err(format!("git clone failed (code {:?})", output.status.code()));
        }
        return Err(stderr);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            git_status,
            git_commits,
            git_has_unpushed,
            git_local_branches,
            git_remote_branches,
            git_diff_file,
            git_commit,
            git_push,
            git_stage_files,
            git_remotes,
            git_set_remote_url,
            git_push_with_token,
            git_clone
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
