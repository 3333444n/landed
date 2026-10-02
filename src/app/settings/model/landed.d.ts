// What desktop/preload.ts exposes to the window. Each call returns null, or why it was refused.
interface Window {
  landed: {
    saveModel(input: {
      provider: string;
      model: string;
      baseUrl: string;
      key: string;
    }): Promise<string | null>;
    clearModel(): Promise<string | null>;
  };
}
