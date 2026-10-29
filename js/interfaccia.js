// Interfaccia: costruzione della pagina, gestione degli eventi, salvataggio
// automatico, verifica, foto, firma, PDF, esportazione e importazione.

import { CONFIG, campiConfigMancanti } from './config.js';
import { h, sostituisciFigli, attendiDisegno } from './dom.js';
import { apriDialogo, conferma, avviso, mostraAvanzamento, nascondiAvanzamento, messaggio } from './dialoghi.js';
import * as archivio from './archivio.js';
import { elaboraFoto, miniaturaDaImmagine } from './foto.js';
import { creaAreaFirma } from './firma.js';
import { caricaPdfmake, generaPdf, scaricaFile } from './pdf.js';
import { creaDocumentoPdf } from './pdf-documento.js';
import { valida } from './validazione.js';
import { codiceDaDati } from './codice.js';
import { verificaPartitaIva } from './piva.js';
import { impronta, improntaContenuto, statoFirma, prossimaRevisione, revisioneCorrente } from './revisione.js';
import { creaFileBozza, leggiFileBozza } from './bozza.js';
import {
  OPZIONI,
  TITOLI_SEZIONI,
  SEZIONI_FACOLTATIVE,
  MAX_FOTO,
  SOGLIA_AVVISO_FOTO,
  nuovaBozza,
  normalizzaBozza,
  nuovaRiga,
  risolviPercorso,
  impostaPercorso,
  eliminaRiga,
  elencoFoto,
  tutteLeFoto,
  mappaNumeriFoto,
  operazioniOrdinate,
  totaliSquadra,
  prepostiSuggeriti,
} from './modello.js';
import { contenutoSezione, opzioniComponenti, opzioniStrumenti, testoConfigEvidenziato, CONSIGLIO_ESPORTA } from './sezioni.js';
import { dataOraIt, dataOraIsoLocale, oraItDaDate, numeroIt, nomeFilePdf, nomeFileBozza, eerIt, eerValido } from './formati.js';

export const VERSIONE_SOFTWARE = 'V0 – versione del 29/10/2026';

const RITARDO_SALVATAGGIO = 500;
const RITARDO_AGGIORNAMENTO = 150;
const CHIAVE_SEZIONI_APERTE = 'rapporto-v0-sezioni-aperte';

const stato = {
  dati: null,
  miniature: new Map(),
  esito: null,
  aperte: new Set([1]),
  mostraErrori: false,
  timerSalvataggio: null,
  timerAggiornamento: null,
  destinazioneFoto: null,
  areaFirma: null,
  ultimoStatoFirma: null,
  operazioniInCorso: false,
};

const $ = (id) => document.getElementById(id);

// --- Avvio

export async function avvia() {
  costruisciPagina();
  collegaEventi();
  mostraAvvisoConfigurazione();
  const archivioPersistente = await archivio.inizializzaArchivio();
  if (!archivioPersistente) {
    aggiungiAvviso('archivio', 'Salvataggio automatico non disponibile in questo browser: i dati restano solo finché la pagina è aperta. Esporta la bozza per non perderli.');
  }

  let dati = null;
  try {
    const salvata = await archivio.caricaBozza();
    if (salvata) dati = normalizzaBozza(salvata);
  } catch (errore) {
    aggiungiAvviso('lettura', `Non è stato possibile leggere la bozza salvata (${errore.message}).`);
  }
  const primaApertura = !dati;
  stato.dati = dati || nuovaBozza(new Date());
  try {
    stato.miniature = new Map(Object.entries(await archivio.caricaMiniature()));
  } catch {
    stato.miniature = new Map();
  }

  ridisegnaTutto();
  if (primaApertura) {
    await salvaOra();
    // alla prima apertura si chiede di non cancellare i dati in automatico
    archivio.richiediPersistenza();
  } else {
    mostraStatoSalvataggio('Dati ripristinati da questo dispositivo');
  }

  // pdfmake si carica subito: così il PDF si genera anche senza connessione
  caricaPdfmake().catch(() => {});
  completaMiniatureMancanti();
  archivio.eliminaOrfane(tutteLeFoto(stato.dati).map((v) => v.foto.id)).catch(() => {});
  controllaAltreSchede();
}

// --- Struttura della pagina

function costruisciPagina() {
  try {
    const salvate = JSON.parse(localStorage.getItem(CHIAVE_SEZIONI_APERTE) || 'null');
    if (Array.isArray(salvate)) stato.aperte = new Set(salvate.filter((n) => Number.isInteger(n)));
  } catch {
    // localStorage non disponibile: si usa il predefinito
  }

  const contenitore = $('sezioni');
  for (let n = 1; n <= 13; n++) {
    const dettagli = h(
      'details',
      { classe: 'sezione', id: `sezione-${n}`, dataset: { sezione: n }, open: stato.aperte.has(n) },
      h(
        'summary',
        {},
        h(
          'span',
          { classe: 'sezione-titolo' },
          h('span', { classe: 'sezione-numero' }, `${n}.`),
          ` ${TITOLI_SEZIONI[n]}`,
          SEZIONI_FACOLTATIVE.includes(n) ? h('small', {}, ' (se applicabile)') : null,
        ),
        h('span', { classe: 'stato-sezione', id: `stato-sezione-${n}` }, ''),
      ),
      h('div', { classe: 'sezione-corpo', id: `corpo-sezione-${n}` }),
    );
    dettagli.addEventListener('toggle', () => {
      if (dettagli.open) stato.aperte.add(n);
      else stato.aperte.delete(n);
      try {
        localStorage.setItem(CHIAVE_SEZIONI_APERTE, JSON.stringify(Array.from(stato.aperte)));
      } catch {
        // ignorato
      }
      if (n === 13 && dettagli.open && stato.areaFirma) stato.areaFirma.adatta();
    });
    contenitore.append(dettagli);
  }

  // suggerimenti per i campi di testo
  document.body.append(
    h('datalist', { id: 'lista-aree' }, OPZIONI.aree.map((a) => h('option', { value: a }))),
    h('datalist', { id: 'lista-grandezze' }, OPZIONI.grandezze.map((a) => h('option', { value: a }))),
    h('datalist', { id: 'lista-preposti' }),
  );

  // dati di testata in sola lettura
  const voci = [
    ['Impianto', [CONFIG.codiceImpianto, ' – ', testoConfigEvidenziato(CONFIG, 'nomeImpianto')]],
    ['Tipologia', testoConfigEvidenziato(CONFIG, 'tipologiaImpianto')],
    String(CONFIG.potenzaKwp || '').trim() ? ['Potenza (kWp)', testoConfigEvidenziato(CONFIG, 'potenzaKwp')] : null,
    ['Ubicazione', testoConfigEvidenziato(CONFIG, 'ubicazione')],
    ['Coordinate', testoConfigEvidenziato(CONFIG, 'coordinate')],
    ['Committente', testoConfigEvidenziato(CONFIG, 'committente')],
    ['Sede', testoConfigEvidenziato(CONFIG, 'sedeCommittente')],
    ['P.IVA e REA', ['P.IVA ', testoConfigEvidenziato(CONFIG, 'pivaCommittente'), ' – REA ', testoConfigEvidenziato(CONFIG, 'reaCommittente')]],
  ].filter(Boolean);
  sostituisciFigli(
    $('dati-impianto'),
    voci.map(([etichetta, valore]) => h('div', {}, h('dt', {}, etichetta), h('dd', {}, valore))),
  );
}

