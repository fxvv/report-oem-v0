import test from 'node:test';
import assert from 'node:assert/strict';
import { impronta, jsonCanonico, improntaContenuto, statoFirma, prossimaRevisione } from '../js/revisione.js';
import { nuovaBozza } from '../js/modello.js';
import { generatoreId } from './aiuti.js';

test('impronta: stessa entrata, stessa impronta', () => {
  assert.equal(impronta('abc'), impronta('abc'));
  assert.notEqual(impronta('abc'), impronta('abd'));
  assert.match(impronta('abc'), /^[0-9a-f]{28}$/);
});

test("JSON canonico: l'ordine delle chiavi non conta", () => {
  assert.equal(jsonCanonico({ b: 1, a: [1, { d: 2, c: 3 }] }), jsonCanonico({ a: [1, { c: 3, d: 2 }], b: 1 }));
  assert.equal(jsonCanonico({ a: undefined, b: null }), '{"b":null}');
});

test("revisione: il primo PDF valido è la Rev. 0", () => {
  assert.equal(prossimaRevisione({ numero: null, impronta: '' }, 'x'), 0);
});

test('revisione: invariata senza modifiche, +1 dopo una modifica', () => {
  const bozza = nuovaBozza(new Date(2026, 9, 29), generatoreId());
  const h0 = improntaContenuto(bozza, { conFirma: true });
  // primo PDF valido
  let revisione = { numero: prossimaRevisione(bozza.revisione, h0), impronta: h0 };
  assert.equal(revisione.numero, 0);
  // rigenerato senza modifiche
  assert.equal(prossimaRevisione(revisione, improntaContenuto(bozza, { conFirma: true })), 0);
  // modifica dei dati
  bozza.s2.oggetto = 'Nuovo oggetto';
  const h1 = improntaContenuto(bozza, { conFirma: true });
  assert.equal(prossimaRevisione(revisione, h1), 1);
  revisione = { numero: 1, impronta: h1 };
  assert.equal(prossimaRevisione(revisione, h1), 1);
});

test("lo stato della revisione e l'id non entrano nell'impronta", () => {
  const bozza = nuovaBozza(new Date(2026, 9, 29), generatoreId());
  const prima = improntaContenuto(bozza, { conFirma: true });
  bozza.revisione = { numero: 3, impronta: 'abc', generatoIl: '2026-10-29T10:00' };
  bozza.id = 'altro';
  assert.equal(improntaContenuto(bozza, { conFirma: true }), prima);
});

test('firma: assente, valida, decaduta dopo una modifica, di nuovo valida se si torna ai dati firmati', () => {
  const bozza = nuovaBozza(new Date(2026, 9, 29), generatoreId());
  assert.equal(statoFirma(bozza), 'assente');
  bozza.s13.firma.nome = 'Mario Rossi';
  bozza.s13.firma.immagine = 'data:image/png;base64,AAAA';
  bozza.s13.firma.dataOra = '2026-10-29T18:00';
  bozza.s13.firma.improntaDati = improntaContenuto(bozza, { conFirma: false });
  assert.equal(statoFirma(bozza), 'valida');
  bozza.s7.situazione = 'Testo cambiato dopo la firma';
  assert.equal(statoFirma(bozza), 'decaduta');
  bozza.s7.situazione = '';
  assert.equal(statoFirma(bozza), 'valida');
  // anche il nome del firmatario fa parte dei dati firmati
  bozza.s13.firma.nome = 'Luca Bianchi';
  assert.equal(statoFirma(bozza), 'decaduta');
});

test("la firma grafica cambia l'impronta completa ma non quella usata per la decadenza", () => {
  const bozza = nuovaBozza(new Date(2026, 9, 29), generatoreId());
  const senza = improntaContenuto(bozza, { conFirma: false });
  const con = improntaContenuto(bozza, { conFirma: true });
  bozza.s13.firma.immagine = 'data:image/png;base64,BBBB';
  assert.equal(improntaContenuto(bozza, { conFirma: false }), senza);
  assert.notEqual(improntaContenuto(bozza, { conFirma: true }), con);
});
