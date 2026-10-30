import test from 'node:test';
import assert from 'node:assert/strict';
import { codiceRapporto, codiceDaDati, siglaValida, progressivoValido } from '../js/codice.js';
import { nuovaBozza } from '../js/modello.js';
import { CONFIG } from '../js/config.js';

test('formato del codice: {impianto}-R-{AAAAMMGG}-{SIGLA}{NN}', () => {
  assert.equal(codiceRapporto({ codiceImpianto: 'EI9', creatoIl: '2026-10-29', sigla: 'AB', progressivo: '01' }), 'EI9-R-20261029-AB01');
  assert.equal(codiceRapporto({ codiceImpianto: 'EI9', creatoIl: '2026-01-05', sigla: 'ZZ', progressivo: '12' }), 'EI9-R-20260105-ZZ12');
});

test('sigla mancante o non valida: XX', () => {
  assert.equal(codiceRapporto({ codiceImpianto: 'EI9', creatoIl: '2026-10-29', sigla: '', progressivo: '01' }), 'EI9-R-20261029-XX01');
  assert.equal(codiceRapporto({ codiceImpianto: 'EI9', creatoIl: '2026-10-29', sigla: 'a', progressivo: '01' }), 'EI9-R-20261029-XX01');
  assert.equal(codiceRapporto({ codiceImpianto: 'EI9', creatoIl: '2026-10-29', sigla: 'ab', progressivo: '01' }), 'EI9-R-20261029-XX01');
});

test('progressivo: due cifre, predefinito 01', () => {
  assert.equal(codiceRapporto({ codiceImpianto: 'EI9', creatoIl: '2026-10-29', sigla: 'AB', progressivo: '7' }), 'EI9-R-20261029-AB07');
  assert.equal(codiceRapporto({ codiceImpianto: 'EI9', creatoIl: '2026-10-29', sigla: 'AB', progressivo: '' }), 'EI9-R-20261029-AB01');
  assert.equal(progressivoValido('01'), true);
  assert.equal(progressivoValido('99'), true);
  assert.equal(progressivoValido('00'), false);
  assert.equal(progressivoValido('1'), false);
  assert.equal(progressivoValido('100'), false);
});

test('sigla: esattamente 2 lettere maiuscole', () => {
  assert.equal(siglaValida('AB'), true);
  assert.equal(siglaValida('A1'), false);
  assert.equal(siglaValida('ABC'), false);
  assert.equal(siglaValida('Ab'), false);
});

test('la data del codice è quella di creazione della bozza e non cambia', () => {
  const bozza = nuovaBozza(new Date(2026, 9, 29, 23, 50));
  bozza.s1.fornitore.sigla = 'AB';
  assert.equal(codiceDaDati(bozza), `${CONFIG.codiceImpianto}-R-20261029-AB01`);
  // dopo giorni il codice resta lo stesso: dipende solo da creatoIl
  const copia = JSON.parse(JSON.stringify(bozza));
  assert.equal(codiceDaDati(copia), codiceDaDati(bozza));
});

test('codice impianto con segnaposto: XXX', () => {
  assert.equal(codiceRapporto({ codiceImpianto: '«codice»', creatoIl: '2026-10-29', sigla: 'AB', progressivo: '01' }), 'XXX-R-20261029-AB01');
});
