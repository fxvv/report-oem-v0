// Definizione del documento PDF per pdfmake (A4 verticale, margini di 15 mm).
// Modulo puro: costruisce solo l'oggetto che descrive il documento, senza usare
// il browser. La generazione vera e propria è in pdf.js.

import { CONFIG, testoConfig } from './config.js';
import { codiceDaDati } from './codice.js';
import {
  dataIt,
  oraIt,
  dataOraIt,
  dataOraItDaDate,
  decimaleIt,
  numeroIt,
  eerIt,
  testoPdf,
  dataValida,
} from './formati.js';
import {
  TITOLI_SEZIONI,
  SI,
  NO,
  ALTRO,
  EVENTO,
  PROGRAMMATA,
  COMPONENTE_GENERALE,
  operazioniOrdinate,
  giornateOrdinate,
  elencoFoto,
  mappaNumeriFoto,
  riferimentoFoto,
  totaliSquadra,
  periodoGiornate,
  testoConAlternativa,
  testoScelta,
  testoScelteMultiple,
  etichettaComponente,
} from './modello.js';

const MM = 72 / 25.4;
export const MARGINE = 15 * MM;
const LARGHEZZA_A4 = 595.28;
const ALTEZZA_A4 = 841.89;
export const LARGHEZZA_UTILE = LARGHEZZA_A4 - 2 * MARGINE;
// Spazio riservato a intestazione e piè di pagina, dentro l'area utile.
const SPAZIO_INTESTAZIONE = 40;
const SPAZIO_PIE = 30;
const ALTEZZA_UTILE = ALTEZZA_A4 - 2 * MARGINE - SPAZIO_INTESTAZIONE - SPAZIO_PIE;

export const TESTO_FILIGRANA = 'BOZZA – NON VALIDA';
export const DICHIARAZIONE = 'Il sottoscritto dichiara che quanto riportato nel presente rapporto corrisponde alle attività eseguite.';

const COLORI = {
  testo: '#1a1a1a',
  tenue: '#555555',
  linea: '#9aa5b1',
  sfondoEtichetta: '#eef2f6',
  sfondoIntestazione: '#dde5ee',
  titolo: '#0b3d63',
  rosso: '#b00020',
};

const LAYOUT_CAMPI = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => COLORI.linea,
  vLineColor: () => COLORI.linea,
  fillColor: (riga, nodo, colonna) => (colonna === 0 ? COLORI.sfondoEtichetta : null),
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 2.5,
  paddingBottom: () => 2.5,
};

const LAYOUT_RIGHE = {
  ...LAYOUT_CAMPI,
  fillColor: (riga) => (riga === 0 ? COLORI.sfondoIntestazione : null),
};

// --- Piccoli aiuti per i testi

const t = (v) => testoPdf(v).trim();
const oTrattino = (v) => (t(v) === '' ? '—' : t(v));
const cella = (v) => (v && typeof v === 'object' ? v : { text: oTrattino(v) });
const unisci = (...parti) => parti.map(t).filter(Boolean).join(' – ');
const conUnita = (valore, unita, unitaAltro) => {
  const v = decimaleIt(valore);
  if (!v) return '';
  const u = unita === ALTRO ? t(unitaAltro) : unita;
  return u ? `${v} ${u}` : v;
};
const sceltaOAltro = (valore, altro) => (valore ? testoScelta(valore, altro) : '');

function titoloSezione(numero, opzioni = {}) {
  return { text: `${numero}. ${TITOLI_SEZIONI[numero]}`, style: 'titoloSezione', headlineLevel: 1, ...opzioni };
}

function sottotitolo(testo) {
  return { text: testo, style: 'sottotitolo', headlineLevel: 2 };
}

function nota(testo) {
  return { text: testo, style: 'nota' };
}

function nonApplicabile(testo = 'Non applicabile') {
  return { text: testo, style: 'nonApplicabile' };
}

// Stima per eccesso dell'altezza di una cella (testo a 9 pt), usata per decidere
// se tenere intere le righe di una tabella (dontBreakRows). pdfmake non riesce a
// spostare su più pagine una riga indivisibile più alta di una pagina: la
// taglierebbe. Le righe si tengono intere solo se sono tutte abbastanza basse.
const LARGHEZZA_CARATTERE = 5.4;
const ALTEZZA_LINEA = 9 * 1.15;
const ALTEZZA_MAX_RIGA_INDIVISIBILE = 400;

