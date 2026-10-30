import test from 'node:test';
import assert from 'node:assert/strict';
import { valida } from '../js/validazione.js';
import { statoFirma } from '../js/revisione.js';
import { elencoFoto } from '../js/modello.js';
import { bozzaEsempio } from './aiuti.js';

test('la bozza di esempio si importa ed è valida, con firma valida', () => {
  const { dati, immagini } = bozzaEsempio();
  const esito = valida(dati);
  assert.deepEqual(esito.errori, []);
  assert.equal(statoFirma(dati), 'valida');
  assert.equal(Object.keys(immagini).length, elencoFoto(dati).length);
});

test("la bozza di esempio descrive un riarmo con sopralluogo su due giornate e ha almeno 3 immagini", () => {
  const { dati, immagini } = bozzaEsempio();
  assert.equal(dati.s4.applicabile, 'Sì');
  assert.ok(dati.s2.tipologie.includes('Ispezione / sopralluogo'));
  assert.equal(dati.s5.giornate.length, 2);
  assert.notEqual(dati.s5.giornate[0].data, dati.s5.giornate[1].data);
  assert.ok(Object.keys(immagini).length >= 3);
  assert.equal(dati.revisione.numero, null);
});
