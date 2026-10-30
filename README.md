# report-oem-v0 – Rapporto di intervento (modulo V0)

## Cos'è la V0

È una soluzione temporanea per far compilare **subito** un rapporto di intervento su un impianto energetico a un fornitore esterno e raccogliere riscontri per la versione definitiva.

È una **pagina web statica** (HTML, CSS e JavaScript, senza fase di build, senza framework e senza server):

- il fornitore apre il link, compila da smartphone o da PC, firma a schermo e scarica il PDF;
- i dati restano **solo nel browser del fornitore** (IndexedDB) finché non invia il PDF; si salvano da soli circa mezzo secondo dopo ogni modifica, foto comprese;
- la pagina non fa richieste verso altri domini: librerie e font sono copiati in `vendor/`;
- non c'è un service worker, così nessuno resta su una versione vecchia mentre la V0 viene corretta; una volta caricata, però, la pagina continua a funzionare anche se la connessione cade.

Il modulo ha 13 sezioni (identificazione, inquadramento, evento e tempi, riarmo, squadra e mezzi, sicurezza, constatazione, registro operazioni, misure, componenti, esito, ESG, foto/allegati/firma). «Verifica» elenca i campi mancanti o non validi; «Scarica PDF» genera il PDF valido solo se la verifica non trova errori, altrimenti offre la bozza PDF con la filigrana «BOZZA – NON VALIDA».

La specifica da cui è nata la V0 è in [`SPEC_V0.md`](SPEC_V0.md), così come è stata consegnata: è il punto di partenza per le versioni successive.

## Pubblicazione su GitHub Pages

1. Unisci il ramo di lavoro in `main`.
2. Nel repository su GitHub: **Settings → Pages**.
3. In «Build and deployment» scegli **Source: Deploy from a branch**.
4. Scegli il ramo **`main`** e la cartella **`/ (root)`**, poi **Save**.
5. Dopo uno o due minuti la pagina è online a `https://<utente>.github.io/<repository>/` (per questo repository: `https://fxvv.github.io/report-oem-v0/`). È il link da mandare al fornitore.

Note:

- la pagina usa solo percorsi relativi, quindi funziona dal sottopercorso del repository;
- il file vuoto `.nojekyll` dice a GitHub Pages di pubblicare i file così come sono, senza elaborarli con Jekyll;
- GitHub Pages tiene i file in cache per circa 10 minuti: dopo una correzione chi ha la pagina aperta deve ricaricarla;
- la bozza di esempio è scaricabile anche dal sito pubblicato: `https://<utente>.github.io/<repository>/esempi/bozza-esempio.json`;
- il repository è pubblico: non inserire mai dati personali reali (né in `js/config.js` né negli esempi).

Per provarla in locale serve un piccolo server (i moduli JavaScript non si caricano da `file://`):

```bash
python3 -m http.server 8000
```

poi apri `http://localhost:8000/`.

## Come modificare `js/config.js`

`js/config.js` contiene i dati fissi dell'impianto e del committente, che il fornitore vede in sola lettura e che finiscono nel PDF:

```js
export const CONFIG = Object.freeze({
  codiceImpianto: 'EI9',
  nomeImpianto: 'FI01A2MEL',
  tipologiaImpianto: '«tipologia»',
  potenzaKwp: '«potenza in kWp»', // facoltativa: '' per non indicarla
  ...
});
```

- Sostituisci ogni testo tra `«»` con il valore reale (anche quando è solo una parte del valore, come `ENERGY ITALIA 9 «forma giuridica»`).
- Finché un valore contiene `«…»` è considerato **mancante**: in cima alla pagina compare l'avviso rosso «Configurazione incompleta: …» e nel PDF quel dato è stampato come **DA COMPILARE**.
- La potenza è facoltativa: se non serve, metti `''` (stringa vuota) e non comparirà né nella pagina né nel PDF.
- Le coordinate sono in gradi decimali WGS84, per esempio `'45.464211, 9.191383'`.
- Il codice impianto entra nel codice del rapporto (`EI9-R-AAAAMMGG-SIGLANN`).
- Dopo la modifica: commit su `main`; la pagina pubblicata si aggiorna in qualche minuto.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `index.html` | pagina unica |
| `css/app.css` | stili mobile-first |
| `js/config.js` | dati fissi dell'impianto (vedi sopra) |
| `js/modello.js` | struttura dei dati, valori ammessi, numerazione foto, totali (logica pura) |
| `js/validazione.js` | regole di validazione per sezione, errori e avvisi (logica pura) |
| `js/formati.js` | date, ore e decimali in italiano, codice EER, nomi dei file (logica pura) |
| `js/piva.js` | controllo della partita IVA (logica pura) |
| `js/codice.js` | codice del rapporto (logica pura) |
| `js/revisione.js` | impronta dei dati, revisione, validità della firma (logica pura) |
| `js/bozza.js` | formato del file di bozza esportato e controlli all'importazione (logica pura) |
| `js/pdf-documento.js` | definizione del documento PDF per pdfmake (logica pura) |
| `js/archivio.js` | salvataggio in IndexedDB |
| `js/foto.js` | ridimensionamento delle foto (1600 px, JPEG 0,72) e miniature |
| `js/firma.js` | area di firma (eventi pointer, PNG) |
| `js/pdf.js` | caricamento di pdfmake e download dei file |
| `js/interfaccia.js`, `js/sezioni.js`, `js/campi.js`, `js/dialoghi.js`, `js/dom.js`, `js/app.js` | interfaccia |
| `tests/` | test eseguibili con `node --test` |
| `esempi/bozza-esempio.json` | bozza completa con dati fittizi, da importare per vedere un PDF completo |
| `esempi/immagini/` | immagini segnaposto e firma fittizia usate dalla bozza di esempio |
| `strumenti/genera-bozza-esempio.js` | rigenera la bozza di esempio |
| `vendor/` | librerie copiate nel repository, con le licenze in `vendor/LICENSES/` |
| `TEST.md` | collaudo manuale su iPhone e Android |
| `SPEC_V0.md` | specifica della V0, così come è stata consegnata |

