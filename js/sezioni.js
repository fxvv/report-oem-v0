// Contenuto delle 13 sezioni del modulo. Ogni funzione restituisce i nodi del
// corpo della sezione a partire dai dati; la pagina ridisegna una sezione
// quando cambia una scelta che mostra o nasconde dei campi.

import { h } from './dom.js';
import { creaCampi, erroreDi, avvisoDi } from './campi.js';
import { ETICHETTE_CONFIG, partiConfig } from './config.js';
import { DICHIARAZIONE } from './pdf-documento.js';
import {
  OPZIONI,
  SI,
  NO,
  EVENTO,
  PROGRAMMATA,
  COMPONENTE_GENERALE,
  MAX_FOTO,
  SOGLIA_AVVISO_FOTO,
  operazioniOrdinate,
  elencoFoto,
  tutteLeFoto,
  etichettaComponente,
  etichettaAttrezzatura,
} from './modello.js';

export const CONSIGLIO_ESPORTA =
  'Esporta la bozza a fine giornata: su alcuni telefoni il browser può cancellare i dati delle pagine che non apri per giorni.';

// Valore della configurazione con i segnaposto evidenziati in rosso.
export function testoConfigEvidenziato(config, chiave) {
  return partiConfig(config, chiave).map((p) => (p.mancante ? h('span', { classe: 'da-compilare' }, p.testo) : p.testo));
}

export function opzioniComponenti(dati) {
  return [
    { valore: COMPONENTE_GENERALE, testo: 'Generale' },
    ...dati.s7.componenti.map((c, i) => ({ valore: c.id, testo: `${i + 1} – ${etichettaComponente(c, i)}` })),
  ];
}

export function opzioniStrumenti(dati) {
  return dati.s9.attrezzature.map((a, i) => ({ valore: a.id, testo: `${i + 1} – ${etichettaAttrezzatura(a, i)}` }));
}

const nonApplicabile = () => h('p', { classe: 'nota-na' }, 'Sezione non applicabile: nel PDF comparirà «Non applicabile».');
const gruppo = (titolo, ...figli) => h('div', { classe: 'gruppo' }, titolo ? h('h3', {}, titolo) : null, ...figli);
const affiancati = (...figli) => h('div', { classe: 'affiancati' }, ...figli);

function datiConfigurazione(config) {
  const chiavi = ['codiceImpianto', 'nomeImpianto', 'tipologiaImpianto', 'potenzaKwp', 'ubicazione', 'coordinate', 'committente', 'sedeCommittente', 'pivaCommittente', 'reaCommittente'];
  return h(
    'dl',
    { classe: 'dati-config' },
    chiavi
      .filter((k) => !(k === 'potenzaKwp' && String(config[k] || '').trim() === ''))
      .map((k) => h('div', {}, h('dt', {}, ETICHETTE_CONFIG[k]), h('dd', {}, testoConfigEvidenziato(config, k)))),
  );
}

// --- 1. Identificazione
function sezione1({ C, dati, config }) {
  const f = dati.s1.fornitore;
  return [
    gruppo(
      'Codice e revisione',
      C.solaLettura('Codice rapporto', '', { id: 's1-codice', classe: 'codice' }),
      C.testo('progressivo', 'Progressivo (NN)', {
        obbligatorio: true,
        inputmode: 'numeric',
        maxlength: 2,
        trasforma: 'progressivo',
        aiuto: 'Due cifre, da 01 a 99: distingue i rapporti creati nello stesso giorno.',
      }),
      C.solaLettura('Revisione', '', { id: 's1-revisione' }),
    ),
    C.elenco('s1.ticket', {
      titolo: 'Ticket collegati',
      aiuto: 'Facoltativi.',
      tipo: 'ticket',
      nomeRiga: 'Ticket',
      testoAggiungi: 'Aggiungi ticket',
      riga: (t) => C.testo(`s1.ticket.${t.id}.testo`, 'Riferimento del ticket', { obbligatorio: true }),
    }),
    gruppo('Impianto e committente', h('p', { classe: 'aiuto' }, 'Dati fissi della configurazione: non si modificano da qui.'), datiConfigurazione(config)),
    gruppo(
      'Fornitore',
      C.testo('s1.fornitore.ragioneSociale', 'Ragione sociale', { obbligatorio: true, autocomplete: 'organization' }),
      C.casella('s1.fornitore.estero', 'Fornitore estero (senza partita IVA italiana)'),
      f.estero
        ? C.testo('s1.fornitore.piva', 'Identificativo fiscale', { obbligatorio: true, aiuto: 'Partita IVA estera o altro identificativo.' })
        : C.testo('s1.fornitore.piva', 'P.IVA', {
            obbligatorio: true,
            inputmode: 'numeric',
            aiuto: '11 cifre: il carattere di controllo viene verificato.',
            dopo: h('p', { classe: 'esito-piva', id: 'esito-piva', 'aria-live': 'polite' }),
          }),
      C.testo('s1.fornitore.sede', 'Sede', { obbligatorio: true, autocomplete: 'street-address' }),
      C.testo('s1.fornitore.sigla', 'Sigla', {
        obbligatorio: true,
        maxlength: 2,
        trasforma: 'sigla',
        autocapitalize: 'characters',
        aiuto: '2 lettere maiuscole, usate nel codice del rapporto (es. AB).',
      }),
    ),
    gruppo(
      'Compilatore',
      C.testo('s1.compilatore.nome', 'Nome e cognome', { obbligatorio: true, autocomplete: 'name' }),
      C.testo('s1.compilatore.ruolo', 'Ruolo', { obbligatorio: true }),
      C.testo('s1.compilatore.email', 'E-mail', { obbligatorio: true, tipo: 'email', inputmode: 'email', autocomplete: 'email' }),
      C.testo('s1.compilatore.telefono', 'Telefono', { tipo: 'tel', inputmode: 'tel', autocomplete: 'tel' }),
    ),
  ];
}

