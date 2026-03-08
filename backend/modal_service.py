import asyncio
import re
from typing import Optional

import modal
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = modal.App("buildman-sandbox-service")

# Node 20 image with npm
node_image = (
    modal.Image.debian_slim(python_version="3.12")
    .run_commands(
        "apt-get update && apt-get install -y curl",
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        "node --version && npm --version",
    )
)

web_app = FastAPI()

# --- Request/Response models ---

class FileEntry(BaseModel):
    path: str       # e.g. "/src/App.tsx"
    content: str

class CreateSandboxRequest(BaseModel):
    files: list[FileEntry]
    framework: str  # "react" | "vue" | "svelte" | "solid"

class CreateSandboxResponse(BaseModel):
    sandboxId: str
    url: str

class SyncFilesRequest(BaseModel):
    files: list[FileEntry]   # only changed files

class RestartRequest(BaseModel):
    files: Optional[list[FileEntry]] = None  # sync these before restarting

# --- Helpers ---

VITE_CONFIG_NAMES = {"vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs"}

def patch_vite_config(content: str) -> str:
    """Inject server.allowedHosts: true so Modal tunnel hosts are not blocked."""
    if "allowedHosts" in content:
        print("[patch_vite_config] already has allowedHosts, skipping")
        return content
    patched = re.sub(r"defineConfig\(\{", "defineConfig({ server: { allowedHosts: true },", content, count=1)
    matched = patched != content
    print(f"[patch_vite_config] patch applied: {matched}")
    print(f"[patch_vite_config] result snippet: {patched[:200]}")
    return patched

async def write_files_to_sandbox(sb: modal.Sandbox, files: list[FileEntry]):
    """Write files into /app/ inside the sandbox. Creates directories as needed."""
    for f in files:
        # Normalize: strip leading slash, then prepend /app/ so "src/App.tsx"
        # and "/src/App.tsx" both become "/app/src/App.tsx"
        clean = f.path.lstrip("/")
        path = f"/app/{clean}" if not f.path.startswith("/app/") else f.path
        # Ensure parent directory exists
        parts = path.rsplit("/", 1)
        if len(parts) > 1 and parts[0]:
            try:
                await sb.mkdir.aio(parts[0], parents=True)
            except Exception:
                pass  # already exists
        filename = path.rsplit("/", 1)[-1]
        content = patch_vite_config(f.content) if filename in VITE_CONFIG_NAMES else f.content
        fh = await sb.open.aio(path, "w")
        await fh.write.aio(content)
        await fh.close.aio()

async def run_command_and_wait(sb: modal.Sandbox, *cmd: str, workdir: str = "/app") -> int:
    """exec a command in the sandbox and wait for completion. Returns exit code."""
    proc = await sb.exec.aio(*cmd, workdir=workdir)
    # drain stdout/stderr so the process doesn't block on output
    async def drain(stream):
        async for _ in stream:
            pass
    await asyncio.gather(drain(proc.stdout), drain(proc.stderr))
    await proc.wait.aio()
    return proc.returncode

# --- Endpoints ---

@web_app.post("/sandbox", response_model=CreateSandboxResponse)
async def create_sandbox(req: CreateSandboxRequest):
    """
    Create a new Modal Sandbox, write all project files, run npm install,
    start the Vite dev server, and return the tunnel URL.
    """
    sb = await modal.Sandbox.create.aio(
        app=app,
        image=node_image,
        encrypted_ports=[5173],
        timeout=3600,       # 1 hour max lifetime
    )
    sandbox_id = sb.object_id  # local variable; renamed to sandboxId in the response model

    # Create /app directory
    try:
        await sb.mkdir.aio("/app", parents=True)
    except Exception:
        pass

    # Write all project files
    await write_files_to_sandbox(sb, req.files)

    # npm install
    exit_code = await run_command_and_wait(sb, "npm", "install", workdir="/app")
    if exit_code != 0:
        await sb.terminate.aio()
        raise HTTPException(status_code=500, detail="npm install failed")

    # Start Vite dev server (non-blocking — runs indefinitely)
    # --host makes Vite listen on 0.0.0.0 so the Modal tunnel can reach it
    dev_proc = await sb.exec.aio("npm", "run", "dev", "--", "--host", "0.0.0.0", workdir="/app")

    # Poll for the tunnel to become available (Vite can take 5-10s in a cold container)
    tunnels = {}
    for _ in range(20):  # up to 20s
        await asyncio.sleep(1)
        # If the dev process already exited something went wrong
        if await dev_proc.poll.aio() is not None:
            await sb.terminate.aio()
            raise HTTPException(status_code=500, detail="Dev server exited unexpectedly")
        tunnels = await sb.tunnels.aio()
        if 5173 in tunnels:
            break
    else:
        await sb.terminate.aio()
        raise HTTPException(status_code=500, detail="Dev server tunnel not available after 20s")

    url = tunnels[5173].url
    return CreateSandboxResponse(sandboxId=sandbox_id, url=url)


@web_app.post("/sandbox/{sandbox_id}/sync")
async def sync_files(sandbox_id: str, req: SyncFilesRequest):
    """
    Write only the changed files into the running sandbox.
    Vite's file watcher detects the changes and sends HMR updates to the browser.
    """
    try:
        sb = await modal.Sandbox.from_id.aio(sandbox_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    await write_files_to_sandbox(sb, req.files)
    return {"ok": True}


@web_app.post("/sandbox/{sandbox_id}/restart")
async def restart_sandbox(sandbox_id: str, req: RestartRequest):
    """
    Sync files then run npm install + restart dev server.
    Used when package.json changes.
    Returns the (unchanged) tunnel URL.
    """
    try:
        sb = await modal.Sandbox.from_id.aio(sandbox_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    if req.files:
        await write_files_to_sandbox(sb, req.files)

    # Kill existing dev server process (find by name); pkill returns 1 if nothing killed — that's fine
    kill_proc = await sb.exec.aio("pkill", "-f", "vite", workdir="/app")
    await kill_proc.wait.aio()

    # Re-run npm install
    exit_code = await run_command_and_wait(sb, "npm", "install", workdir="/app")
    if exit_code != 0:
        raise HTTPException(status_code=500, detail="npm install failed on restart")

    # Restart dev server
    await sb.exec.aio("npm", "run", "dev", "--", "--host", "0.0.0.0", workdir="/app")
    await asyncio.sleep(3)

    tunnels = await sb.tunnels.aio()
    url = tunnels[5173].url if 5173 in tunnels else None
    return {"ok": True, "url": url}


@web_app.delete("/sandbox/{sandbox_id}")
async def terminate_sandbox(sandbox_id: str):
    """Terminate a sandbox to free Modal resources."""
    try:
        sb = await modal.Sandbox.from_id.aio(sandbox_id)
        await sb.terminate.aio()
    except Exception:
        pass  # already gone — that's fine
    return {"ok": True}


# Modal entry point — deploy as ASGI web endpoint
@app.function(image=modal.Image.debian_slim(python_version="3.12").pip_install("fastapi", "pydantic"))
@modal.asgi_app()
def sandbox_api():
    return web_app
