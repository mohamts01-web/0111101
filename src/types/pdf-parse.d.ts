declare module 'pdf-parse/lib/pdf-parse.js' {
  type PdfData = { text: string; numpages: number };
  const parsePdf: (buffer: Buffer) => Promise<PdfData>;
  export default parsePdf;
}
