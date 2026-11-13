import { createWorker, PSM, type ImageLike, type Worker, type WorkerOptions } from 'tesseract.js';

const NAME_LETTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝàáâãäåæçèéêëìíîïñòóôõöøùúûüýÿß';

/** Keeps the longest run of letters and applies WoW's capitalization (first letter upper, rest lower). */
export function cleanName(text: string): string {
  const word = (text.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) ?? []).sort((a, b) => b.length - a.length)[0] ?? '';
  return word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : '';
}

export async function createOcrWorker(options: Partial<WorkerOptions> = {}): Promise<Worker> {
  const worker = await createWorker('eng', 1, options);
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
    tessedit_char_whitelist: NAME_LETTERS,
  });
  return worker;
}

interface Reading {
  name: string;
  confidence: number;
}

/**
 * `renderings[v][i]` is cell i drawn with variant v. Each name uses its most confident reading;
 * ties (often all zero, e.g. under a raid marker) go to the variant that read best across the screenshot.
 */
export async function readNames(
  worker: Worker,
  renderings: ImageLike[][],
  onProgress: (done: number, total: number) => void = () => {},
): Promise<string[]> {
  const total = renderings.reduce((n, v) => n + v.length, 0);
  let done = 0;
  const readings: Reading[][] = [];
  for (const variant of renderings) {
    const out: Reading[] = [];
    for (const image of variant) {
      const { data } = await worker.recognize(image);
      out.push({ name: cleanName(data.text), confidence: data.confidence });
      onProgress(++done, total);
    }
    readings.push(out);
  }

  const average = (rs: Reading[]) => rs.reduce((s, r) => s + r.confidence, 0) / (rs.length || 1);
  const ranked = [...readings].sort((a, b) => average(b) - average(a));
  return (renderings[0] ?? []).map((_, i) => {
    let best: Reading = { name: '', confidence: -1 };
    for (const rs of ranked) {
      if (rs[i].name && rs[i].confidence > best.confidence) best = rs[i];
    }
    return best.name;
  });
}
