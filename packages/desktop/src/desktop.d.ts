export {};

declare global {
  interface Window {
    /** Native bridge exposed by electron/preload.ts (absent in a plain browser). */
    desktop?: {
      platform: string;
      printToPdf(): Promise<string | null>;
      print(): Promise<boolean>;
      savePdf(suggestedName: string): Promise<string | null>;
      openExternal(url: string): Promise<boolean>;
    };
  }
}