function aggiungiAvviso(chiave, testo, classe = 'avviso-rosso') {
  let el = document.querySelector(`[data-avviso="${chiave}"]`);
  if (!el) {
    el = h('div', { classe, role: 'alert', dataset: { avviso: chiave } });
    $('avvisi').append(el);
  }
  el.textContent = testo;
  el.hidden = false;
  return el;
}

function rimuoviAvviso(chiave) {
  const el = document.querySelector(`[data-avviso="${chiave}"]`);
  if (el) el.remove();
}

function mostraAvvisoConfigurazione() {
  const mancanti = campiConfigMancanti(CONFIG);
  if (mancanti.length === 0) return;
  aggiungiAvviso(
    'configurazione',
    `Configurazione incompleta: ${mancanti.map((m) => m.etichetta).join(', ')}. Nel PDF questi dati compariranno come «DA COMPILARE». Avvisa il committente.`,
  );
}

// Avvisa se la pagina è aperta in più schede: ognuna salverebbe sopra l'altra.
function controllaAltreSchede() {
  if (typeof BroadcastChannel !== 'function') return;
  const canale = new BroadcastChannel('rapporto-intervento-v0');
  const segnala = () => aggiungiAvviso('schede', 'La pagina è aperta anche in un\'altra scheda o finestra: usa una sola scheda, altrimenti le modifiche si sovrascrivono.');
  canale.onmessage = (e) => {
    if (e.data === 'ciao') canale.postMessage('presente');
    if (e.data === 'ciao' || e.data === 'presente') segnala();
  };
  canale.postMessage('ciao');
}

// --- Disegno delle sezioni

function contestoDisegno() {
  return { dati: stato.dati, config: CONFIG, miniature: stato.miniature, numeriFoto: mappaNumeriFoto(stato.dati) };
}

function ridisegnaTutto() {
  ridisegnaSezioni([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
}

// Ridisegna le sezioni indicate e riporta il cursore sul campo che lo aveva.
function ridisegnaSezioni(numeri) {
  const attivo = document.activeElement;
  const percorsoAttivo = attivo && attivo.dataset ? attivo.dataset.percorso : null;
  const valoreAttivo = attivo && (attivo.type === 'radio' || attivo.type === 'checkbox') ? attivo.value : null;
  const contesto = contestoDisegno();
  for (const n of new Set(numeri)) {
    sostituisciFigli($(`corpo-sezione-${n}`), contenutoSezione(n, contesto));
    if (n === 13) preparaFirma();
  }
  if (percorsoAttivo && (!document.activeElement || document.activeElement === document.body)) {
    let selettore = `[data-percorso="${CSS.escape(percorsoAttivo)}"]`;
    if (valoreAttivo !== null) selettore += `[value="${CSS.escape(valoreAttivo)}"]`;
    const el = document.querySelector(selettore);
    if (el && !el.disabled) el.focus({ preventScroll: true });
  }
  aggiornaDerivati();
}

// Sezioni da ridisegnare dopo una scelta nella sezione n.
function sezioniDipendenti(n) {
  const s = new Set([n]);
  if (n === 3) s.add(11); // "Attività programmata" abilita l'ipotesi non applicabile
  if (n === 4) s.add(3); // il riarmo diventa obbligatorio
  if (n === 4 || n === 6 || n === 7 || n === 8) s.add(13); // foto stampate e numerazione
  return s;
}

const numeroSezione = (percorso) => {
  const m = /^s(\d+)\./.exec(percorso);
  return m ? Number(m[1]) : 1;
};

// --- Eventi

function collegaEventi() {
  const radice = $('sezioni');
  radice.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset || el.dataset.percorso === undefined) return;
    if (el.type === 'radio' || el.type === 'checkbox' || el.tagName === 'SELECT') return; // gestiti con "change"
    applicaValore(el, false);
  });
  radice.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.dataset || el.dataset.percorso === undefined) return;
    applicaValore(el, true);
  });
  // le operazioni si riordinano quando si esce dai campi di data e ora
  radice.addEventListener('focusout', (e) => {
    if (e.target.dataset && e.target.dataset.riordina !== undefined) setTimeout(riordinaOperazioniSeServe, 0);
  });
  document.addEventListener('click', gestisciClic);

  // su telefono la barra in basso si nasconde mentre la tastiera è aperta
  document.addEventListener('focusin', aggiornaBarraConTastiera);
  document.addEventListener('focusout', () => setTimeout(aggiornaBarraConTastiera, 0));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', aggiornaBarraConTastiera);

  // salvataggio immediato quando la pagina passa in secondo piano o si chiude
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && stato.timerSalvataggio) salvaOra();
  });
  window.addEventListener('pagehide', () => {
    if (stato.timerSalvataggio) salvaOra();
  });

  let timerRidimensiona = null;
  window.addEventListener('resize', () => {
    clearTimeout(timerRidimensiona);
    timerRidimensiona = setTimeout(() => stato.areaFirma && stato.areaFirma.adatta(), 250);
  });

  $('input-foto').addEventListener('change', (e) => {
    const file = Array.from(e.target.files || []);
    e.target.value = '';
    aggiungiFoto(file);
  });
  $('input-bozza').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) importaBozza(file);
  });
}

// La tastiera aperta riduce l'area visibile (visualViewport): solo allora la barra
// si nasconde. Così riappare anche se la tastiera si chiude senza uscire dal campo
// (tasto Indietro su Android).
function aggiornaBarraConTastiera() {
  const t = document.activeElement;
  const testuale = !!t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'file'].includes(t.type)));
  const vv = window.visualViewport;
  const tastiera = vv ? window.innerHeight - vv.height > 150 : true;
  document.body.classList.toggle('in-scrittura', testuale && tastiera);
}

