import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { creaFileBozza, leggiFileBozza, FORMATO_BOZZA, VERSIONE_FORMATO_BOZZA } from '../js/bozza.js';
import { statoFirma, improntaContenuto } from '../js/revisione.js';
import { RADICE, bozzaEsempio } from './aiuti.js';

test('esportazione e importazione conservano tutti i dati e le foto', () => {
  const { dati, immagini } = bozzaEsempio();
  dati.revisione = { numero: 2, impronta: improntaContenuto(dati, { conFirma: true }), generatoIl: '2026-10-28T16:00' };
  const miniature = Object.fromEntries(Object.keys(immagini).map((id) => [id, 'data:image/jpeg;base64,AAAA']));
  const file = creaFileBozza({ dati, immagini, miniature, adesso: new Date('2026-10-29T10:00:00Z') });
  assert.equal(file.formato, FORMATO_BOZZA);
  assert.equal(file.versioneFormato, VERSIONE_FORMATO_BOZZA);
  assert.equal(file.esportatoIl, '2026-10-29T10:00:00.000Z');
  const letto = leggiFileBozza(JSON.stringify(file));
  assert.deepEqual(letto.dati, dati);
  assert.deepEqual(letto.immagini, immagini);
  assert.deepEqual(letto.miniature, miniature);
  assert.equal(statoFirma(letto.dati), 'valida');
  assert.equal(letto.dati.revisione.numero, 2);
});

test('file non JSON, di altro formato o di versione più recente', () => {
  assert.throws(() => leggiFileBozza('non è json'), /JSON/);
  assert.throws(() => leggiFileBozza('{"formato":"altro","versioneFormato":1,"dati":{}}'), /non è una bozza/);
  assert.throws(() => leggiFileBozza(JSON.stringify({ formato: FORMATO_BOZZA, versioneFormato: 99, dati: {} })), /più recente/);
  assert.throws(() => leggiFileBozza(JSON.stringify({ formato: FORMATO_BOZZA, versioneFormato: 'uno', dati: {} })), /Versione/);
  assert.throws(() => leggiFileBozza(JSON.stringify({ formato: FORMATO_BOZZA, versioneFormato: 1 })), /non contiene i dati/);
});

test('foto senza immagine: importazione rifiutata', () => {
  const testo = readFileSync(join(RADICE, 'esempi', 'bozza-esempio.json'), 'utf8');
  const file = JSON.parse(testo);
  delete file.immagini['foto-es-2'];
  assert.throws(() => leggiFileBozza(JSON.stringify(file)), /mancano le immagini di 1 foto/);
});

test("l'impronta delle foto si ricalcola dall'immagine: un'immagine cambiata fa decadere la firma", () => {
  const file = JSON.parse(readFileSync(join(RADICE, 'esempi', 'bozza-esempio.json'), 'utf8'));
  file.immagini['foto-es-1'].jpeg = file.immagini['foto-es-2'].jpeg;
  const { dati } = leggiFileBozza(JSON.stringify(file));
  assert.equal(statoFirma(dati), 'decaduta');
});
