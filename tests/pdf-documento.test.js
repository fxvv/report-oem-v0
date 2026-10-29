import test from 'node:test';
import assert from 'node:assert/strict';
import { creaDocumentoPdf, didascaliaFoto, MARGINE, TESTO_FILIGRANA, DICHIARAZIONE } from '../js/pdf-documento.js';
import { CONFIG } from '../js/config.js';
import { elencoFoto, TITOLI_SEZIONI } from '../js/modello.js';
import { bozzaEsempio, testiPdf } from './aiuti.js';

const generatoIl = new Date(2026, 9, 29, 21, 30);

function documento(opzioni = {}) {
  const { dati, immagini } = bozzaEsempio();
  return { dati, doc: creaDocumentoPdf(dati, { revisione: 3, generatoIl, immagini, firmaValida: true, ...opzioni }) };
}

test('A4 verticale, margini laterali di 15 mm', () => {
  const { doc } = documento();
  assert.equal(doc.pageSize, 'A4');
  assert.equal(doc.pageOrientation, 'portrait');
  assert.ok(Math.abs(MARGINE - 42.52) < 0.01);
  assert.equal(doc.pageMargins[0], MARGINE);
  assert.equal(doc.pageMargins[2], MARGINE);
  assert.ok(doc.pageMargins[1] > MARGINE && doc.pageMargins[3] > MARGINE);
  assert.equal(doc.defaultStyle.font, 'Roboto');
  assert.ok(doc.defaultStyle.fontSize >= 9 && doc.defaultStyle.fontSize <= 10);
});

test('intestazione su ogni pagina: titolo, codice, revisione, impianto, committente, Pagina X di Y', () => {
  const { doc } = documento();
  const testo = testiPdf(doc.header(2, 7)).join(' ');
  assert.match(testo, /RAPPORTO DI INTERVENTO/);
  assert.match(testo, /EI9-R-20261027-EM01/);
  assert.match(testo, /Rev\. 3/);
  assert.match(testo, /Impianto: EI9 – FI01A2MEL/);
  assert.match(testo, /Committente: ENERGY ITALIA 9/);
  assert.match(testo, /Pagina 2 di 7/);
});

test('piè di pagina: dati del committente e data di generazione', () => {
  const { doc } = documento();
  const testo = testiPdf(doc.footer(1, 7)).join(' ');
  assert.match(testo, /Via Giacomo Puccini 3, 20121 Milano \(MI\)/);
  assert.match(testo, /P\.IVA 01776210765/);
  assert.match(testo, /REA .*2055472/);
  assert.match(testo, /Modulo V0 – generato il 29\/10\/2026 21:30/);
});

test('filigrana solo sulla bozza', () => {
  assert.equal(documento().doc.watermark, undefined);
  const { doc } = documento({ bozza: true });
  assert.equal(doc.watermark.text, TESTO_FILIGRANA);
  assert.equal(TESTO_FILIGRANA, 'BOZZA – NON VALIDA');
});

test('prima pagina con il riepilogo, poi le sezioni dalla 2 alla 13 in ordine', () => {
  const { doc } = documento();
  const testi = testiPdf(doc.content);
  const iRiepilogo = testi.indexOf('Riepilogo');
  assert.ok(iRiepilogo >= 0);
  for (const voce of ['Tipologia impianto', 'Ubicazione', 'Coordinate (WGS84)', 'Committente', 'Fornitore', 'Compilatore', 'Periodo', 'Oggetto', 'Tipologie', 'Regime']) {
    assert.ok(testi.indexOf(voce) > iRiepilogo, voce);
  }
  assert.ok(testi.includes('dal 27/10/2026 al 28/10/2026'));
  let precedente = iRiepilogo;
  for (let n = 2; n <= 13; n++) {
    const i = testi.indexOf(`${n}. ${TITOLI_SEZIONI[n]}`);
    assert.ok(i > precedente, `sezione ${n}`);
    precedente = i;
  }
  const sezione2 = doc.content.find((x) => x.text === `2. ${TITOLI_SEZIONI[2]}`);
  assert.equal(sezione2.pageBreak, 'before');
});