function applicaValore(el, daChange) {
  const percorso = el.dataset.percorso;
  let valore;
  if (el.type === 'checkbox' && el.dataset.multipla !== undefined) {
    const gruppo = el.closest('fieldset');
    valore = Array.from(gruppo.querySelectorAll('input[type=checkbox]')).filter((x) => x.checked).map((x) => x.value);
  } else if (el.type === 'checkbox' && el.dataset.valoreCasella !== undefined) {
    valore = el.checked ? el.dataset.valoreCasella : '';
  } else if (el.type === 'checkbox') {
    valore = el.checked;
  } else if (el.type === 'radio') {
    if (!el.checked) return;
    valore = el.value;
  } else {
    valore = el.value;
  }

  // correzioni durante la scrittura
  if (el.dataset.trasforma === 'sigla') {
    valore = valore.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    if (el.value !== valore) el.value = valore;
  } else if (el.dataset.trasforma === 'progressivo') {
    valore = valore.replace(/\D/g, '').slice(0, 2);
    if (daChange && valore.length === 1) valore = valore.padStart(2, '0');
    if (el.value !== valore) el.value = valore;
  } else if (el.dataset.trasforma === 'eer' && daChange && eerValido(valore)) {
    valore = eerIt(valore);
    el.value = valore;
  }

  if (!impostaPercorso(stato.dati, percorso, valore)) return;
  sincronizzaCampi(percorso, el, valore);
  aggiornaContatore(el);
  const scelta = el.type === 'radio' || el.type === 'checkbox' || el.tagName === 'SELECT';
  if (daChange && scelta) ridisegnaSezioni(sezioniDipendenti(numeroSezione(percorso)));
  dopoModifica({ subito: daChange });
}

// Aggiorna gli altri campi con lo stesso percorso (es. didascalia nella sezione e nel riepilogo).
function sincronizzaCampi(percorso, sorgente, valore) {
  if (typeof valore !== 'string') return;
  document.querySelectorAll(`[data-percorso="${CSS.escape(percorso)}"]`).forEach((el) => {
    if (el !== sorgente && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') && el.type !== 'radio' && el.type !== 'checkbox' && el.value !== valore) {
      el.value = valore;
    }
  });
}

function aggiornaContatore(el) {
  const contatore = document.querySelector(`[data-contatore-per="${CSS.escape(el.dataset.percorso)}"]`);
  if (!contatore) return;
  if (contatore.dataset.minimo) contatore.textContent = `${el.value.trim().length} caratteri (minimo ${contatore.dataset.minimo})`;
  else if (el.dataset.massimo) contatore.textContent = `${el.value.length}/${el.dataset.massimo}`;
}

function dopoModifica({ subito = false } = {}) {
  pianificaSalvataggio();
  clearTimeout(stato.timerAggiornamento);
  if (subito) aggiornaDerivati();
  else stato.timerAggiornamento = setTimeout(aggiornaDerivati, RITARDO_AGGIORNAMENTO);
}

function riordinaOperazioniSeServe() {
  const corpo = $('corpo-sezione-8');
  const nelDom = Array.from(corpo.querySelectorAll('[data-elenco="s8.operazioni"] > .scheda')).map((s) => s.dataset.riga);
  const ordinate = operazioniOrdinate(stato.dati).map((op) => op.id);
  if (nelDom.join() !== ordinate.join()) {
    ridisegnaSezioni([8, 13]);
    messaggio('Operazioni riordinate per data e ora.');
  }
}

async function gestisciClic(e) {
  const pulsante = e.target.closest('[data-azione]');
  if (!pulsante) return;
  const { azione } = pulsante.dataset;
  switch (azione) {
    case 'apri-menu':
      return apriMenu();
    case 'verifica':
      stato.mostraErrori = true;
      aggiornaDerivati();
      return apriVerifica();
    case 'scarica-pdf':
      return scaricaPdf();
    case 'aggiungi-riga':
      return aggiungiRiga(pulsante.dataset.elenco, pulsante.dataset.tipo);
    case 'elimina-riga':
      return eliminaRigaConConferma(pulsante.dataset.elenco, pulsante.dataset.id, pulsante.dataset.nome);
    case 'duplica-giornata':
      return duplicaGiornata(pulsante.dataset.id);
    case 'aggiungi-foto':
      stato.destinazioneFoto = pulsante.dataset.elenco;
      $('input-foto').click();
      return undefined;
    case 'elimina-foto':
      return eliminaFotoConConferma(pulsante.dataset.elenco, pulsante.dataset.id);
    case 'cambia-segno':
      return cambiaSegno(pulsante.dataset.percorso);
    case 'cancella-firma':
      return cancellaFirma();
    case 'usa-preposto':
      return usaPreposto(pulsante.dataset.valore);
    case 'esporta-bozza':
      return esportaBozza();
    case 'importa-bozza':
      $('input-bozza').click();
      return undefined;
    case 'nuovo-rapporto':
      return nuovoRapporto();
    case 'istruzioni':
      return apriIstruzioni();
    default:
      return undefined;
  }
}

// --- Salvataggio

function mostraStatoSalvataggio(testo, errore = false) {
  const el = $('stato-salvataggio');
  el.textContent = testo;
  el.classList.toggle('errore', errore);
}

function pianificaSalvataggio() {
  clearTimeout(stato.timerSalvataggio);
  mostraStatoSalvataggio('Modifiche in corso…');
  stato.timerSalvataggio = setTimeout(salvaOra, RITARDO_SALVATAGGIO);
}

async function salvaOra() {
  clearTimeout(stato.timerSalvataggio);
  stato.timerSalvataggio = null;
  try {
    await archivio.salvaBozza(stato.dati);
    const ora = oraItDaDate(new Date());
    mostraStatoSalvataggio(archivio.archivioInMemoria() ? `Solo in memoria (${ora}): esporta la bozza` : `Salvato alle ${ora}`, archivio.archivioInMemoria());
  } catch (errore) {
    mostraStatoSalvataggio('Errore di salvataggio: esporta la bozza', true);
    messaggio(`Salvataggio non riuscito (${errore.message}). Esporta la bozza dal menu.`, 8000);
  }
}

// --- Aggiornamento di stati, totali, opzioni e messaggi (dopo ogni modifica)

