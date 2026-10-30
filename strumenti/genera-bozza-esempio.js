// Rigenera esempi/bozza-esempio.json a partire dai dati qui sotto e dalle
// immagini segnaposto in esempi/immagini/. Tutti i dati sono fittizi.
//
// Uso (Node 18 o superiore, nessuna dipendenza):
//   node strumenti/genera-bozza-esempio.js
//
// Va rieseguito se cambiano il modello dei dati o il calcolo dell'impronta,
// altrimenti la firma dell'esempio risulterebbe decaduta.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizzaBozza } from '../js/modello.js';
import { impronta, improntaContenuto } from '../js/revisione.js';
import { creaFileBozza } from '../js/bozza.js';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
const cartellaImmagini = join(radice, 'esempi', 'immagini');
const dataUrl = (file, tipo) => `data:${tipo};base64,${readFileSync(join(cartellaImmagini, file)).toString('base64')}`;

const immagini = {
  'foto-es-1': dataUrl('foto-1.jpg', 'image/jpeg'),
  'foto-es-2': dataUrl('foto-2.jpg', 'image/jpeg'),
  'foto-es-3': dataUrl('foto-3.jpg', 'image/jpeg'),
  'foto-es-4': dataUrl('foto-4.jpg', 'image/jpeg'),
};

const foto = (id, didascalia, nomeOriginale, verticale = false) => ({
  id,
  didascalia,
  nomeOriginale,
  larghezzaOriginale: verticale ? 3024 : 4032,
  altezzaOriginale: verticale ? 4032 : 3024,
  pesoOriginaleMB: 3.2,
  larghezza: verticale ? 1200 : 1600,
  altezza: verticale ? 1600 : 1200,
  impronta: impronta(immagini[id]),
});

const FORNITORE = 'Esempio Manutenzioni Elettriche S.r.l.';

