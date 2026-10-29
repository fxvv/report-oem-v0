// Struttura dei dati del rapporto, elenchi di valori ammessi e calcoli derivati.
// Modulo puro: non usa il browser, si testa con Node.
//
// I percorsi dei campi ("s5.giornate.<id>.persone.<id>.nome") indicano le righe
// degli elenchi con il loro id: restano validi anche se l'ordine cambia.

import { dataIsoLocale, parseDecimale } from './formati.js';

export const MAX_FOTO = 60;
export const SOGLIA_AVVISO_FOTO = 40;

export const NON_APPLICABILE = 'Non applicabile';
export const NON_RILEVATO = 'Non rilevato';
export const ALTERNATIVE = Object.freeze([NON_APPLICABILE, NON_RILEVATO]);
export const ALTRO = 'Altro';
export const SI = 'Sì';
export const NO = 'No';
export const EVENTO = 'Evento o guasto';
export const PROGRAMMATA = 'Attività programmata';
export const PREPOSTO = 'Preposto ai lavori';
export const IN_CAMPO = 'In campo';
export const COMPONENTE_GENERALE = 'generale';

// Valori ammessi, esattamente come indicati nella specifica.
export const OPZIONI = Object.freeze({
  tipologie: ['Ordinario (programmato)', 'Correttivo', 'Ispezione / sopralluogo', 'Messa in servizio', ALTRO],
  regime: ['Canone', 'Extra-canone', 'Da concordare'],
  garanzia: [SI, NO, 'Da definire'],
  origine: [EVENTO, PROGRAMMATA],
  fonteOrario: ['SCADA/monitoraggio', 'Relè di protezione', 'Segnalazione', ALTRO],
  rilevazione: [
    'Allarme SCADA/monitoraggio',
    "Segnalazione del titolare o dell'asset manager",
    'Segnalazione del distributore',
    'Rilevato in sito',
    ALTRO,
  ],
  statoImpianto: ['In servizio', 'Limitato', 'Fermo'],
  siNo: [SI, NO],
  protezioni: [
    'DG/PG – Dispositivo o protezione generale',
    'SPI/DDI – Protezione o dispositivo di interfaccia',
    'Interruttore MT di linea',
    'Inverter',
    'Protezioni BT',
    ALTRO,
  ],
  causaScatto: ["Guasto interno all'impianto", 'Disturbo o guasto sulla rete del distributore', 'Non individuata', ALTRO],
  modalitaAutorizzazione: ['In sito', 'Telefono', 'E-mail', ALTRO],
  ruoloPersona: [PREPOSTO, 'Tecnico', 'Responsabile impianto', ALTRO],
  qualifica: ['PES', 'PAV', 'PES + PEI', 'PAV + PEI', 'Nessuna'],
  tipoMezzo: ['Auto', 'Furgone', "Mezzo d'opera", ALTRO],
  alimentazione: ['Gasolio', 'Benzina', 'GPL o metano', 'Ibrido', 'Elettrico', ALTRO],
  dpi: [
    'Elmetto',
    'Guanti isolanti',
    'Visiera o occhiali',
    'Calzature di sicurezza',
    'Indumenti ignifughi o per arco elettrico',
    'Pedana o tappeto isolante',
    ALTRO,
  ],
  aree: [
    'Cabina di consegna',
    'Cabina utente',
    'Cabina di trasformazione',
    'Cabina inverter',
    'Campo',
    'Quadri BT',
    'Linee MT',
    'Sistema di monitoraggio/SCADA',
    'Recinzione e viabilità',
  ],
  tipoOperazione: [
    'Verifica o ispezione',
    'Misura o prova',
    'Manovra',
    'Messa in sicurezza',
    'Riarmo',
    'Riparazione o ripristino',
    'Sostituzione',
    'Pulizia',
    'Configurazione o impostazione',
    ALTRO,
  ],
  esitoOperazione: ['Eseguita', 'Parziale', 'Non eseguita'],
  statoRiscontrato: ['Conforme', 'Anomalia', NON_APPLICABILE],
  modalitaOperazione: [IN_CAMPO, 'Da remoto'],
  grandezze: ['Resistenza di isolamento', 'Resistenza di terra', 'Tensione', 'Corrente', 'Temperatura'],
  unitaMisura: ['MΩ', 'Ω', 'V', 'kV', 'A', '°C', '%', ALTRO],
  esitoMisura: ['Conforme', 'Non conforme', 'Solo rilievo'],
  unitaQuantita: ['n', 'm', 'kg', 'l', 'set', ALTRO],
  garanziaCostruttore: [SI, NO, NON_APPLICABILE, 'Non nota'],
  priorita: ['Alta', 'Media', 'Bassa'],
  unitaRifiuto: ['kg', 'l', 'n', 'm'],
  destinazioneRifiuto: ['Ritirati dal fornitore', 'Lasciati in sito in area dedicata', ALTRO],
  gasIsolanti: [SI, NO, 'Non verificato'],
  tipoAllegato: ['Certificato di taratura', 'Scheda tecnica', 'Manuale', 'Report del fornitore', ALTRO],
});