## Test

Con Node 18 o superiore, senza installare nulla:

```bash
node --test
```

I test coprono la logica pura: P.IVA, codice del rapporto, formati, revisione e decadenza della firma, modello dei dati, regole di validazione, esportazione/importazione, documento PDF, configurazione e bozza di esempio.

Se cambiano il modello dei dati o il calcolo dell'impronta, la firma della bozza di esempio risulterebbe decaduta: rigenerala con

```bash
node strumenti/genera-bozza-esempio.js
```

## Librerie (in `vendor/`)

| Libreria | Versione | File | Licenza |
| --- | --- | --- | --- |
| [pdfmake](https://pdfmake.github.io/) | 0.3.13 | `vendor/pdfmake/pdfmake.min.js` (+ `.map`) | MIT – `vendor/LICENSES/pdfmake-MIT.txt` |
| Font Roboto (in `vfs_fonts.js` di pdfmake) | 3.014 | `vendor/pdfmake/vfs_fonts.js` | SIL OFL 1.1 – `vendor/LICENSES/Roboto-OFL-1.1.txt` |
| Librerie incluse nel bundle di pdfmake (pdfkit 0.20.2, fontkit 2.0.4, …) | vedi file | dentro `pdfmake.min.js` | `vendor/LICENSES/pdfmake-librerie-incluse.txt` |

I file sono quelli del pacchetto npm `pdfmake@0.3.13` (cartella `build/`), non modificati. La pagina li carica all'avvio e vieta a pdfmake di scaricare risorse da URL esterni.

## Limiti noti

- **I dati stanno solo sul dispositivo.** Se il browser cancella i dati del sito (su alcuni telefoni succede per le pagine non aperte da giorni) la bozza si perde: per questo la pagina chiede l'archiviazione persistente e consiglia di **esportare la bozza a fine giornata**. In navigazione privata i dati spariscono alla chiusura.
- **Una scheda alla volta.** Se la pagina è aperta in due schede, ognuna salva sopra l'altra: la pagina lo segnala con un avviso.
- **Senza connessione** la pagina continua a funzionare se era già aperta; non si può però aprirla per la prima volta (o ricaricarla) offline, perché non c'è un service worker.
- **Generazione del PDF nel browser.** Durante la generazione la pagina resta occupata (con un messaggio di avanzamento): con 30 foto vere servono alcuni secondi (circa 7 s misurati con la CPU rallentata 4 volte).
- **Foto HEIC**: si leggono solo dove il browser sa decodificarle (Safari su iPhone e Mac). Da Chrome/Edge/Firefox su Windows compare il messaggio di convertirle in JPEG o caricarle da telefono. Le foto sono ridotte a 1600 px: gli originali vanno inviati a parte.
- **Firma grafica**: è un'immagine disegnata a schermo, non una firma elettronica qualificata.
- **Impronta dei dati**: serve a riconoscere le modifiche (revisione, decadenza della firma), non è una protezione crittografica contro le alterazioni.
- **Orari delle operazioni** nella stessa giornata: un'operazione che passa la mezzanotte va divisa in due.
- **iPhone, valori negativi**: la tastiera decimale non ha il segno meno; per le misure c'è il pulsante «±».
- I controlli nativi di data e ora mostrano il formato del dispositivo; nel PDF le date sono sempre gg/mm/aaaa e le ore hh:mm.
- Il collaudo automatico è stato fatto su Chromium; Safari su iPhone e Chrome su Android vanno verificati con [TEST.md](TEST.md).
