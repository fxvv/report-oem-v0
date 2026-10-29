import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dataIt,
  oraIt,
  dataOraIt,
  dataValida,
  oraValida,
  dataOraValida,
  normalizzaDataOra,
  parteData,
  parseDecimale,
  decimaleIt,
  numeroIt,
  sembraMigliaia,
  emailValida,
  eerValido,
  eerIt,
  testoPdf,
  pulisciNomeFile,
  nomeFilePdf,
  nomeFileBozza,
  marcaTemporale,
  LUNGHEZZA_MAX_NOME_FILE,
} from '../js/formati.js';

test('date e ore in formato italiano', () => {
  assert.equal(dataIt('2026-10-29'), '29/10/2026');
  assert.equal(dataIt('2026-10-29T08:30'), '29/10/2026');
  assert.equal(oraIt('08:30'), '08:30');
  assert.equal(oraIt('08:30:15'), '08:30');
  assert.equal(dataOraIt('2026-10-29T08:30'), '29/10/2026 08:30');
  assert.equal(dataOraIt('2026-10-29T08:30:59'), '29/10/2026 08:30');
  assert.equal(dataIt(''), '');
  assert.equal(dataOraIt('29/10/2026'), '');
});

test('controllo dei valori dei campi nativi', () => {
  assert.equal(dataValida('2026-02-28'), true);
  assert.equal(dataValida('2026-02-30'), false);
  assert.equal(dataValida('2024-02-29'), true);
  assert.equal(oraValida('23:59'), true);
  assert.equal(oraValida('24:00'), false);
  assert.equal(dataOraValida('2026-10-29T08:30'), true);
  assert.equal(dataOraValida('2026-10-29 08:30'), false);
  assert.equal(normalizzaDataOra('2026-10-29T08:30:12'), '2026-10-29T08:30');
  assert.equal(parteData('2026-10-29T08:30'), '2026-10-29');
  assert.equal(parteData('x'), '');
});

test('decimali: virgola o punto', () => {
  assert.equal(parseDecimale('12,5'), 12.5);
  assert.equal(parseDecimale('12.5'), 12.5);
  assert.equal(parseDecimale(' 7 '), 7);
  assert.equal(parseDecimale(',5'), 0.5);
  assert.equal(parseDecimale('-3,2'), -3.2);
  assert.equal(parseDecimale(''), null);
  assert.ok(Number.isNaN(parseDecimale('1.000,5')));
  assert.ok(Number.isNaN(parseDecimale('abc')));
  assert.ok(Number.isNaN(parseDecimale('1,2,3')));
});

test('decimali stampati con la virgola', () => {
  assert.equal(decimaleIt('12.50'), '12,50');
  assert.equal(decimaleIt('12,5'), '12,5');
  assert.equal(decimaleIt('.5'), '0,5');
  assert.equal(decimaleIt('+3'), '3');
  assert.equal(numeroIt(17.5), '17,5');
  assert.equal(numeroIt(0.1 + 0.2), '0,3');
  assert.equal(numeroIt(172), '172');
  assert.equal(numeroIt(NaN), '');
});

test('valori che sembrano migliaia', () => {
  assert.equal(sembraMigliaia('1.200'), true);
  assert.equal(sembraMigliaia('1,200'), false);
  assert.equal(sembraMigliaia('12.5'), false);
});

test('e-mail', () => {
  assert.equal(emailValida('mario.rossi@example.com'), true);
  assert.equal(emailValida('mario.rossi@example'), false);
  assert.equal(emailValida('mario rossi@example.com'), false);
  assert.equal(emailValida(''), false);
});

test('codice EER: 6 cifre mostrate come NN NN NN', () => {
  assert.equal(eerValido('160214'), true);
  assert.equal(eerValido('16 02 14'), true);
  assert.equal(eerValido('16 02 13*'), true);
  assert.equal(eerValido('1602'), false);
  assert.equal(eerIt('160214'), '16 02 14');
  assert.equal(eerIt('160213*'), '16 02 13*');
});

test('testo per il PDF senza emoji né caratteri di controllo', () => {
  assert.equal(testoPdf('Tutto ok 👍✅ fine'), 'Tutto ok  fine');
  assert.equal(testoPdf('riga 1\r\nriga 2'), 'riga 1\nriga 2');
  assert.equal(testoPdf('Ω ° – × ≥ àèéìòù'), 'Ω ° – × ≥ àèéìòù');
});

test('nome del file PDF', () => {
  assert.equal(
    nomeFilePdf({ codice: 'EI9-R-20261029-AB01', revisione: 0, oggetto: 'Riarmo SPI/DDI: verifica "urgente"?' }),
    'EI9-R-20261029-AB01 rev0 - Riarmo SPI DDI verifica urgente.pdf',
  );
  assert.equal(nomeFilePdf({ codice: 'EI9-R-20261029-AB01', revisione: 2, oggetto: '' }), 'EI9-R-20261029-AB01 rev2.pdf');
  assert.equal(
    nomeFilePdf({ codice: 'EI9-R-20261029-AB01', revisione: 1, oggetto: 'Sopralluogo', bozza: true }),
    'EI9-R-20261029-AB01 rev1 - Sopralluogo - BOZZA.pdf',
  );
});

test('nome del file PDF: al massimo 120 caratteri, estensione compresa', () => {
  const lungo = 'Oggetto molto lungo '.repeat(10);
  const nome = nomeFilePdf({ codice: 'EI9-R-20261029-AB01', revisione: 10, oggetto: lungo });
  assert.ok(nome.length <= LUNGHEZZA_MAX_NOME_FILE, `${nome.length}`);
  assert.ok(nome.endsWith('.pdf'));
  assert.ok(nome.startsWith('EI9-R-20261029-AB01 rev10 - Oggetto molto lungo'));
  const bozza = nomeFilePdf({ codice: 'EI9-R-20261029-AB01', revisione: 10, oggetto: lungo, bozza: true });
  assert.ok(bozza.length <= LUNGHEZZA_MAX_NOME_FILE);
  assert.ok(bozza.endsWith(' - BOZZA.pdf'));
});

test('pulizia dei nomi dei file', () => {
  assert.equal(pulisciNomeFile('a/b\\c:d*e?f"g<h>i|j'), 'a b c d e f g h i j');
  assert.equal(pulisciNomeFile('  fine con punti...  '), 'fine con punti');
});

test('nome del file della bozza', () => {
  const adesso = new Date(2026, 9, 29, 9, 5);
  assert.equal(marcaTemporale(adesso), '20261029-0905');
  assert.equal(nomeFileBozza('EI9-R-20261029-AB01', adesso), 'EI9-R-20261029-AB01 bozza 20261029-0905.json');
});