export const TITOLI_SEZIONI = Object.freeze({
  1: 'Identificazione',
  2: 'Inquadramento',
  3: 'Evento e tempi',
  4: 'Riarmo',
  5: 'Squadra e mezzi, per giornata',
  6: 'Sicurezza',
  7: 'Constatazione iniziale e sopralluogo',
  8: 'Registro operazioni',
  9: 'Misure e attrezzature',
  10: 'Componenti utilizzati o sostituiti',
  11: 'Esito',
  12: 'ESG (dati minimi)',
  13: 'Foto, allegati e firma',
});

// Sezioni con la scelta esplicita "se applicabile" (campo "applicabile": Sì/No).
export const SEZIONI_FACOLTATIVE = Object.freeze([4, 9, 10]);

// --- Identificativi

let contatoreId = 0;

export function generaId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID().replace(/-/g, '').slice(0, 16);
  contatoreId += 1;
  return (Date.now().toString(36) + contatoreId.toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 20);
}

// --- Normalizzazione: da qualunque oggetto (bozza importata o salvata) alla
// struttura completa, con i tipi giusti. I campi sconosciuti si scartano.

const testo = (v) => (typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
const booleano = (v) => v === true;
const numero = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const oggetto = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const elenco = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object' && !Array.isArray(x)) : []);
const elencoTesti = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const conAlternativa = (v) => {
  const o = oggetto(v);
  return { valore: testo(o.valore), alternativa: ALTERNATIVE.includes(o.alternativa) ? o.alternativa : '' };
};

// Costruttori delle righe: con un oggetto vuoto creano una riga nuova, con una
// riga esistente la normalizzano. Gli id restano quelli esistenti se validi e
// non duplicati; altrimenti se ne genera uno nuovo.
export function costruttoriRighe(genera = generaId, idGiaUsati = new Set()) {
  const id = (candidato) => {
    let nuovo = typeof candidato === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(candidato) ? candidato : genera();
    while (idGiaUsati.has(nuovo) || nuovo === COMPONENTE_GENERALE) nuovo = genera();
    idGiaUsati.add(nuovo);
    return nuovo;
  };
  const R = { id };
  R.foto = (r) => ({
    id: id(r.id),
    didascalia: testo(r.didascalia),
    nomeOriginale: testo(r.nomeOriginale),
    larghezzaOriginale: numero(r.larghezzaOriginale),
    altezzaOriginale: numero(r.altezzaOriginale),
    pesoOriginaleMB: numero(r.pesoOriginaleMB),
    larghezza: numero(r.larghezza),
    altezza: numero(r.altezza),
    impronta: testo(r.impronta),
  });
  R.elencoFoto = (v) => elenco(v).map(R.foto);
  R.ticket = (r) => ({ id: id(r.id), testo: testo(r.testo) });
  R.persona = (r) => ({
    id: id(r.id),
    nome: testo(r.nome),
    organizzazione: testo(r.organizzazione),
    ruolo: testo(r.ruolo),
    ruoloAltro: testo(r.ruoloAltro),
    qualifica: testo(r.qualifica),
    oreLavoro: testo(r.oreLavoro),
    oreViaggio: testo(r.oreViaggio),
  });
  R.mezzo = (r) => ({
    id: id(r.id),
    tipo: testo(r.tipo),
    tipoAltro: testo(r.tipoAltro),
    alimentazione: testo(r.alimentazione),
    alimentazioneAltro: testo(r.alimentazioneAltro),
    km: testo(r.km),
  });
  R.giornata = (r) => ({
    id: id(r.id),
    data: testo(r.data),
    persone: elenco(r.persone).map(R.persona),
    nessunMezzo: booleano(r.nessunMezzo),
    mezzi: elenco(r.mezzi).map(R.mezzo),
  });
  R.componente = (r) => ({
    id: id(r.id),
    area: testo(r.area),
    componente: testo(r.componente),
    costruttore: conAlternativa(r.costruttore),
    modello: conAlternativa(r.modello),
    seriale: conAlternativa(r.seriale),
  });
  R.anomalia = (r) => ({
    id: id(r.id),
    area: testo(r.area),
    descrizione: testo(r.descrizione),
    foto: R.elencoFoto(r.foto),
  });
  R.operazione = (r) => ({
    id: id(r.id),
    data: testo(r.data),
    oraInizio: testo(r.oraInizio),
    oraFine: testo(r.oraFine),
    tipo: testo(r.tipo),
    tipoAltro: testo(r.tipoAltro),
    componente: testo(r.componente),
    descrizione: testo(r.descrizione),
    esito: testo(r.esito),
    stato: testo(r.stato),
    modalita: testo(r.modalita),
    foto: R.elencoFoto(r.foto),
  });
  R.attrezzatura = (r) => ({
    id: id(r.id),
    tipo: testo(r.tipo),
    produttore: testo(r.produttore),
    modello: testo(r.modello),
    seriale: testo(r.seriale),
    certificato: testo(r.certificato),
    certificatoNonDisponibile: booleano(r.certificatoNonDisponibile),
    scadenza: testo(r.scadenza),
    scadenzaNonDisponibile: booleano(r.scadenzaNonDisponibile),
  });
  R.misura = (r) => ({
    id: id(r.id),
    data: testo(r.data),
    grandezza: testo(r.grandezza),
    punto: testo(r.punto),
    valore: testo(r.valore),
    unita: testo(r.unita),
    unitaAltro: testo(r.unitaAltro),
    riferimento: testo(r.riferimento),
    esito: testo(r.esito),
    strumento: testo(r.strumento),
  });
  R.componenteUsato = (r) => ({
    id: id(r.id),
    area: testo(r.area),
    componente: testo(r.componente),
    costruttore: testo(r.costruttore),
    modello: testo(r.modello),
    quantita: testo(r.quantita),
    unita: testo(r.unita),
    unitaAltro: testo(r.unitaAltro),
    serialeVecchio: conAlternativa(r.serialeVecchio),
    serialeNuovo: conAlternativa(r.serialeNuovo),
    fornitore: testo(r.fornitore),
    garanzia: testo(r.garanzia),
    componenteRif: testo(r.componenteRif),
  });
  R.operazioneDaEseguire = (r) => ({
    id: id(r.id),
    descrizione: testo(r.descrizione),
    priorita: testo(r.priorita),
    carico: testo(r.carico),
    entro: testo(r.entro),
  });
  R.rifiuto = (r) => ({
    id: id(r.id),
    descrizione: testo(r.descrizione),
    eer: testo(r.eer),
    quantita: testo(r.quantita),
    unita: testo(r.unita),
    destinazione: testo(r.destinazione),
    destinazioneAltro: testo(r.destinazioneAltro),
  });
  R.allegato = (r) => ({
    id: id(r.id),
    tipo: testo(r.tipo),
    tipoAltro: testo(r.tipoAltro),
    descrizione: testo(r.descrizione),
    nomeFile: testo(r.nomeFile),
  });
  return R;
}

// Bozza completa e normalizzata a partire da un oggetto qualsiasi.
export function normalizzaBozza(grezzo, genera = generaId) {
  const g = oggetto(grezzo);
  const R = costruttoriRighe(genera);
  const s1 = oggetto(g.s1), s2 = oggetto(g.s2), s3 = oggetto(g.s3), s4 = oggetto(g.s4);
  const s5 = oggetto(g.s5), s6 = oggetto(g.s6), s7 = oggetto(g.s7), s8 = oggetto(g.s8);
  const s9 = oggetto(g.s9), s10 = oggetto(g.s10), s11 = oggetto(g.s11), s12 = oggetto(g.s12);
  const s13 = oggetto(g.s13);
  const fornitore = oggetto(s1.fornitore);
  const compilatore = oggetto(s1.compilatore);
  const firma = oggetto(s13.firma);
  const revisione = oggetto(g.revisione);
  return {
    id: R.id(g.id),
    creatoIl: /^\d{4}-\d{2}-\d{2}$/.test(testo(g.creatoIl)) ? g.creatoIl : dataIsoLocale(new Date()),
    progressivo: /^\d{1,2}$/.test(testo(g.progressivo)) ? testo(g.progressivo) : '01',
    revisione: {
      numero: Number.isInteger(revisione.numero) && revisione.numero >= 0 ? revisione.numero : null,
      impronta: testo(revisione.impronta),
      generatoIl: testo(revisione.generatoIl),
    },
    s1: {
      ticket: elenco(s1.ticket).map(R.ticket),
      fornitore: {
        ragioneSociale: testo(fornitore.ragioneSociale),
        estero: booleano(fornitore.estero),
        piva: testo(fornitore.piva),
        sede: testo(fornitore.sede),
        sigla: testo(fornitore.sigla),
      },
      compilatore: {
        nome: testo(compilatore.nome),
        ruolo: testo(compilatore.ruolo),
        email: testo(compilatore.email),
        telefono: testo(compilatore.telefono),
      },
    },
    s2: {
      oggetto: testo(s2.oggetto),
      tipologie: elencoTesti(s2.tipologie),
      tipologiaAltro: testo(s2.tipologiaAltro),
      regime: testo(s2.regime),
      riferimentoOfferta: testo(s2.riferimentoOfferta),
      garanzia: testo(s2.garanzia),
    },
    s3: {
      origine: testo(s3.origine),
      eventoDataOra: testo(s3.eventoDataOra),
      eventoNonNota: booleano(s3.eventoNonNota),
      fonteOrario: testo(s3.fonteOrario),
      fonteOrarioAltro: testo(s3.fonteOrarioAltro),
      rilevazione: testo(s3.rilevazione),
      rilevazioneAltro: testo(s3.rilevazioneAltro),
      arrivo: testo(s3.arrivo),
      riarmo: testo(s3.riarmo),
      fine: testo(s3.fine),
      statoPrima: testo(s3.statoPrima),
      potenzaPrima: testo(s3.potenzaPrima),
      statoDopo: testo(s3.statoDopo),
      potenzaDopo: testo(s3.potenzaDopo),
    },
    s4: {
      applicabile: testo(s4.applicabile),
      protezioni: elencoTesti(s4.protezioni),
      protezioniAltro: testo(s4.protezioniAltro),
      segnalazioni: testo(s4.segnalazioni),
      foto: R.elencoFoto(s4.foto),
      fotoNonDisponibile: booleano(s4.fotoNonDisponibile),
      fotoMotivo: testo(s4.fotoMotivo),
      causa: testo(s4.causa),
      causaAltro: testo(s4.causaAltro),
      verifiche: testo(s4.verifiche),
      autorizzatoNome: testo(s4.autorizzatoNome),
      autorizzatoRuolo: testo(s4.autorizzatoRuolo),
      autorizzatoModalita: testo(s4.autorizzatoModalita),
      autorizzatoModalitaAltro: testo(s4.autorizzatoModalitaAltro),
    },
    s5: {
      giornate: elenco(s5.giornate).map(R.giornata),
    },
    s6: {
      responsabileNome: testo(s6.responsabileNome),
      responsabileOrganizzazione: testo(s6.responsabileOrganizzazione),
      preposto: testo(s6.preposto),
      manovre: testo(s6.manovre),
      manovreDescrizione: testo(s6.manovreDescrizione),
      dpi: elencoTesti(s6.dpi),
      dpiAltro: testo(s6.dpiAltro),
      anomalie: testo(s6.anomalie),
      anomalieDescrizione: testo(s6.anomalieDescrizione),
      anomalieFoto: R.elencoFoto(s6.anomalieFoto),
      incidenti: testo(s6.incidenti),
      incidentiDescrizione: testo(s6.incidentiDescrizione),
    },
    s7: {
      situazione: testo(s7.situazione),
      componenti: elenco(s7.componenti).map(R.componente),
      nessunaAnomalia: booleano(s7.nessunaAnomalia),
      anomalie: elenco(s7.anomalie).map(R.anomalia),
    },
    s8: {
      operazioni: elenco(s8.operazioni).map(R.operazione),
    },
    s9: {
      applicabile: testo(s9.applicabile),
      attrezzature: elenco(s9.attrezzature).map(R.attrezzatura),
      nessunaMisura: booleano(s9.nessunaMisura),
      misure: elenco(s9.misure).map(R.misura),
    },
    s10: {
      applicabile: testo(s10.applicabile),
      righe: elenco(s10.righe).map(R.componenteUsato),
    },
    s11: {
      constatazione: testo(s11.constatazione),
      ipotesi: testo(s11.ipotesi),
      ipotesiNonApplicabile: booleano(s11.ipotesiNonApplicabile),
      nessunaOperazione: booleano(s11.nessunaOperazione),
      operazioni: elenco(s11.operazioni).map(R.operazioneDaEseguire),
    },
    s12: {
      carburante: testo(s12.carburante),
      carburanteNonNoto: booleano(s12.carburanteNonNoto),
      nessunRifiuto: booleano(s12.nessunRifiuto),
      rifiuti: elenco(s12.rifiuti).map(R.rifiuto),
      acqua: testo(s12.acqua),
      acquaNonUtilizzata: booleano(s12.acquaNonUtilizzata),
      gas: testo(s12.gas),
      gasApparecchiatura: testo(s12.gasApparecchiatura),
      gasQuantita: testo(s12.gasQuantita),
      gasQuantitaNonNota: booleano(s12.gasQuantitaNonNota),
    },
    s13: {
      allegati: elenco(s13.allegati).map(R.allegato),
      firma: {
        nome: testo(firma.nome),
        ruolo: testo(firma.ruolo),
        immagine: /^data:image\/png;base64,/.test(testo(firma.immagine)) ? firma.immagine : '',
        dataOra: testo(firma.dataOra),
        improntaDati: testo(firma.improntaDati),
      },
    },
  };
}

// Nuova bozza vuota: la data di creazione si fissa adesso e non cambia più.
export function nuovaBozza(adesso = new Date(), genera = generaId) {
  return normalizzaBozza({ creatoIl: dataIsoLocale(adesso), progressivo: '01' }, genera);
}

// Riga nuova di un elenco, con id unico rispetto alla bozza.
export function nuovaRiga(dati, tipo, valori = {}, genera = generaId) {
  const R = costruttoriRighe(genera, idUsati(dati));
  return R[tipo]({ ...valori, id: undefined });
}

// Tutti gli id presenti nella bozza (righe e foto).
export function idUsati(dati) {
  const usati = new Set();
  const visita = (v) => {
    if (Array.isArray(v)) v.forEach(visita);
    else if (v && typeof v === 'object') {
      if (typeof v.id === 'string') usati.add(v.id);
      Object.values(v).forEach(visita);
    }
  };
  visita(dati);
  return usati;
}

// --- Percorsi

export function risolviPercorso(dati, percorso) {
  if (!percorso) return dati;
  let corrente = dati;
  for (const parte of percorso.split('.')) {
    if (corrente === null || corrente === undefined) return undefined;
    corrente = Array.isArray(corrente) ? corrente.find((x) => x && x.id === parte) : corrente[parte];
  }
  return corrente;
}

// Scrive un campo esistente; restituisce false se il percorso non esiste.
export function impostaPercorso(dati, percorso, valore) {
  const parti = percorso.split('.');
  const campo = parti.pop();
  const contenitore = risolviPercorso(dati, parti.join('.'));
  if (!contenitore || typeof contenitore !== 'object' || Array.isArray(contenitore)) return false;
  if (!Object.prototype.hasOwnProperty.call(contenitore, campo)) return false;
  contenitore[campo] = valore;
  return true;
}

// Elimina la riga con l'id indicato dall'elenco al percorso dato.
export function eliminaRiga(dati, percorsoElenco, id) {
  const lista = risolviPercorso(dati, percorsoElenco);
  if (!Array.isArray(lista)) return false;
  const indice = lista.findIndex((x) => x.id === id);
  if (indice < 0) return false;
  lista.splice(indice, 1);
  return true;
}

// --- Calcoli derivati

const chiaveOperazione = (op) => `${op.data || '9999-99-99'}T${op.oraInizio || '99:99'}-${op.oraFine || '99:99'}`;

// Operazioni ordinate per data e ora (a parità, nell'ordine di inserimento).
export function operazioniOrdinate(dati) {
  return dati.s8.operazioni
    .map((op, indice) => ({ op, indice, chiave: chiaveOperazione(op) }))
    .sort((a, b) => (a.chiave < b.chiave ? -1 : a.chiave > b.chiave ? 1 : a.indice - b.indice))
    .map((x) => x.op);
}

// Giornate ordinate per data (quelle senza data in fondo).
export function giornateOrdinate(dati) {
  return dati.s5.giornate
    .map((g, indice) => ({ g, indice, chiave: g.data || '9999-99-99' }))
    .sort((a, b) => (a.chiave < b.chiave ? -1 : a.chiave > b.chiave ? 1 : a.indice - b.indice))
    .map((x) => x.g);
}

// Foto stampate nel PDF, con numerazione unica nell'ordine delle sezioni e delle
// righe. Restano fuori le foto delle parti non applicabili (riarmo "No",
// anomalie di sicurezza "No", "Foto non disponibile").
export function elencoFoto(dati) {
  const voci = [];
  const aggiungi = (foto, sezione, riferimento, percorsoElenco) => {
    foto.forEach((f) => voci.push({ foto: f, sezione, riferimento, percorsoElenco, percorso: `${percorsoElenco}.${f.id}` }));
  };
  if (dati.s4.applicabile === SI && !dati.s4.fotoNonDisponibile) {
    aggiungi(dati.s4.foto, 4, 'Sez. 4 – Segnalazioni', 's4.foto');
  }
  if (dati.s6.anomalie === SI) {
    aggiungi(dati.s6.anomalieFoto, 6, 'Sez. 6 – Anomalie di sicurezza', 's6.anomalieFoto');
  }
  if (!dati.s7.nessunaAnomalia) {
    dati.s7.anomalie.forEach((a, i) => aggiungi(a.foto, 7, `Sez. 7 – Anomalia ${i + 1}`, `s7.anomalie.${a.id}.foto`));
  }
  operazioniOrdinate(dati).forEach((op, i) => aggiungi(op.foto, 8, `Sez. 8 – Operazione ${i + 1}`, `s8.operazioni.${op.id}.foto`));
  return voci.map((v, i) => ({ ...v, numero: i + 1 }));
}

// Tutte le foto della bozza, anche quelle delle parti non applicabili.
export function tutteLeFoto(dati) {
  const voci = [];
  const aggiungi = (foto, percorsoElenco) => foto.forEach((f) => voci.push({ foto: f, percorsoElenco }));
  aggiungi(dati.s4.foto, 's4.foto');
  aggiungi(dati.s6.anomalieFoto, 's6.anomalieFoto');
  dati.s7.anomalie.forEach((a) => aggiungi(a.foto, `s7.anomalie.${a.id}.foto`));
  dati.s8.operazioni.forEach((op) => aggiungi(op.foto, `s8.operazioni.${op.id}.foto`));
  return voci;
}

// "Foto 3, 4" per le tabelle del PDF; '' se non ci sono foto.
export function riferimentoFoto(foto, numeri) {
  const n = foto.map((f) => numeri.get(f.id)).filter((x) => x !== undefined);
  if (n.length === 0) return '';
  return `Foto ${n.join(', ')}`;
}

export function mappaNumeriFoto(dati) {
  return new Map(elencoFoto(dati).map((v) => [v.foto.id, v.numero]));
}

const numeroOZero = (testoNumero) => {
  const n = parseDecimale(testoNumero);
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};

// Totali della sezione 5: ore per persona (unite per nome) e complessive, km.
export function totaliSquadra(dati) {
  const perNome = new Map();
  let oreLavoro = 0;
  let oreViaggio = 0;
  let km = 0;
  for (const g of giornateOrdinate(dati)) {
    for (const p of g.persone) {
      const nome = p.nome.trim().replace(/\s+/g, ' ');
      const chiave = nome.toLowerCase() || `#${p.id}`;
      const voce = perNome.get(chiave) || { nome: nome || '(senza nome)', oreLavoro: 0, oreViaggio: 0 };
      voce.oreLavoro += numeroOZero(p.oreLavoro);
      voce.oreViaggio += numeroOZero(p.oreViaggio);
      perNome.set(chiave, voce);
      oreLavoro += numeroOZero(p.oreLavoro);
      oreViaggio += numeroOZero(p.oreViaggio);
    }
    if (!g.nessunMezzo) g.mezzi.forEach((m) => (km += numeroOZero(m.km)));
  }
  return { perPersona: Array.from(perNome.values()), oreLavoro, oreViaggio, km };
}

// Periodo dalla prima all'ultima giornata (date "AAAA-MM-GG", '' se assenti).
export function periodoGiornate(dati) {
  const date = dati.s5.giornate.map((g) => g.data).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  return { dal: date[0] || '', al: date[date.length - 1] || '' };
}

// Nominativi con ruolo "Preposto ai lavori" inseriti nella sezione 5.
export function prepostiSuggeriti(dati) {
  const nomi = new Map();
  for (const g of dati.s5.giornate) {
    for (const p of g.persone) {
      const nome = p.nome.trim().replace(/\s+/g, ' ');
      if (p.ruolo === PREPOSTO && nome) nomi.set(nome.toLowerCase(), nome);
    }
  }
  return Array.from(nomi.values());
}

export function testoConAlternativa(v) {
  return v.alternativa || v.valore.trim();
}

// "Altro: …" quando è scelto Altro, altrimenti il valore.
export function testoScelta(valore, altro) {
  return valore === ALTRO ? `${ALTRO}: ${altro.trim()}` : valore;
}

export function testoScelteMultiple(valori, altro) {
  return valori.map((v) => testoScelta(v, altro)).join(', ');
}

// Etichette leggibili per gli elenchi a scelta delle altre sezioni.
export function etichettaComponente(c, indice) {
  const nome = c.componente.trim() || `Componente ${indice + 1}`;
  const area = c.area.trim();
  return area ? `${nome} – ${area}` : nome;
}

export function etichettaAttrezzatura(a, indice) {
  const parti = [a.tipo, a.produttore, a.modello].map((x) => x.trim()).filter(Boolean);
  const nome = parti.join(' ') || `Attrezzatura ${indice + 1}`;
  return a.seriale.trim() ? `${nome} (S/N ${a.seriale.trim()})` : nome;
}
