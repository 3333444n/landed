/*
 * Updates (ADR 013), reported to the window's update banner. On Windows and Linux electron-updater
 * downloads the new version in the background and installs it on restart. Unsigned macOS builds
 * cannot install themselves, so main downloads the matching dmg from the latest GitHub release,
 * checks its SHA-256 and opens it for the person to drag over the old app.
 */
import { createHash } from "node:crypto";
import { createWriteStream, rmSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import { app, ipcMain, shell, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { autoUpdater } from "electron-updater";

type Release = {
  tag_name: string;
  assets: { name: string; browser_download_url: string; digest?: string }[];
};

/** True when `latest` ("1.2.3", optionally "v1.2.3") is a higher major.minor.patch than `current`. */
export function isNewer(latest: string, current: string): boolean {
  const rank = (version: string) =>
    version
      .replace(/^v/, "")
      .split(".")
      .reduce((sum, part) => sum * 1000 + Number(part), 0);
  return rank(latest) > rank(current);
}

/** The dmg electron-builder names for this Mac (`mac.artifactName` in electron-builder.yml). */
export function dmgName(version: string, arch: string): string {
  return `Landed-${version}-${arch}.dmg`;
}

/** The hex SHA-256 from GitHub's asset `digest` ("sha256:<hex>"); without one there is no check. */
export function expectedSha256(digest: string | undefined): string {
  const match = /^sha256:([0-9a-f]{64})$/.exec(digest ?? "");
  if (!match) throw new Error("The release lists no checksum for the installer.");
  return match[1]!;
}

export function handleUpdates(origin: string, window: BrowserWindow) {
  let status: UpdateStatus = { state: "none" };
  let release: Release | null = null;
  const set = (next: UpdateStatus) => {
    status = next;
    window.webContents.send("update:status", status);
  };
  const allowed = (event: IpcMainInvokeEvent) => new URL(event.senderFrame!.url).origin === origin;

  ipcMain.handle("update:status", (event) => (allowed(event) ? status : null));
  ipcMain.handle("update:download", (event) => {
    if (!allowed(event) || status.state !== "available") return;
    if (!app.isPackaged) return console.log("Update preview: download");
    const version = status.version;
    downloadDmg(release!, version, (percent) => {
      if (status.state !== "downloading" || status.percent !== percent) {
        set({ state: "downloading", version, percent });
      }
    })
      .then((path) => {
        set({ state: "downloaded", version });
        return shell.openPath(path);
      })
      .catch((error: Error) => set({ state: "error", version, message: error.message }));
  });
  ipcMain.handle("update:install", (event) => {
    if (!allowed(event) || status.state !== "ready") return;
    if (!app.isPackaged) return console.log("Update preview: install");
    // Quits through before-quit, which stops the server, then installs silently and relaunches.
    autoUpdater.quitAndInstall(true, true);
  });

  if (!app.isPackaged) {
    // `LANDED_UPDATE_PREVIEW=<state> pnpm desktop:dev` shows the banner in that state.
    const state = process.env.LANDED_UPDATE_PREVIEW;
    if (state)
      status = { state, version: "9.9.9", percent: 42, message: "Preview." } as UpdateStatus;
    return;
  }

  if (process.platform === "darwin") {
    fetch("https://api.github.com/repos/3333444n/landed/releases/latest", {
      signal: AbortSignal.timeout(5_000),
    })
      .then(async (response) => {
        if (!response.ok) return;
        release = (await response.json()) as Release;
        if (isNewer(release.tag_name, app.getVersion())) {
          set({ state: "available", version: release.tag_name.replace(/^v/, "") });
        }
      })
      // Offline or GitHub unreachable: try again next launch.
      .catch(() => {});
    return;
  }

  autoUpdater.on("update-available", ({ version }) =>
    set({ state: "downloading", version, percent: 0 }),
  );
  autoUpdater.on("download-progress", ({ percent }) => {
    if (status.state === "downloading" && Math.floor(percent) !== status.percent) {
      set({ ...status, percent: Math.floor(percent) });
    }
  });
  autoUpdater.on("update-downloaded", ({ version }) => set({ state: "ready", version }));
  autoUpdater.on("error", (error) => {
    // A failed check (offline) stays quiet; a failed download is shown.
    if (status.state === "downloading") {
      set({ state: "error", version: status.version, message: error.message });
    }
  });
  autoUpdater.checkForUpdates().catch(() => {});
}

async function downloadDmg(release: Release, version: string, progress: (percent: number) => void) {
  const name = dmgName(version, process.arch);
  const asset = release.assets.find((item) => item.name === name);
  if (!asset) throw new Error(`The release has no ${name}.`);
  const expected = expectedSha256(asset.digest);
  const response = await fetch(asset.browser_download_url);
  if (!response.ok || !response.body) throw new Error(`The download failed (${response.status}).`);
  const total = Number(response.headers.get("content-length"));
  const hash = createHash("sha256");
  const path = join(app.getPath("downloads"), name);
  let received = 0;
  progress(0);
  await pipeline(
    Readable.fromWeb(response.body as ReadableStream),
    async function* (chunks: AsyncIterable<Buffer>) {
      for await (const chunk of chunks) {
        hash.update(chunk);
        received += chunk.length;
        if (total) progress(Math.floor((received / total) * 100));
        yield chunk;
      }
    },
    createWriteStream(path),
  );
  if (hash.digest("hex") !== expected) {
    rmSync(path, { force: true });
    throw new Error("The download did not match the release checksum and was deleted.");
  }
  return path;
}
