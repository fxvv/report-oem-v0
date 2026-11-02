// Codice del rapporto: {codiceImpianto}-R-{AAAAMMGG}-{SIGLA}{NN}, es. EI9-R-20261029-AB01.
// Modulo puro: non usa il browser, si testa con Node.

import { haSegnaposto } from './config.js';

export function siglaValida(sigla) {
  return /^[A-Z]{2}$/.test(String(sigla ?? ''));
}

export function progressivoValido(progressivo) {
  return /^\d{2}$/.test(String(progressivo ?? '')) && progressivo !== '00';
}

// La data è quella di creazione della bozza ("AAAA-MM-GG"), fissata alla prima apertura.
export function codiceRapporto({ codiceImpianto, creatoIl, sigla, progressivo }) {
  const impianto = String(codiceImpianto ?? '').trim();
  const parteImpianto = impianto === '' || haSegnaposto(impianto) ? 'XXX' : impianto;
  const parteData = /^\d{4}-\d{2}-\d{2}$/.test(creatoIl ?? '') ? creatoIl.replace(/-/g, '') : '00000000';
  const parteSigla = siglaValida(sigla) ? sigla : 'XX';
  const nn = /^\d{1,2}$/.test(progressivo ?? '') ? String(progressivo).padStart(2, '0') : '01';
  return `${parteImpianto}-R-${parteData}-${parteSigla}${nn}`;
}

// Il codice dell'impianto è quello interno dell'impianto scelto nella sezione 1
// (es. EI9 per FI01A2MEL); finché non è scelto il codice riporta XXX.
export function codiceDaDati(dati) {
  return codiceRapporto({
    codiceImpianto: dati.s1.impianto.codice,
    creatoIl: dati.creatoIl,
    sigla: dati.s1.fornitore.sigla,
    progressivo: dati.progressivo,
  });
}
