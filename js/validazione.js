// Regole di validazione del rapporto.
// Modulo puro: non usa il browser, si testa con Node.
//
// valida(dati) restituisce:
// - errori: campi mancanti o non validi (bloccano il PDF valido);
// - avvisi: segnalazioni che non bloccano (es. taratura scaduta);
// - sezioni: per ogni sezione 1–13 lo stato e il numero di errori.
// Ogni voce ha "percorso", il campo a cui portare il cursore dalla pagina.

import { verificaPartitaIva } from './piva.js';
import { siglaValida, progressivoValido } from './codice.js';
import { statoFirma } from './revisione.js';
import {
  dataValida,
  oraValida,
  dataOraValida,
  normalizzaDataOra,
  parteData,
  dataIt,
  dataOraIt,
  parseDecimale,
  sembraMigliaia,
  emailValida,
  eerValido,
} from './formati.js';
import {
  OPZIONI,
  ALTRO,
  SI,
  NO,
  EVENTO,
  PROGRAMMATA,
  IN_CAMPO,
  COMPONENTE_GENERALE,
  MAX_FOTO,
  SOGLIA_AVVISO_FOTO,
  SEZIONI_FACOLTATIVE,
  operazioniOrdinate,
  elencoFoto,
  tutteLeFoto,
  etichettaAttrezzatura,
} from './modello.js';

const vuoto = (v) => (Array.isArray(v) ? v.length === 0 : String(v ?? '').trim() === '');

export const MIN_CARATTERI_TESTO = 20;
export const MAX_CARATTERI_OGGETTO = 120;

