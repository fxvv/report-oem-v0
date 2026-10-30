// Configurazione fissa dell'impianto: il fornitore non può modificarla dalla pagina.
//
// Come compilarla:
// - sostituisci ogni testo tra «» con il valore reale;
// - un valore che contiene ancora «…» è considerato mancante: la pagina mostra
//   l'avviso rosso "Configurazione incompleta" e il PDF stampa "DA COMPILARE";
// - per un campo facoltativo che non serve (la potenza) usa la stringa vuota ''.
//
// Il repository è pubblico: qui vanno solo dati aziendali, mai dati personali.

export const CONFIG = Object.freeze({
  codiceImpianto: 'EI9',
  nomeImpianto: 'FI01A2MEL',
  tipologiaImpianto: '«tipologia»',
  potenzaKwp: '«potenza in kWp»', // facoltativa: '' per non indicarla
  ubicazione: '«indirizzo o località, comune, provincia»',
  coordinate: '«latitudine, longitudine»', // gradi decimali, WGS84
  committente: 'ENERGY ITALIA 9 «forma giuridica»',
  sedeCommittente: 'Via Giacomo Puccini 3, 20121 Milano (MI)',
  pivaCommittente: '01776210765',
  reaCommittente: '«provincia» 2055472',
  destinatarioFoto: '«nome ed e-mail»',
  versioneModulo: 'V0',
});

// Etichette usate nella pagina, nel PDF e nell'avviso di configurazione incompleta.
export const ETICHETTE_CONFIG = Object.freeze({
  codiceImpianto: 'Codice impianto',
  nomeImpianto: 'Nome impianto',
  tipologiaImpianto: 'Tipologia impianto',
  potenzaKwp: 'Potenza (kWp)',
  ubicazione: 'Ubicazione',
  coordinate: 'Coordinate (WGS84)',
  committente: 'Committente (SPV)',
  sedeCommittente: 'Sede del committente',
  pivaCommittente: 'P.IVA del committente',
  reaCommittente: 'REA del committente',
  destinatarioFoto: 'Destinatario delle foto originali e degli allegati',
  versioneModulo: 'Versione del modulo',
});

export const CAMPI_FACOLTATIVI = Object.freeze(['potenzaKwp']);

export const DA_COMPILARE = 'DA COMPILARE';

const RE_SEGNAPOSTO = /«[^»]*»/;
const RE_SEGNAPOSTO_GLOBALE = /«[^»]*»/g;

export function haSegnaposto(valore) {
  return RE_SEGNAPOSTO.test(String(valore ?? ''));
}

// Elenco dei campi mancanti: valori con segnaposto «…» oppure vuoti se obbligatori.
export function campiConfigMancanti(config = CONFIG) {
  return Object.keys(ETICHETTE_CONFIG)
    .filter((chiave) => {
      const valore = String(config[chiave] ?? '').trim();
      if (haSegnaposto(valore)) return true;
      return valore === '' && !CAMPI_FACOLTATIVI.includes(chiave);
    })
    .map((chiave) => ({ chiave, etichetta: ETICHETTE_CONFIG[chiave] }));
}

// Testo per il PDF: ogni segnaposto diventa "DA COMPILARE"; un obbligatorio vuoto pure.
export function testoConfig(config, chiave) {
  const valore = String(config[chiave] ?? '').trim();
  if (valore === '') return CAMPI_FACOLTATIVI.includes(chiave) ? '' : DA_COMPILARE;
  return valore.replace(RE_SEGNAPOSTO_GLOBALE, DA_COMPILARE).replace(/\s+/g, ' ').trim();
}

// Parti del valore per la pagina, così i segnaposto si possono evidenziare in rosso.
export function partiConfig(config, chiave) {
  const valore = String(config[chiave] ?? '');
  if (valore.trim() === '') {
    return CAMPI_FACOLTATIVI.includes(chiave) ? [] : [{ testo: DA_COMPILARE, mancante: true }];
  }
  const parti = [];
  let ultimo = 0;
  for (const corrispondenza of valore.matchAll(RE_SEGNAPOSTO_GLOBALE)) {
    if (corrispondenza.index > ultimo) parti.push({ testo: valore.slice(ultimo, corrispondenza.index), mancante: false });
    parti.push({ testo: DA_COMPILARE, mancante: true });
    ultimo = corrispondenza.index + corrispondenza[0].length;
  }
  if (ultimo < valore.length) parti.push({ testo: valore.slice(ultimo), mancante: false });
  return parti;
}
