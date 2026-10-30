import test from 'node:test';
import assert from 'node:assert/strict';
import { valida } from '../js/validazione.js';
import { nuovaBozza, nuovaRiga, COMPONENTE_GENERALE } from '../js/modello.js';
import { improntaContenuto } from '../js/revisione.js';
import { bozzaEsempio, generatoreId } from './aiuti.js';

// Bozza di esempio valida, da modificare nei singoli test.
const esempio = () => bozzaEsempio().dati;
const percorsiErrori = (dati) => valida(dati).errori.map((e) => e.percorso);
const haErrore = (dati, percorso, testo) =>
  valida(dati).errori.some((e) => e.percorso === percorso && (!testo || e.messaggio.includes(testo)));

// Dopo una modifica la firma decade: per controllare le altre regole si rifirma.
function rifirma(dati) {
  dati.s13.firma.improntaDati = improntaContenuto(dati, { conFirma: false });
  return dati;
}

test("la bozza di esempio è valida", () => {
  const esito = valida(esempio());
  assert.deepEqual(esito.errori, []);
  assert.equal(esito.valido, true);
  for (let n = 1; n <= 13; n++) assert.equal(esito.sezioni[n].stato, 'completa', `sezione ${n}`);
});

test('una bozza nuova ha errori in tutte le 13 sezioni', () => {
  const esito = valida(nuovaBozza(new Date(2026, 9, 29), generatoreId()));
  assert.equal(esito.valido, false);
  for (let n = 1; n <= 13; n++) {
    assert.equal(esito.sezioni[n].stato, 'da-completare', `sezione ${n}`);
    assert.ok(esito.sezioni[n].errori > 0);
  }
});

test('ogni errore indica sezione, percorso e messaggio', () => {
  for (const e of valida(nuovaBozza(new Date(), generatoreId())).errori) {
    assert.ok(e.sezione >= 1 && e.sezione <= 13);
    assert.equal(typeof e.percorso, 'string');
    assert.ok(e.messaggio.length > 5);
  }
});

test('sezione 1: P.IVA controllata, fornitore estero con identificativo libero', () => {
  const d = esempio();
  d.s1.fornitore.piva = '12345678901';
  assert.ok(haErrore(rifirma(d), 's1.fornitore.piva', 'carattere di controllo'));
  d.s1.fornitore.estero = true;
  d.s1.fornitore.piva = 'DE123456789';
  assert.ok(!haErrore(rifirma(d), 's1.fornitore.piva'));
  d.s1.fornitore.piva = '';
  assert.ok(haErrore(rifirma(d), 's1.fornitore.piva'));
});

test('sezione 1: sigla, e-mail e ticket vuoti', () => {
  const d = esempio();
  d.s1.fornitore.sigla = 'A1';
  d.s1.compilatore.email = 'non-valida';
  d.s1.ticket.push({ id: 'vuoto', testo: '  ' });
  rifirma(d);
  assert.ok(haErrore(d, 's1.fornitore.sigla'));
  assert.ok(haErrore(d, 's1.compilatore.email', 'non valido'));
  assert.ok(haErrore(d, 's1.ticket.vuoto.testo'));
});

test('sezione 2: oggetto max 120, tipologie, Altro, Extra-canone', () => {
  const d = esempio();
  d.s2.oggetto = 'x'.repeat(121);
  d.s2.tipologie = ['Altro'];
  d.s2.tipologiaAltro = '';
  d.s2.riferimentoOfferta = '';
  rifirma(d);
  assert.ok(haErrore(d, 's2.oggetto', '120'));
  assert.ok(haErrore(d, 's2.tipologiaAltro', 'specificare'));
  assert.ok(haErrore(d, 's2.riferimentoOfferta'));
  d.s2.regime = 'Canone';
  assert.ok(!haErrore(rifirma(d), 's2.riferimentoOfferta'));
  d.s2.tipologie = [];
  assert.ok(haErrore(rifirma(d), 's2.tipologie'));
});