export function valida(dati) {
  const errori = [];
  const avvisi = [];
  const errore = (sezione, percorso, messaggio) => errori.push({ sezione, percorso, messaggio });
  const avviso = (sezione, percorso, messaggio) => avvisi.push({ sezione, percorso, messaggio });

  // --- Controlli riutilizzati

  const obbligatorio = (sez, percorso, valore, etichetta) => {
    if (vuoto(valore)) errore(sez, percorso, `${etichetta}: campo obbligatorio`);
    return !vuoto(valore);
  };

  // Scelta da elenco; con "Altro" serve anche il campo "specificare".
  const scelta = (sez, percorso, valore, opzioni, etichetta, percorsoAltro, valoreAltro) => {
    if (vuoto(valore)) return errore(sez, percorso, `${etichetta}: ${opzioni === OPZIONI.siNo ? 'scegli Sì o No' : 'scegli una voce'}`);
    if (!opzioni.includes(valore)) return errore(sez, percorso, `${etichetta}: valore non ammesso («${valore}»)`);
    if (valore === ALTRO && percorsoAltro && vuoto(valoreAltro)) errore(sez, percorsoAltro, `${etichetta} – Altro: specificare`);
  };

  const sceltaMultipla = (sez, percorso, valori, opzioni, etichetta, percorsoAltro, valoreAltro) => {
    if (valori.length === 0) return errore(sez, percorso, `${etichetta}: seleziona almeno una voce`);
    const estranei = valori.filter((v) => !opzioni.includes(v));
    if (estranei.length) errore(sez, percorso, `${etichetta}: valori non ammessi (${estranei.join(', ')})`);
    if (valori.includes(ALTRO) && vuoto(valoreAltro)) errore(sez, percorsoAltro, `${etichetta} – Altro: specificare`);
  };

  // Numero con virgola o punto. limiti: { min, max, maggioreDi }.
  const numero = (sez, percorso, testo, etichetta, { obbligatorio: obblig = true, min, max, maggioreDi, messaggioVuoto } = {}) => {
    if (vuoto(testo)) {
      if (obblig) errore(sez, percorso, messaggioVuoto || `${etichetta}: campo obbligatorio`);
      return;
    }
    const n = parseDecimale(testo);
    if (Number.isNaN(n)) return errore(sez, percorso, `${etichetta}: inserisci un numero (es. 12,5)`);
    if (maggioreDi !== undefined && !(n > maggioreDi)) return errore(sez, percorso, `${etichetta}: deve essere maggiore di ${maggioreDi}`);
    if (min !== undefined && n < min) return errore(sez, percorso, `${etichetta}: deve essere maggiore o uguale a ${min}`);
    if (max !== undefined && n > max) return errore(sez, percorso, `${etichetta}: deve essere al massimo ${max}`);
    if (sembraMigliaia(testo)) {
      avviso(sez, percorso, `${etichetta}: «${String(testo).trim()}» viene letto come ${String(n).replace('.', ',')}. Il punto è il separatore decimale: non usarlo per le migliaia.`);
    }
  };

  const data = (sez, percorso, valore, etichetta, obblig = true) => {
    if (vuoto(valore)) {
      if (obblig) errore(sez, percorso, `${etichetta}: campo obbligatorio`);
      return false;
    }
    if (!dataValida(valore)) {
      errore(sez, percorso, `${etichetta}: data non valida`);
      return false;
    }
    return true;
  };

  const ora = (sez, percorso, valore, etichetta) => {
    if (vuoto(valore)) {
      errore(sez, percorso, `${etichetta}: campo obbligatorio`);
      return false;
    }
    if (!oraValida(valore)) {
      errore(sez, percorso, `${etichetta}: ora non valida`);
      return false;
    }
    return true;
  };

  const dataOra = (sez, percorso, valore, etichetta, obblig = true) => {
    if (vuoto(valore)) {
      if (obblig) errore(sez, percorso, `${etichetta}: campo obbligatorio`);
      return false;
    }
    if (!dataOraValida(valore)) {
      errore(sez, percorso, `${etichetta}: data e ora non valide`);
      return false;
    }
    return true;
  };

  // Testo lungo con un minimo di caratteri.
  const testoMinimo = (sez, percorso, valore, etichetta) => {
    if (!obbligatorio(sez, percorso, valore, etichetta)) return;
    const n = valore.trim().length;
    if (n < MIN_CARATTERI_TESTO) errore(sez, percorso, `${etichetta}: scrivi almeno ${MIN_CARATTERI_TESTO} caratteri (ora ${n})`);
  };

  // Valore con le alternative "Non applicabile" / "Non rilevato".
  const conAlternativa = (sez, percorso, v, etichetta) => {
    if (vuoto(v.valore) && !v.alternativa) {
      errore(sez, `${percorso}.valore`, `${etichetta}: inserisci il valore oppure scegli "Non applicabile" o "Non rilevato"`);
    }
  };

  // Elenco che può restare vuoto solo con la casella esplicita.
  const elencoOCasella = (sez, righe, casella, percorsoCasella, etichetta, testoCasella, cosa) => {
    if (casella && righe.length > 0) {
      errore(sez, percorsoCasella, `${etichetta}: hai scelto "${testoCasella}" ma l'elenco contiene delle righe`);
    } else if (!casella && righe.length === 0) {
      errore(sez, percorsoCasella, `${etichetta}: aggiungi ${cosa} oppure seleziona "${testoCasella}"`);
    }
  };

  const siNo = (sez, percorso, valore, etichetta) => scelta(sez, percorso, valore, OPZIONI.siNo, etichetta);

  const { s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13 } = dati;

  // --- 1. Identificazione
  {
    const f = s1.fornitore;
    if (!progressivoValido(dati.progressivo)) {
      errore(1, 'progressivo', 'Progressivo del codice rapporto: 2 cifre, da 01 a 99');
    }
    s1.ticket.forEach((t, i) => {
      if (vuoto(t.testo)) errore(1, `s1.ticket.${t.id}.testo`, `Ticket ${i + 1}: scrivi il riferimento oppure elimina la riga`);
    });
    obbligatorio(1, 's1.fornitore.ragioneSociale', f.ragioneSociale, 'Fornitore – ragione sociale');
    if (f.estero) {
      obbligatorio(1, 's1.fornitore.piva', f.piva, 'Fornitore – identificativo fiscale');
    } else {
      const esito = verificaPartitaIva(f.piva);
      if (!esito.valida) errore(1, 's1.fornitore.piva', `Fornitore – P.IVA: ${esito.messaggio}`);
    }
    obbligatorio(1, 's1.fornitore.sede', f.sede, 'Fornitore – sede');
    if (obbligatorio(1, 's1.fornitore.sigla', f.sigla, 'Fornitore – sigla') && !siglaValida(f.sigla)) {
      errore(1, 's1.fornitore.sigla', 'Fornitore – sigla: 2 lettere maiuscole (es. AB)');
    }
    const c = s1.compilatore;
    obbligatorio(1, 's1.compilatore.nome', c.nome, 'Compilatore – nome e cognome');
    obbligatorio(1, 's1.compilatore.ruolo', c.ruolo, 'Compilatore – ruolo');
    if (obbligatorio(1, 's1.compilatore.email', c.email, 'Compilatore – e-mail') && !emailValida(c.email)) {
      errore(1, 's1.compilatore.email', 'Compilatore – e-mail: indirizzo non valido');
    }
  }

  // --- 2. Inquadramento
  {
    if (obbligatorio(2, 's2.oggetto', s2.oggetto, "Oggetto dell'intervento") && s2.oggetto.trim().length > MAX_CARATTERI_OGGETTO) {
      errore(2, 's2.oggetto', `Oggetto dell'intervento: massimo ${MAX_CARATTERI_OGGETTO} caratteri`);
    }
    sceltaMultipla(2, 's2.tipologie', s2.tipologie, OPZIONI.tipologie, 'Tipologie', 's2.tipologiaAltro', s2.tipologiaAltro);
    scelta(2, 's2.regime', s2.regime, OPZIONI.regime, 'Regime');
    if (s2.regime === 'Extra-canone') {
      obbligatorio(2, 's2.riferimentoOfferta', s2.riferimentoOfferta, 'Riferimento offerta o ordine (obbligatorio con Extra-canone)');
    }
    scelta(2, 's2.garanzia', s2.garanzia, OPZIONI.garanzia, 'Intervento coperto da garanzia');
  }

  // --- 3. Evento e tempi
  {
    scelta(3, 's3.origine', s3.origine, OPZIONI.origine, "Origine dell'attività");
    const conEvento = s3.origine === EVENTO;
    let evento = '';
    if (conEvento) {
      if (!s3.eventoNonNota) {
        if (vuoto(s3.eventoDataOra)) {
          errore(3, 's3.eventoDataOra', `Data e ora dell'evento: inserisci la data e l'ora oppure seleziona "Non nota"`);
        } else if (dataOra(3, 's3.eventoDataOra', s3.eventoDataOra, "Data e ora dell'evento")) {
          evento = normalizzaDataOra(s3.eventoDataOra);
          scelta(3, 's3.fonteOrario', s3.fonteOrario, OPZIONI.fonteOrario, "Fonte dell'orario dell'evento", 's3.fonteOrarioAltro', s3.fonteOrarioAltro);
        }
      }
      scelta(3, 's3.rilevazione', s3.rilevazione, OPZIONI.rilevazione, 'Modalità di rilevazione', 's3.rilevazioneAltro', s3.rilevazioneAltro);
    }
    const arrivo = dataOra(3, 's3.arrivo', s3.arrivo, 'Arrivo in sito') ? normalizzaDataOra(s3.arrivo) : '';
    const riarmoObbligatorio = s4.applicabile === SI;
    const riarmo = dataOra(3, 's3.riarmo', s3.riarmo, riarmoObbligatorio ? 'Riarmo o ripristino (obbligatorio con il riarmo di protezioni)' : 'Riarmo o ripristino', riarmoObbligatorio)
      ? normalizzaDataOra(s3.riarmo)
      : '';
    const fine = dataOra(3, 's3.fine', s3.fine, 'Fine attività') ? normalizzaDataOra(s3.fine) : '';

    // Coerenza: evento ≤ arrivo ≤ riarmo ≤ fine, per i valori presenti.
    const catena = [
      { valore: evento, percorso: 's3.eventoDataOra', nome: "l'evento" },
      { valore: arrivo, percorso: 's3.arrivo', nome: "l'arrivo in sito", etichetta: 'Arrivo in sito' },
      { valore: riarmo, percorso: 's3.riarmo', nome: 'il riarmo o ripristino', etichetta: 'Riarmo o ripristino' },
      { valore: fine, percorso: 's3.fine', nome: 'la fine attività', etichetta: 'Fine attività' },
    ].filter((x) => x.valore);
    for (let i = 1; i < catena.length; i++) {
      if (catena[i].valore < catena[i - 1].valore) {
        errore(3, catena[i].percorso, `${catena[i].etichetta}: non può precedere ${catena[i - 1].nome} (${dataOraIt(catena[i - 1].valore)})`);
      }
    }

    for (const [chiave, etichetta] of [['Prima', "Stato dell'impianto prima"], ['Dopo', "Stato dell'impianto dopo"]]) {
      scelta(3, `s3.stato${chiave}`, s3[`stato${chiave}`], OPZIONI.statoImpianto, etichetta);
      if (s3[`stato${chiave}`] === 'Limitato') {
        numero(3, `s3.potenza${chiave}`, s3[`potenza${chiave}`], `${etichetta} – potenza disponibile (%)`, { min: 0, max: 100 });
      }
    }
  }

  // --- 4. Riarmo (se applicabile)
  {
    scelta(4, 's4.applicabile', s4.applicabile, OPZIONI.siNo, "Riarmo di protezioni compreso nell'intervento");
    if (s4.applicabile === SI) {
      sceltaMultipla(4, 's4.protezioni', s4.protezioni, OPZIONI.protezioni, 'Protezioni intervenute', 's4.protezioniAltro', s4.protezioniAltro);
      obbligatorio(4, 's4.segnalazioni', s4.segnalazioni, 'Segnalazioni lette su relè o apparecchiature');
      if (s4.fotoNonDisponibile) {
        if (s4.foto.length > 0) {
          errore(4, 's4.fotoNonDisponibile', 'Foto delle segnalazioni: hai scelto "Foto non disponibile" ma ci sono foto');
        }
        obbligatorio(4, 's4.fotoMotivo', s4.fotoMotivo, 'Foto non disponibile – motivo');
      } else if (s4.foto.length === 0) {
        errore(4, 's4.foto', 'Foto delle segnalazioni: aggiungi almeno una foto oppure seleziona "Foto non disponibile"');
      }
      scelta(4, 's4.causa', s4.causa, OPZIONI.causaScatto, 'Causa dello scatto', 's4.causaAltro', s4.causaAltro);
      obbligatorio(4, 's4.verifiche', s4.verifiche, 'Verifiche eseguite prima del riarmo');
      obbligatorio(4, 's4.autorizzatoNome', s4.autorizzatoNome, 'Riarmo autorizzato da – nome e cognome');
      obbligatorio(4, 's4.autorizzatoRuolo', s4.autorizzatoRuolo, 'Riarmo autorizzato da – ruolo e organizzazione');
      scelta(4, 's4.autorizzatoModalita', s4.autorizzatoModalita, OPZIONI.modalitaAutorizzazione, 'Riarmo autorizzato da – modalità', 's4.autorizzatoModalitaAltro', s4.autorizzatoModalitaAltro);
    }
  }

  // --- 5. Squadra e mezzi, per giornata
  const dateGiornate = new Set();
  {
    if (s5.giornate.length === 0) errore(5, 's5.giornate', 'Giornate: aggiungi almeno una giornata');
    const primaData = parteData(s3.arrivo);
    const ultimaData = parteData(s3.fine);
    const giaViste = new Map();
    s5.giornate.forEach((g, i) => {
      const ctx = `Giornata ${i + 1}`;
      const base = `s5.giornate.${g.id}`;
      if (data(5, `${base}.data`, g.data, `${ctx} – data`)) {
        if (giaViste.has(g.data)) {
          errore(5, `${base}.data`, `${ctx} – data: uguale a quella della giornata ${giaViste.get(g.data)}`);
        } else {
          giaViste.set(g.data, i + 1);
        }
        dateGiornate.add(g.data);
        if (primaData && g.data < primaData) errore(5, `${base}.data`, `${ctx} – data: precede l'arrivo in sito (${dataIt(primaData)})`);
        if (ultimaData && g.data > ultimaData) errore(5, `${base}.data`, `${ctx} – data: è successiva alla fine attività (${dataIt(ultimaData)})`);
      }
      if (g.persone.length === 0) errore(5, `${base}.persone`, `${ctx} – persone: aggiungi almeno una persona`);
      g.persone.forEach((p, j) => {
        const c = `${ctx} › Persona ${j + 1}`;
        const bp = `${base}.persone.${p.id}`;
        obbligatorio(5, `${bp}.nome`, p.nome, `${c} – nome e cognome`);
        obbligatorio(5, `${bp}.organizzazione`, p.organizzazione, `${c} – organizzazione`);
        scelta(5, `${bp}.ruolo`, p.ruolo, OPZIONI.ruoloPersona, `${c} – ruolo`, `${bp}.ruoloAltro`, p.ruoloAltro);
        scelta(5, `${bp}.qualifica`, p.qualifica, OPZIONI.qualifica, `${c} – qualifica`);
        numero(5, `${bp}.oreLavoro`, p.oreLavoro, `${c} – ore di lavoro`, { min: 0, max: 24 });
        numero(5, `${bp}.oreViaggio`, p.oreViaggio, `${c} – ore di viaggio`, { obbligatorio: false, min: 0, max: 24 });
      });
      elencoOCasella(5, g.mezzi, g.nessunMezzo, `${base}.nessunMezzo`, `${ctx} – mezzi`, 'Nessun mezzo', 'un mezzo');
      if (!g.nessunMezzo) {
        g.mezzi.forEach((m, j) => {
          const c = `${ctx} › Mezzo ${j + 1}`;
          const bm = `${base}.mezzi.${m.id}`;
          scelta(5, `${bm}.tipo`, m.tipo, OPZIONI.tipoMezzo, `${c} – tipo`, `${bm}.tipoAltro`, m.tipoAltro);
          scelta(5, `${bm}.alimentazione`, m.alimentazione, OPZIONI.alimentazione, `${c} – alimentazione`, `${bm}.alimentazioneAltro`, m.alimentazioneAltro);
          numero(5, `${bm}.km`, m.km, `${c} – km di andata e ritorno`, { min: 0 });
        });
      }
    });
  }

  // --- 6. Sicurezza
  {
    obbligatorio(6, 's6.responsabileNome', s6.responsabileNome, 'Responsabile impianto – nome e cognome');
    obbligatorio(6, 's6.responsabileOrganizzazione', s6.responsabileOrganizzazione, 'Responsabile impianto – organizzazione');
    obbligatorio(6, 's6.preposto', s6.preposto, 'Preposto ai lavori – nome e cognome');
    siNo(6, 's6.manovre', s6.manovre, 'Manovre su apparecchiature elettriche');
    if (s6.manovre === SI) obbligatorio(6, 's6.manovreDescrizione', s6.manovreDescrizione, 'Manovre – descrizione');
    sceltaMultipla(6, 's6.dpi', s6.dpi, OPZIONI.dpi, 'DPI utilizzati', 's6.dpiAltro', s6.dpiAltro);
    siNo(6, 's6.anomalie', s6.anomalie, 'Anomalie di sicurezza riscontrate');
    if (s6.anomalie === SI) {
      obbligatorio(6, 's6.anomalieDescrizione', s6.anomalieDescrizione, 'Anomalie di sicurezza – descrizione');
      if (s6.anomalieFoto.length === 0) errore(6, 's6.anomalieFoto', 'Anomalie di sicurezza – foto: aggiungi almeno una foto');
    }
    siNo(6, 's6.incidenti', s6.incidenti, 'Incidenti o quasi incidenti');
    if (s6.incidenti === SI) obbligatorio(6, 's6.incidentiDescrizione', s6.incidentiDescrizione, 'Incidenti – descrizione');
  }

  // --- 7. Constatazione iniziale e sopralluogo
  const idComponenti = new Set(s7.componenti.map((c) => c.id));
  {
    testoMinimo(7, 's7.situazione', s7.situazione, 'Situazione riscontrata');
    if (s7.componenti.length === 0) errore(7, 's7.componenti', 'Componenti e apparecchiature: aggiungi almeno un componente');
    s7.componenti.forEach((c, i) => {
      const ctx = `Componente ${i + 1}`;
      const b = `s7.componenti.${c.id}`;
      obbligatorio(7, `${b}.area`, c.area, `${ctx} – area`);
      obbligatorio(7, `${b}.componente`, c.componente, `${ctx} – componente`);
      conAlternativa(7, `${b}.costruttore`, c.costruttore, `${ctx} – costruttore`);
      conAlternativa(7, `${b}.modello`, c.modello, `${ctx} – modello`);
      conAlternativa(7, `${b}.seriale`, c.seriale, `${ctx} – seriale`);
    });
    elencoOCasella(7, s7.anomalie, s7.nessunaAnomalia, 's7.nessunaAnomalia', 'Anomalie riscontrate', 'Nessuna anomalia', "un'anomalia");
    if (!s7.nessunaAnomalia) {
      s7.anomalie.forEach((a, i) => {
        const b = `s7.anomalie.${a.id}`;
        obbligatorio(7, `${b}.area`, a.area, `Anomalia ${i + 1} – area`);
        obbligatorio(7, `${b}.descrizione`, a.descrizione, `Anomalia ${i + 1} – descrizione`);
      });
    }
  }

  // --- 8. Registro operazioni
  {
    const operazioni = operazioniOrdinate(dati);
    if (operazioni.length === 0) errore(8, 's8.operazioni', "Registro operazioni: aggiungi almeno un'operazione");
    operazioni.forEach((op, i) => {
      const ctx = `Operazione ${i + 1}`;
      const b = `s8.operazioni.${op.id}`;
      const dataOk = data(8, `${b}.data`, op.data, `${ctx} – data`);
      const inizioOk = ora(8, `${b}.oraInizio`, op.oraInizio, `${ctx} – ora di inizio`);
      const fineOk = ora(8, `${b}.oraFine`, op.oraFine, `${ctx} – ora di fine`);
      if (inizioOk && fineOk && op.oraFine.slice(0, 5) < op.oraInizio.slice(0, 5)) {
        errore(8, `${b}.oraFine`, `${ctx} – ora di fine: precede l'ora di inizio`);
      }
      scelta(8, `${b}.tipo`, op.tipo, OPZIONI.tipoOperazione, `${ctx} – tipo`, `${b}.tipoAltro`, op.tipoAltro);
      if (vuoto(op.componente)) {
        errore(8, `${b}.componente`, `${ctx} – componente: scegli una voce`);
      } else if (op.componente !== COMPONENTE_GENERALE && !idComponenti.has(op.componente)) {
        errore(8, `${b}.componente`, `${ctx} – componente: non è più presente nella sezione 7, scegline un altro`);
      }
      obbligatorio(8, `${b}.descrizione`, op.descrizione, `${ctx} – descrizione`);
      scelta(8, `${b}.esito`, op.esito, OPZIONI.esitoOperazione, `${ctx} – esito`);
      scelta(8, `${b}.stato`, op.stato, OPZIONI.statoRiscontrato, `${ctx} – stato riscontrato`);
      scelta(8, `${b}.modalita`, op.modalita, OPZIONI.modalitaOperazione, `${ctx} – modalità`);
      if (op.modalita === IN_CAMPO && dataOk && !dateGiornate.has(op.data)) {
        errore(8, `${b}.data`, `${ctx} – data: con "In campo" deve corrispondere a una giornata della sezione 5`);
      }
    });
  }

  // --- 9. Misure e attrezzature (se applicabile)
  {
    scelta(9, 's9.applicabile', s9.applicabile, OPZIONI.siNo, 'Misure e attrezzature applicabili');
    if (s9.applicabile === SI) {
      if (s9.attrezzature.length === 0) errore(9, 's9.attrezzature', 'Attrezzature: aggiungi almeno un\'attrezzatura');
      const attrezzature = new Map();
      s9.attrezzature.forEach((a, i) => {
        attrezzature.set(a.id, { a, indice: i });
        const ctx = `Attrezzatura ${i + 1}`;
        const b = `s9.attrezzature.${a.id}`;
        obbligatorio(9, `${b}.tipo`, a.tipo, `${ctx} – tipo o descrizione`);
        obbligatorio(9, `${b}.produttore`, a.produttore, `${ctx} – produttore`);
        obbligatorio(9, `${b}.modello`, a.modello, `${ctx} – modello`);
        obbligatorio(9, `${b}.seriale`, a.seriale, `${ctx} – seriale`);
        if (!a.certificatoNonDisponibile && vuoto(a.certificato)) {
          errore(9, `${b}.certificato`, `${ctx} – certificato di taratura: inserisci il numero oppure seleziona "Non disponibile"`);
        }
        if (!a.scadenzaNonDisponibile) {
          if (vuoto(a.scadenza)) errore(9, `${b}.scadenza`, `${ctx} – scadenza della taratura: inserisci la data oppure seleziona "Non disponibile"`);
          else data(9, `${b}.scadenza`, a.scadenza, `${ctx} – scadenza della taratura`);
        }
      });
      elencoOCasella(9, s9.misure, s9.nessunaMisura, 's9.nessunaMisura', 'Misure', 'Nessuna misura', 'una misura');
      if (!s9.nessunaMisura) {
        s9.misure.forEach((m, i) => {
          const ctx = `Misura ${i + 1}`;
          const b = `s9.misure.${m.id}`;
          const dataOk = data(9, `${b}.data`, m.data, `${ctx} – data`);
          obbligatorio(9, `${b}.grandezza`, m.grandezza, `${ctx} – grandezza`);
          obbligatorio(9, `${b}.punto`, m.punto, `${ctx} – punto di misura`);
          numero(9, `${b}.valore`, m.valore, `${ctx} – valore`);
          scelta(9, `${b}.unita`, m.unita, OPZIONI.unitaMisura, `${ctx} – unità`, `${b}.unitaAltro`, m.unitaAltro);
          scelta(9, `${b}.esito`, m.esito, OPZIONI.esitoMisura, `${ctx} – esito`);
          if (vuoto(m.strumento)) {
            errore(9, `${b}.strumento`, `${ctx} – strumento: scegli una voce`);
          } else if (!attrezzature.has(m.strumento)) {
            errore(9, `${b}.strumento`, `${ctx} – strumento: non è più presente tra le attrezzature, scegline un altro`);
          } else {
            const { a, indice } = attrezzature.get(m.strumento);
            if (dataOk && !a.scadenzaNonDisponibile && dataValida(a.scadenza) && a.scadenza < m.data) {
              avviso(9, `${b}.strumento`, `${ctx}: la taratura di «${etichettaAttrezzatura(a, indice)}» è scaduta il ${dataIt(a.scadenza)}, prima della misura del ${dataIt(m.data)}`);
            }
          }
        });
      }
    }
  }

  // --- 10. Componenti utilizzati o sostituiti (se applicabile)
  {
    scelta(10, 's10.applicabile', s10.applicabile, OPZIONI.siNo, 'Componenti utilizzati o sostituiti applicabili');
    if (s10.applicabile === SI) {
      if (s10.righe.length === 0) errore(10, 's10.righe', 'Componenti utilizzati o sostituiti: aggiungi almeno una riga');
      s10.righe.forEach((r, i) => {
        const ctx = `Riga ${i + 1}`;
        const b = `s10.righe.${r.id}`;
        obbligatorio(10, `${b}.area`, r.area, `${ctx} – area`);
        obbligatorio(10, `${b}.componente`, r.componente, `${ctx} – componente`);
        obbligatorio(10, `${b}.costruttore`, r.costruttore, `${ctx} – costruttore`);
        obbligatorio(10, `${b}.modello`, r.modello, `${ctx} – modello`);
        numero(10, `${b}.quantita`, r.quantita, `${ctx} – quantità`, { maggioreDi: 0 });
        scelta(10, `${b}.unita`, r.unita, OPZIONI.unitaQuantita, `${ctx} – unità di misura`, `${b}.unitaAltro`, r.unitaAltro);
        conAlternativa(10, `${b}.serialeVecchio`, r.serialeVecchio, `${ctx} – seriale vecchio`);
        conAlternativa(10, `${b}.serialeNuovo`, r.serialeNuovo, `${ctx} – seriale nuovo`);
        obbligatorio(10, `${b}.fornitore`, r.fornitore, `${ctx} – fornitore del componente`);
        scelta(10, `${b}.garanzia`, r.garanzia, OPZIONI.garanziaCostruttore, `${ctx} – garanzia del costruttore`);
        if (!vuoto(r.componenteRif) && !idComponenti.has(r.componenteRif)) {
          errore(10, `${b}.componenteRif`, `${ctx} – componente della sezione 7: non è più presente, scegline un altro o nessuno`);
        }
      });
    }
  }

  // --- 11. Esito
  {
    testoMinimo(11, 's11.constatazione', s11.constatazione, 'Constatazione finale');
    const naAmmessa = s3.origine === PROGRAMMATA;
    if (!(naAmmessa && s11.ipotesiNonApplicabile) && vuoto(s11.ipotesi)) {
      errore(11, 's11.ipotesi', naAmmessa
        ? `Ipotesi sull'origine del guasto: scrivi l'ipotesi oppure seleziona "Non applicabile (attività programmata)"`
        : "Ipotesi sull'origine del guasto: campo obbligatorio");
    }
    elencoOCasella(11, s11.operazioni, s11.nessunaOperazione, 's11.nessunaOperazione', 'Operazioni da eseguire', 'Nessuna operazione da eseguire', "un'operazione");
    if (!s11.nessunaOperazione) {
      s11.operazioni.forEach((o, i) => {
        const ctx = `Operazione da eseguire ${i + 1}`;
        const b = `s11.operazioni.${o.id}`;
        obbligatorio(11, `${b}.descrizione`, o.descrizione, `${ctx} – descrizione`);
        scelta(11, `${b}.priorita`, o.priorita, OPZIONI.priorita, `${ctx} – priorità`);
        obbligatorio(11, `${b}.carico`, o.carico, `${ctx} – a carico di`);
        data(11, `${b}.entro`, o.entro, `${ctx} – entro`, false);
      });
    }
  }

  // --- 12. ESG (dati minimi)
  {
    if (!s12.carburanteNonNoto) {
      numero(12, 's12.carburante', s12.carburante, 'Carburante consumato (litri)', { min: 0, messaggioVuoto: 'Carburante consumato: inserisci i litri oppure seleziona "Non noto"' });
    }
    elencoOCasella(12, s12.rifiuti, s12.nessunRifiuto, 's12.nessunRifiuto', 'Rifiuti prodotti', 'Nessun rifiuto', 'un rifiuto');
    if (!s12.nessunRifiuto) {
      s12.rifiuti.forEach((r, i) => {
        const ctx = `Rifiuto ${i + 1}`;
        const b = `s12.rifiuti.${r.id}`;
        obbligatorio(12, `${b}.descrizione`, r.descrizione, `${ctx} – descrizione`);
        if (!vuoto(r.eer) && !eerValido(r.eer)) errore(12, `${b}.eer`, `${ctx} – codice EER: 6 cifre (es. 16 02 13), con l'asterisco finale se pericoloso`);
        numero(12, `${b}.quantita`, r.quantita, `${ctx} – quantità`, { maggioreDi: 0 });
        scelta(12, `${b}.unita`, r.unita, OPZIONI.unitaRifiuto, `${ctx} – unità`);
        scelta(12, `${b}.destinazione`, r.destinazione, OPZIONI.destinazioneRifiuto, `${ctx} – destinazione`, `${b}.destinazioneAltro`, r.destinazioneAltro);
      });
    }
    if (!s12.acquaNonUtilizzata) {
      numero(12, 's12.acqua', s12.acqua, 'Acqua utilizzata (litri)', { min: 0, messaggioVuoto: 'Acqua utilizzata: inserisci i litri oppure seleziona "Non utilizzata"' });
    }
    scelta(12, 's12.gas', s12.gas, OPZIONI.gasIsolanti, 'Perdite o rabbocchi di gas isolanti');
    if (s12.gas === SI) {
      obbligatorio(12, 's12.gasApparecchiatura', s12.gasApparecchiatura, 'Gas isolanti – apparecchiatura');
      if (!s12.gasQuantitaNonNota) {
        numero(12, 's12.gasQuantita', s12.gasQuantita, 'Gas isolanti – quantità (kg)', { min: 0, messaggioVuoto: 'Gas isolanti – quantità: inserisci i kg oppure seleziona "Non nota"' });
      }
    }
  }

  // --- 13. Foto, allegati e firma
  {
    const foto = elencoFoto(dati);
    foto.forEach((v) => obbligatorio(13, `${v.percorso}.didascalia`, v.foto.didascalia, `Foto ${v.numero} – didascalia`));
    const totale = tutteLeFoto(dati).length;
    if (totale > MAX_FOTO) errore(13, 'foto', `Foto: sono ${totale}, il massimo è ${MAX_FOTO}. Elimina le foto in eccesso.`);
    else if (totale >= SOGLIA_AVVISO_FOTO) avviso(13, 'foto', `Foto: ne hai inserite ${totale}, il massimo è ${MAX_FOTO}.`);
    s13.allegati.forEach((a, i) => {
      const b = `s13.allegati.${a.id}`;
      scelta(13, `${b}.tipo`, a.tipo, OPZIONI.tipoAllegato, `Allegato ${i + 1} – tipo`, `${b}.tipoAltro`, a.tipoAltro);
      obbligatorio(13, `${b}.descrizione`, a.descrizione, `Allegato ${i + 1} – descrizione`);
    });
    obbligatorio(13, 's13.firma.nome', s13.firma.nome, 'Firma – nome e cognome del firmatario');
    obbligatorio(13, 's13.firma.ruolo', s13.firma.ruolo, 'Firma – ruolo');
    const stato = statoFirma(dati);
    if (stato === 'assente') errore(13, 's13.firma.immagine', 'Firma: manca la firma grafica');
    if (stato === 'decaduta') errore(13, 's13.firma.immagine', 'Firma: i dati sono cambiati dopo la firma, firma di nuovo');
  }

  // --- Stato delle sezioni
  const sezioni = {};
  for (let n = 1; n <= 13; n++) {
    const numeroErrori = errori.filter((e) => e.sezione === n).length;
    const facoltativa = SEZIONI_FACOLTATIVE.includes(n) && dati[`s${n}`].applicabile === NO;
    sezioni[n] = {
      errori: numeroErrori,
      stato: numeroErrori > 0 ? 'da-completare' : facoltativa ? 'non-applicabile' : 'completa',
    };
  }

  return { errori, avvisi, sezioni, valido: errori.length === 0 };
}
