// The window's only bridge to the main process: the model setting and updates.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("landed", {
  saveModel: (input: unknown) => ipcRenderer.invoke("model:save", input),
  clearModel: () => ipcRenderer.invoke("model:clear"),
  updates: {
    status: () => ipcRenderer.invoke("update:status"),
    onStatus: (callback: (status: unknown) => void) => {
      const listener = (_event: IpcRendererEvent, status: unknown) => callback(status);
      ipcRenderer.on("update:status", listener);
      return () => void ipcRenderer.off("update:status", listener);
    },
    download: () => ipcRenderer.invoke("update:download"),
    install: () => ipcRenderer.invoke("update:install"),
  },
});