function aggiornaDerivati() {
  clearTimeout(stato.timerAggiornamento);
  const dati = stato.dati;
  const esito = valida(dati);
  stato.esito = esito;

  for (let n = 1; n <= 13; n++) {
    const s = esito.sezioni[n];
    const el = $(`stato-sezione-${n}`);
    el.className = `stato-sezione ${s.stato}`;
    el.textContent = s.stato === 'completa' ? 'Completa' : s.stato === 'non-applicabile' ? 'Non applicabile' : `Da completare (${s.errori})`;
  }

  const codice = codiceDaDati(dati);
  const improntaAttuale = improntaContenuto(dati, { conFirma: true });
  const revisione = prossimaRevisione(dati.revisione, improntaAttuale);
  const testoRevisione = descriviRevisione(dati.revisione, revisione, improntaAttuale);
  $('codice-rapporto').textContent = codice;
  $('revisione-rapporto').textContent = testoRevisione;
  if ($('s1-codice')) $('s1-codice').textContent = codice;
  if ($('s1-revisione')) $('s1-revisione').textContent = testoRevisione;

  const pulsantePdf = $('pulsante-pdf');
  pulsantePdf.textContent = esito.valido ? 'Scarica PDF' : 'Scarica bozza PDF';
  pulsantePdf.classList.toggle('bozza', !esito.valido);
  $('conteggio-verifica').textContent = esito.valido ? '✓' : String(esito.errori.length);
  $('conteggio-verifica').classList.toggle('ok', esito.valido);

  aggiornaMessaggiInLinea(esito);
  aggiornaTotali();
  aggiornaOpzioniDinamiche();
  aggiornaPreposti();
  aggiornaNumeriFoto();
  aggiornaEsitoPiva();
  aggiornaFirma();
}

function descriviRevisione(rev, prossima, improntaAttuale) {
  if (!Number.isInteger(rev.numero)) return `Rev. ${prossima} – sarà assegnata al primo PDF valido`;
  const quando = dataOraIt(rev.generatoIl);
  if (rev.impronta === improntaAttuale) return `Rev. ${rev.numero} – PDF valido generato il ${quando}`;
  return `Rev. ${prossima} al prossimo PDF valido (dati modificati dopo la Rev. ${rev.numero} del ${quando})`;
}

// Errori e avvisi accanto ai campi: gli errori compaiono dopo la prima "Verifica".
function aggiornaMessaggiInLinea(esito) {
  const breve = (m) => {
    const i = m.indexOf(': ');
    return i >= 0 ? m.slice(i + 2) : m;
  };
  const errori = new Map();
  for (const e of esito.errori) {
    if (!errori.has(e.percorso)) errori.set(e.percorso, []);
    errori.get(e.percorso).push(breve(e.messaggio));
  }
  document.querySelectorAll('[data-errore-per]').forEach((p) => {
    const elenco = stato.mostraErrori ? errori.get(p.dataset.errorePer) : null;
    p.hidden = !elenco;
    p.textContent = elenco ? elenco.join(' · ') : '';
  });
  document.querySelectorAll('[data-campo]').forEach((c) => {
    c.classList.toggle('con-errore', stato.mostraErrori && errori.has(c.dataset.campo));
  });
  document.querySelectorAll('[data-percorso]').forEach((el) => {
    if (stato.mostraErrori && errori.has(el.dataset.percorso)) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  });
  const avvisi = new Map(esito.avvisi.map((a) => [a.percorso, a.messaggio]));
  document.querySelectorAll('[data-avviso-per]').forEach((p) => {
    const testo = avvisi.get(p.dataset.avvisoPer);
    p.hidden = !testo;
    p.textContent = testo || '';
  });
}

function aggiornaTotali() {
  const totali = totaliSquadra(stato.dati);
  const contenitore = document.querySelector('[data-calcolato="totali-squadra"]');
  if (contenitore) {
    sostituisciFigli(
      contenitore,
      h('h3', {}, 'Totali calcolati'),
      totali.perPersona.length
        ? h(
            'table',
            { classe: 'tabella-totali' },
            h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Persona'), h('th', { scope: 'col' }, 'Lavoro (h)'), h('th', { scope: 'col' }, 'Viaggio (h)'))),
            h(
              'tbody',
              {},
              totali.perPersona.map((p) => h('tr', {}, h('td', {}, p.nome), h('td', {}, numeroIt(p.oreLavoro)), h('td', {}, numeroIt(p.oreViaggio)))),
              h('tr', { classe: 'totale' }, h('td', {}, 'Totale complessivo'), h('td', {}, numeroIt(totali.oreLavoro)), h('td', {}, numeroIt(totali.oreViaggio))),
            ),
          )
        : h('p', { classe: 'aiuto' }, 'Nessuna persona inserita.'),
      h('p', { classe: 'km-totali' }, `Km complessivi: ${numeroIt(totali.km)}`),
    );
  }
  document.querySelectorAll('[data-calcolato="km"]').forEach((el) => (el.textContent = `${numeroIt(totali.km)} km`));
}

// Elenchi a scelta che dipendono da altre sezioni (componenti, strumenti).
function aggiornaOpzioniDinamiche() {
  const componenti = opzioniComponenti(stato.dati);
  const voci = { componenti, 'componenti-rif': componenti.slice(1), strumenti: opzioniStrumenti(stato.dati) };
  document.querySelectorAll('select[data-opzioni]').forEach((sel) => {
    const elenco = voci[sel.dataset.opzioni] || [];
    const firma = JSON.stringify(elenco);
    if (sel.dataset.firmaOpzioni === firma) return;
    sel.dataset.firmaOpzioni = firma;
    const valore = risolviPercorso(stato.dati, sel.dataset.percorso) || '';
    const vuota = sel.options[0] ? sel.options[0].textContent : '— Scegli —';
    sostituisciFigli(
      sel,
      h('option', { value: '' }, vuota),
      elenco.map((v) => h('option', { value: v.valore }, v.testo)),
      valore && !elenco.some((v) => v.valore === valore) ? h('option', { value: valore }, '(non più disponibile)') : null,
    );
    sel.value = valore;
  });
}

function aggiornaPreposti() {
  const nomi = prepostiSuggeriti(stato.dati);
  const firma = nomi.join('|');
  const lista = $('lista-preposti');
  if (lista.dataset.firma !== firma) {
    lista.dataset.firma = firma;
    sostituisciFigli(lista, nomi.map((n) => h('option', { value: n })));
  }
  document.querySelectorAll('[data-suggerimenti="preposti"]').forEach((c) => {
    if (c.dataset.firma === firma) return;
    c.dataset.firma = firma;
    sostituisciFigli(
      c,
      nomi.length ? h('span', { classe: 'aiuto' }, 'Dalla sezione 5:') : null,
      nomi.map((n) => h('button', { type: 'button', classe: 'chip', dataset: { azione: 'usa-preposto', valore: n } }, n)),
    );
  });
}