function altezzaCella(c, larghezza) {
  if (c && c.image) return (c.fit ? c.fit[1] : 80) + 6;
  const testo = typeof c === 'string' ? c : c && typeof c.text === 'string' ? c.text : '';
  const perLinea = Math.max(1, Math.floor(larghezza / LARGHEZZA_CARATTERE));
  const linee = testo.split('\n').reduce((n, r) => n + Math.max(1, Math.ceil(r.length / perLinea)), 0);
  return linee * ALTEZZA_LINEA + 6;
}

function righeBasse(corpo, widths) {
  const fisse = widths.filter((w) => typeof w === 'number');
  const stelle = widths.length - fisse.length;
  const libera = LARGHEZZA_UTILE - fisse.reduce((a, b) => a + b, 0) - widths.length * 9;
  const larghezze = widths.map((w) => (typeof w === 'number' ? w : Math.max(20, libera / Math.max(1, stelle))));
  return corpo.every((riga) => Math.max(...riga.map((c, i) => altezzaCella(c, larghezze[i]))) < ALTEZZA_MAX_RIGA_INDIVISIBILE);
}

// Tabella a due colonne: etichetta | valore.
function tabellaCampi(righe) {
  const widths = [140, '*'];
  const corpo = righe.map(([etichetta, valore]) => [{ text: etichetta, style: 'etichetta' }, cella(valore)]);
  return {
    table: { widths, body: corpo, dontBreakRows: righeBasse(corpo, widths) },
    layout: LAYOUT_CAMPI,
    margin: [0, 0, 0, 8],
  };
}

// Tabella delle righe ripetibili: l'intestazione si ripete a ogni cambio pagina.
function tabellaRighe(intestazioni, righe, widths) {
  const corpo = righe.map((r) => r.map(cella));
  return {
    table: {
      headerRows: 1,
      keepWithHeaderRows: 1,
      dontBreakRows: righeBasse(corpo, widths),
      widths,
      body: [intestazioni.map((x) => ({ text: x, style: 'th' })), ...corpo],
    },
    layout: LAYOUT_RIGHE,
    style: 'tabella',
    margin: [0, 0, 0, 8],
  };
}

// Didascalia della foto nell'allegato fotografico.
export function didascaliaFoto(voce) {
  const f = voce.foto;
  const didascalia = t(f.didascalia) || '(didascalia mancante)';
  const dimensioni = f.larghezzaOriginale && f.altezzaOriginale ? ` (${f.larghezzaOriginale}×${f.altezzaOriginale} px)` : '';
  return `Foto ${voce.numero} – ${didascalia} – Rif.: ${voce.riferimento} – File originale: ${t(f.nomeOriginale) || '—'}${dimensioni}`;
}

// --- Documento