test("sezione 3: evento obbligatorio solo con 'Evento o guasto'", () => {
  const d = esempio();
  d.s3.eventoDataOra = '';
  d.s3.eventoNonNota = false;
  assert.ok(haErrore(rifirma(d), 's3.eventoDataOra', 'Non nota'));
  d.s3.eventoNonNota = true;
  assert.ok(!haErrore(rifirma(d), 's3.eventoDataOra'));
  // fonte dell'orario richiesta solo se la data-ora è inserita
  assert.ok(!haErrore(rifirma(d), 's3.fonteOrario'));
  d.s3.origine = 'Attività programmata';
  d.s3.eventoNonNota = false;
  d.s3.rilevazione = '';
  rifirma(d);
  assert.ok(!haErrore(d, 's3.eventoDataOra'));
  assert.ok(!haErrore(d, 's3.rilevazione'));
});

test('sezione 3: coerenza evento ≤ arrivo ≤ riarmo ≤ fine', () => {
  const d = esempio();
  d.s3.arrivo = '2026-10-27T06:00'; // prima dell'evento (06:42)
  assert.ok(haErrore(rifirma(d), 's3.arrivo', "l'evento"));
  d.s3.arrivo = '2026-10-27T09:15';
  d.s3.riarmo = '2026-10-29T08:00'; // dopo la fine
  assert.ok(haErrore(rifirma(d), 's3.fine', 'riarmo'));
  d.s3.riarmo = '';
  // riarmo obbligatorio perché la sezione 4 è applicabile
  assert.ok(haErrore(rifirma(d), 's3.riarmo', 'obbligatorio'));
  d.s4.applicabile = 'No';
  assert.ok(!haErrore(rifirma(d), 's3.riarmo'));
});

test('sezione 3: con "Limitato" serve la potenza da 0 a 100', () => {
  const d = esempio();
  d.s3.statoDopo = 'Limitato';
  assert.ok(haErrore(rifirma(d), 's3.potenzaDopo', 'obbligatorio'));
  d.s3.potenzaDopo = '120';
  assert.ok(haErrore(rifirma(d), 's3.potenzaDopo', 'al massimo 100'));
  d.s3.potenzaDopo = '60,5';
  assert.ok(!haErrore(rifirma(d), 's3.potenzaDopo'));
});

test('sezione 4: foto delle segnalazioni oppure "Foto non disponibile" con motivo', () => {
  const d = esempio();
  d.s4.foto = [];
  assert.ok(haErrore(rifirma(d), 's4.foto', 'Foto non disponibile'));
  d.s4.fotoNonDisponibile = true;
  assert.ok(haErrore(rifirma(d), 's4.fotoMotivo'));
  d.s4.fotoMotivo = 'Display spento';
  assert.ok(!percorsiErrori(rifirma(d)).some((p) => p.startsWith('s4.')));
});

test('sezioni "se applicabili": con No non sono richieste e risultano Non applicabile', () => {
  const d = esempio();
  d.s4.applicabile = 'No';
  d.s4.protezioni = [];
  d.s9.applicabile = 'No';
  d.s9.attrezzature = [];
  d.s10.applicabile = 'No';
  d.s10.righe = [];
  const esito = valida(rifirma(d));
  assert.equal(esito.valido, true, JSON.stringify(esito.errori));
  assert.equal(esito.sezioni[4].stato, 'non-applicabile');
  assert.equal(esito.sezioni[9].stato, 'non-applicabile');
  assert.equal(esito.sezioni[10].stato, 'non-applicabile');
  d.s9.applicabile = '';
  assert.ok(haErrore(rifirma(d), 's9.applicabile', 'Sì o No'));
});