function aggiornaNumeriFoto() {
  const numeri = mappaNumeriFoto(stato.dati);
  document.querySelectorAll('[data-numero-foto]').forEach((el) => {
    const n = numeri.get(el.dataset.numeroFoto);
    el.textContent = n ? `Foto ${n}` : 'Foto (non stampata)';
  });
}

function aggiornaEsitoPiva() {
  const el = $('esito-piva');
  if (!el) return;
  const piva = stato.dati.s1.fornitore.piva;
  if (!piva.trim()) {
    el.textContent = '';
    el.className = 'esito-piva';
    return;
  }
  const esito = verificaPartitaIva(piva);
  el.textContent = esito.valida ? 'Partita IVA valida' : `Partita IVA non valida: ${esito.messaggio}`;
  el.className = `esito-piva ${esito.valida ? 'valida' : 'non-valida'}`;
}

// --- Firma

function preparaFirma() {
  const canvas = $('area-firma');
  if (!canvas) return;
  stato.areaFirma = creaAreaFirma(canvas, {
    primaDelTratto: () => statoFirma(stato.dati) === 'decaduta',
    alCambio: (png) => {
      const firma = stato.dati.s13.firma;
      firma.immagine = png;
      firma.dataOra = dataOraIsoLocale(new Date());
      firma.improntaDati = improntaContenuto(stato.dati, { conFirma: false });
      dopoModifica({ subito: true });
    },
  });
  // il canvas ha una dimensione solo dopo l'inserimento nella pagina
  requestAnimationFrame(() => stato.areaFirma && stato.areaFirma.mostra(stato.dati.s13.firma.immagine));
}

function aggiornaFirma() {
  const firma = stato.dati.s13.firma;
  const st = statoFirma(stato.dati);
  const testo = { assente: 'Firma mancante', valida: `Firmato il ${dataOraIt(firma.dataOra)}`, decaduta: 'Firma non più valida' }[st];
  if ($('stato-firma')) $('stato-firma').textContent = testo;
  document.querySelectorAll('[data-avviso-firma="decaduta"]').forEach((el) => (el.hidden = st !== 'decaduta'));
  document.querySelectorAll('[data-avviso-firma="consiglio"]').forEach((el) => (el.hidden = st !== 'valida'));
  const canvas = $('area-firma');
  if (canvas) canvas.classList.toggle('decaduta', st === 'decaduta');
  if (st === 'decaduta') aggiungiAvviso('firma', 'I dati sono cambiati dopo la firma: firma di nuovo (sezione 13).');
  else rimuoviAvviso('firma');
  if (st === 'decaduta' && stato.ultimoStatoFirma === 'valida') messaggio('I dati sono cambiati dopo la firma: firma di nuovo');
  if (st === 'valida' && stato.ultimoStatoFirma === 'assente') messaggio(CONSIGLIO_ESPORTA, 7000);
  stato.ultimoStatoFirma = st;
}

function cancellaFirma() {
  const firma = stato.dati.s13.firma;
  firma.immagine = '';
  firma.dataOra = '';
  firma.improntaDati = '';
  if (stato.areaFirma) stato.areaFirma.pulisci();
  dopoModifica({ subito: true });
}

// --- Righe degli elenchi

function aggiungiRiga(percorsoElenco, tipo) {
  const dati = stato.dati;
  const elenco = risolviPercorso(dati, percorsoElenco);
  if (!Array.isArray(elenco)) return;
  const valori = {};
  if (tipo === 'persona') valori.organizzazione = dati.s1.fornitore.ragioneSociale.trim();
  if (tipo === 'giornata') valori.persone = [{ organizzazione: dati.s1.fornitore.ragioneSociale.trim() }];
  if (tipo === 'operazione') {
    const ordinate = operazioniOrdinate(dati);
    const ultima = ordinate[ordinate.length - 1];
    const giornate = dati.s5.giornate.map((g) => g.data).filter(Boolean).sort();
    valori.data = (ultima && ultima.data) || giornate[0] || '';
  }
  const riga = nuovaRiga(dati, tipo, valori);
  elenco.push(riga);
  ridisegnaSezioni(sezioniDipendenti(numeroSezione(percorsoElenco)));
  dopoModifica({ subito: true });
  const scheda = document.querySelector(`[data-riga="${CSS.escape(riga.id)}"]`);
  if (scheda) {
    scheda.scrollIntoView({ block: 'center' });
    const primo = scheda.querySelector('input:not([disabled]), select, textarea');
    if (primo) primo.focus({ preventScroll: true });
  }
}

// Id delle foto contenute in una riga (anomalie, operazioni).
function fotoDentro(valore, ids = []) {
  if (Array.isArray(valore)) valore.forEach((v) => fotoDentro(v, ids));
  else if (valore && typeof valore === 'object') {
    if (typeof valore.impronta === 'string' && 'didascalia' in valore) ids.push(valore.id);
    Object.values(valore).forEach((v) => fotoDentro(v, ids));
  }
  return ids;
}

async function eliminaRigaConConferma(percorsoElenco, id, nome) {
  const dati = stato.dati;
  const riga = risolviPercorso(dati, `${percorsoElenco}.${id}`);
  if (!riga) return;
  const foto = fotoDentro(riga);
  const note = [];
  if (foto.length) note.push(`Verranno eliminate anche ${foto.length === 1 ? '1 foto' : `${foto.length} foto`}.`);
  if (percorsoElenco === 's7.componenti') {
    const operazioni = dati.s8.operazioni.filter((op) => op.componente === id).length;
    const ricambi = dati.s10.righe.filter((r) => r.componenteRif === id).length;
    if (operazioni || ricambi) note.push(`Il componente è indicato in ${operazioni} operazioni della sezione 8 e in ${ricambi} righe della sezione 10: dovrai sceglierne un altro.`);
  }
  if (percorsoElenco === 's9.attrezzature') {
    const misure = dati.s9.misure.filter((m) => m.strumento === id).length;
    if (misure) note.push(`L'attrezzatura è indicata in ${misure} misure: dovrai sceglierne un'altra.`);
  }
  const ok = await conferma({
    titolo: `Eliminare ${nome}?`,
    testo: [`Vuoi eliminare ${nome}? L'operazione non si può annullare.`, ...note].join(' '),
    ok: 'Elimina',
    pericolo: true,
  });
  if (!ok) return;
  eliminaRiga(dati, percorsoElenco, id);
  if (foto.length) {
    foto.forEach((f) => stato.miniature.delete(f));
    archivio.eliminaFoto(foto).catch(() => {});
  }
  ridisegnaSezioni(sezioniDipendenti(numeroSezione(percorsoElenco)));
  dopoModifica({ subito: true });
}

