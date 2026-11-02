import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, ETICHETTE_CONFIG, campiConfigMancanti, testoConfig, partiConfig, haSegnaposto, DA_COMPILARE } from '../js/config.js';

const completa = {
  ...CONFIG,
  destinatarioFoto: 'Ufficio tecnico – tecnico@example.com',
};

test('valori tra «» considerati mancanti', () => {
  assert.equal(haSegnaposto('«nome ed e-mail»'), true);
  assert.equal(haSegnaposto('ENERGY ITALIA 9 «forma giuridica»'), true);
  assert.equal(haSegnaposto('EI9'), false);
});

test('configurazione completa: nessun dato mancante', () => {
  assert.deepEqual(campiConfigMancanti(completa), []);
});

test('l\'avviso considera solo i dati rimasti in configurazione', () => {
  assert.deepEqual(Object.keys(ETICHETTE_CONFIG).sort(), ['destinatarioFoto', 'versioneModulo']);
  for (const chiave of ['tipologiaImpianto', 'potenzaKwp', 'ubicazione', 'coordinate', 'reaCommittente', 'codiceImpianto', 'nomeImpianto']) {
    assert.equal(chiave in CONFIG, false, `${chiave} non è più in configurazione`);
  }
  const mancanti = campiConfigMancanti({ ...completa, destinatarioFoto: '«…»' });
  assert.deepEqual(mancanti.map((m) => m.chiave), ['destinatarioFoto']);
});

test('anagrafica: segnaposto, valori vuoti ed elenchi vuoti sono segnalati', () => {
  const mancanti = campiConfigMancanti({
    ...completa,
    impianti: [{ codice: 'EI9', nome: '«nome»' }],
    committenti: [{ nome: 'ACME', sede: '', piva: '01776210765' }],
    tipologieImpianto: [],
  });
  assert.deepEqual(mancanti.map((m) => m.chiave), ['impianti.0.nome', 'committenti.0.sede', 'tipologieImpianto']);
  assert.deepEqual(mancanti.map((m) => m.etichetta), ['Impianto 1 – nome', 'Committente 1 – sede', 'Elenco delle tipologie di impianto']);
});

test('configurazione del repository: anagrafica completa', () => {
  assert.deepEqual(CONFIG.impianti, [{ codice: 'EI9', nome: 'FI01A2MEL' }]);
  assert.deepEqual(CONFIG.committenti, [{ nome: 'ENERGY ITALIA 9', sede: 'Via Giacomo Puccini 3, 20121 Milano (MI)', piva: '01776210765' }]);
  assert.deepEqual(CONFIG.tipologieImpianto, ['Fotovoltaico', 'Eolico']);
  const chiavi = campiConfigMancanti(CONFIG).map((m) => m.chiave);
  assert.ok(chiavi.every((c) => c === 'destinatarioFoto'), `solo il destinatario può mancare (${chiavi})`);
});

test('la configurazione non si modifica dalla pagina', () => {
  // i moduli ES sono in modalità strict: modificare un oggetto congelato lancia un errore
  assert.throws(() => CONFIG.impianti.push({ codice: 'X', nome: 'Y' }));
  assert.equal(Object.isFrozen(CONFIG.committenti[0]), true);
});

test('nel PDF un segnaposto diventa DA COMPILARE', () => {
  assert.equal(testoConfig({ destinatarioFoto: '«nome ed e-mail»' }, 'destinatarioFoto'), DA_COMPILARE);
  assert.equal(testoConfig({ destinatarioFoto: '' }, 'destinatarioFoto'), DA_COMPILARE);
  assert.equal(testoConfig(completa, 'destinatarioFoto'), 'Ufficio tecnico – tecnico@example.com');
});

test('parti per evidenziare i segnaposto nella pagina', () => {
  assert.deepEqual(partiConfig({ destinatarioFoto: 'Ufficio «e-mail»' }, 'destinatarioFoto'), [
    { testo: 'Ufficio ', mancante: false },
    { testo: DA_COMPILARE, mancante: true },
  ]);
});