test('sezione 5: giornate con date diverse, nel periodo, persone e ore valide', () => {
  const d = esempio();
  const [g1, g2] = d.s5.giornate;
  g2.data = g1.data;
  assert.ok(haErrore(rifirma(d), `s5.giornate.${g2.id}.data`, 'uguale'));
  g2.data = '2026-10-30';
  assert.ok(haErrore(rifirma(d), `s5.giornate.${g2.id}.data`, 'fine attività'));
  g2.data = '2026-10-28';
  g1.persone[0].oreLavoro = '25';
  g1.persone[1].oreViaggio = 'tanto';
  rifirma(d);
  assert.ok(haErrore(d, `s5.giornate.${g1.id}.persone.${g1.persone[0].id}.oreLavoro`, '24'));
  assert.ok(haErrore(d, `s5.giornate.${g1.id}.persone.${g1.persone[1].id}.oreViaggio`, 'numero'));
  g1.persone = [];
  assert.ok(haErrore(rifirma(d), `s5.giornate.${g1.id}.persone`));
  d.s5.giornate = [];
  assert.ok(haErrore(rifirma(d), 's5.giornate'));
});

test('elenchi vuoti: validi solo con la casella esplicita', () => {
  const d = esempio();
  const g = d.s5.giornate[0];
  g.mezzi = [];
  assert.ok(haErrore(rifirma(d), `s5.giornate.${g.id}.nessunMezzo`, 'Nessun mezzo'));
  g.nessunMezzo = true;
  assert.ok(!haErrore(rifirma(d), `s5.giornate.${g.id}.nessunMezzo`));
  d.s7.anomalie = [];
  assert.ok(haErrore(rifirma(d), 's7.nessunaAnomalia'));
  d.s7.nessunaAnomalia = true;
  assert.ok(!haErrore(rifirma(d), 's7.nessunaAnomalia'));
  d.s12.rifiuti = [];
  assert.ok(haErrore(rifirma(d), 's12.nessunRifiuto'));
  d.s11.operazioni = [];
  assert.ok(haErrore(rifirma(d), 's11.nessunaOperazione'));
  d.s9.misure = [];
  assert.ok(haErrore(rifirma(d), 's9.nessunaMisura'));
  // casella selezionata ma elenco non vuoto: contraddizione
  const d2 = esempio();
  d2.s12.nessunRifiuto = true;
  assert.ok(haErrore(rifirma(d2), 's12.nessunRifiuto', 'contiene'));
});

test('sezione 6: con Sì servono descrizione e foto delle anomalie', () => {
  const d = esempio();
  d.s6.anomalie = 'Sì';
  rifirma(d);
  assert.ok(haErrore(d, 's6.anomalieDescrizione'));
  assert.ok(haErrore(d, 's6.anomalieFoto'));
  d.s6.dpi = ['Altro'];
  assert.ok(haErrore(rifirma(d), 's6.dpiAltro'));
});

test('sezione 7: situazione di almeno 20 caratteri e costruttore/modello/seriale con alternative', () => {
  const d = esempio();
  d.s7.situazione = 'Troppo corto';
  const c = d.s7.componenti[0];
  c.seriale = { valore: '', alternativa: '' };
  rifirma(d);
  assert.ok(haErrore(d, 's7.situazione', '20 caratteri'));
  assert.ok(haErrore(d, `s7.componenti.${c.id}.seriale.valore`, 'Non rilevato'));
  c.seriale = { valore: '', alternativa: 'Non rilevato' };
  assert.ok(!haErrore(rifirma(d), `s7.componenti.${c.id}.seriale.valore`));
});

test('sezione 8: ora di fine non precedente, componente esistente, "In campo" in una giornata', () => {
  const d = esempio();
  const op = d.s8.operazioni[0];
  op.oraFine = '09:00';
  op.componente = 'inesistente';
  op.data = '2026-10-26';
  rifirma(d);
  assert.ok(haErrore(d, `s8.operazioni.${op.id}.oraFine`, 'precede'));
  assert.ok(haErrore(d, `s8.operazioni.${op.id}.componente`, 'non è più presente'));
  assert.ok(haErrore(d, `s8.operazioni.${op.id}.data`, 'In campo'));
  op.modalita = 'Da remoto';
  op.componente = COMPONENTE_GENERALE;
  assert.ok(!haErrore(rifirma(d), `s8.operazioni.${op.id}.data`));
  assert.ok(!haErrore(d, `s8.operazioni.${op.id}.componente`));
});

