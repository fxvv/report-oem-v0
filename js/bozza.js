// Formato del file della bozza esportata (JSON con dati e foto in base64).
// Modulo puro: non usa il browser, si testa con Node.

import { CONFIG } from './config.js';
import { codiceDaDati } from './codice.js';
import { normalizzaBozza, tutteLeFoto, generaId } from './modello.js';
import { impronta } from './revisione.js';

export const FORMATO_BOZZA = 'rapporto-intervento-bozza';
export const VERSIONE_FORMATO_BOZZA = 1;

const RE_IMMAGINE = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/;
const RE_MINIATURA = /^data:image\/(jpeg|png);base64,/;

// Oggetto da salvare come JSON. "immagini" e "miniature": { idFoto: dataURL }.
export function creaFileBozza({ dati, immagini, miniature = {}, adesso = new Date() }) {
  const foto = {};
  for (const { foto: f } of tutteLeFoto(dati)) {
    foto[f.id] = { jpeg: immagini[f.id] || '', miniatura: miniature[f.id] || '' };
  }
  return {
    formato: FORMATO_BOZZA,
    versioneFormato: VERSIONE_FORMATO_BOZZA,
    versioneModulo: CONFIG.versioneModulo,
    esportatoIl: adesso.toISOString(),
    codice: codiceDaDati(dati),
    dati,
    immagini: foto,
  };
}

// Legge il testo di un file bozza: controlla formato e versione, normalizza i
// dati e verifica che ci siano tutte le immagini. In caso di problemi lancia un
// errore con un messaggio in italiano da mostrare all'utente.
export function leggiFileBozza(testo, genera = generaId) {
  let contenuto;
  try {
    contenuto = JSON.parse(testo);
  } catch {
    throw new Error('Il file non è leggibile: non è un file JSON valido.');
  }
  if (!contenuto || typeof contenuto !== 'object' || contenuto.formato !== FORMATO_BOZZA) {
    throw new Error('Il file non è una bozza di questo modulo di rapporto di intervento.');
  }
  const versione = contenuto.versioneFormato;
  if (!Number.isInteger(versione) || versione < 1) {
    throw new Error('Versione della bozza non riconosciuta.');
  }
  if (versione > VERSIONE_FORMATO_BOZZA) {
    throw new Error('La bozza è stata creata con una versione più recente del modulo: ricarica la pagina e riprova.');
  }
  if (!contenuto.dati || typeof contenuto.dati !== 'object') {
    throw new Error('Il file non contiene i dati del rapporto.');
  }
  const dati = normalizzaBozza(contenuto.dati, genera);
  const sorgenti = contenuto.immagini && typeof contenuto.immagini === 'object' ? contenuto.immagini : {};
  const immagini = {};
  const miniature = {};
  let mancanti = 0;
  for (const { foto } of tutteLeFoto(dati)) {
    const voce = sorgenti[foto.id];
    const jpeg = voce && typeof voce.jpeg === 'string' ? voce.jpeg : '';
    if (!RE_IMMAGINE.test(jpeg)) {
      mancanti += 1;
      continue;
    }
    immagini[foto.id] = jpeg;
    // L'impronta si ricalcola dall'immagine: non ci si fida di quella nel file.
    foto.impronta = impronta(jpeg);
    if (voce && typeof voce.miniatura === 'string' && RE_MINIATURA.test(voce.miniatura)) {
      miniature[foto.id] = voce.miniatura;
    }
  }
  if (mancanti > 0) {
    throw new Error(`La bozza è incompleta: mancano le immagini di ${mancanti} foto.`);
  }
  return {
    dati,
    immagini,
    miniature,
    versioneModulo: typeof contenuto.versioneModulo === 'string' ? contenuto.versioneModulo : '',
    esportatoIl: typeof contenuto.esportatoIl === 'string' ? contenuto.esportatoIl : '',
  };
}