// --- 2. Inquadramento
function sezione2({ C, dati }) {
  return [
    C.testo('s2.oggetto', "Oggetto dell'intervento", {
      obbligatorio: true,
      maxlength: 120,
      contatore: true,
      aiuto: 'Testo breve: compare anche nel nome del file PDF.',
    }),
    C.multipla('s2.tipologie', 'Tipologie', OPZIONI.tipologie, { obbligatorio: true, aiuto: 'Seleziona almeno una voce.' }),
    C.altro('s2.tipologie', 's2.tipologiaAltro'),
    C.scelta('s2.regime', 'Regime', OPZIONI.regime, { obbligatorio: true }),
    C.testo('s2.riferimentoOfferta', 'Riferimento offerta o ordine', {
      obbligatorio: dati.s2.regime === 'Extra-canone',
      aiuto: 'Obbligatorio con il regime Extra-canone.',
    }),
    C.scelta('s2.garanzia', 'Intervento coperto da garanzia, quindi non addebitabile', OPZIONI.garanzia, { obbligatorio: true }),
  ];
}

// --- 3. Evento e tempi
function sezione3({ C, dati }) {
  const s3 = dati.s3;
  const parti = [
    C.scelta('s3.origine', "Origine dell'attività", OPZIONI.origine, {
      obbligatorio: true,
      aiuto: "Con «Attività programmata» i campi dell'evento non sono richiesti.",
    }),
  ];
  if (s3.origine === EVENTO) {
    parti.push(
      gruppo(
        'Evento',
        C.dataOra('s3.eventoDataOra', "Data e ora dell'evento", { obbligatorio: !s3.eventoNonNota, disabilitato: s3.eventoNonNota }),
        C.casella('s3.eventoNonNota', 'Data e ora non note'),
        s3.eventoNonNota
          ? null
          : [
              C.scelta('s3.fonteOrario', "Fonte dell'orario dell'evento", OPZIONI.fonteOrario, {
                obbligatorio: true,
                aiuto: "Richiesta quando la data e l'ora sono inserite.",
              }),
              C.altro('s3.fonteOrario', 's3.fonteOrarioAltro'),
            ],
        C.scelta('s3.rilevazione', 'Modalità di rilevazione', OPZIONI.rilevazione, { obbligatorio: true, verticale: true }),
        C.altro('s3.rilevazione', 's3.rilevazioneAltro'),
      ),
    );
  }
  parti.push(
    gruppo(
      'Tempi',
      C.dataOra('s3.arrivo', 'Arrivo in sito', { obbligatorio: true }),
      C.dataOra('s3.riarmo', 'Riarmo o ripristino', {
        obbligatorio: dati.s4.applicabile === SI,
        aiuto: 'Obbligatorio se la sezione 4 (riarmo) è applicabile.',
      }),
      C.dataOra('s3.fine', 'Fine attività', { obbligatorio: true }),
      h('p', { classe: 'aiuto' }, 'Ordine richiesto: evento ≤ arrivo in sito ≤ riarmo ≤ fine attività.'),
    ),
    gruppo(
      "Stato dell'impianto",
      C.scelta('s3.statoPrima', "Prima dell'intervento", OPZIONI.statoImpianto, { obbligatorio: true }),
      s3.statoPrima === 'Limitato' ? C.numero('s3.potenzaPrima', 'Potenza disponibile prima (0–100)', { obbligatorio: true, unita: '%' }) : null,
      C.scelta('s3.statoDopo', "Dopo l'intervento", OPZIONI.statoImpianto, { obbligatorio: true }),
      s3.statoDopo === 'Limitato' ? C.numero('s3.potenzaDopo', 'Potenza disponibile dopo (0–100)', { obbligatorio: true, unita: '%' }) : null,
    ),
  );
  return parti;
}

