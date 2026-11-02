// Impianto e committente scelti nel modulo (sezione 1): valori ammessi, regole,
// firma, PDF e bozze create con la versione precedente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG } from '../js/config.js';
import {
  opzioniImpianti,
  opzioniTipologie,
  opzioniCommittenti,
  opzioniSedi,
  opzioniPartiteIva,
  datiImpiantoCommittente,
} from '../js/anagrafica.js';
import { valida, MESSAGGIO_POTENZA } from '../js/validazione.js';
import { nuovaBozza } from '../js/modello.js';
import { improntaContenuto, statoFirma, prossimaRevisione } from '../js/revisione.js';
import { leggiFileBozza, creaFileBozza, FORMATO_BOZZA, VERSIONE_FORMATO_BOZZA } from '../js/bozza.js';
import { creaDocumentoPdf } from '../js/pdf-documento.js';
import { codiceDaDati } from '../js/codice.js';
import { RADICE, bozzaEsempio, generatoreId, testiPdf } from './aiuti.js';

const PERCORSI = ['s1.impianto.codice', 's1.impianto.tipologia', 's1.impianto.coordinate', 's1.committente.nome', 's1.committente.sede', 's1.committente.piva'];
const errori = (dati, config) => valida(dati, config).errori;
const errore = (dati, percorso, config) => errori(dati, config).find((e) => e.percorso === percorso);
const rifirma = (dati) => {
  dati.s13.firma.improntaDati = improntaContenuto(dati, { conFirma: false });
  return dati;
};

test('menu dalla configurazione: impianto, tipologia, committente, sede, P.IVA', () => {
  assert.deepEqual(opzioniImpianti(), [{ valore: 'EI9', testo: 'FI01A2MEL' }]);
  assert.deepEqual(opzioniTipologie(), ['Fotovoltaico', 'Eolico']);
  assert.deepEqual(opzioniCommittenti(), ['ENERGY ITALIA 9']);
  assert.deepEqual(opzioniSedi(), ['Via Giacomo Puccini 3, 20121 Milano (MI)']);
  assert.deepEqual(opzioniPartiteIva(), ['01776210765']);
});

test('per aggiungere un impianto o un committente basta la configurazione', () => {
  const config = {
    ...CONFIG,
    impianti: [...CONFIG.impianti, { codice: 'EI8', nome: 'IMPIANTO DI PROVA' }],
    committenti: [...CONFIG.committenti, { nome: 'ACME SPV', sede: 'Via Prova 1, 00100 Roma (RM)', piva: '12345678903' }],
  };
  assert.deepEqual(opzioniImpianti(config).map((o) => o.testo), ['FI01A2MEL', 'IMPIANTO DI PROVA']);
  assert.deepEqual(opzioniCommittenti(config), ['ENERGY ITALIA 9', 'ACME SPV']);
  const { dati } = bozzaEsempio();
  dati.s1.impianto.codice = 'EI8';
  dati.s1.committente = { nome: 'ACME SPV', sede: 'Via Prova 1, 00100 Roma (RM)', piva: '12345678903' };
  rifirma(dati);
  assert.deepEqual(errori(dati, config), []);
  assert.equal(codiceDaDati(dati), 'EI8-R-20261027-EM01');
  // con la configurazione del repository gli stessi valori non sono ammessi
  assert.match(errore(dati, 's1.impianto.codice').messaggio, /valore non ammesso/);
});

test('i menu sono indipendenti: si può scegliere qualsiasi combinazione presente in anagrafica', () => {
  const config = {
    ...CONFIG,
    committenti: [...CONFIG.committenti, { nome: 'ACME SPV', sede: 'Via Prova 1, 00100 Roma (RM)', piva: '12345678903' }],
  };
  const { dati } = bozzaEsempio();
  dati.s1.committente = { nome: 'ENERGY ITALIA 9', sede: 'Via Prova 1, 00100 Roma (RM)', piva: '01776210765' };
  rifirma(dati);
  assert.deepEqual(errori(dati, config), []);
});