async function duplicaGiornata(id) {
  const dati = stato.dati;
  const indice = dati.s5.giornate.findIndex((g) => g.id === id);
  if (indice < 0) return;
  const g = dati.s5.giornate[indice];
  const copia = nuovaRiga(dati, 'giornata', {
    data: '',
    nessunMezzo: g.nessunMezzo,
    persone: g.persone.map((p) => ({ ...p, id: undefined })),
    mezzi: g.mezzi.map((m) => ({ ...m, id: undefined })),
  });
  dati.s5.giornate.splice(indice + 1, 0, copia);
  ridisegnaSezioni([5]);
  dopoModifica({ subito: true });
  messaggio('Giornata duplicata: inserisci la data e controlla ore e mezzi.');
  const campo = document.querySelector(`[data-percorso="s5.giornate.${CSS.escape(copia.id)}.data"]`);
  if (campo) {
    campo.scrollIntoView({ block: 'center' });
    campo.focus({ preventScroll: true });
  }
}

function cambiaSegno(percorso) {
  const attuale = String(risolviPercorso(stato.dati, percorso) || '').trim();
  const nuovo = attuale.startsWith('-') ? attuale.slice(1) : `-${attuale.replace(/^\+/, '')}`;
  impostaPercorso(stato.dati, percorso, nuovo);
  const input = document.querySelector(`[data-percorso="${CSS.escape(percorso)}"]`);
  if (input) input.value = nuovo;
  dopoModifica({ subito: true });
}

function usaPreposto(nome) {
  stato.dati.s6.preposto = nome;
  const input = document.querySelector('[data-percorso="s6.preposto"]');
  if (input) input.value = nome;
  dopoModifica({ subito: true });
}

// --- Foto

async function aggiungiFoto(file) {
  const percorsoElenco = stato.destinazioneFoto;
  const elenco = percorsoElenco ? risolviPercorso(stato.dati, percorsoElenco) : null;
  if (!Array.isArray(elenco) || file.length === 0) return;
  const presenti = tutteLeFoto(stato.dati).length;
  const disponibili = MAX_FOTO - presenti;
  if (disponibili <= 0) {
    await avviso({ titolo: 'Limite di foto raggiunto', testo: `Il rapporto contiene già ${MAX_FOTO} foto, il massimo consentito.` });
    return;
  }
  const scelte = file.slice(0, disponibili);
  const errori = [];
  for (let i = 0; i < scelte.length; i++) {
    mostraAvanzamento(`Elaborazione della foto ${i + 1} di ${scelte.length}…`);
    try {
      const r = await elaboraFoto(scelte[i]);
      const foto = nuovaRiga(stato.dati, 'foto', {
        nomeOriginale: r.nomeOriginale,
        larghezzaOriginale: r.larghezzaOriginale,
        altezzaOriginale: r.altezzaOriginale,
        pesoOriginaleMB: r.pesoOriginaleMB,
        larghezza: r.larghezza,
        altezza: r.altezza,
        impronta: impronta(r.jpeg),
      });
      await archivio.salvaFoto(foto.id, r.jpeg, r.miniatura);
      stato.miniature.set(foto.id, r.miniatura);
      elenco.push(foto);
    } catch (errore) {
      errori.push(h('li', {}, h('strong', {}, scelte[i].name || 'Foto'), `: ${errore.message}`));
    }
  }
  nascondiAvanzamento();
  ridisegnaSezioni(sezioniDipendenti(numeroSezione(percorsoElenco)));
  dopoModifica({ subito: true });
  await salvaOra();
  const totale = tutteLeFoto(stato.dati).length;
  if (errori.length) {
    await avviso({ titolo: 'Alcune foto non sono state aggiunte', testo: h('ul', {}, errori) });
  }
  if (file.length > scelte.length) {
    await avviso({ titolo: 'Limite di foto raggiunto', testo: `Sono state aggiunte solo ${scelte.length} foto: il massimo per rapporto è ${MAX_FOTO}.` });
  } else if (totale >= SOGLIA_AVVISO_FOTO) {
    messaggio(`Hai inserito ${totale} foto: il massimo è ${MAX_FOTO}.`, 6000);
  } else if (scelte.length > errori.length) {
    messaggio('Foto aggiunte: ricordati la didascalia.');
  }
}

async function eliminaFotoConConferma(percorsoElenco, id) {
  const numero = mappaNumeriFoto(stato.dati).get(id);
  const ok = await conferma({
    titolo: 'Eliminare la foto?',
    testo: `Vuoi eliminare ${numero ? `la foto ${numero}` : 'questa foto'}? L'operazione non si può annullare.`,
    ok: 'Elimina',
    pericolo: true,
  });
  if (!ok) return;
  eliminaRiga(stato.dati, percorsoElenco, id);
  stato.miniature.delete(id);
  archivio.eliminaFoto([id]).catch(() => {});
  ridisegnaSezioni(sezioniDipendenti(numeroSezione(percorsoElenco)));
  dopoModifica({ subito: true });
}

// Bozze importate senza miniature (o interrotte): si ricreano in sottofondo.
async function completaMiniatureMancanti() {
  const mancanti = tutteLeFoto(stato.dati).map((v) => v.foto.id).filter((id) => !stato.miniature.has(id));
  if (mancanti.length === 0) return;
  const immagini = await archivio.caricaImmagini(mancanti).catch(() => ({}));
  let fatte = 0;
  for (const id of mancanti) {
    if (!immagini[id]) continue;
    try {
      const mini = await miniaturaDaImmagine(immagini[id]);
      stato.miniature.set(id, mini);
      await archivio.salvaMiniatura(id, mini);
      fatte += 1;
    } catch {
      // resta senza anteprima: il PDF usa comunque l'immagine completa
    }
  }
  if (fatte) ridisegnaSezioni([4, 6, 7, 8, 13]);
}

// --- Verifica

