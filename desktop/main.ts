/*
 * The Electron main process (ADR 013): a thin supervisor that migrates the database, starts the
 * Next.js standalone server in a utilityProcess on a free 127.0.0.1 port, and opens one sandboxed
 * window that alone holds the per-launch session cookie the server requires. Started with `--mcp`
 * by an assistant, it opens no window and serves the tools over stdio on the same data.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createServer, Socket, type AddressInfo } from "node:net";
import { join } from "node:path";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  session,
  shell,
  utilityProcess,
  type UtilityProcess,
} from "electron";
import { serveLandedStdio } from "../src/app/mcp/stdio";
import { sessionCookieName } from "../src/infrastructure/session-guard";
import { migrateWithBackup, NewerDatabaseError } from "../src/infrastructure/migrate";
import { clearModelSettings, loadModelEnv, saveModelSettings } from "./model-settings";
import { checkForUpdate } from "./updates";

let window: BrowserWindow | null = null;
let server: UtilityProcess | null = null;
let quitting = false;

// Development runs keep their own data, apart from an installed Landed's.
if (!app.isPackaged) app.setPath("userData", join(__dirname, "../data/desktop-dev"));
const userData = app.getPath("userData");
const dataDir = join(userData, "data");
const artifactDir = join(userData, "artifacts");
const dbPath = join(dataDir, "landed.db");
const backupDir = join(userData, "backups");
// Packaged, electron-builder puts these in Resources; in development they are in the repository.
const root = join(__dirname, "..");
const migrationsDir = app.isPackaged
  ? join(process.resourcesPath, "migrations")
  : join(root, "db/migrations");

if (process.argv.includes("--mcp")) {
  app.dock?.hide();
  // In Electron's main process on Windows, process.stdin ends at once without data; a socket on
  // the same descriptor reads the pipe.
  const input =
    process.platform === "win32"
      ? new Socket({ fd: 0, readable: true, writable: false })
      : process.stdin;
  serveLandedStdio({
    dbPath,
    artifactDir,
    migrationsDir,
    backupDir,
    appVersion: app.getVersion(),
    input,
  });
  input.on("end", () => app.quit());
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  app.on("before-quit", () => {
    quitting = true;
    server?.kill();
  });
  app.on("window-all-closed", () => app.quit());
  app.whenReady().then(startApp).catch(fail);
}

async function startApp() {
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(artifactDir, { recursive: true });
  const serverDir = app.isPackaged
    ? join(process.resourcesPath, "server")
    : join(root, ".next/standalone");

  try {
    migrateWithBackup({ dbPath, migrationsDir, backupDir, appVersion: app.getVersion() });
  } catch (error) {
    if (!(error instanceof NewerDatabaseError)) throw error;
    dialog.showErrorBox(
      "Landed",
      "This data was created by a newer Landed. Install the latest version.",
    );
    app.quit();
    return;
  }

  const secret = randomBytes(32).toString("hex");
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  await session.defaultSession.cookies.set({
    url: origin,
    name: sessionCookieName,
    value: secret,
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });

  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    LANDED_DATABASE_PATH: dbPath,
    LANDED_ARTIFACT_DIR: artifactDir,
    LANDED_SESSION_SECRET: secret,
    LANDED_EXECUTABLE_PATH: process.execPath,
    LANDED_DESKTOP: "1",
    NODE_ENV: "production" as const,
  };
  const start = () => startServer(serverDir, { ...env, ...loadModelEnv(userData) }, origin);
  await start();
  handleModelSettings(origin, userData, start);

  window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: join(__dirname, "preload.cjs"),
    },
  });
  window.once("ready-to-show", () => {
    window?.show();
    if (app.isPackaged) void checkForUpdate();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin === origin) return;
    event.preventDefault();
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  await window.loadURL(origin);
}

async function startServer(serverDir: string, env: NodeJS.ProcessEnv, origin: string) {
  const child = utilityProcess.fork(join(serverDir, "server.js"), [], {
    cwd: serverDir,
    env,
    stdio: "pipe",
  });
  server = child;
  child.stdout?.pipe(process.stdout);
  child.stderr?.pipe(process.stderr);
  child.on("exit", (code) => {
    if (!quitting && child === server) {
      fail(new Error(`The Landed server stopped unexpectedly (exit code ${code}).`));
    }
  });
  await waitForServer(origin);
}

/**
 * Settings → Model setup in the window saves or removes the model setting here (ADR 006 revision).
 * The server reads it only at start, so a change restarts it and reloads the window.
 */
function handleModelSettings(origin: string, userData: string, start: () => Promise<void>) {
  async function restart() {
    const old = server!;
    server = null;
    const exited = new Promise((resolve) => old.once("exit", resolve));
    old.kill();
    await exited;
    await start();
    window?.reload();
  }
  ipcMain.handle("model:save", async (event, input: unknown) => {
    if (new URL(event.senderFrame!.url).origin !== origin) return "Not allowed.";
    const problem = saveModelSettings(userData, input);
    if (problem) return problem;
    await restart();
    return null;
  });
  ipcMain.handle("model:clear", async (event) => {
    if (new URL(event.senderFrame!.url).origin !== origin) return "Not allowed.";
    clearModelSettings(userData);
    await restart();
    return null;
  });
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

// Any HTTP answer, even the 403 for a request without the cookie, means the server is listening.
async function waitForServer(origin: string) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      await fetch(origin);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("The Landed server did not start within 15 seconds.");
}

function fail(error: unknown) {
  dialog.showErrorBox(
    "Landed could not start",
    error instanceof Error ? error.message : String(error),
  );
  app.quit();
}
