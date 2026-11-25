import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ScheduleCatalog } from '../types/course';
import { parseScheduleText } from './scheduleParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface TextItemLike {
  str: string;
  transform: number[];
}

/**
 * Extracts structured lines from a LUMS Class Schedule PDF using pdfjs-dist
 * by grouping text items that share the same visual row (Y coordinate).
 */
export async function parseSchedulePdfFile(
  file: File
): Promise<ScheduleCatalog> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const rows: Array<{ y: number; items: Array<{ x: number; text: string }> }> =
      [];

    for (const rawItem of textContent.items) {
      const item = rawItem as TextItemLike;
      if (!item.str || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = item.transform[5];

      // Group items within 3pt vertically into the same row
      let row = rows.find((r) => Math.abs(r.y - y) <= 3);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x, text: item.str.trim() });
    }

    // Sort top-to-bottom (higher Y is higher on page in PDF coordinates)
    rows.sort((a, b) => b.y - a.y);

    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
      const lineText = row.items
        .map((it) => it.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (lineText) {
        allLines.push(lineText);
      }
    }
  }

  const catalog = parseScheduleText(allLines.join('\n'), 'uploaded');
  if (catalog.courses.length === 0) {
    throw new Error(
      'No courses were found in this PDF. Please make sure it is a LUMS Class Schedule PDF.'
    );
  }
  return catalog;
}
