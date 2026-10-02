// The window's only bridge to the main process: saving and removing the model setting.
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("landed", {
  saveModel: (input: unknown) => ipcRenderer.invoke("model:save", input),
  clearModel: () => ipcRenderer.invoke("model:clear"),
});