test('le tabelle delle righe ripetibili ripetono l\'intestazione', () => {
  const { doc } = documento();
  const tabelle = doc.content.filter((x) => x.table && x.table.body[0][0].style === 'th');
  assert.ok(tabelle.length >= 10);
  for (const t of tabelle) assert.equal(t.table.headerRows, 1);
});

test('sezioni non applicabili e valori "Non applicabile"/"Non rilevato" stampati per esteso', () => {
  const { dati, immagini } = bozzaEsempio();
  dati.s4.applicabile = 'No';
  dati.s9.applicabile = 'No';
  dati.s10.applicabile = 'No';
  const testi = testiPdf(creaDocumentoPdf(dati, { immagini, generatoIl }).content);
  const indice = (n) => testi.indexOf(`${n}. ${TITOLI_SEZIONI[n]}`);
  for (const n of [4, 9, 10]) assert.equal(testi[indice(n) + 1], 'Non applicabile', `sezione ${n}`);
  assert.ok(testi.includes('Non rilevato'));
  assert.ok(testi.includes('Non applicabile'));
});

test('configurazione incompleta: DA COMPILARE nel PDF', () => {
  const { doc } = documento();
  const testi = testiPdf(doc.content);
  const iTipologia = testi.indexOf('Tipologia impianto');
  assert.equal(testi[iTipologia + 1], 'DA COMPILARE');
  const completo = documento({ config: { ...CONFIG, tipologiaImpianto: 'Fotovoltaico' } }).doc;
  const t2 = testiPdf(completo.content);
  assert.equal(t2[t2.indexOf('Tipologia impianto') + 1], 'Fotovoltaico');
});

test('foto: riferimenti nelle tabelle e allegato fotografico con una foto per pagina', () => {
  const { dati, doc } = documento();
  const testi = testiPdf(doc.content);
  assert.ok(testi.includes('Foto 1'));
  assert.ok(testi.includes('Foto 3, 4'));
  const pagineFoto = doc.content.filter((x) => x.pageBreak === 'before' && x.stack && x.stack.some((n) => n.image));
  assert.equal(pagineFoto.length, 4);
  const voce = elencoFoto(dati)[0];
  assert.equal(
    didascaliaFoto(voce),
    'Foto 1 – Display del relè SPI con la segnalazione 59.S1 – Rif.: Sez. 4 – Segnalazioni – File originale: IMG_20261027_092431.jpg (4032×3024 px)',
  );
  assert.ok(testi.includes(didascaliaFoto(voce)));
  for (const chiave of Object.keys(doc.images)) assert.match(doc.images[chiave], /^data:image\/(jpeg|png);base64,/);
});

test('firma con dichiarazione, nome, ruolo, data e ora', () => {
  const { doc } = documento();
  const testi = testiPdf(doc.content);
  const i = testi.indexOf(DICHIARAZIONE);
  assert.ok(i > 0);
  assert.equal(testi[testi.indexOf('Firmatario', i) + 1], 'Mario Rossi');
  assert.equal(testi[testi.indexOf('Ruolo', i) + 1], 'Preposto ai lavori');
  assert.ok(testi.includes('28/10/2026 15:40'));
  assert.ok(doc.images.firma);
  const senzaFirma = documento({ firmaValida: false }).doc;
  assert.equal(senzaFirma.images.firma, undefined);
  assert.ok(testiPdf(senzaFirma.content).includes('Firma mancante o non valida'));
});

test('totali della squadra stampati', () => {
  const testi = testiPdf(documento().doc.content);
  assert.ok(testi.includes('Totale complessivo'));
  assert.ok(testi.includes('17,5'));
  assert.ok(testi.includes('Km complessivi'));
  assert.ok(testi.includes('172'));
});