// --- 4. Riarmo (se applicabile)
function sezione4({ C, dati }) {
  const s4 = dati.s4;
  const parti = [C.scelta('s4.applicabile', "L'intervento comprende il riarmo di protezioni?", OPZIONI.siNo, { obbligatorio: true })];
  if (s4.applicabile === NO) parti.push(nonApplicabile());
  if (s4.applicabile !== SI) return parti;
  const mostraFoto = !s4.fotoNonDisponibile || s4.foto.length > 0;
  parti.push(
    C.multipla('s4.protezioni', 'Protezioni intervenute', OPZIONI.protezioni, { obbligatorio: true }),
    C.altro('s4.protezioni', 's4.protezioniAltro'),
    C.area('s4.segnalazioni', 'Segnalazioni lette su relè o apparecchiature', {
      obbligatorio: true,
      aiuto: 'Funzioni intervenute, valori e allarmi.',
    }),
    gruppo(
      null,
      mostraFoto
        ? C.foto('s4.foto', { etichetta: 'Foto delle segnalazioni', obbligatorio: !s4.fotoNonDisponibile, aiuto: 'Almeno una foto, oppure seleziona «Foto non disponibile».' })
        : null,
      s4.foto.length === 0 || s4.fotoNonDisponibile ? C.casella('s4.fotoNonDisponibile', 'Foto non disponibile') : null,
      s4.fotoNonDisponibile ? C.testo('s4.fotoMotivo', 'Motivo', { obbligatorio: true }) : null,
    ),
    C.scelta('s4.causa', 'Causa dello scatto', OPZIONI.causaScatto, { obbligatorio: true, verticale: true }),
    C.altro('s4.causa', 's4.causaAltro'),
    C.area('s4.verifiche', 'Verifiche eseguite prima del riarmo', { obbligatorio: true }),
    gruppo(
      'Riarmo autorizzato da',
      C.testo('s4.autorizzatoNome', 'Nome e cognome', { obbligatorio: true }),
      C.testo('s4.autorizzatoRuolo', 'Ruolo e organizzazione', { obbligatorio: true }),
      C.scelta('s4.autorizzatoModalita', 'Modalità', OPZIONI.modalitaAutorizzazione, { obbligatorio: true }),
      C.altro('s4.autorizzatoModalita', 's4.autorizzatoModalitaAltro'),
    ),
  );
  return parti;
}