// opzioni:
// - revisione: numero di revisione da stampare;
// - bozza: true per la bozza con filigrana;
// - generatoIl: Date della generazione;
// - immagini: { idFoto: dataURL JPEG } delle foto da stampare;
// - firmaValida: true se la firma grafica è valida (non decaduta).
export function creaDocumentoPdf(dati, { config = CONFIG, revisione = 0, bozza = false, generatoIl = new Date(), immagini = {}, firmaValida = false } = {}) {
  const codice = codiceDaDati(dati, config);
  const cfg = (chiave) => testoConfig(config, chiave);
  const numeriFoto = mappaNumeriFoto(dati);
  const fotoStampate = elencoFoto(dati);
  const componenti = dati.s7.componenti;
  const etichettaComp = (id) => {
    if (id === COMPONENTE_GENERALE) return 'Generale';
    const i = componenti.findIndex((c) => c.id === id);
    return i < 0 ? '' : `${i + 1} – ${etichettaComponente(componenti[i], i)}`;
  };
  const immaginiPdf = {};
  const chiaveFoto = (id) => (immagini[id] ? `foto_${id}` : null);
  fotoStampate.forEach((v) => {
    if (immagini[v.foto.id]) immaginiPdf[`foto_${v.foto.id}`] = immagini[v.foto.id];
  });
  if (firmaValida && dati.s13.firma.immagine) immaginiPdf.firma = dati.s13.firma.immagine;

  const { s1, s2, s3, s4, s6, s7, s9, s10, s11, s12, s13 } = dati;
  const contenuto = [];

  // --- Prima pagina: riepilogo
  const periodo = periodoGiornate(dati);
  const testoPeriodo = !periodo.dal ? '' : periodo.dal === periodo.al ? dataIt(periodo.dal) : `dal ${dataIt(periodo.dal)} al ${dataIt(periodo.al)}`;
  const f = s1.fornitore;
  const c = s1.compilatore;
  const righeRiepilogo = [
    ['Codice rapporto', codice],
    ['Revisione', `Rev. ${revisione}`],
    ['Ticket collegati', s1.ticket.map((x) => t(x.testo)).filter(Boolean).join(', ') || 'Nessuno'],
    ['Impianto', `${cfg('codiceImpianto')} – ${cfg('nomeImpianto')}`],
    ['Tipologia impianto', cfg('tipologiaImpianto')],
  ];
  if (cfg('potenzaKwp')) righeRiepilogo.push(['Potenza (kWp)', cfg('potenzaKwp')]);
  righeRiepilogo.push(
    ['Ubicazione', cfg('ubicazione')],
    ['Coordinate (WGS84)', cfg('coordinate')],
    ['Committente', `${cfg('committente')}\n${cfg('sedeCommittente')}\nP.IVA ${cfg('pivaCommittente')} – REA ${cfg('reaCommittente')}`],
    ['Fornitore', [t(f.ragioneSociale), `${f.estero ? 'Identificativo fiscale (fornitore estero)' : 'P.IVA'} ${t(f.piva)}`, t(f.sede), `Sigla ${t(f.sigla)}`].filter((x) => x.trim()).join('\n')],
    ['Compilatore', [unisci(c.nome, c.ruolo), unisci(c.email, c.telefono)].filter(Boolean).join('\n')],
    ['Periodo', testoPeriodo],
    ['Oggetto', s2.oggetto],
    ['Tipologie', testoScelteMultiple(s2.tipologie, s2.tipologiaAltro)],
    ['Regime', s2.regime],
  );
  contenuto.push(
    { text: 'RAPPORTO DI INTERVENTO', style: 'titolo' },
    { text: `${codice}   ·   Rev. ${revisione}`, style: 'codiceTitolo' },
  );
  if (bozza) {
    contenuto.push({ text: 'BOZZA – NON VALIDA: la verifica ha trovato campi mancanti o non validi.', style: 'avvisoBozza' });
  }
  contenuto.push(
    { text: 'Riepilogo', style: 'titoloSezione' },
    nota('Comprende i dati della sezione 1. Identificazione.'),
    { ...tabellaCampi(righeRiepilogo), margin: [0, 4, 0, 8] },
  );

  // --- 2. Inquadramento (da pagina nuova)
  contenuto.push(titoloSezione(2, { pageBreak: 'before' }));
  contenuto.push(
    tabellaCampi([
      ["Oggetto dell'intervento", s2.oggetto],
      ['Tipologie', testoScelteMultiple(s2.tipologie, s2.tipologiaAltro)],
      ['Regime', s2.regime],
      ['Riferimento offerta o ordine', s2.riferimentoOfferta],
      ['Coperto da garanzia (non addebitabile)', s2.garanzia],
    ]),
  );

  // --- 3. Evento e tempi
  const statoImpianto = (stato, potenza) => (stato === 'Limitato' ? `Limitato – potenza disponibile ${decimaleIt(potenza) || '—'} %` : stato);
  const righe3 = [["Origine dell'attività", s3.origine]];
  if (s3.origine === EVENTO) {
    righe3.push(["Data e ora dell'evento", s3.eventoNonNota ? 'Non nota' : dataOraIt(s3.eventoDataOra)]);
    if (!s3.eventoNonNota) righe3.push(["Fonte dell'orario dell'evento", sceltaOAltro(s3.fonteOrario, s3.fonteOrarioAltro)]);
    righe3.push(['Modalità di rilevazione', sceltaOAltro(s3.rilevazione, s3.rilevazioneAltro)]);
  } else if (s3.origine === PROGRAMMATA) {
    righe3.push(["Evento (data e ora, fonte, rilevazione)", 'Non applicabile (attività programmata)']);
  }
  righe3.push(
    ['Arrivo in sito', dataOraIt(s3.arrivo)],
    ['Riarmo o ripristino', dataOraIt(s3.riarmo)],
    ['Fine attività', dataOraIt(s3.fine)],
    ["Stato dell'impianto prima", statoImpianto(s3.statoPrima, s3.potenzaPrima)],
    ["Stato dell'impianto dopo", statoImpianto(s3.statoDopo, s3.potenzaDopo)],
  );
  contenuto.push(titoloSezione(3), tabellaCampi(righe3));

  // --- 4. Riarmo
  contenuto.push(titoloSezione(4));
  if (s4.applicabile === SI) {
    contenuto.push(
      tabellaCampi([
        ['Protezioni intervenute', testoScelteMultiple(s4.protezioni, s4.protezioniAltro)],
        ['Segnalazioni lette su relè o apparecchiature', s4.segnalazioni],
        ['Foto delle segnalazioni', s4.fotoNonDisponibile ? `Foto non disponibile – motivo: ${t(s4.fotoMotivo) || '—'}` : riferimentoFoto(s4.foto, numeriFoto)],
        ['Causa dello scatto', sceltaOAltro(s4.causa, s4.causaAltro)],
        ['Verifiche eseguite prima del riarmo', s4.verifiche],
        ['Riarmo autorizzato da', [unisci(s4.autorizzatoNome, s4.autorizzatoRuolo), s4.autorizzatoModalita ? `Modalità: ${sceltaOAltro(s4.autorizzatoModalita, s4.autorizzatoModalitaAltro)}` : ''].filter(Boolean).join('\n')],
      ]),
    );
  } else {
    contenuto.push(nonApplicabile(s4.applicabile === NO ? 'Non applicabile' : 'Applicabilità non indicata'));
  }

  // --- 5. Squadra e mezzi, per giornata
  contenuto.push(titoloSezione(5));
  const giornate = giornateOrdinate(dati);
  if (giornate.length === 0) contenuto.push(nota('Nessuna giornata indicata.'));
  giornate.forEach((g, i) => {
    contenuto.push(sottotitolo(`Giornata ${i + 1} – ${dataIt(g.data) || 'data non indicata'}`));
    if (g.persone.length) {
      contenuto.push(
        tabellaRighe(
          ['Nome e cognome', 'Organizzazione', 'Ruolo', 'Qualifica', 'Ore lavoro', 'Ore viaggio'],
          g.persone.map((p) => [p.nome, p.organizzazione, sceltaOAltro(p.ruolo, p.ruoloAltro), p.qualifica, decimaleIt(p.oreLavoro), decimaleIt(p.oreViaggio)]),
          ['*', '*', 80, 52, 40, 40],
        ),
      );
    } else {
      contenuto.push(nota('Nessuna persona indicata.'));
    }
    if (g.nessunMezzo) {
      contenuto.push({ text: [{ text: 'Mezzi: ', bold: true }, 'Nessun mezzo'], margin: [0, 0, 0, 8] });
    } else if (g.mezzi.length) {
      contenuto.push(
        tabellaRighe(
          ['Mezzo', 'Alimentazione', 'km andata e ritorno'],
          g.mezzi.map((m) => [sceltaOAltro(m.tipo, m.tipoAltro), sceltaOAltro(m.alimentazione, m.alimentazioneAltro), decimaleIt(m.km)]),
          ['*', '*', 90],
        ),
      );
    } else {
      contenuto.push(nota('Mezzi: non indicati.'));
    }
  });
  const totali = totaliSquadra(dati);
  contenuto.push(sottotitolo('Totali'));
  contenuto.push(
    tabellaRighe(
      ['Persona', 'Ore di lavoro', 'Ore di viaggio'],
      [
        ...totali.perPersona.map((p) => [p.nome, numeroIt(p.oreLavoro), numeroIt(p.oreViaggio)]),
        [{ text: 'Totale complessivo', bold: true }, { text: numeroIt(totali.oreLavoro), bold: true }, { text: numeroIt(totali.oreViaggio), bold: true }],
      ],
      ['*', 80, 80],
    ),
    tabellaCampi([['Km complessivi', numeroIt(totali.km)]]),
  );

  // --- 6. Sicurezza
  const siDescrizione = (valore, descrizione) => (valore === SI ? `Sì – ${t(descrizione) || '—'}` : valore);
  contenuto.push(
    titoloSezione(6),
    tabellaCampi([
      ['Responsabile impianto', unisci(s6.responsabileNome, s6.responsabileOrganizzazione)],
      ['Preposto ai lavori', s6.preposto],
      ['Manovre su apparecchiature elettriche', siDescrizione(s6.manovre, s6.manovreDescrizione)],
      ['DPI utilizzati', testoScelteMultiple(s6.dpi, s6.dpiAltro)],
      ['Anomalie di sicurezza riscontrate', s6.anomalie === SI ? [siDescrizione(s6.anomalie, s6.anomalieDescrizione), riferimentoFoto(s6.anomalieFoto, numeriFoto)].filter(Boolean).join('\n') : s6.anomalie],
      ['Incidenti o quasi incidenti', siDescrizione(s6.incidenti, s6.incidentiDescrizione)],
    ]),
  );

  // --- 7. Constatazione iniziale e sopralluogo
  contenuto.push(titoloSezione(7), tabellaCampi([['Situazione riscontrata', s7.situazione]]));
  contenuto.push(sottotitolo('Componenti e apparecchiature oggetto dell\'intervento'));
  if (componenti.length) {
    contenuto.push(
      tabellaRighe(
        ['N.', 'Area', 'Componente', 'Costruttore', 'Modello', 'Seriale'],
        componenti.map((x, i) => [String(i + 1), x.area, x.componente, testoConAlternativa(x.costruttore), testoConAlternativa(x.modello), testoConAlternativa(x.seriale)]),
        [16, 74, '*', 72, 72, 72],
      ),
    );
  } else {
    contenuto.push(nota('Nessun componente indicato.'));
  }
  contenuto.push(sottotitolo('Anomalie riscontrate'));
  if (s7.nessunaAnomalia) {
    contenuto.push({ text: 'Nessuna anomalia', margin: [0, 0, 0, 8] });
  } else if (s7.anomalie.length) {
    contenuto.push(
      tabellaRighe(
        ['N.', 'Area', 'Descrizione', 'Foto'],
        s7.anomalie.map((a, i) => [String(i + 1), a.area, a.descrizione, riferimentoFoto(a.foto, numeriFoto)]),
        [16, 80, '*', 64],
      ),
    );
  } else {
    contenuto.push(nota('Non indicate.'));
  }

  // --- 8. Registro operazioni
  contenuto.push(titoloSezione(8));
  const operazioni = operazioniOrdinate(dati);
  if (operazioni.length) {
    contenuto.push(
      tabellaRighe(
        ['N.', 'Data e orario', 'Tipo e componente', 'Descrizione', 'Esito e stato', 'Modalità', 'Foto'],
        operazioni.map((op, i) => [
          String(i + 1),
          [dataIt(op.data), op.oraInizio || op.oraFine ? `${oraIt(op.oraInizio) || '—'}–${oraIt(op.oraFine) || '—'}` : ''].filter(Boolean).join('\n'),
          [sceltaOAltro(op.tipo, op.tipoAltro), etichettaComp(op.componente)].filter(Boolean).join('\n'),
          op.descrizione,
          [op.esito, op.stato].filter(Boolean).join('\n'),
          op.modalita,
          riferimentoFoto(op.foto, numeriFoto),
        ]),
        [16, 52, 92, '*', 60, 42, 40],
      ),
    );
  } else {
    contenuto.push(nota('Nessuna operazione indicata.'));
  }

  // --- 9. Misure e attrezzature
  contenuto.push(titoloSezione(9));
  if (s9.applicabile === SI) {
    contenuto.push(sottotitolo('Attrezzature'));
    if (s9.attrezzature.length) {
      contenuto.push(
        tabellaRighe(
          ['N.', 'Tipo o descrizione', 'Produttore', 'Modello', 'Seriale', 'Certificato di taratura', 'Scadenza taratura'],
          s9.attrezzature.map((a, i) => [
            String(i + 1),
            a.tipo,
            a.produttore,
            a.modello,
            a.seriale,
            a.certificatoNonDisponibile ? 'Non disponibile' : a.certificato,
            a.scadenzaNonDisponibile ? 'Non disponibile' : dataIt(a.scadenza),
          ]),
          [16, '*', 64, 64, 64, 70, 54],
        ),
      );
    } else {
      contenuto.push(nota('Nessuna attrezzatura indicata.'));
    }
    contenuto.push(sottotitolo('Misure'));
    if (s9.nessunaMisura) {
      contenuto.push({ text: 'Nessuna misura', margin: [0, 0, 0, 8] });
    } else if (s9.misure.length) {
      contenuto.push(
        tabellaRighe(
          ['N.', 'Data', 'Grandezza', 'Punto di misura', 'Valore', 'Riferimento o soglia', 'Esito', 'Strumento'],
          s9.misure.map((m, i) => {
            const indice = s9.attrezzature.findIndex((a) => a.id === m.strumento);
            const a = s9.attrezzature[indice];
            let strumento = a ? `${indice + 1} – ${t(a.tipo)}` : '';
            if (a && !a.scadenzaNonDisponibile && dataValida(a.scadenza) && dataValida(m.data) && a.scadenza < m.data) {
              strumento += ' (taratura scaduta)';
            }
            return [String(i + 1), dataIt(m.data), m.grandezza, m.punto, conUnita(m.valore, m.unita, m.unitaAltro), m.riferimento, m.esito, strumento];
          }),
          [16, 52, 66, '*', 50, 58, 48, 70],
        ),
      );
    } else {
      contenuto.push(nota('Non indicate.'));
    }
  } else {
    contenuto.push(nonApplicabile(s9.applicabile === NO ? 'Non applicabile' : 'Applicabilità non indicata'));
  }

  // --- 10. Componenti utilizzati o sostituiti
  contenuto.push(titoloSezione(10));
  if (s10.applicabile === SI) {
    if (s10.righe.length) {
      contenuto.push(
        tabellaRighe(
          ['N.', 'Area e componente', 'Costruttore e modello', 'Quantità', 'Seriale vecchio e nuovo', 'Fornitore', 'Garanzia costruttore', 'Rif. sez. 7'],
          s10.righe.map((r, i) => {
            const rif = componenti.findIndex((x) => x.id === r.componenteRif);
            return [
              String(i + 1),
              [r.area, r.componente].map(t).filter(Boolean).join('\n'),
              [r.costruttore, r.modello].map(t).filter(Boolean).join('\n'),
              conUnita(r.quantita, r.unita, r.unitaAltro),
              `Vecchio: ${testoConAlternativa(r.serialeVecchio) || '—'}\nNuovo: ${testoConAlternativa(r.serialeNuovo) || '—'}`,
              r.fornitore,
              r.garanzia,
              rif < 0 ? '' : `Comp. ${rif + 1}`,
            ];
          }),
          [16, '*', 74, 44, 80, 62, 46, 52],
        ),
      );
    } else {
      contenuto.push(nota('Nessuna riga indicata.'));
    }
  } else {
    contenuto.push(nonApplicabile(s10.applicabile === NO ? 'Non applicabile' : 'Applicabilità non indicata'));
  }

  // --- 11. Esito
  const ipotesiNA = s3.origine === PROGRAMMATA && s11.ipotesiNonApplicabile;
  contenuto.push(
    titoloSezione(11),
    tabellaCampi([
      ['Constatazione finale', s11.constatazione],
      ["Ipotesi sull'origine del guasto", ipotesiNA ? 'Non applicabile (attività programmata)' : s11.ipotesi],
    ]),
    sottotitolo('Operazioni da eseguire'),
  );
  if (s11.nessunaOperazione) {
    contenuto.push({ text: 'Nessuna operazione da eseguire', margin: [0, 0, 0, 8] });
  } else if (s11.operazioni.length) {
    contenuto.push(
      tabellaRighe(
        ['N.', 'Descrizione', 'Priorità', 'A carico di', 'Entro'],
        s11.operazioni.map((o, i) => [String(i + 1), o.descrizione, o.priorita, o.carico, dataIt(o.entro)]),
        [16, '*', 46, 100, 54],
      ),
    );
  } else {
    contenuto.push(nota('Non indicate.'));
  }

  // --- 12. ESG (dati minimi)
  const gas = s12.gas === SI
    ? `Sì – apparecchiatura: ${t(s12.gasApparecchiatura) || '—'} – quantità: ${s12.gasQuantitaNonNota ? 'Non nota' : `${decimaleIt(s12.gasQuantita) || '—'} kg`}`
    : s12.gas;
  contenuto.push(
    titoloSezione(12),
    tabellaCampi([
      ['Km complessivi (dalla sezione 5)', numeroIt(totali.km)],
      ['Carburante consumato', s12.carburanteNonNoto ? 'Non noto' : conUnita(s12.carburante, 'l')],
      ['Acqua utilizzata', s12.acquaNonUtilizzata ? 'Non utilizzata' : conUnita(s12.acqua, 'l')],
      ['Perdite o rabbocchi di gas isolanti (es. SF6)', gas],
    ]),
    sottotitolo('Rifiuti prodotti'),
  );
  if (s12.nessunRifiuto) {
    contenuto.push({ text: 'Nessun rifiuto', margin: [0, 0, 0, 8] });
  } else if (s12.rifiuti.length) {
    contenuto.push(
      tabellaRighe(
        ['N.', 'Descrizione', 'Codice EER', 'Quantità', 'Destinazione'],
        s12.rifiuti.map((r, i) => [String(i + 1), r.descrizione, eerIt(r.eer), conUnita(r.quantita, r.unita), sceltaOAltro(r.destinazione, r.destinazioneAltro)]),
        [16, '*', 62, 56, 120],
      ),
    );
  } else {
    contenuto.push(nota('Non indicati.'));
  }

  // --- 13. Foto, allegati e firma
  contenuto.push(titoloSezione(13), sottotitolo('Riepilogo delle foto'));
  if (fotoStampate.length) {
    contenuto.push(
      tabellaRighe(
        ['N.', 'Miniatura', 'Didascalia', 'Riferimento', 'File originale'],
        fotoStampate.map((v) => {
          const chiave = chiaveFoto(v.foto.id);
          return [
            String(v.numero),
            chiave ? { image: chiave, fit: [46, 34], alignment: 'center' } : { text: '—' },
            v.foto.didascalia,
            v.riferimento,
            t(v.foto.nomeOriginale),
          ];
        }),
        [20, 54, '*', 96, 116],
      ),
    );
  } else {
    contenuto.push({ text: 'Nessuna foto', margin: [0, 0, 0, 8] });
  }
  contenuto.push(sottotitolo('Allegati inviati a parte'));
  if (s13.allegati.length) {
    contenuto.push(
      tabellaRighe(
        ['N.', 'Tipo', 'Descrizione', 'Nome del file'],
        s13.allegati.map((a, i) => [String(i + 1), sceltaOAltro(a.tipo, a.tipoAltro), a.descrizione, a.nomeFile]),
        [16, 100, '*', 130],
      ),
    );
  } else {
    contenuto.push({ text: 'Nessun allegato', margin: [0, 0, 0, 8] });
  }
  contenuto.push(nota(`Le foto originali ad alta risoluzione e gli allegati sono inviati a parte a: ${cfg('destinatarioFoto')}.`));
  const firma = s13.firma;
  contenuto.push({
    unbreakable: true,
    stack: [
      { text: DICHIARAZIONE, style: 'dichiarazione' },
      tabellaCampi([
        ['Firmatario', firma.nome],
        ['Ruolo', firma.ruolo],
        ['Data e ora della firma', firmaValida ? dataOraIt(firma.dataOra) : ''],
        ['Firma', firmaValida && immaginiPdf.firma ? { image: 'firma', fit: [190, 70] } : { text: 'Firma mancante o non valida', color: COLORI.rosso }],
      ]),
    ],
  });

  // --- Allegato fotografico: una foto per pagina
  fotoStampate.forEach((v, i) => {
    const didascalia = didascaliaFoto(v);
    const righeDidascalia = Math.ceil(didascalia.length / 95) + 1;
    const altezzaFoto = Math.max(200, ALTEZZA_UTILE - 30 - righeDidascalia * 12);
    const chiave = chiaveFoto(v.foto.id);
    contenuto.push({
      pageBreak: 'before',
      stack: [
        { text: `Allegato fotografico – foto ${i + 1} di ${fotoStampate.length}`, style: 'sottotitolo', margin: [0, 0, 0, 6] },
        chiave
          ? { image: chiave, fit: [LARGHEZZA_UTILE, altezzaFoto], alignment: 'center' }
          : { text: 'Immagine non disponibile', color: COLORI.rosso },
        { text: didascalia, style: 'didascalia', margin: [0, 6, 0, 0] },
      ],
    });
  });

  const testoCommittente = cfg('committente');
  const generato = dataOraItDaDate(generatoIl);

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [MARGINE, MARGINE + SPAZIO_INTESTAZIONE, MARGINE, MARGINE + SPAZIO_PIE],
    info: {
      title: `Rapporto di intervento ${codice} Rev. ${revisione}${bozza ? ' (BOZZA)' : ''}`,
      author: t(f.ragioneSociale),
      subject: t(s2.oggetto),
      creator: `Modulo ${config.versioneModulo}`,
    },
    header: (pagina, totalePagine) => ({
      margin: [MARGINE, MARGINE, MARGINE, 0],
      stack: [
        {
          columns: [
            { text: [{ text: 'RAPPORTO DI INTERVENTO', bold: true }, `   ${codice}   `, { text: `Rev. ${revisione}`, bold: true }], fontSize: 9 },
            { text: `Pagina ${pagina} di ${totalePagine}`, alignment: 'right', fontSize: 9, width: 100 },
          ],
        },
        { text: `Impianto: ${cfg('codiceImpianto')} – ${cfg('nomeImpianto')}   ·   Committente: ${testoCommittente}`, fontSize: 8.5, color: COLORI.tenue, margin: [0, 2, 0, 0] },
        { canvas: [{ type: 'line', x1: 0, y1: 4, x2: LARGHEZZA_UTILE, y2: 4, lineWidth: 0.6, lineColor: COLORI.linea }] },
      ],
    }),
    footer: () => ({
      margin: [MARGINE, 2, MARGINE, 0],
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LARGHEZZA_UTILE, y2: 0, lineWidth: 0.6, lineColor: COLORI.linea }] },
        { text: `${testoCommittente} – ${cfg('sedeCommittente')} – P.IVA ${cfg('pivaCommittente')} – REA ${cfg('reaCommittente')}`, fontSize: 7.5, color: COLORI.tenue, margin: [0, 3, 0, 0] },
        { text: `Modulo ${config.versioneModulo} – generato il ${generato}`, fontSize: 7.5, color: COLORI.tenue },
      ],
    }),
    watermark: bozza ? { text: TESTO_FILIGRANA, color: COLORI.rosso, opacity: 0.16, bold: true } : undefined,
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.15, color: COLORI.testo },
    styles: {
      titolo: { fontSize: 16, bold: true, color: COLORI.titolo, margin: [0, 0, 0, 2] },
      codiceTitolo: { fontSize: 11, margin: [0, 0, 0, 10] },
      avvisoBozza: { color: COLORI.rosso, bold: true, margin: [0, 0, 0, 8] },
      titoloSezione: { fontSize: 11.5, bold: true, color: COLORI.titolo, margin: [0, 8, 0, 4] },
      sottotitolo: { fontSize: 10, bold: true, margin: [0, 4, 0, 3] },
      etichetta: { bold: true, fontSize: 9 },
      th: { bold: true, fontSize: 9 },
      tabella: { fontSize: 9 },
      nota: { fontSize: 9, color: COLORI.tenue, margin: [0, 0, 0, 6] },
      nonApplicabile: { italics: true, color: COLORI.tenue, margin: [0, 0, 0, 8] },
      dichiarazione: { fontSize: 10, margin: [0, 10, 0, 6] },
      didascalia: { fontSize: 9.5 },
    },
    content: contenuto,
    images: immaginiPdf,
    // Un titolo non resta da solo in fondo alla pagina: si passa alla pagina
    // successiva se è nell'ultimo 15% della pagina o se non lo segue nulla.
    pageBreakBefore: (nodo, nodi) =>
      !!nodo.headlineLevel && (nodo.startPosition.verticalRatio > 0.85 || nodi.getFollowingNodesOnPage().length === 0),
  };
}