function apriVerifica() {
  const esito = stato.esito;
  const contenuto = [];
  if (esito.valido) {
    contenuto.push(h('p', { classe: 'esito-ok' }, 'Nessun campo mancante o non valido: puoi scaricare il PDF valido.'));
  } else {
    contenuto.push(h('p', {}, `${esito.errori.length} ${esito.errori.length === 1 ? 'campo da completare' : 'campi da completare'} o correggere. Tocca una voce per andare al campo.`));
  }
  for (let n = 1; n <= 13; n++) {
    const errori = esito.errori.map((e, i) => ({ e, i })).filter((x) => x.e.sezione === n);
    if (errori.length === 0) continue;
    contenuto.push(
      h(
        'section',
        { classe: 'gruppo-verifica' },
        h('h3', {}, `${n}. ${TITOLI_SEZIONI[n]}`),
        h('ul', {}, errori.map(({ e, i }) => h('li', {}, h('button', { type: 'button', classe: 'voce-verifica', dataset: { chiudiCon: `errore:${i}` } }, e.messaggio)))),
      ),
    );
  }
  if (esito.avvisi.length) {
    contenuto.push(
      h(
        'section',
        { classe: 'gruppo-verifica avvisi' },
        h('h3', {}, 'Avvisi (non bloccano il PDF)'),
        h('ul', {}, esito.avvisi.map((a, i) => h('li', {}, h('button', { type: 'button', classe: 'voce-verifica', dataset: { chiudiCon: `avviso:${i}` } }, `${a.sezione}. ${a.messaggio}`)))),
      ),
    );
  }
  apriDialogo({ titolo: 'Verifica', contenuto, classe: 'dialogo-verifica', pulsanti: [{ testo: 'Chiudi', valore: null, classe: 'secondario' }] }).then((scelta) => {
    if (!scelta) return;
    const [tipo, indice] = scelta.split(':');
    const voce = tipo === 'errore' ? esito.errori[Number(indice)] : esito.avvisi[Number(indice)];
    if (voce) vaiAlCampo(voce);
  });
}

// Apre la sezione e porta il cursore sul campo indicato.
function vaiAlCampo({ sezione, percorso }) {
  const dettagli = $(`sezione-${sezione}`);
  dettagli.open = true;
  const corpo = $(`corpo-sezione-${sezione}`);
  const esc = CSS.escape(percorso);
  const el =
    corpo.querySelector(`[data-percorso="${esc}"]:not([disabled])`) ||
    corpo.querySelector(`[data-campo="${esc}"]`) ||
    corpo.querySelector(`[data-elenco="${esc}"]`) ||
    document.querySelector(`[data-percorso="${esc}"]:not([disabled])`) ||
    dettagli;
  const destinazione = el.matches('input, select, textarea, button, canvas')
    ? el
    : el.querySelector('input:not([disabled]), select, textarea, canvas, .pulsante-aggiungi') || el;
  (el.closest('.campo') || el).scrollIntoView({ block: 'center' });
  if (typeof destinazione.focus === 'function') destinazione.focus({ preventScroll: true });
}

// --- PDF

async function scaricaPdf() {
  if (stato.operazioniInCorso) return;
  stato.operazioniInCorso = true;
  if (stato.timerSalvataggio) await salvaOra();
  aggiornaDerivati();
  const dati = stato.dati;
  const valido = stato.esito.valido;
  if (!valido) stato.mostraErrori = true;
  try {
    mostraAvanzamento(valido ? 'Preparazione del PDF…' : 'Preparazione della bozza PDF…');
    await attendiDisegno();
    await caricaPdfmake();
    const voci = elencoFoto(dati);
    mostraAvanzamento(`Lettura delle foto (${voci.length})…`);
    const immagini = await archivio.caricaImmagini(voci.map((v) => v.foto.id));
    const improntaAttuale = improntaContenuto(dati, { conFirma: true });
    // il PDF valido prende la revisione successiva se i dati sono cambiati;
    // la bozza riporta la revisione corrente, senza aumentarla
    const revisione = valido ? prossimaRevisione(dati.revisione, improntaAttuale) : revisioneCorrente(dati.revisione);
    const adesso = new Date();
    const definizione = creaDocumentoPdf(dati, {
      config: CONFIG,
      revisione,
      bozza: !valido,
      generatoIl: adesso,
      immagini,
      firmaValida: statoFirma(dati) === 'valida',
    });
    mostraAvanzamento(`Impaginazione del PDF${voci.length ? ` con ${voci.length} foto` : ''}: attendi qualche secondo…`);
    await attendiDisegno();
    const blob = await generaPdf(definizione);
    const nome = nomeFilePdf({ codice: codiceDaDati(dati), revisione, oggetto: dati.s2.oggetto, bozza: !valido });
    scaricaFile(blob, nome);
    if (valido) {
      dati.revisione = { numero: revisione, impronta: improntaAttuale, generatoIl: dataOraIsoLocale(adesso) };
      await salvaOra();
    }
    nascondiAvanzamento();
    aggiornaDerivati();
    if (valido) {
      messaggio(`PDF Rev. ${revisione} scaricato: ${nome}`, 7000);
    } else {
      messaggio('Bozza PDF scaricata con la filigrana «BOZZA – NON VALIDA». Usa Verifica per vedere cosa manca.', 7000);
    }
  } catch (errore) {
    nascondiAvanzamento();
    await avviso({ titolo: 'PDF non generato', testo: `Si è verificato un errore durante la generazione del PDF: ${errore.message}` });
  } finally {
    stato.operazioniInCorso = false;
  }
}

// --- Esportazione, importazione, nuovo rapporto

async function esportaBozza() {
  try {
    if (stato.timerSalvataggio) await salvaOra();
    mostraAvanzamento('Preparazione del file della bozza…');
    await attendiDisegno();
    const ids = tutteLeFoto(stato.dati).map((v) => v.foto.id);
    const immagini = await archivio.caricaImmagini(ids);
    const adesso = new Date();
    const file = creaFileBozza({ dati: stato.dati, immagini, miniature: Object.fromEntries(stato.miniature), adesso });
    const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
    const nome = nomeFileBozza(codiceDaDati(stato.dati), adesso);
    scaricaFile(blob, nome);
    nascondiAvanzamento();
    messaggio(`Bozza esportata: ${nome}`, 6000);
    return true;
  } catch (errore) {
    nascondiAvanzamento();
    await avviso({ titolo: 'Esportazione non riuscita', testo: errore.message });
    return false;
  }
}