// --- 5. Squadra e mezzi, per giornata
function sezione5({ C }) {
  return [
    C.elenco('s5.giornate', {
      titolo: 'Giornate',
      obbligatorio: true,
      aiuto: "Almeno una giornata. Le date devono essere diverse e comprese tra l'arrivo in sito e la fine attività.",
      tipo: 'giornata',
      nomeRiga: 'Giornata',
      testoAggiungi: 'Aggiungi giornata',
      azioniRiga: (g) =>
        h('button', { type: 'button', classe: 'secondario piccolo', dataset: { azione: 'duplica-giornata', id: g.id } }, 'Duplica'),
      riga: (g) => {
        const base = `s5.giornate.${g.id}`;
        return [
          C.data(`${base}.data`, 'Data', { obbligatorio: true }),
          C.elenco(`${base}.persone`, {
            titolo: 'Persone',
            obbligatorio: true,
            classe: 'annidato',
            tipo: 'persona',
            nomeRiga: 'Persona',
            testoAggiungi: 'Aggiungi persona',
            riga: (p) => {
              const b = `${base}.persone.${p.id}`;
              return [
                C.testo(`${b}.nome`, 'Nome e cognome', { obbligatorio: true }),
                C.testo(`${b}.organizzazione`, 'Organizzazione', { obbligatorio: true }),
                C.tendina(`${b}.ruolo`, 'Ruolo', OPZIONI.ruoloPersona, { obbligatorio: true }),
                C.altro(`${b}.ruolo`, `${b}.ruoloAltro`),
                C.tendina(`${b}.qualifica`, 'Qualifica', OPZIONI.qualifica, { obbligatorio: true }),
                affiancati(
                  C.numero(`${b}.oreLavoro`, 'Ore di lavoro', { obbligatorio: true, unita: 'h' }),
                  C.numero(`${b}.oreViaggio`, 'Ore di viaggio', { unita: 'h' }),
                ),
              ];
            },
          }),
          C.elenco(`${base}.mezzi`, {
            titolo: 'Mezzi',
            classe: 'annidato',
            tipo: 'mezzo',
            nomeRiga: 'Mezzo',
            testoAggiungi: 'Aggiungi mezzo',
            casella: { percorso: `${base}.nessunMezzo`, testo: 'Nessun mezzo' },
            riga: (m) => {
              const b = `${base}.mezzi.${m.id}`;
              return [
                C.tendina(`${b}.tipo`, 'Tipo', OPZIONI.tipoMezzo, { obbligatorio: true }),
                C.altro(`${b}.tipo`, `${b}.tipoAltro`),
                C.tendina(`${b}.alimentazione`, 'Alimentazione', OPZIONI.alimentazione, { obbligatorio: true }),
                C.altro(`${b}.alimentazione`, `${b}.alimentazioneAltro`),
                C.numero(`${b}.km`, 'Km di andata e ritorno', { obbligatorio: true, unita: 'km' }),
              ];
            },
          }),
        ];
      },
    }),
    h('div', { classe: 'gruppo totali', dataset: { calcolato: 'totali-squadra' } }),
  ];
}

// --- 6. Sicurezza
function sezione6({ C, dati }) {
  const s6 = dati.s6;
  return [
    gruppo(
      'Responsabile impianto',
      C.testo('s6.responsabileNome', 'Nome e cognome', { obbligatorio: true }),
      C.testo('s6.responsabileOrganizzazione', 'Organizzazione', { obbligatorio: true }),
    ),
    C.testo('s6.preposto', 'Preposto ai lavori – nome e cognome', {
      obbligatorio: true,
      lista: 'lista-preposti',
      dopo: h('div', { classe: 'suggerimenti', dataset: { suggerimenti: 'preposti' } }),
    }),
    C.scelta('s6.manovre', 'Manovre su apparecchiature elettriche', OPZIONI.siNo, { obbligatorio: true }),
    s6.manovre === SI ? C.area('s6.manovreDescrizione', 'Descrizione delle manovre', { obbligatorio: true }) : null,
    C.multipla('s6.dpi', 'DPI utilizzati', OPZIONI.dpi, { obbligatorio: true }),
    C.altro('s6.dpi', 's6.dpiAltro'),
    C.scelta('s6.anomalie', 'Anomalie di sicurezza riscontrate', OPZIONI.siNo, { obbligatorio: true }),
    s6.anomalie === SI
      ? [
          C.area('s6.anomalieDescrizione', 'Descrizione delle anomalie di sicurezza', { obbligatorio: true }),
          C.foto('s6.anomalieFoto', { etichetta: 'Foto delle anomalie di sicurezza', obbligatorio: true }),
        ]
      : null,
    C.scelta('s6.incidenti', 'Incidenti o quasi incidenti', OPZIONI.siNo, { obbligatorio: true }),
    s6.incidenti === SI ? C.area('s6.incidentiDescrizione', 'Descrizione degli incidenti o quasi incidenti', { obbligatorio: true }) : null,
  ];
}

