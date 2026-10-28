declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  import type { PDFDocumentProxy } from "pdfjs-dist";

  export function getDocument(source: {
    data: Uint8Array;
    isEvalSupported?: boolean;
    useSystemFonts?: boolean;
    verbosity?: number;
  }): { promise: Promise<PDFDocumentProxy> };
}