test('bozza nuova: i sei campi obbligatori risultano mancanti nella sezione 1', () => {
  const dati = nuovaBozza(new Date(2026, 9, 30), generatoreId());
  const esito = valida(dati);
  for (const percorso of PERCORSI) {
    const e = esito.errori.find((x) => x.percorso === percorso);
    assert.ok(e, percorso);
    assert.equal(e.sezione, 1);
  }
  assert.equal(esito.errori.some((e) => e.percorso === 's1.impianto.potenzaKwp'), false, 'la potenza è facoltativa');
});

test('un campo obbligatorio mancante rende il PDF non valido (solo bozza)', () => {
  for (const percorso of PERCORSI) {
    const { dati } = bozzaEsempio();
    const [, gruppo, campo] = percorso.split('.');
    dati.s1[gruppo][campo] = '';
    const esito = valida(rifirma(dati));
    assert.equal(esito.valido, false, percorso);
    assert.equal(esito.sezioni[1].stato, 'da-completare', percorso);
    assert.ok(esito.errori.some((e) => e.percorso === percorso), percorso);
  }
});

test('impianto: ammesso solo un impianto dell\'anagrafica', () => {
  const { dati } = bozzaEsempio();
  dati.s1.impianto.codice = 'FI01A2MEL'; // il nome non è il valore del menu: il valore è il codice
  assert.match(errore(rifirma(dati), 's1.impianto.codice').messaggio, /Impianto: valore non ammesso/);
  dati.s1.impianto.codice = 'EI9';
  assert.equal(errore(rifirma(dati), 's1.impianto.codice'), undefined);
});

test('tipologia: solo «Fotovoltaico» o «Eolico»', () => {
  const { dati } = bozzaEsempio();
  for (const valore of ['Fotovoltaico', 'Eolico']) {
    dati.s1.impianto.tipologia = valore;
    assert.equal(errore(rifirma(dati), 's1.impianto.tipologia'), undefined, valore);
  }
  for (const valore of ['Solare', 'fotovoltaico', 'Idroelettrico']) {
    dati.s1.impianto.tipologia = valore;
    assert.match(errore(rifirma(dati), 's1.impianto.tipologia').messaggio, /valore non ammesso/, valore);
  }
});

test('committente, sede e P.IVA: solo valori dell\'anagrafica', () => {
  const { dati } = bozzaEsempio();
  const prove = [
    ['nome', 'ENERGY ITALIA 9 S.r.l.', 's1.committente.nome'],
    ['sede', 'Via Giacomo Puccini 3, Milano', 's1.committente.sede'],
    ['piva', '12345678903', 's1.committente.piva'],
  ];
  for (const [campo, valore, percorso] of prove) {
    const copia = bozzaEsempio().dati;
    copia.s1.committente[campo] = valore;
    assert.match(errore(rifirma(copia), percorso).messaggio, /valore non ammesso/, percorso);
  }
  assert.deepEqual(errori(dati), []);
});

test('potenza: facoltativa, solo cifre, maggiore di 0', () => {
  const { dati } = bozzaEsempio();
  for (const valore of ['', '998', '1', '12500', ' 998 ']) {
    dati.s1.impianto.potenzaKwp = valore;
    assert.equal(errore(rifirma(dati), 's1.impianto.potenzaKwp'), undefined, `«${valore}» ammessa`);
  }
  for (const valore of ['998,5', '998.5', '1.000', '1,000', '1 000', '-5', '+5', '998 kWp', 'mille']) {
    dati.s1.impianto.potenzaKwp = valore;
    const e = errore(rifirma(dati), 's1.impianto.potenzaKwp');
    assert.ok(e, `«${valore}» rifiutata`);
    assert.equal(e.messaggio, `Potenza (kWp): ${MESSAGGIO_POTENZA}`);
  }
  assert.equal(MESSAGGIO_POTENZA, 'Inserisci solo cifre, senza decimali né separatori');
  for (const valore of ['0', '000']) {
    dati.s1.impianto.potenzaKwp = valore;
    assert.match(errore(rifirma(dati), 's1.impianto.potenzaKwp').messaggio, /maggiore di 0/, valore);
  }
});

