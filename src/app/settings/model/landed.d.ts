// What desktop/preload.ts exposes to the window. Each model call returns null, or why it was refused.
interface Window {
  landed: {
    saveModel(input: {
      provider: string;
      model: string;
      baseUrl: string;
      key: string;
    }): Promise<string | null>;
    clearModel(): Promise<string | null>;
    updates: {
      status(): Promise<UpdateStatus>;
      onStatus(callback: (status: UpdateStatus) => void): () => void;
      download(): Promise<void>;
      install(): Promise<void>;
    };
  };
}

// The update banner's state, kept by desktop/updates.ts.
type UpdateStatus =
  | { state: "none" }
  | { state: "available" | "downloaded" | "ready"; version: string }
  | { state: "downloading"; version: string; percent: number }
  | { state: "error"; version: string; message: string };