// --- 7. Constatazione iniziale e sopralluogo
function sezione7({ C }) {
  return [
    C.area('s7.situazione', 'Situazione riscontrata', { obbligatorio: true, minimo: 20, righe: 5 }),
    C.elenco('s7.componenti', {
      titolo: "Componenti e apparecchiature oggetto dell'intervento",
      obbligatorio: true,
      aiuto: 'Almeno uno. Per costruttore, modello e seriale puoi scegliere «Non applicabile» o «Non rilevato».',
      tipo: 'componente',
      nomeRiga: 'Componente',
      testoAggiungi: 'Aggiungi componente',
      riga: (c) => {
        const b = `s7.componenti.${c.id}`;
        return [
          C.testo(`${b}.area`, 'Area', { obbligatorio: true, lista: 'lista-aree', aiuto: 'Scegli un suggerimento o scrivi.' }),
          C.testo(`${b}.componente`, 'Componente', { obbligatorio: true }),
          C.conAlternativa(`${b}.costruttore`, 'Costruttore'),
          C.conAlternativa(`${b}.modello`, 'Modello'),
          C.conAlternativa(`${b}.seriale`, 'Seriale'),
        ];
      },
    }),
    C.elenco('s7.anomalie', {
      titolo: 'Anomalie riscontrate',
      aiuto: 'Aggiungi le anomalie oppure seleziona «Nessuna anomalia».',
      tipo: 'anomalia',
      nomeRiga: 'Anomalia',
      testoAggiungi: 'Aggiungi anomalia',
      casella: { percorso: 's7.nessunaAnomalia', testo: 'Nessuna anomalia' },
      riga: (a) => {
        const b = `s7.anomalie.${a.id}`;
        return [
          C.testo(`${b}.area`, 'Area', { obbligatorio: true, lista: 'lista-aree' }),
          C.area(`${b}.descrizione`, 'Descrizione', { obbligatorio: true }),
          C.foto(`${b}.foto`),
        ];
      },
    }),
  ];
}

// --- 8. Registro operazioni
function sezione8({ C, dati }) {
  const componenti = opzioniComponenti(dati);
  return [
    h('p', { classe: 'aiuto' }, 'Le operazioni si ordinano da sole per data e ora e si numerano automaticamente.'),
    C.elenco('s8.operazioni', {
      righe: operazioniOrdinate(dati),
      titolo: 'Operazioni',
      obbligatorio: true,
      tipo: 'operazione',
      nomeRiga: 'Operazione',
      testoAggiungi: 'Aggiungi operazione',
      riga: (op) => {
        const b = `s8.operazioni.${op.id}`;
        return [
          C.data(`${b}.data`, 'Data', { obbligatorio: true, riordina: true }),
          affiancati(
            C.ora(`${b}.oraInizio`, 'Ora di inizio', { obbligatorio: true, riordina: true }),
            C.ora(`${b}.oraFine`, 'Ora di fine', { obbligatorio: true, riordina: true }),
          ),
          C.tendina(`${b}.tipo`, 'Tipo', OPZIONI.tipoOperazione, { obbligatorio: true }),
          C.altro(`${b}.tipo`, `${b}.tipoAltro`),
          C.tendina(`${b}.componente`, 'Componente', componenti, { obbligatorio: true, dinamiche: 'componenti' }),
          C.area(`${b}.descrizione`, 'Descrizione', { obbligatorio: true, righe: 3 }),
          C.scelta(`${b}.esito`, "Esito dell'operazione", OPZIONI.esitoOperazione, { obbligatorio: true }),
          C.scelta(`${b}.stato`, 'Stato riscontrato', OPZIONI.statoRiscontrato, { obbligatorio: true }),
          C.scelta(`${b}.modalita`, 'Modalità', OPZIONI.modalitaOperazione, {
            obbligatorio: true,
            aiuto: 'Con «In campo» la data deve corrispondere a una giornata della sezione 5.',
          }),
          C.foto(`${b}.foto`),
        ];
      },
    }),
  ];
}

