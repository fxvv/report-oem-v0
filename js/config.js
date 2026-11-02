// Configurazione del modulo: anagrafica di impianti e committenti tra cui il
// fornitore sceglie nella sezione 1, e pochi dati fissi.
//
// Come compilarla:
// - per aggiungere un impianto o un committente basta una riga in più negli
//   elenchi qui sotto: i menu del modulo si aggiornano da soli;
// - un valore che contiene ancora un segnaposto tra «» è considerato mancante:
//   la pagina mostra l'avviso rosso "Configurazione incompleta" e il PDF stampa
//   "DA COMPILARE" al suo posto.
//
// Il repository è pubblico: qui vanno solo dati aziendali, mai dati personali.

export const CONFIG = congela({
  // Impianti: il codice interno entra nel codice del rapporto (es. EI9-R-20261030-AB01),
  // il nome è quello mostrato nel menu.
  impianti: [{ codice: 'EI9', nome: 'FI01A2MEL' }],
  // Committenti (SPV): nome, sede e partita IVA.
  committenti: [{ nome: 'ENERGY ITALIA 9', sede: 'Via Giacomo Puccini 3, 20121 Milano (MI)', piva: '01776210765' }],
  // Tipologie di impianto proposte nel menu.
  tipologieImpianto: ['Fotovoltaico', 'Eolico'],
  destinatarioFoto: '«nome ed e-mail»',
  versioneModulo: 'V0',
});

// Etichette dei dati fissi, usate nella pagina, nel PDF e nell'avviso di configurazione incompleta.
export const ETICHETTE_CONFIG = Object.freeze({
  destinatarioFoto: 'Destinatario delle foto originali e degli allegati',
  versioneModulo: 'Versione del modulo',
});

export const DA_COMPILARE = 'DA COMPILARE';

const RE_SEGNAPOSTO = /«[^»]*»/;
const RE_SEGNAPOSTO_GLOBALE = /«[^»]*»/g;

function congela(oggetto) {
  Object.values(oggetto).forEach((v) => {
    if (v && typeof v === 'object') congela(v);
  });
  return Object.freeze(oggetto);
}

export function haSegnaposto(valore) {
  return RE_SEGNAPOSTO.test(String(valore ?? ''));
}

const mancante = (valore) => String(valore ?? '').trim() === '' || haSegnaposto(valore);

// Elenco dei dati di configurazione mancanti: valori vuoti o con un segnaposto «…»,
// elenchi vuoti. Riguarda solo i dati che restano in configurazione.
export function campiConfigMancanti(config = CONFIG) {
  const risultato = [];
  Object.keys(ETICHETTE_CONFIG).forEach((chiave) => {
    if (mancante(config[chiave])) risultato.push({ chiave, etichetta: ETICHETTE_CONFIG[chiave] });
  });
  const elenco = (chiave, etichettaElenco, nomeVoce, campi) => {
    const voci = Array.isArray(config[chiave]) ? config[chiave] : [];
    if (voci.length === 0) risultato.push({ chiave, etichetta: etichettaElenco });
    voci.forEach((voce, i) => {
      if (campi === null) {
        if (mancante(voce)) risultato.push({ chiave: `${chiave}.${i}`, etichetta: `${nomeVoce} ${i + 1}` });
        return;
      }
      for (const [campo, etichetta] of campi) {
        if (mancante(voce && voce[campo])) risultato.push({ chiave: `${chiave}.${i}.${campo}`, etichetta: `${nomeVoce} ${i + 1} – ${etichetta}` });
      }
    });
  };
  elenco('impianti', 'Elenco degli impianti', 'Impianto', [['codice', 'codice'], ['nome', 'nome']]);
  elenco('committenti', 'Elenco dei committenti', 'Committente', [['nome', 'nome'], ['sede', 'sede'], ['piva', 'P.IVA']]);
  elenco('tipologieImpianto', 'Elenco delle tipologie di impianto', 'Tipologia', null);
  return risultato;
}

// Testo per il PDF: ogni segnaposto diventa "DA COMPILARE"; un valore vuoto pure.
export function testoConfig(config, chiave) {
  const valore = String(config[chiave] ?? '').trim();
  if (valore === '') return DA_COMPILARE;
  return valore.replace(RE_SEGNAPOSTO_GLOBALE, DA_COMPILARE).replace(/\s+/g, ' ').trim();
}

// Parti del valore per la pagina, così i segnaposto si possono evidenziare in rosso.
export function partiConfig(config, chiave) {
  const valore = String(config[chiave] ?? '');
  if (valore.trim() === '') return [{ testo: DA_COMPILARE, mancante: true }];
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
