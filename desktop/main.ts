/*
 * The Electron main process (ADR 013): a thin supervisor that migrates the database, starts the
 * Next.js standalone server in a utilityProcess on a free 127.0.0.1 port, and opens one sandboxed
 * window that alone holds the per-launch session cookie the server requires.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createServer, type AddressInfo } from "node:net";
import { join } from "node:path";
import {
  app,
  BrowserWindow,
  dialog,
  session,
  shell,
  utilityProcess,
  type UtilityProcess,
} from "electron";
import { sessionCookieName } from "../src/infrastructure/session-guard";
import { migrateWithBackup, NewerDatabaseError } from "./migrate";

let window: BrowserWindow | null = null;
let server: UtilityProcess | null = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) {
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
  // Development runs keep their own data, apart from an installed Landed's.
  if (!app.isPackaged) app.setPath("userData", join(__dirname, "../data/desktop-dev"));
  const userData = app.getPath("userData");
  const dataDir = join(userData, "data");
  const artifactDir = join(userData, "artifacts");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(artifactDir, { recursive: true });
  const dbPath = join(dataDir, "landed.db");

  // Packaged, electron-builder puts these in Resources; in development they are in the repository.
  const root = join(__dirname, "..");
  const serverDir = app.isPackaged
    ? join(process.resourcesPath, "server")
    : join(root, ".next/standalone");
  const migrationsDir = app.isPackaged
    ? join(process.resourcesPath, "migrations")
    : join(root, "db/migrations");

  try {
    migrateWithBackup({
      dbPath,
      migrationsDir,
      backupDir: join(userData, "backups"),
      appVersion: app.getVersion(),
    });
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

  server = utilityProcess.fork(join(serverDir, "server.js"), [], {
    cwd: serverDir,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      LANDED_DATABASE_PATH: dbPath,
      LANDED_ARTIFACT_DIR: artifactDir,
      LANDED_SESSION_SECRET: secret,
      NODE_ENV: "production",
    },
    stdio: "pipe",
  });
  server.stdout?.pipe(process.stdout);
  server.stderr?.pipe(process.stderr);
  server.on("exit", (code) => {
    if (!quitting) fail(new Error(`The Landed server stopped unexpectedly (exit code ${code}).`));
  });
  await waitForServer(origin);

  window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  window.once("ready-to-show", () => window?.show());
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