// --- 9. Misure e attrezzature (se applicabile)
function sezione9({ C, dati }) {
  const s9 = dati.s9;
  const parti = [C.scelta('s9.applicabile', 'Sono state usate attrezzature di misura o eseguite misure?', OPZIONI.siNo, { obbligatorio: true })];
  if (s9.applicabile === NO) parti.push(nonApplicabile());
  if (s9.applicabile !== SI) return parti;
  const strumenti = opzioniStrumenti(dati);
  parti.push(
    C.elenco('s9.attrezzature', {
      titolo: 'Attrezzature',
      obbligatorio: true,
      tipo: 'attrezzatura',
      nomeRiga: 'Attrezzatura',
      testoAggiungi: 'Aggiungi attrezzatura',
      riga: (a) => {
        const b = `s9.attrezzature.${a.id}`;
        return [
          C.testo(`${b}.tipo`, 'Tipo o descrizione', { obbligatorio: true }),
          C.testo(`${b}.produttore`, 'Produttore', { obbligatorio: true }),
          C.testo(`${b}.modello`, 'Modello', { obbligatorio: true }),
          C.testo(`${b}.seriale`, 'Seriale', { obbligatorio: true }),
          C.testo(`${b}.certificato`, 'Numero del certificato di taratura', { obbligatorio: !a.certificatoNonDisponibile, disabilitato: a.certificatoNonDisponibile }),
          C.casella(`${b}.certificatoNonDisponibile`, 'Certificato non disponibile'),
          C.data(`${b}.scadenza`, 'Scadenza della taratura', { obbligatorio: !a.scadenzaNonDisponibile, disabilitato: a.scadenzaNonDisponibile }),
          C.casella(`${b}.scadenzaNonDisponibile`, 'Scadenza non disponibile'),
        ];
      },
    }),
    C.elenco('s9.misure', {
      titolo: 'Misure',
      aiuto: 'Aggiungi le misure oppure seleziona «Nessuna misura».',
      tipo: 'misura',
      nomeRiga: 'Misura',
      testoAggiungi: 'Aggiungi misura',
      casella: { percorso: 's9.nessunaMisura', testo: 'Nessuna misura' },
      riga: (m) => {
        const b = `s9.misure.${m.id}`;
        return [
          C.data(`${b}.data`, 'Data', { obbligatorio: true }),
          C.testo(`${b}.grandezza`, 'Grandezza', { obbligatorio: true, lista: 'lista-grandezze', aiuto: 'Scegli un suggerimento o scrivi.' }),
          C.testo(`${b}.punto`, 'Punto di misura', { obbligatorio: true }),
          affiancati(
            C.numero(`${b}.valore`, 'Valore', { obbligatorio: true, segno: true }),
            C.tendina(`${b}.unita`, 'Unità', OPZIONI.unitaMisura, { obbligatorio: true }),
          ),
          C.altro(`${b}.unita`, `${b}.unitaAltro`, 'Unità'),
          C.testo(`${b}.riferimento`, 'Riferimento o soglia'),
          C.scelta(`${b}.esito`, 'Esito', OPZIONI.esitoMisura, { obbligatorio: true }),
          C.tendina(`${b}.strumento`, 'Strumento', strumenti, { obbligatorio: true, dinamiche: 'strumenti' }),
          avvisoDi(`${b}.strumento`),
        ];
      },
    }),
  );
  return parti;
}

// --- 10. Componenti utilizzati o sostituiti (se applicabile)
function sezione10({ C, dati }) {
  const s10 = dati.s10;
  const parti = [C.scelta('s10.applicabile', 'Sono stati utilizzati o sostituiti componenti?', OPZIONI.siNo, { obbligatorio: true })];
  if (s10.applicabile === NO) parti.push(nonApplicabile());
  if (s10.applicabile !== SI) return parti;
  const riferimenti = opzioniComponenti(dati).slice(1);
  parti.push(
    C.elenco('s10.righe', {
      titolo: 'Componenti',
      obbligatorio: true,
      tipo: 'componenteUsato',
      nomeRiga: 'Componente',
      testoAggiungi: 'Aggiungi componente',
      riga: (r) => {
        const b = `s10.righe.${r.id}`;
        return [
          C.testo(`${b}.area`, 'Area', { obbligatorio: true, lista: 'lista-aree' }),
          C.testo(`${b}.componente`, 'Componente', { obbligatorio: true }),
          C.testo(`${b}.costruttore`, 'Costruttore', { obbligatorio: true }),
          C.testo(`${b}.modello`, 'Modello', { obbligatorio: true }),
          affiancati(
            C.numero(`${b}.quantita`, 'Quantità', { obbligatorio: true }),
            C.tendina(`${b}.unita`, 'Unità di misura', OPZIONI.unitaQuantita, { obbligatorio: true }),
          ),
          C.altro(`${b}.unita`, `${b}.unitaAltro`, 'Unità di misura'),
          C.conAlternativa(`${b}.serialeVecchio`, 'Seriale vecchio'),
          C.conAlternativa(`${b}.serialeNuovo`, 'Seriale nuovo'),
          C.testo(`${b}.fornitore`, 'Fornitore del componente', { obbligatorio: true }),
          C.tendina(`${b}.garanzia`, 'Garanzia del costruttore', OPZIONI.garanziaCostruttore, { obbligatorio: true }),
          C.tendina(`${b}.componenteRif`, 'Componente della sezione 7 a cui si riferisce', riferimenti, {
            vuota: '— Nessuno —',
            dinamiche: 'componenti-rif',
          }),
        ];
      },
    }),
  );
  return parti;
}