test('sezione 9: taratura scaduta è un avviso, non un errore', () => {
  const d = esempio();
  d.s9.attrezzature[0].scadenza = '2026-10-01';
  const esito = valida(rifirma(d));
  assert.equal(esito.valido, true);
  assert.ok(esito.avvisi.some((a) => a.sezione === 9 && a.messaggio.includes('scaduta')));
});

test('sezione 9: certificato e scadenza, oppure "Non disponibile"', () => {
  const d = esempio();
  const a = d.s9.attrezzature[0];
  a.certificato = '';
  a.scadenza = '';
  rifirma(d);
  assert.ok(haErrore(d, `s9.attrezzature.${a.id}.certificato`, 'Non disponibile'));
  assert.ok(haErrore(d, `s9.attrezzature.${a.id}.scadenza`, 'Non disponibile'));
  a.certificatoNonDisponibile = true;
  a.scadenzaNonDisponibile = true;
  assert.equal(valida(rifirma(d)).valido, true);
});

test('sezione 10: quantità maggiore di 0 e seriali con alternative', () => {
  const d = esempio();
  const r = d.s10.righe[0];
  r.quantita = '0';
  r.serialeNuovo = { valore: '', alternativa: '' };
  rifirma(d);
  assert.ok(haErrore(d, `s10.righe.${r.id}.quantita`, 'maggiore di 0'));
  assert.ok(haErrore(d, `s10.righe.${r.id}.serialeNuovo.valore`));
});

test("sezione 11: 'Non applicabile (attività programmata)' solo con attività programmata", () => {
  const d = esempio();
  d.s11.ipotesi = '';
  d.s11.ipotesiNonApplicabile = true;
  assert.ok(haErrore(rifirma(d), 's11.ipotesi'));
  d.s3.origine = 'Attività programmata';
  assert.ok(!haErrore(rifirma(d), 's11.ipotesi'));
});

test('sezione 12: EER, carburante e gas', () => {
  const d = esempio();
  d.s12.rifiuti[0].eer = '1602';
  d.s12.carburante = '';
  d.s12.gas = 'Sì';
  rifirma(d);
  assert.ok(haErrore(d, `s12.rifiuti.${d.s12.rifiuti[0].id}.eer`, '6 cifre'));
  assert.ok(haErrore(d, 's12.carburante', 'Non noto'));
  assert.ok(haErrore(d, 's12.gasApparecchiatura'));
  assert.ok(haErrore(d, 's12.gasQuantita', 'Non nota'));
  d.s12.carburanteNonNoto = true;
  d.s12.gasApparecchiatura = 'Quadro MT';
  d.s12.gasQuantitaNonNota = true;
  d.s12.rifiuti[0].eer = '';
  assert.equal(valida(rifirma(d)).valido, true);
});

test('sezione 13: didascalie obbligatorie e firma decaduta segnalata come mancante', () => {
  const d = esempio();
  d.s4.foto[0].didascalia = '';
  const esito = valida(d); // senza rifirmare: la firma è decaduta
  assert.ok(esito.errori.some((e) => e.percorso === `s4.foto.${d.s4.foto[0].id}.didascalia` && e.sezione === 13));
  assert.ok(esito.errori.some((e) => e.percorso === 's13.firma.immagine' && e.messaggio.includes('firma di nuovo')));
});

test('numeri scritti come migliaia: avviso', () => {
  const d = esempio();
  d.s5.giornate[0].mezzi[0].km = '1.200';
  const esito = valida(rifirma(d));
  assert.ok(esito.avvisi.some((a) => a.messaggio.includes('1,2')));
});

test('le righe nuove partono vuote e producono errori nella loro sezione', () => {
  const d = esempio();
  d.s11.operazioni.push(nuovaRiga(d, 'operazioneDaEseguire'));
  const esito = valida(rifirma(d));
  assert.equal(esito.sezioni[11].stato, 'da-completare');
  assert.ok(esito.sezioni[11].errori >= 3);
});