test('coordinate: obbligatorie, accettate in qualsiasi formato', () => {
  const { dati } = bozzaEsempio();
  const formati = [
    '45.464211, 9.191383',
    '45,464211 9,191383',
    '45°27\'51.2"N 9°11\'25.3"E',
    '45°27′51″N 9°11′25″E',
    'N 45° 27.853\' E 9° 11.422\'',
    'Lat 45.4642 Lon 9.1914',
    '33T 514590 5034910',
  ];
  for (const valore of formati) {
    dati.s1.impianto.coordinate = valore;
    assert.equal(errore(rifirma(dati), 's1.impianto.coordinate'), undefined, valore);
  }
  dati.s1.impianto.coordinate = '   ';
  assert.match(errore(rifirma(dati), 's1.impianto.coordinate').messaggio, /campo obbligatorio/);
});

test('una modifica di impianto o committente dopo la firma fa decadere la firma', () => {
  const modifiche = [
    (d) => (d.s1.impianto.tipologia = 'Eolico'),
    (d) => (d.s1.impianto.potenzaKwp = '998'),
    (d) => (d.s1.impianto.coordinate = '45.0, 9.0'),
    (d) => (d.s1.impianto.codice = ''),
    (d) => (d.s1.committente.sede = ''),
  ];
  for (const modifica of modifiche) {
    const { dati } = bozzaEsempio();
    assert.equal(statoFirma(dati), 'valida');
    const prima = improntaContenuto(dati, { conFirma: true });
    modifica(dati);
    assert.equal(statoFirma(dati), 'decaduta', modifica.toString());
    assert.equal(prossimaRevisione({ numero: 0, impronta: prima }, improntaContenuto(dati, { conFirma: true })), 1);
  }
});

test('testata e PDF: ordine dei dati e campi vuoti «DA COMPILARE»', () => {
  const { dati } = bozzaEsempio();
  const voci = datiImpiantoCommittente(dati);
  assert.deepEqual(voci.map((v) => v.etichetta), ['Impianto', 'Tipologia impianto', 'Potenza (kWp)', 'Coordinate', 'Committente', 'Sede', 'P.IVA']);
  assert.deepEqual(voci.map((v) => v.valore), [
    'EI9 – FI01A2MEL',
    'Fotovoltaico',
    'Non indicata',
    '45°00\'00"N 9°00\'00"E (coordinate di esempio)',
    'ENERGY ITALIA 9',
    'Via Giacomo Puccini 3, 20121 Milano (MI)',
    '01776210765',
  ]);
  const vuote = datiImpiantoCommittente(nuovaBozza(new Date(), generatoreId()));
  assert.deepEqual(vuote.map((v) => v.valore), ['DA COMPILARE', 'DA COMPILARE', 'Non indicata', 'DA COMPILARE', 'DA COMPILARE', 'DA COMPILARE', 'DA COMPILARE']);
  assert.deepEqual(vuote.map((v) => v.mancante), [true, true, false, true, true, true, true]);
});

test('PDF: i sette dati di seguito, nell\'ordine richiesto, senza ubicazione, REA e forma giuridica', () => {
  const { dati, immagini } = bozzaEsempio();
  dati.s1.impianto.potenzaKwp = '998';
  dati.s1.impianto.coordinate = '45°27′51″N 9°11′25″E';
  const doc = creaDocumentoPdf(dati, { immagini, firmaValida: true, generatoIl: new Date(2026, 9, 30, 10, 0) });
  const testi = testiPdf(doc.content);
  const i = testi.indexOf('Impianto');
  assert.deepEqual(testi.slice(i, i + 14), [
    'Impianto', 'EI9 – FI01A2MEL',
    'Tipologia impianto', 'Fotovoltaico',
    'Potenza (kWp)', '998',
    'Coordinate', '45°27′51″N 9°11′25″E',
    'Committente', 'ENERGY ITALIA 9',
    'Sede', 'Via Giacomo Puccini 3, 20121 Milano (MI)',
    'P.IVA', '01776210765',
  ]);
  const tutto = [testi.join('\n'), testiPdf(doc.header(1, 9)).join(' '), testiPdf(doc.footer(1, 9)).join(' ')].join('\n');
  assert.doesNotMatch(tutto, /Ubicazione|REA|forma giuridica/);
  assert.match(testiPdf(doc.header(1, 9)).join(' '), /Impianto: EI9 – FI01A2MEL .*Committente: ENERGY ITALIA 9/);
});

