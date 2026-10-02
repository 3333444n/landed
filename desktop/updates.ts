// At startup the app asks GitHub for the latest release and, when it is newer, offers to open its
// page (ADR 013). Installing it replaces the app; the next launch backs up before migrating.
import { app, dialog, shell } from "electron";

/** True when `latest` ("1.2.3", optionally "v1.2.3") is a higher major.minor.patch than `current`. */
export function isNewer(latest: string, current: string): boolean {
  const rank = (version: string) =>
    version
      .replace(/^v/, "")
      .split(".")
      .reduce((sum, part) => sum * 1000 + Number(part), 0);
  return rank(latest) > rank(current);
}

export async function checkForUpdate() {
  try {
    const response = await fetch("https://api.github.com/repos/3333444n/landed/releases/latest", {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return;
    const release = (await response.json()) as { tag_name: string; html_url: string };
    if (!isNewer(release.tag_name, app.getVersion())) return;
    const version = release.tag_name.replace(/^v/, "");
    const { response: choice } = await dialog.showMessageBox({
      message: `Landed ${version} is available.`,
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (choice === 0) await shell.openExternal(release.html_url);
  } catch {
    // Offline or GitHub unreachable: try again next launch.
  }
}