// --- 11. Esito
function sezione11({ C, dati }) {
  const s11 = dati.s11;
  const programmata = dati.s3.origine === PROGRAMMATA;
  const naScelta = programmata && s11.ipotesiNonApplicabile;
  return [
    C.area('s11.constatazione', 'Constatazione finale', { obbligatorio: true, minimo: 20, righe: 5 }),
    naScelta ? null : C.area('s11.ipotesi', "Ipotesi sull'origine del guasto", { obbligatorio: true }),
    programmata ? C.casella('s11.ipotesiNonApplicabile', 'Non applicabile (attività programmata)') : null,
    C.elenco('s11.operazioni', {
      titolo: 'Operazioni da eseguire',
      aiuto: 'Aggiungi le operazioni oppure seleziona «Nessuna operazione da eseguire».',
      tipo: 'operazioneDaEseguire',
      nomeRiga: 'Operazione da eseguire',
      testoAggiungi: 'Aggiungi operazione da eseguire',
      casella: { percorso: 's11.nessunaOperazione', testo: 'Nessuna operazione da eseguire' },
      riga: (o) => {
        const b = `s11.operazioni.${o.id}`;
        return [
          C.area(`${b}.descrizione`, 'Descrizione', { obbligatorio: true, righe: 3 }),
          C.scelta(`${b}.priorita`, 'Priorità', OPZIONI.priorita, { obbligatorio: true }),
          C.testo(`${b}.carico`, 'A carico di', { obbligatorio: true }),
          C.data(`${b}.entro`, 'Entro'),
        ];
      },
    }),
  ];
}

// --- 12. ESG (dati minimi)
function sezione12({ C, dati }) {
  const s12 = dati.s12;
  return [
    C.solaLettura('Km complessivi (calcolati dalla sezione 5)', '', { dataset: { calcolato: 'km' } }),
    gruppo(
      'Carburante consumato',
      s12.carburanteNonNoto ? null : C.numero('s12.carburante', 'Litri', { obbligatorio: true, unita: 'l' }),
      C.casella('s12.carburanteNonNoto', 'Non noto'),
    ),
    C.elenco('s12.rifiuti', {
      titolo: 'Rifiuti prodotti',
      aiuto: 'Aggiungi i rifiuti oppure seleziona «Nessun rifiuto».',
      tipo: 'rifiuto',
      nomeRiga: 'Rifiuto',
      testoAggiungi: 'Aggiungi rifiuto',
      casella: { percorso: 's12.nessunRifiuto', testo: 'Nessun rifiuto' },
      riga: (r) => {
        const b = `s12.rifiuti.${r.id}`;
        return [
          C.testo(`${b}.descrizione`, 'Descrizione', { obbligatorio: true }),
          C.testo(`${b}.eer`, 'Codice EER', {
            trasforma: 'eer',
            segnaposto: 'NN NN NN',
            aiuto: 'Facoltativo: 6 cifre, con * finale se il rifiuto è pericoloso.',
          }),
          affiancati(
            C.numero(`${b}.quantita`, 'Quantità', { obbligatorio: true }),
            C.tendina(`${b}.unita`, 'Unità', OPZIONI.unitaRifiuto, { obbligatorio: true }),
          ),
          C.tendina(`${b}.destinazione`, 'Destinazione', OPZIONI.destinazioneRifiuto, { obbligatorio: true }),
          C.altro(`${b}.destinazione`, `${b}.destinazioneAltro`),
        ];
      },
    }),
    gruppo(
      'Acqua utilizzata',
      s12.acquaNonUtilizzata ? null : C.numero('s12.acqua', 'Litri', { obbligatorio: true, unita: 'l' }),
      C.casella('s12.acquaNonUtilizzata', 'Non utilizzata'),
    ),
    C.scelta('s12.gas', 'Perdite o rabbocchi di gas isolanti delle apparecchiature (es. SF6)', OPZIONI.gasIsolanti, { obbligatorio: true }),
    s12.gas === SI
      ? gruppo(
          null,
          C.testo('s12.gasApparecchiatura', 'Apparecchiatura', { obbligatorio: true }),
          s12.gasQuantitaNonNota ? null : C.numero('s12.gasQuantita', 'Quantità', { obbligatorio: true, unita: 'kg' }),
          C.casella('s12.gasQuantitaNonNota', 'Quantità non nota'),
        )
      : null,
  ];
}