test('PDF della bozza con impianto e committente non scelti: «DA COMPILARE»', () => {
  const { dati, immagini } = bozzaEsempio();
  dati.s1.impianto = { codice: '', tipologia: '', potenzaKwp: '', coordinate: '' };
  dati.s1.committente = { nome: '', sede: '', piva: '' };
  const doc = creaDocumentoPdf(dati, { immagini, bozza: true, generatoIl: new Date(2026, 9, 30, 10, 0) });
  const testi = testiPdf(doc.content);
  const i = testi.indexOf('Impianto');
  assert.deepEqual(testi.slice(i, i + 14).filter((_, k) => k % 2 === 1), ['DA COMPILARE', 'DA COMPILARE', 'Non indicata', 'DA COMPILARE', 'DA COMPILARE', 'DA COMPILARE', 'DA COMPILARE']);
  assert.match(testiPdf(doc.header(1, 9)).join(' '), /Impianto: DA COMPILARE .*Committente: DA COMPILARE/);
});

test('bozza esportata con la versione precedente (formato 1): si apre senza errori, con i nuovi campi vuoti', () => {
  const testo = readFileSync(join(RADICE, 'tests', 'dati', 'bozza-formato-1.json'), 'utf8');
  const originale = JSON.parse(testo);
  assert.equal(originale.formato, FORMATO_BOZZA);
  assert.equal(originale.versioneFormato, 1);
  assert.equal('impianto' in originale.dati.s1, false);

  const { dati, immagini } = leggiFileBozza(testo);
  assert.deepEqual(dati.s1.impianto, { codice: '', tipologia: '', potenzaKwp: '', coordinate: '' });
  assert.deepEqual(dati.s1.committente, { nome: '', sede: '', piva: '' });
  assert.equal(Object.keys(immagini).length, 1);
  // firma e revisione restano quelle di prima finché non si compilano i nuovi campi
  assert.equal(statoFirma(dati), 'valida');
  assert.equal(prossimaRevisione(dati.revisione, improntaContenuto(dati, { conFirma: true })), 0);
  // la verifica chiede solo i nuovi campi obbligatori
  const nuovi = valida(dati).errori.filter((e) => e.percorso.startsWith('s1.impianto') || e.percorso.startsWith('s1.committente'));
  assert.deepEqual(nuovi.map((e) => e.percorso).sort(), [...PERCORSI].sort());
  // compilandoli i dati cambiano: la firma decade e il prossimo PDF valido sarà la Rev. 1
  dati.s1.impianto.codice = 'EI9';
  assert.equal(statoFirma(dati), 'decaduta');
  assert.equal(prossimaRevisione(dati.revisione, improntaContenuto(dati, { conFirma: true })), 1);
});

test('formato della bozza: si scrive il 2, si leggono 1 e 2, un formato più recente è rifiutato', () => {
  assert.equal(VERSIONE_FORMATO_BOZZA, 2);
  const { dati, immagini } = bozzaEsempio();
  const file = creaFileBozza({ dati, immagini });
  assert.equal(file.versioneFormato, 2);
  const riletto = leggiFileBozza(JSON.stringify(file));
  assert.deepEqual(riletto.dati.s1.impianto, dati.s1.impianto);
  assert.deepEqual(riletto.dati.s1.committente, dati.s1.committente);
  assert.throws(() => leggiFileBozza(JSON.stringify({ ...file, versioneFormato: 3 })), /più recente/);
});
