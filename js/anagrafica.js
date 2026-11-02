// Anagrafica di impianti e committenti (da config.js) e testi dei dati che il
// fornitore sceglie nella sezione 1. Modulo puro: non usa il browser.
//
// Per ora i menu sono indipendenti: impianto, tipologia, committente, sede e
// partita IVA si scelgono ciascuno dal proprio elenco.

import { CONFIG, DA_COMPILARE } from './config.js';

const unici = (valori) => Array.from(new Set(valori.filter((v) => typeof v === 'string' && v.trim() !== '')));

// Menu "Impianto": il valore salvato è il codice interno, il testo è il nome.
export function opzioniImpianti(config = CONFIG) {
  return config.impianti.map((i) => ({ valore: i.codice, testo: i.nome }));
}

export function opzioniTipologie(config = CONFIG) {
  return unici(config.tipologieImpianto);
}

export function opzioniCommittenti(config = CONFIG) {
  return unici(config.committenti.map((c) => c.nome));
}

export function opzioniSedi(config = CONFIG) {
  return unici(config.committenti.map((c) => c.sede));
}

export function opzioniPartiteIva(config = CONFIG) {
  return unici(config.committenti.map((c) => c.piva));
}

export function impiantoDaCodice(codice, config = CONFIG) {
  return config.impianti.find((i) => i.codice === codice) || null;
}

export const NON_INDICATA = 'Non indicata';

// Dati di impianto e committente da mostrare, nell'ordine della scheda in
// testata e del PDF. Un campo obbligatorio vuoto risulta "DA COMPILARE"; la
// potenza è facoltativa e, se vuota, risulta "Non indicata".
export function datiImpiantoCommittente(dati, config = CONFIG) {
  const impianto = dati.s1.impianto;
  const committente = dati.s1.committente;
  const voce = (chiave, etichetta, valore, facoltativo = false) => {
    const testo = String(valore || '').trim();
    if (testo) return { chiave, etichetta, valore: testo, mancante: false };
    return { chiave, etichetta, valore: facoltativo ? NON_INDICATA : DA_COMPILARE, mancante: !facoltativo };
  };
  const trovato = impiantoDaCodice(impianto.codice, config);
  const testoImpianto = !impianto.codice ? '' : trovato ? `${trovato.codice} – ${trovato.nome}` : impianto.codice;
  return [
    voce('impianto', 'Impianto', testoImpianto),
    voce('tipologia', 'Tipologia impianto', impianto.tipologia),
    voce('potenza', 'Potenza (kWp)', impianto.potenzaKwp, true),
    voce('coordinate', 'Coordinate', impianto.coordinate),
    voce('committente', 'Committente', committente.nome),
    voce('sede', 'Sede', committente.sede),
    voce('piva', 'P.IVA', committente.piva),
  ];
}
