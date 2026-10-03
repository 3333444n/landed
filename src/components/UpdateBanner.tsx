"use client";

import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import { IconTile } from "./IconTile";
import styles from "./UpdateBanner.module.css";

/**
 * The desktop app's update notice (DESIGN.md "Update banner"), fed by desktop/updates.ts. The
 * browser has no `window.landed`, so it renders nothing there.
 */
export function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus>({ state: "none" });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const updates = window.landed?.updates;
    if (!updates) return;
    void updates.status().then(setStatus);
    return updates.onStatus(setStatus);
  }, []);

  if (hidden || status.state === "none") return null;
  const updates = window.landed.updates;
  const { version } = status;
  let text = `Landed ${version} is ready.`;
  let action: { label: string; run: () => void } | null = {
    label: "Restart to update",
    run: () => void updates.install(),
  };
  if (status.state === "available") {
    text = `Landed ${version} is available.`;
    action = { label: "Download", run: () => void updates.download() };
  } else if (status.state === "downloading") {
    text = `Downloading Landed ${version}… ${status.percent}%`;
    action = null;
  } else if (status.state === "downloaded") {
    text = `Landed ${version} is downloaded and open. Drag it to Applications, replace the old version, then reopen Landed.`;
    action = null;
  } else if (status.state === "error") {
    text = `Landed ${version} could not be downloaded: ${status.message}`;
    action = {
      label: "Open release page",
      run: () => window.open("https://github.com/3333444n/landed/releases/latest"),
    };
  }

  return (
    <div className={styles.banner} role="status">
      <div className={styles.message}>
        <IconTile size="sm">{status.state === "ready" ? <RefreshCw /> : <Download />}</IconTile>
        <p className="body-sm">{text}</p>
      </div>
      <div className={styles.actions}>
        {action && <Button onClick={action.run}>{action.label}</Button>}
        <Button variant="tertiary" onClick={() => setHidden(true)}>
          Later
        </Button>
      </div>
    </div>
  );
}