const grezzo = {
  id: 'bozzaesempio0001',
  creatoIl: '2026-10-27',
  progressivo: '01',
  revisione: { numero: null, impronta: '', generatoIl: '' },
  s1: {
    ticket: [{ id: 'ticket-1', testo: 'TCK-2026-0001 (esempio)' }],
    fornitore: {
      ragioneSociale: FORNITORE,
      estero: false,
      piva: '12345678903',
      sede: "Via dell'Esempio 1, 00100 Roma (RM)",
      sigla: 'EM',
    },
    compilatore: {
      nome: 'Mario Rossi',
      ruolo: 'Preposto ai lavori',
      email: 'mario.rossi@example.com',
      telefono: '+39 000 0000000',
    },
  },
  s2: {
    oggetto: 'Riarmo SPI dopo intervento della protezione di interfaccia e sopralluogo',
    tipologie: ['Correttivo', 'Ispezione / sopralluogo'],
    tipologiaAltro: '',
    regime: 'Extra-canone',
    riferimentoOfferta: 'Ordine ODA-0000/2026 (esempio)',
    garanzia: 'No',
  },
  s3: {
    origine: 'Evento o guasto',
    eventoDataOra: '2026-10-27T06:42',
    eventoNonNota: false,
    fonteOrario: 'Relè di protezione',
    fonteOrarioAltro: '',
    rilevazione: 'Allarme SCADA/monitoraggio',
    rilevazioneAltro: '',
    arrivo: '2026-10-27T09:15',
    riarmo: '2026-10-27T11:05',
    fine: '2026-10-28T15:30',
    statoPrima: 'Fermo',
    potenzaPrima: '',
    statoDopo: 'In servizio',
    potenzaDopo: '',
  },
  s4: {
    applicabile: 'Sì',
    protezioni: ['SPI/DDI – Protezione o dispositivo di interfaccia'],
    protezioniAltro: '',
    segnalazioni:
      'Relè SPI: intervento della funzione 59.S1 (massima tensione, valore medio su 10 minuti) alle 06:42, ' +
      'tensione registrata 1,12 Un. DDI aperto. Nessun allarme attivo sugli inverter.',
    foto: [foto('foto-es-1', 'Display del relè SPI con la segnalazione 59.S1', 'IMG_20261027_092431.jpg')],
    fotoNonDisponibile: false,
    fotoMotivo: '',
    causa: 'Disturbo o guasto sulla rete del distributore',
    causaAltro: '',
    verifiche:
      'Verifica visiva di cabina utente, quadri MT e BT; lettura del registro eventi del relè SPI; ' +
      'controllo delle tensioni di rete, stabili per 15 minuti; assenza di allarmi sugli inverter.',
    autorizzatoNome: 'Giulia Verdi',
    autorizzatoRuolo: 'Asset manager – Esempio Asset Management S.r.l.',
    autorizzatoModalita: 'Telefono',
    autorizzatoModalitaAltro: '',
  },
  s5: {
    giornate: [
      {
        id: 'giornata-1',
        data: '2026-10-27',
        persone: [
          { id: 'persona-1', nome: 'Mario Rossi', organizzazione: FORNITORE, ruolo: 'Preposto ai lavori', ruoloAltro: '', qualifica: 'PES', oreLavoro: '6', oreViaggio: '1,5' },
          { id: 'persona-2', nome: 'Luca Bianchi', organizzazione: FORNITORE, ruolo: 'Tecnico', ruoloAltro: '', qualifica: 'PAV', oreLavoro: '6', oreViaggio: '1,5' },
        ],
        nessunMezzo: false,
        mezzi: [{ id: 'mezzo-1', tipo: 'Furgone', tipoAltro: '', alimentazione: 'Gasolio', alimentazioneAltro: '', km: '86' }],
      },
      {
        id: 'giornata-2',
        data: '2026-10-28',
        persone: [
          { id: 'persona-3', nome: 'Mario Rossi', organizzazione: FORNITORE, ruolo: 'Preposto ai lavori', ruoloAltro: '', qualifica: 'PES', oreLavoro: '5,5', oreViaggio: '1,5' },
        ],
        nessunMezzo: false,
        mezzi: [{ id: 'mezzo-2', tipo: 'Auto', tipoAltro: '', alimentazione: 'Ibrido', alimentazioneAltro: '', km: '86' }],
      },
    ],
  },
  s6: {
    responsabileNome: 'Paolo Neri',
    responsabileOrganizzazione: 'Esempio Asset Management S.r.l.',
    preposto: 'Mario Rossi',
    manovre: 'Sì',
    manovreDescrizione: 'Richiusura del DDI dopo le verifiche; manovra eseguita dal preposto con i DPI per lavori elettrici.',
    dpi: ['Elmetto', 'Guanti isolanti', 'Visiera o occhiali', 'Calzature di sicurezza', 'Indumenti ignifughi o per arco elettrico'],
    dpiAltro: '',
    anomalie: 'No',
    anomalieDescrizione: '',
    anomalieFoto: [],
    incidenti: 'No',
    incidentiDescrizione: '',
  },
  s7: {
    situazione:
      "All'arrivo l'impianto era fermo, con il DDI aperto e il relè SPI in stato di intervento. " +
      'Cabine e quadri senza danni visibili; nel quadro AC della cabina inverter uno scaricatore segnala guasto.',
    componenti: [
      {
        id: 'componente-1',
        area: 'Cabina utente',
        componente: 'Relè di protezione di interfaccia (SPI)',
        costruttore: { valore: 'Costruttore Esempio', alternativa: '' },
        modello: { valore: 'SPI-000', alternativa: '' },
        seriale: { valore: 'SN-0000-0001', alternativa: '' },
      },
      {
        id: 'componente-2',
        area: 'Cabina inverter',
        componente: 'Scaricatore di sovratensione del quadro AC',
        costruttore: { valore: '', alternativa: 'Non rilevato' },
        modello: { valore: '', alternativa: 'Non rilevato' },
        seriale: { valore: '', alternativa: 'Non applicabile' },
      },
    ],
    nessunaAnomalia: false,
    anomalie: [
      {
        id: 'anomalia-1',
        area: 'Cabina inverter',
        descrizione: "Scaricatore di sovratensione del quadro AC con l'indicatore di guasto rosso.",
        foto: [foto('foto-es-2', "Scaricatore con l'indicatore di guasto rosso", 'IMG_20261027_100512.jpg')],
      },
    ],
  },
  s8: {
    operazioni: [
      { id: 'operazione-1', data: '2026-10-27', oraInizio: '09:20', oraFine: '09:50', tipo: 'Verifica o ispezione', tipoAltro: '', componente: 'componente-1', descrizione: 'Lettura del registro eventi e delle segnalazioni del relè SPI.', esito: 'Eseguita', stato: 'Anomalia', modalita: 'In campo', foto: [] },
      { id: 'operazione-2', data: '2026-10-27', oraInizio: '09:50', oraFine: '10:40', tipo: 'Misura o prova', tipoAltro: '', componente: 'generale', descrizione: 'Controllo delle tensioni di rete con gli strumenti di cabina; tensioni stabili per 15 minuti.', esito: 'Eseguita', stato: 'Conforme', modalita: 'In campo', foto: [] },
      { id: 'operazione-3', data: '2026-10-27', oraInizio: '10:50', oraFine: '11:05', tipo: 'Riarmo', tipoAltro: '', componente: 'componente-1', descrizione: "Riarmo del relè SPI e richiusura del DDI, su autorizzazione telefonica dell'asset manager.", esito: 'Eseguita', stato: 'Conforme', modalita: 'In campo', foto: [] },
      { id: 'operazione-4', data: '2026-10-27', oraInizio: '11:05', oraFine: '11:30', tipo: 'Verifica o ispezione', tipoAltro: '', componente: 'generale', descrizione: 'Verifica dal monitoraggio della ripartenza degli inverter e della produzione.', esito: 'Eseguita', stato: 'Conforme', modalita: 'Da remoto', foto: [] },
      {
        id: 'operazione-5', data: '2026-10-28', oraInizio: '08:30', oraFine: '10:00', tipo: 'Sostituzione', tipoAltro: '', componente: 'componente-2', descrizione: 'Messa fuori servizio del quadro AC e sostituzione dello scaricatore di sovratensione guasto.', esito: 'Eseguita', stato: 'Conforme', modalita: 'In campo',
        foto: [
          foto('foto-es-3', 'Nuovo scaricatore installato nel quadro AC', 'IMG_20261028_095803.jpg'),
          foto('foto-es-4', 'Quadro AC chiuso dopo la sostituzione', 'IMG_20261028_100140.jpg', true),
        ],
      },
      { id: 'operazione-6', data: '2026-10-28', oraInizio: '10:00', oraFine: '12:00', tipo: 'Misura o prova', tipoAltro: '', componente: 'generale', descrizione: 'Misura della resistenza di isolamento delle linee in uscita dal quadro AC, poi rimessa in servizio.', esito: 'Eseguita', stato: 'Conforme', modalita: 'In campo', foto: [] },
    ],
  },
  s9: {
    applicabile: 'Sì',
    attrezzature: [
      { id: 'attrezzatura-1', tipo: 'Misuratore di isolamento', produttore: 'Produttore Esempio', modello: 'MI-000', seriale: 'SN-A-0001', certificato: 'LAT 000/0000 (esempio)', certificatoNonDisponibile: false, scadenza: '2027-03-31', scadenzaNonDisponibile: false },
    ],
    nessunaMisura: false,
    misure: [
      { id: 'misura-1', data: '2026-10-28', grandezza: 'Resistenza di isolamento', punto: 'Linea AC 1 – fase L1 verso terra', valore: '520', unita: 'MΩ', unitaAltro: '', riferimento: '≥ 1 MΩ', esito: 'Conforme', strumento: 'attrezzatura-1' },
      { id: 'misura-2', data: '2026-10-28', grandezza: 'Resistenza di isolamento', punto: 'Linea AC 2 – fase L1 verso terra', valore: '480', unita: 'MΩ', unitaAltro: '', riferimento: '≥ 1 MΩ', esito: 'Conforme', strumento: 'attrezzatura-1' },
    ],
  },
  s10: {
    applicabile: 'Sì',
    righe: [
      {
        id: 'ricambio-1',
        area: 'Cabina inverter',
        componente: 'Scaricatore di sovratensione del quadro AC',
        costruttore: 'Costruttore Esempio',
        modello: 'SPD-000',
        quantita: '1',
        unita: 'n',
        unitaAltro: '',
        serialeVecchio: { valore: '', alternativa: 'Non rilevato' },
        serialeNuovo: { valore: 'SN-SPD-0002', alternativa: '' },
        fornitore: FORNITORE,
        garanzia: 'No',
        componenteRif: 'componente-2',
      },
    ],
  },
  s11: {
    constatazione: 'Impianto riavviato e in servizio. Scaricatore guasto sostituito; misure di isolamento conformi.',
    ipotesi: "Sovratensione sulla rete del distributore: ha causato l'intervento della funzione 59.S1 e il guasto dello scaricatore.",
    ipotesiNonApplicabile: false,
    nessunaOperazione: false,
    operazioni: [
      { id: 'da-eseguire-1', descrizione: 'Chiedere al distributore gli eventi di rete del 27/10/2026.', priorita: 'Media', carico: 'Asset manager', entro: '2026-11-15' },
    ],
  },
  s12: {
    carburante: '14,5',
    carburanteNonNoto: false,
    nessunRifiuto: false,
    rifiuti: [
      { id: 'rifiuto-1', descrizione: 'Scaricatore di sovratensione guasto', eer: '160214', quantita: '0,4', unita: 'kg', destinazione: 'Ritirati dal fornitore', destinazioneAltro: '' },
    ],
    acqua: '',
    acquaNonUtilizzata: true,
    gas: 'No',
    gasApparecchiatura: '',
    gasQuantita: '',
    gasQuantitaNonNota: false,
  },
  s13: {
    allegati: [
      { id: 'allegato-1', tipo: 'Certificato di taratura', tipoAltro: '', descrizione: 'Certificato di taratura del misuratore di isolamento', nomeFile: 'certificato-taratura-esempio.pdf' },
    ],
    firma: { nome: 'Mario Rossi', ruolo: 'Preposto ai lavori', immagine: dataUrl('firma-esempio.png', 'image/png'), dataOra: '2026-10-28T15:40', improntaDati: '' },
  },
};

// Normalizzazione (come all'importazione) e firma valida per questi dati.
const dati = normalizzaBozza(grezzo, () => {
  throw new Error('Nella bozza di esempio ogni riga deve avere un id fisso');
});
dati.s13.firma.improntaDati = improntaContenuto(dati, { conFirma: false });

const file = creaFileBozza({ dati, immagini, adesso: new Date('2026-10-28T15:45:00Z') });
const destinazione = join(radice, 'esempi', 'bozza-esempio.json');
writeFileSync(destinazione, JSON.stringify(file, null, 2) + '\n');
console.log(`Scritto ${destinazione}`);
