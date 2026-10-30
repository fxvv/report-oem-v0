// Funzioni di supporto per i test (nessuna dipendenza).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { leggiFileBozza } from '../js/bozza.js';

export const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');

// Generatore di id prevedibile, per test ripetibili.
export function generatoreId(prefisso = 'id') {
  let n = 0;
  return () => `${prefisso}${(n += 1)}`;
}

// La bozza di esempio, letta come fa "Importa bozza".
export function bozzaEsempio() {
  return leggiFileBozza(readFileSync(join(RADICE, 'esempi', 'bozza-esempio.json'), 'utf8'));
}

// Tutti i testi contenuti in un nodo pdfmake (stringhe, text, stack, table…).
export function testiPdf(nodo, uscita = []) {
  if (nodo === null || nodo === undefined) return uscita;
  if (typeof nodo === 'string') {
    uscita.push(nodo);
  } else if (Array.isArray(nodo)) {
    nodo.forEach((x) => testiPdf(x, uscita));
  } else if (typeof nodo === 'object') {
    if ('text' in nodo) testiPdf(nodo.text, uscita);
    if (nodo.stack) testiPdf(nodo.stack, uscita);
    if (nodo.columns) testiPdf(nodo.columns, uscita);
    if (nodo.table) testiPdf(nodo.table.body, uscita);
  }
  return uscita;
}
