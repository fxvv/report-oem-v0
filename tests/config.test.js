import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, campiConfigMancanti, testoConfig, partiConfig, haSegnaposto, DA_COMPILARE } from '../js/config.js';

const completa = {
  ...CONFIG,
  tipologiaImpianto: 'Fotovoltaico a terra',
  potenzaKwp: '',
  ubicazione: 'Località Esempio, Comune (XX)',
  coordinate: '0.000000, 0.000000',
  committente: 'ENERGY ITALIA 9 S.r.l.',
  reaCommittente: 'MI 2055472',
  destinatarioFoto: 'Ufficio tecnico – tecnico@example.com',
};

test('valori tra «» considerati mancanti', () => {
  assert.equal(haSegnaposto('«tipologia»'), true);
  assert.equal(haSegnaposto('ENERGY ITALIA 9 «forma giuridica»'), true);
  assert.equal(haSegnaposto('EI9'), false);
  const mancanti = campiConfigMancanti({ ...completa, tipologiaImpianto: '«tipologia»', reaCommittente: '«provincia» 2055472' });
  assert.deepEqual(mancanti.map((m) => m.chiave), ['tipologiaImpianto', 'reaCommittente']);
});

test('configurazione completa: nessun campo mancante; la potenza vuota è ammessa', () => {
  assert.deepEqual(campiConfigMancanti(completa), []);
  assert.equal(testoConfig(completa, 'potenzaKwp'), '');
});

test('obbligatorio vuoto: mancante', () => {
  assert.deepEqual(campiConfigMancanti({ ...completa, ubicazione: '' }).map((m) => m.chiave), ['ubicazione']);
  assert.equal(testoConfig({ ...completa, ubicazione: '' }, 'ubicazione'), DA_COMPILARE);
});

test('nel PDF i segnaposto diventano DA COMPILARE', () => {
  assert.equal(testoConfig(CONFIG, 'tipologiaImpianto'), 'DA COMPILARE');
  assert.equal(testoConfig(CONFIG, 'committente'), 'ENERGY ITALIA 9 DA COMPILARE');
  assert.equal(testoConfig(CONFIG, 'codiceImpianto'), 'EI9');
});

test('parti per evidenziare i segnaposto nella pagina', () => {
  assert.deepEqual(partiConfig(CONFIG, 'committente'), [
    { testo: 'ENERGY ITALIA 9 ', mancante: false },
    { testo: DA_COMPILARE, mancante: true },
  ]);
});

test('configurazione attuale del repository: i campi ancora da compilare sono segnalati', () => {
  const chiavi = campiConfigMancanti(CONFIG).map((m) => m.chiave);
  assert.ok(chiavi.includes('tipologiaImpianto'));
  assert.ok(!chiavi.includes('codiceImpianto'));
  assert.ok(!chiavi.includes('sedeCommittente'));
});
