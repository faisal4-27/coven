// Pulls positioned text out of a timetable PDF in the browser. Nothing is uploaded anywhere.

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { TextItem } from './parseSchedule';

GlobalWorkerOptions.workerSrc = workerUrl;

export async function readPdfText(file: File): Promise<TextItem[]> {
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const items: TextItem[] = [];
  try {
    const pdf = await task.promise;
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const { height } = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      for (const it of content.items) {
        if (!('str' in it) || !it.str.trim()) continue; // skip marked-content markers and blank runs
        items.push({ str: it.str, x: it.transform[4], y: height - it.transform[5], w: it.width, page: p }); // PDF y grows upward, flip it
      }
    }
  } finally {
    await task.destroy();
  }
  return items;
}

const RENDER_WIDTH = 2000; // about what the image reader upscales screenshots to anyway

/** Each page as a PNG, for PDFs with no text layer (scans, or a screenshot saved as a PDF). */
export async function renderPdfPages(file: File): Promise<Blob[]> {
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pages: Blob[] = [];
  try {
    const pdf = await task.promise;
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: RENDER_WIDTH / page.getViewport({ scale: 1 }).width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport, background: 'white' }).promise;
      pages.push(await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('could not render page'))), 'image/png')));
      canvas.width = 0;
    }
  } finally {
    await task.destroy();
  }
  return pages;
}
