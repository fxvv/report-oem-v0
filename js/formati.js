// Formati italiani (date, ore, decimali), controlli di formato e nomi dei file.
// Modulo puro: non usa il browser, si testa con Node.

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_DATA_ORA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
const RE_ORA = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;

export const pad2 = (n) => String(n).padStart(2, '0');

function giornoEsistente(anno, mese, giorno) {
  const d = new Date(Date.UTC(anno, mese - 1, giorno));
  return d.getUTCFullYear() === anno && d.getUTCMonth() === mese - 1 && d.getUTCDate() === giorno;
}

// --- Controlli dei valori prodotti dai controlli nativi (date, time, datetime-local)

export function dataValida(valore) {
  const m = RE_DATA.exec(String(valore ?? ''));
  return !!m && giornoEsistente(+m[1], +m[2], +m[3]);
}

export function oraValida(valore) {
  const m = RE_ORA.exec(String(valore ?? ''));
  return !!m && +m[1] < 24 && +m[2] < 60;
}

export function dataOraValida(valore) {
  const m = RE_DATA_ORA.exec(String(valore ?? ''));
  return !!m && giornoEsistente(+m[1], +m[2], +m[3]) && +m[4] < 24 && +m[5] < 60;
}

// "AAAA-MM-GGThh:mm" senza secondi: si confronta come testo. '' se non valida.
export function normalizzaDataOra(valore) {
  return dataOraValida(valore) ? String(valore).slice(0, 16) : '';
}

// "hh:mm" senza secondi. '' se non valida.
export function normalizzaOra(valore) {
  return oraValida(valore) ? String(valore).slice(0, 5) : '';
}

// Parte "AAAA-MM-GG" di una data o di una data-ora valida, altrimenti ''.
export function parteData(valore) {
  const v = String(valore ?? '');
  if (dataValida(v)) return v;
  if (dataOraValida(v)) return v.slice(0, 10);
  return '';
}

// --- Visualizzazione in formato italiano

export function dataIt(valore) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valore ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function oraIt(valore) {
  const m = /^(\d{2}):(\d{2})/.exec(String(valore ?? ''));
  return m ? `${m[1]}:${m[2]}` : '';
}

export function dataOraIt(valore) {
  const m = RE_DATA_ORA.exec(String(valore ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : '';
}

// --- Conversioni da oggetti Date (ora locale del dispositivo)

export function dataIsoLocale(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function dataOraIsoLocale(d) {
  return `${dataIsoLocale(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function oraItDaDate(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function dataOraItDaDate(d) {
  return dataOraIt(dataOraIsoLocale(d));
}

// "AAAAMMGG-hhmm", usato nel nome del file della bozza esportata.
export function marcaTemporale(d) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

// --- Numeri decimali: virgola o punto come separatore, nessun separatore delle migliaia

const RE_DECIMALE = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/;

// null se vuoto, NaN se non è un numero, altrimenti il numero.
export function parseDecimale(testo) {
  const s = String(testo ?? '').trim().replace(/\s+/g, '');
  if (s === '') return null;
  if (!RE_DECIMALE.test(s)) return NaN;
  return Number(s.replace(',', '.'));
}

// Vero per valori come "1.200", che sembrano migliaia ma vengono letti come 1,2.
export function sembraMigliaia(testo) {
  return /^\d{1,3}\.\d{3}$/.test(String(testo ?? '').trim());
}

export function numeroIt(n, decimaliMax = 2) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  const fattore = 10 ** decimaliMax;
  const arrotondato = Math.round(n * fattore) / fattore;
  return String(Object.is(arrotondato, -0) ? 0 : arrotondato).replace('.', ',');
}

// Riporta il valore così come è stato scritto, ma con la virgola decimale.
export function decimaleIt(testo) {
  const n = parseDecimale(testo);
  const grezzo = String(testo ?? '').trim();
  if (n === null || Number.isNaN(n)) return grezzo;
  let s = grezzo.replace(/\s+/g, '').replace('.', ',');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith(',')) s = '0' + s;
  if (s.startsWith('-,')) s = '-0' + s.slice(1);
  if (s.endsWith(',')) s = s.slice(0, -1);
  return s;
}

// --- Altri formati

export function emailValida(testo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(testo ?? '').trim());
}

// Codice EER: 6 cifre, con l'asterisco finale per i rifiuti pericolosi.
export function normalizzaEer(testo) {
  return String(testo ?? '').replace(/[^\d*]/g, '');
}

export function eerValido(testo) {
  return /^\d{6}\*?$/.test(normalizzaEer(testo));
}

export function eerIt(testo) {
  const n = normalizzaEer(testo);
  if (!/^\d{6}\*?$/.test(n)) return String(testo ?? '').trim();
  return `${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)}${n.slice(6)}`;
}

// --- Testi per il PDF e nomi dei file

// Emoji e simboli fuori dal font del PDF: si tolgono per non stampare quadratini.
const RE_FUORI_FONT = /[\u{10000}-\u{10FFFF}☀-➿⬀-⯿︀-️‍]/gu;

export function testoPdf(valore) {
  return String(valore ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(RE_FUORI_FONT, '');
}

export function pulisciNomeFile(valore) {
  return String(valore ?? '')
    .normalize('NFC')
    .replace(RE_FUORI_FONT, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
}

export const LUNGHEZZA_MAX_NOME_FILE = 120;

// "{codice} rev{N} - {oggetto}.pdf", al massimo 120 caratteri compresa l'estensione.
// Per la bozza si aggiunge " - BOZZA" prima dell'estensione.
export function nomeFilePdf({ codice, revisione, oggetto, bozza = false }) {
  const base = pulisciNomeFile(`${codice} rev${revisione}`);
  const coda = (bozza ? ' - BOZZA' : '') + '.pdf';
  const spazio = LUNGHEZZA_MAX_NOME_FILE - base.length - coda.length - 3;
  let ogg = Array.from(pulisciNomeFile(oggetto));
  if (ogg.length > spazio) ogg = ogg.slice(0, Math.max(0, spazio));
  const testoOggetto = ogg.join('').replace(/[. ]+$/, '').trim();
  const nome = testoOggetto ? `${base} - ${testoOggetto}${coda}` : `${base}${coda}`;
  return Array.from(nome).slice(0, LUNGHEZZA_MAX_NOME_FILE).join('');
}

// "{codice} bozza {AAAAMMGG-hhmm}.json"
export function nomeFileBozza(codice, adesso) {
  return `${pulisciNomeFile(codice)} bozza ${marcaTemporale(adesso)}.json`;
}
