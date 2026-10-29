import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nuovaBozza,
  normalizzaBozza,
  nuovaRiga,
  risolviPercorso,
  impostaPercorso,
  eliminaRiga,
  elencoFoto,
  tutteLeFoto,
  operazioniOrdinate,
  totaliSquadra,
  periodoGiornate,
  prepostiSuggeriti,
  riferimentoFoto,
  mappaNumeriFoto,
} from '../js/modello.js';
import { bozzaEsempio, generatoreId } from './aiuti.js';

test('la normalizzazione è idempotente e scarta i campi sconosciuti', () => {
  const { dati } = bozzaEsempio();
  const due = normalizzaBozza(JSON.parse(JSON.stringify(dati)));
  assert.deepEqual(due, dati);
  const sporca = normalizzaBozza({ ...dati, campoIgnoto: 1, s2: { ...dati.s2, extra: true, oggetto: 42 } });
  assert.equal('campoIgnoto' in sporca, false);
  assert.equal('extra' in sporca.s2, false);
  assert.equal(sporca.s2.oggetto, '42');
});

test('bozza nuova: data di creazione fissata e struttura completa', () => {
  const b = nuovaBozza(new Date(2026, 9, 29, 8), generatoreId());
  assert.equal(b.creatoIl, '2026-10-29');
  assert.equal(b.progressivo, '01');
  assert.equal(b.revisione.numero, null);
  for (let n = 1; n <= 13; n++) assert.ok(b[`s${n}`], `s${n}`);
});

test('gli id duplicati vengono sostituiti', () => {
  const b = normalizzaBozza({ s1: { ticket: [{ id: 'x', testo: 'a' }, { id: 'x', testo: 'b' }] } }, generatoreId('n'));
  assert.notEqual(b.s1.ticket[0].id, b.s1.ticket[1].id);
  assert.equal(b.s1.ticket[0].id, 'x');
});

test('percorsi con gli id delle righe', () => {
  const { dati } = bozzaEsempio();
  const g = dati.s5.giornate[1];
  const p = g.persone[0];
  assert.equal(risolviPercorso(dati, `s5.giornate.${g.id}.persone.${p.id}.nome`), 'Mario Rossi');
  assert.equal(impostaPercorso(dati, `s5.giornate.${g.id}.persone.${p.id}.oreLavoro`, '7'), true);
  assert.equal(p.oreLavoro, '7');
  assert.equal(impostaPercorso(dati, 's2.campoInesistente', 'x'), false);
  assert.equal(eliminaRiga(dati, `s5.giornate.${g.id}.persone`, p.id), true);
  assert.equal(g.persone.length, 0);
});

test('nuova riga con id unico nella bozza', () => {
  const { dati } = bozzaEsempio();
  const r = nuovaRiga(dati, 'persona', { organizzazione: 'ACME' });
  assert.equal(r.organizzazione, 'ACME');
  assert.equal(r.nome, '');
  assert.ok(r.id && r.id !== 'persona-1');
});

test('numerazione unica delle foto: ordine delle sezioni e delle righe', () => {
  const { dati } = bozzaEsempio();
  const voci = elencoFoto(dati);
  assert.deepEqual(voci.map((v) => v.numero), [1, 2, 3, 4]);
  assert.deepEqual(voci.map((v) => v.sezione), [4, 7, 8, 8]);
  assert.equal(voci[0].riferimento, 'Sez. 4 – Segnalazioni');
  assert.equal(voci[1].riferimento, 'Sez. 7 – Anomalia 1');
  assert.equal(voci[2].riferimento, 'Sez. 8 – Operazione 5');
  assert.equal(riferimentoFoto(dati.s8.operazioni[4].foto, mappaNumeriFoto(dati)), 'Foto 3, 4');
});

test('le foto delle parti non applicabili non sono numerate', () => {
  const { dati } = bozzaEsempio();
  dati.s4.applicabile = 'No';
  const voci = elencoFoto(dati);
  assert.equal(voci.length, 3);
  assert.equal(voci[0].sezione, 7);
  assert.equal(voci[0].numero, 1);
  assert.equal(tutteLeFoto(dati).length, 4);
});

test('operazioni ordinate per data e ora', () => {
  const { dati } = bozzaEsempio();
  dati.s8.operazioni.reverse();
  const ordinate = operazioniOrdinate(dati);
  assert.equal(ordinate[0].id, 'operazione-1');
  assert.equal(ordinate[5].id, 'operazione-6');
  // la numerazione delle foto segue l'ordine delle operazioni
  assert.equal(elencoFoto(dati)[2].riferimento, 'Sez. 8 – Operazione 5');
});

test('totali della squadra: per persona, complessivi e km', () => {
  const { dati } = bozzaEsempio();
  const totali = totaliSquadra(dati);
  assert.equal(totali.oreLavoro, 17.5);
  assert.equal(totali.oreViaggio, 4.5);
  assert.equal(totali.km, 172);
  const mario = totali.perPersona.find((p) => p.nome === 'Mario Rossi');
  assert.equal(mario.oreLavoro, 11.5);
  assert.equal(mario.oreViaggio, 3);
  dati.s5.giornate[0].nessunMezzo = true;
  assert.equal(totaliSquadra(dati).km, 86);
});

test('periodo e preposti suggeriti', () => {
  const { dati } = bozzaEsempio();
  assert.deepEqual(periodoGiornate(dati), { dal: '2026-10-27', al: '2026-10-28' });
  assert.deepEqual(prepostiSuggeriti(dati), ['Mario Rossi']);
});
