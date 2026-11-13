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

export async function readName(worker: Worker, image: ImageLike): Promise<string> {
  const { data } = await worker.recognize(image);
  return cleanName(data.text);
}