// --- 13. Foto, allegati e firma
function sezione13({ C, dati, config }) {
  const voci = elencoFoto(dati);
  const totale = tutteLeFoto(dati).length;
  return [
    h(
      'div',
      { classe: 'istruzione' },
      h('strong', {}, 'Foto originali e allegati: '),
      'invia le foto originali ad alta risoluzione e gli allegati a ',
      testoConfigEvidenziato(config, 'destinatarioFoto'),
      ' con WeTransfer, e-mail o un altro canale. Nel PDF ogni foto riporta il nome del file originale, così si possono abbinare.',
    ),
    h(
      'div',
      { classe: 'gruppo', dataset: { campo: 'foto' } },
      h('h3', {}, 'Riepilogo delle foto'),
      h(
        'p',
        { classe: totale >= SOGLIA_AVVISO_FOTO ? 'avviso-campo' : 'aiuto' },
        `${voci.length} foto nel rapporto, massimo ${MAX_FOTO}.`,
        totale >= SOGLIA_AVVISO_FOTO ? ` Ne hai inserite ${totale}: restano ${Math.max(0, MAX_FOTO - totale)} foto.` : '',
      ),
      voci.length
        ? h('div', { classe: 'griglia-foto riepilogo' }, voci.map((v) => C.schedaFoto(v.foto, v.percorsoElenco, { riepilogo: true, riferimento: v.riferimento })))
        : h('p', { classe: 'aiuto' }, 'Nessuna foto: si aggiungono nelle sezioni 4, 6, 7 e 8.'),
      erroreDi('foto'),
    ),
    C.elenco('s13.allegati', {
      titolo: 'Allegati inviati a parte',
      aiuto: 'Facoltativi: indica i file che invii insieme alle foto originali.',
      tipo: 'allegato',
      nomeRiga: 'Allegato',
      testoAggiungi: 'Aggiungi allegato',
      riga: (a) => {
        const b = `s13.allegati.${a.id}`;
        return [
          C.tendina(`${b}.tipo`, 'Tipo', OPZIONI.tipoAllegato, { obbligatorio: true }),
          C.altro(`${b}.tipo`, `${b}.tipoAltro`),
          C.testo(`${b}.descrizione`, 'Descrizione', { obbligatorio: true }),
          C.testo(`${b}.nomeFile`, 'Nome del file'),
        ];
      },
    }),
    h(
      'div',
      { classe: 'gruppo firma' },
      h('h3', {}, 'Firma'),
      h('p', { classe: 'dichiarazione' }, DICHIARAZIONE),
      C.testo('s13.firma.nome', 'Nome e cognome del firmatario', { obbligatorio: true, autocomplete: 'name' }),
      C.testo('s13.firma.ruolo', 'Ruolo', { obbligatorio: true }),
      h(
        'div',
        { classe: 'campo', dataset: { campo: 's13.firma.immagine' } },
        h('span', { classe: 'etichetta' }, 'Firma grafica', h('span', { classe: 'obbl' }, ' *')),
        h('p', { classe: 'aiuto' }, 'Firma con il dito, la penna o il mouse. Compila prima nome e ruolo: se dopo la firma cambia un dato, bisogna firmare di nuovo.'),
        h('div', { classe: 'contenitore-firma' }, h('canvas', { id: 'area-firma', classe: 'area-firma', tabindex: '0', 'aria-label': 'Area per la firma' })),
        h(
          'div',
          { classe: 'azioni-firma' },
          h('button', { type: 'button', classe: 'secondario', dataset: { azione: 'cancella-firma' } }, 'Cancella'),
          h('span', { id: 'stato-firma', classe: 'stato-firma', 'aria-live': 'polite' }),
        ),
        h('p', { classe: 'avviso-rosso piccolo', dataset: { avvisoFirma: 'decaduta' }, hidden: true }, 'I dati sono cambiati dopo la firma: firma di nuovo'),
        h('p', { classe: 'consiglio', dataset: { avvisoFirma: 'consiglio' }, hidden: true }, CONSIGLIO_ESPORTA),
        erroreDi('s13.firma.immagine'),
      ),
    ),
  ];
}

const SEZIONI = { 1: sezione1, 2: sezione2, 3: sezione3, 4: sezione4, 5: sezione5, 6: sezione6, 7: sezione7, 8: sezione8, 9: sezione9, 10: sezione10, 11: sezione11, 12: sezione12, 13: sezione13 };

// contesto: { dati, config, miniature, numeriFoto }
export function contenutoSezione(numero, contesto) {
  const C = creaCampi(contesto.dati, contesto);
  return SEZIONI[numero]({ ...contesto, C });
}