async function importaBozza(file) {
  let letto;
  try {
    mostraAvanzamento('Lettura del file…');
    letto = leggiFileBozza(await file.text());
  } catch (errore) {
    nascondiAvanzamento();
    await avviso({ titolo: 'Importazione non riuscita', testo: errore.message });
    return;
  }
  nascondiAvanzamento();
  const numeroFoto = Object.keys(letto.immagini).length;
  const ok = await conferma({
    titolo: 'Importare la bozza?',
    testo: `Il file contiene il rapporto ${codiceDaDati(letto.dati)} con ${numeroFoto} foto. I dati presenti su questo dispositivo (rapporto ${codiceDaDati(stato.dati)}) verranno sostituiti.`,
    ok: 'Importa e sostituisci',
    pericolo: true,
  });
  if (!ok) return;
  try {
    const miniature = { ...letto.miniature };
    const daCreare = Object.keys(letto.immagini).filter((id) => !miniature[id]);
    for (let i = 0; i < daCreare.length; i++) {
      mostraAvanzamento(`Preparazione delle anteprime: ${i + 1} di ${daCreare.length}…`);
      try {
        miniature[daCreare[i]] = await miniaturaDaImmagine(letto.immagini[daCreare[i]]);
      } catch {
        // anteprima non disponibile: non blocca l'importazione
      }
    }
    mostraAvanzamento('Salvataggio della bozza importata…');
    await archivio.sostituisciTutto(letto.dati, letto.immagini, miniature);
    stato.dati = letto.dati;
    stato.miniature = new Map(Object.entries(miniature));
    stato.ultimoStatoFirma = null;
    ridisegnaTutto();
    mostraStatoSalvataggio(`Bozza importata alle ${oraItDaDate(new Date())}`);
    nascondiAvanzamento();
    messaggio(`Bozza ${codiceDaDati(stato.dati)} importata.`);
  } catch (errore) {
    nascondiAvanzamento();
    await avviso({ titolo: 'Importazione non riuscita', testo: errore.message });
  }
}

async function nuovoRapporto() {
  const mantieni = h('input', { type: 'checkbox', checked: true, id: 'mantieni-fornitore' });
  const scelta = await apriDialogo({
    titolo: 'Nuovo rapporto',
    contenuto: [
      h('p', {}, `Il rapporto attuale (${codiceDaDati(stato.dati)}) verrà cancellato da questo dispositivo, foto comprese. Prima conviene esportare la bozza.`),
      h('label', { classe: 'opzione' }, mantieni, h('span', {}, 'Mantieni i dati del fornitore e del compilatore')),
    ],
    pulsanti: [
      { testo: 'Annulla', valore: null, classe: 'secondario' },
      { testo: 'Crea senza esportare', valore: 'nuovo', classe: 'pericolo' },
      { testo: 'Esporta e poi crea', valore: 'esporta', classe: 'primario' },
    ],
  });
  if (!scelta) return;
  if (scelta === 'esporta') {
    if (!(await esportaBozza())) return;
    const ok = await conferma({
      titolo: 'Bozza salvata?',
      testo: 'Controlla di aver salvato il file della bozza, poi conferma per creare il nuovo rapporto.',
      ok: 'Crea il nuovo rapporto',
    });
    if (!ok) return;
  }
  const nuova = nuovaBozza(new Date());
  if (mantieni.checked) {
    nuova.s1.fornitore = { ...stato.dati.s1.fornitore };
    nuova.s1.compilatore = { ...stato.dati.s1.compilatore };
  }
  try {
    await archivio.sostituisciTutto(nuova, {}, {});
  } catch (errore) {
    await avviso({ titolo: 'Operazione non riuscita', testo: errore.message });
    return;
  }
  stato.dati = nuova;
  stato.miniature = new Map();
  stato.mostraErrori = false;
  stato.ultimoStatoFirma = null;
  ridisegnaTutto();
  mostraStatoSalvataggio(`Nuovo rapporto creato alle ${oraItDaDate(new Date())}`);
  window.scrollTo(0, 0);
}

// --- Menu e istruzioni

function apriMenu() {
  const voce = (azione, titolo, descrizione) =>
    h('button', { type: 'button', classe: 'voce-menu', dataset: { azione, chiudiCon: azione } }, h('strong', {}, titolo), h('small', {}, descrizione));
  apriDialogo({
    titolo: 'Menu',
    classe: 'dialogo-menu',
    pulsanti: [],
    contenuto: [
      h(
        'div',
        { classe: 'menu-voci' },
        voce('esporta-bozza', 'Esporta bozza', 'Scarica un file con tutti i dati e le foto.'),
        voce('importa-bozza', 'Importa bozza', 'Carica un file di bozza (es. da un altro dispositivo).'),
        voce('nuovo-rapporto', 'Nuovo rapporto', 'Cancella questo rapporto e ne inizia uno nuovo.'),
        voce('istruzioni', 'Istruzioni', 'Come compilare, salvare e inviare il rapporto.'),
      ),
      h('p', { classe: 'consiglio' }, CONSIGLIO_ESPORTA),
    ],
  });
}

async function apriIstruzioni() {
  const persistente = await archivio.statoPersistenza();
  const punti = [
    'Compila le 13 sezioni: l\'intestazione di ogni sezione indica se è completa, cosa manca o se non è applicabile. I campi con * sono obbligatori.',
    'I dati si salvano da soli su questo dispositivo, foto comprese. Non servono account né connessione: una volta aperta, la pagina funziona anche offline.',
    CONSIGLIO_ESPORTA,
    'Per passare dal telefono al PC (o viceversa): Menu → Esporta bozza, poi sull\'altro dispositivo Menu → Importa bozza.',
    'Foto: si aggiungono nelle sezioni 4, 6, 7 e 8 con «Aggiungi foto» (fotocamera o galleria). Ogni foto deve avere una didascalia. Massimo 60 foto.',
    'Firma: alla fine, nella sezione 13. Se dopo la firma cambi un dato, la firma decade e va rifatta.',
    '«Verifica» elenca i campi mancanti o non validi: tocca una voce per andare al campo. «Scarica PDF» genera il PDF valido; se ci sono errori puoi scaricare una bozza PDF con la filigrana «BOZZA – NON VALIDA».',
    'Ogni nuovo PDF valido dopo una modifica dei dati aumenta la revisione (Rev. 0, 1, 2…).',
  ];
  apriDialogo({
    titolo: 'Istruzioni',
    contenuto: [
      h('ol', { classe: 'istruzioni' }, punti.map((p) => h('li', {}, p))),
      h('p', {}, 'Invia il PDF e, a parte, le foto originali e gli allegati a: ', testoConfigEvidenziato(CONFIG, 'destinatarioFoto'), '.'),
      h(
        'p',
        { classe: 'aiuto' },
        `${VERSIONE_SOFTWARE}. Archiviazione persistente: ${persistente === true ? 'concessa' : persistente === false ? 'non concessa dal browser' : 'non disponibile'}.`,
      ),
    ],
  });
}
