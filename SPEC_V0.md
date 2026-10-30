> NOTA PER L'UTENTE: compila i valori tra «» nella sezione "Dati impianto" e cancella questa nota prima di inviare il prompt.

# V0 – Rapporto di intervento (modulo web statico)

## Ruolo e obiettivo
Sei lo sviluppatore della V0 di un modulo per i rapporti di intervento su impianti energetici. La V0 è una soluzione temporanea: serve a far compilare subito un rapporto a un fornitore esterno e a raccogliere riscontri per la versione definitiva. Deve essere semplice, robusta e facile da correggere.

Il risultato è una pagina web statica, pubblicata su GitHub Pages da questo repository. Il fornitore la apre dal link, la compila da smartphone o da PC, firma a schermo e scarica un PDF. Non esiste un server: i dati restano nel browser del fornitore finché non invia il PDF.

## Vincoli tecnici
1. Solo file statici: HTML, CSS e JavaScript (ES2020). Niente fase di build, niente framework, niente npm in esecuzione.
2. Nessuna richiesta di rete in esecuzione: niente CDN, font remoti, analytics o servizi esterni. Le librerie vanno copiate nel repository in `vendor/`, con la versione indicata nel README e la licenza in `vendor/LICENSES/`.
3. Per il PDF usa pdfmake (ultima versione stabile, copiata in `vendor/` insieme ai font di base). Se si rivela inadatto, puoi usare jsPDF con jspdf-autotable, motivando la scelta nel report finale.
4. Solo percorsi relativi: il sito sarà servito da un sottopercorso (`https://<utente>.github.io/<repository>/`).
5. Niente service worker: evita che i fornitori restino su versioni vecchie mentre correggiamo la V0. Una volta caricata, però, la pagina deve continuare a funzionare anche se la connessione cade.
6. Interfaccia e PDF in italiano. Commenti nel codice in italiano.
7. Browser da supportare, nelle versioni correnti: Safari su iPhone, Chrome su Android, Chrome, Edge, Firefox e Safari su desktop.
8. Il repository è pubblico: non inserire dati personali reali. Gli esempi usano dati fittizi.

## Dati impianto (configurazione fissa, non modificabile dal fornitore)
Mettili in `js/config.js`. Un valore ancora racchiuso tra «» va considerato mancante: in quel caso mostra in cima alla pagina l'avviso rosso "Configurazione incompleta: …" e stampa il campo nel PDF come "DA COMPILARE".
- Codice impianto: EI9
- Nome impianto: FI01A2MEL
- Tipologia impianto: «tipologia»
- Potenza: «potenza in kWp» (facoltativa)
- Ubicazione: «indirizzo o località, comune, provincia»
- Coordinate (gradi decimali, WGS84): «latitudine, longitudine»
- Committente (SPV): ENERGY ITALIA 9 «forma giuridica»
- Sede del committente: Via Giacomo Puccini 3, 20121 Milano (MI)
- P.IVA del committente: 01776210765
- REA del committente: «provincia» 2055472
- Destinatario delle foto originali e degli allegati: «nome ed e-mail»
- Versione del modulo: V0

## Funzionamento generale

### Struttura della pagina
- Pagina unica, mobile-first, con le 13 sezioni sotto forma di pannelli apribili e chiudibili. L'intestazione di ogni sezione ne mostra lo stato: Completa, Da completare (con il numero di campi mancanti) oppure Non applicabile.
- In cima: codice del rapporto, revisione, dati dell'impianto e del committente in sola lettura.
- In basso, una barra fissa con lo stato del salvataggio ("Salvato alle hh:mm"), il pulsante "Verifica" e il pulsante "Scarica PDF".
- Un menu con: Esporta bozza, Importa bozza, Nuovo rapporto, Istruzioni.
- A 360 px di larghezza non deve esserci scorrimento orizzontale. Le aree toccabili misurano almeno 44 px.
- Le righe ripetibili (persone, operazioni, componenti ecc.) si mostrano come schede, non come tabelle larghe. Si possono aggiungere ed eliminare; l'eliminazione chiede conferma.
- Campi numerici: `type="text"` con `inputmode="decimal"`, che accettano sia la virgola sia il punto. Date e ore usano i controlli nativi.
- I campi obbligatori sono marcati con *. I testi lunghi vanno in aree di testo ampie, così la dettatura vocale della tastiera funziona senza ostacoli.

### Salvataggio
- Salvataggio automatico in IndexedDB a ogni modifica, foto comprese, con un ritardo di circa 0,5 secondi.
- Alla prima apertura chiedi l'archiviazione persistente con `navigator.storage.persist()`, se il browser la supporta.
- Mostra questo consiglio nel menu e dopo la firma: "Esporta la bozza a fine giornata: su alcuni telefoni il browser può cancellare i dati delle pagine che non apri per giorni."
- Esporta bozza: un file JSON con tutti i dati e le foto (in base64), di nome `{codice} bozza {AAAAMMGG-hhmm}.json`.
- Importa bozza: controlla formato e versione, poi chiede conferma prima di sovrascrivere i dati presenti.
- Nuovo rapporto: chiede conferma e propone di esportare prima la bozza in corso.

### Codice del rapporto
Formato `{codiceImpianto}-R-{AAAAMMGG}-{SIGLA}{NN}`, per esempio `EI9-R-20261029-AB01`.
- AAAAMMGG è la data di creazione della bozza. Si fissa alla prima apertura e non cambia più, nemmeno se la bozza viene importata su un altro dispositivo.
- SIGLA è la sigla del fornitore (sezione 1). Finché manca, mostra "XX".
- NN è un progressivo a 2 cifre, modificabile, con valore predefinito 01.

### Revisione
- Il primo PDF valido è la Rev. 0.
- Ogni nuovo PDF valido generato dopo una modifica dei dati fa salire la revisione di uno. Se lo si rigenera senza modifiche, la revisione resta la stessa.
- Per riconoscere le modifiche usa un'impronta (hash) dei dati, salvata a ogni generazione.

### Verifica e PDF
- "Verifica" apre l'elenco dei campi mancanti o non validi, raggruppati per sezione. Toccando una voce si apre la sezione e il cursore va sul campo.
- "Scarica PDF" genera un PDF valido solo se la verifica non trova errori.
- In caso di errori, il pulsante offre invece "Scarica bozza PDF": lo stesso documento con la filigrana "BOZZA – NON VALIDA" su ogni pagina, senza aumentare la revisione.
- Durante la generazione mostra un indicatore di avanzamento: l'interfaccia non deve mai restare bloccata senza un messaggio.

### Sezioni ed elenchi "se applicabile"
- Ogni sezione o gruppo marcato "se applicabile" ha una scelta esplicita Sì/No. Con No i campi si nascondono, non sono richiesti e il PDF stampa "Non applicabile".
- Gli elenchi che possono restare vuoti richiedono una casella esplicita (per esempio "Nessuna anomalia"). Un elenco vuoto senza casella non è mai valido.
- Per costruttore, modello e seriale, oltre al valore ci sono due opzioni distinte, "Non applicabile" e "Non rilevato", che il PDF stampa per esteso.
- Ogni voce "Altro" richiede il campo "specificare", obbligatorio.

### Foto
- Si aggiungono dalle sezioni in cui sono previste, con il pulsante "Aggiungi foto": fotocamera o galleria, `accept="image/*"`, più file alla volta. Non usare l'attributo `capture`.
- Ogni foto viene ridimensionata nel browser a 1600 px sul lato lungo e salvata in JPEG con qualità 0,72, rispettando l'orientamento dello scatto.
- Di ogni foto si conservano anche il nome del file originale, le dimensioni originali in pixel e il peso originale in MB.
- Se il browser non riesce a leggere il formato (per esempio HEIC su un PC Windows), mostra: "Formato non supportato da questo browser: convertilo in JPEG o caricalo da telefono."
- La didascalia è obbligatoria per ogni foto.
- Massimo 60 foto per rapporto, con un avviso a partire da 40.
- Le foto hanno una numerazione unica (Foto 1, 2, …) che segue l'ordine delle sezioni e delle righe. Nelle tabelle del PDF compaiono come riferimento, per esempio "Foto 3, 4".

### Firma
- Area di disegno utilizzabile con dito, penna o mouse (eventi pointer), con un pulsante "Cancella". La firma si conserva come immagine PNG.
- Data e ora della firma si registrano automaticamente.
- Se dopo la firma cambia un qualsiasi dato, la firma decade: compare l'avviso "I dati sono cambiati dopo la firma: firma di nuovo" e la verifica la segnala come mancante.

## Contenuto del modulo
Legenda: * indica un campo obbligatorio. Le liste usano esattamente i valori indicati.

### 1. Identificazione
- Codice rapporto e revisione: calcolati, in sola lettura.
- Ticket collegati: elenco di testi, facoltativo.
- Impianto e committente: presi dalla configurazione, in sola lettura.
- Fornitore*:
  - ragione sociale*;
  - P.IVA*, con controllo del carattere di controllo della partita IVA italiana (11 cifre). Una casella "Fornitore estero" disattiva il controllo e accetta un identificativo libero;
  - sede*;
  - sigla*: 2 lettere maiuscole, usate nel codice del rapporto.
- Compilatore*: nome e cognome*, ruolo*, e-mail* (in formato valido), telefono (facoltativo).

### 2. Inquadramento
- Oggetto dell'intervento*: testo breve, massimo 120 caratteri. Compare anche nel nome del file PDF.
- Tipologie*: scelta multipla, almeno una tra Ordinario (programmato), Correttivo, Ispezione / sopralluogo, Messa in servizio, Altro.
- Regime*: Canone, Extra-canone, Da concordare.
- Riferimento offerta o ordine: obbligatorio se il regime è Extra-canone.
- Intervento coperto da garanzia, quindi non addebitabile*: Sì, No, Da definire.

### 3. Evento e tempi
- Origine dell'attività*: Evento o guasto, Attività programmata. Con "Attività programmata" i campi relativi all'evento non sono richiesti.
- Data e ora dell'evento: una data-ora oppure la casella "Non nota". Con "Evento o guasto" serve una delle due.
- Fonte dell'orario dell'evento*, se la data-ora è inserita: SCADA/monitoraggio, Relè di protezione, Segnalazione, Altro.
- Modalità di rilevazione*, con "Evento o guasto": Allarme SCADA/monitoraggio, Segnalazione del titolare o dell'asset manager, Segnalazione del distributore, Rilevato in sito, Altro.
- Arrivo in sito*: data-ora.
- Riarmo o ripristino: data-ora, obbligatoria se la sezione 4 è applicabile.
- Fine attività*: data-ora.
- Stato dell'impianto prima* e dopo*: In servizio, Limitato, Fermo. Con "Limitato" serve la potenza disponibile in percentuale, da 0 a 100, obbligatoria.
- Regola di coerenza: evento ≤ arrivo in sito ≤ riarmo ≤ fine attività, per i valori presenti.

### 4. Riarmo
Se applicabile, alla domanda "L'intervento comprende il riarmo di protezioni?".
- Protezioni intervenute*: scelta multipla tra DG/PG – Dispositivo o protezione generale; SPI/DDI – Protezione o dispositivo di interfaccia; Interruttore MT di linea; Inverter; Protezioni BT; Altro.
- Segnalazioni lette su relè o apparecchiature*: testo con funzioni intervenute, valori e allarmi.
- Foto delle segnalazioni: almeno una, oppure la casella "Foto non disponibile" con il motivo*.
- Causa dello scatto*: Guasto interno all'impianto, Disturbo o guasto sulla rete del distributore, Non individuata, Altro.
- Verifiche eseguite prima del riarmo*: testo.
- Riarmo autorizzato da*: nome e cognome*, ruolo e organizzazione*, modalità* (In sito, Telefono, E-mail, Altro).

### 5. Squadra e mezzi, per giornata
Serve almeno una giornata. Per ogni giornata:
- Data*. Le giornate devono avere date diverse, comprese tra la data di arrivo in sito e quella di fine attività.
- Persone, almeno una:
  - nome e cognome*;
  - organizzazione*, con valore predefinito la ragione sociale del fornitore;
  - ruolo*: Preposto ai lavori, Tecnico, Responsabile impianto, Altro;
  - qualifica*: PES, PAV, PES + PEI, PAV + PEI, Nessuna;
  - ore di lavoro*, da 0 a 24;
  - ore di viaggio, da 0 a 24.
- Mezzi: un elenco oppure la casella "Nessun mezzo". Per ogni mezzo:
  - tipo*: Auto, Furgone, Mezzo d'opera, Altro;
  - alimentazione*: Gasolio, Benzina, GPL o metano, Ibrido, Elettrico, Altro;
  - km di andata e ritorno*, maggiori o uguali a 0.
- Totali calcolati, mostrati e stampati: ore di lavoro e di viaggio per persona e complessive, km complessivi.

### 6. Sicurezza
- Responsabile impianto*: nome e cognome, organizzazione.
- Preposto ai lavori*: nome e cognome, suggerendo i nominativi con ruolo "Preposto ai lavori" inseriti nella sezione 5.
- Manovre su apparecchiature elettriche*: Sì/No. Con Sì serve una descrizione*.
- DPI utilizzati*: scelta multipla tra Elmetto, Guanti isolanti, Visiera o occhiali, Calzature di sicurezza, Indumenti ignifughi o per arco elettrico, Pedana o tappeto isolante, Altro.
- Anomalie di sicurezza riscontrate*: Sì/No. Con Sì servono una descrizione* e le foto.
- Incidenti o quasi incidenti*: Sì/No. Con Sì serve una descrizione*.

### 7. Constatazione iniziale e sopralluogo
- Situazione riscontrata*: testo di almeno 20 caratteri.
- Componenti e apparecchiature oggetto dell'intervento, almeno uno:
  - area*: testo con suggerimenti (Cabina di consegna, Cabina utente, Cabina di trasformazione, Cabina inverter, Campo, Quadri BT, Linee MT, Sistema di monitoraggio/SCADA, Recinzione e viabilità);
  - componente*;
  - costruttore*, modello* e seriale*, ciascuno con le opzioni "Non applicabile" e "Non rilevato".
- Anomalie riscontrate: un elenco oppure la casella "Nessuna anomalia". Per ogni anomalia: area*, descrizione*, foto.

### 8. Registro operazioni
Serve almeno un'operazione. Le operazioni si ordinano per data e ora e si numerano automaticamente. Per ognuna:
- Data*, ora di inizio*, ora di fine* (non precedente all'inizio).
- Tipo*: Verifica o ispezione, Misura o prova, Manovra, Messa in sicurezza, Riarmo, Riparazione o ripristino, Sostituzione, Pulizia, Configurazione o impostazione, Altro.
- Componente*: scelta tra i componenti della sezione 7, più la voce "Generale".
- Descrizione*.
- Esito dell'operazione*: Eseguita, Parziale, Non eseguita.
- Stato riscontrato*: Conforme, Anomalia, Non applicabile.
- Modalità*: In campo, Da remoto. Con "In campo" la data deve corrispondere a una giornata della sezione 5.
- Foto.

### 9. Misure e attrezzature (se applicabile)
- Attrezzature, almeno una:
  - tipo o descrizione*, produttore*, modello*, seriale*;
  - numero del certificato di taratura, oppure "Non disponibile";
  - scadenza della taratura, come data oppure "Non disponibile".

  Se la taratura risulta scaduta alla data di una misura, mostra un avviso, senza bloccare.
- Misure: un elenco oppure la casella "Nessuna misura". Per ogni misura:
  - data*;
  - grandezza*: testo con suggerimenti (Resistenza di isolamento, Resistenza di terra, Tensione, Corrente, Temperatura);
  - punto di misura*;
  - valore*, numerico;
  - unità*: MΩ, Ω, V, kV, A, °C, %, Altro;
  - riferimento o soglia, facoltativo;
  - esito*: Conforme, Non conforme, Solo rilievo;
  - strumento*: scelta tra le attrezzature inserite.

### 10. Componenti utilizzati o sostituiti (se applicabile)
Serve almeno una riga. Per ogni riga:
- area*, componente*, costruttore*, modello*;
- quantità*, maggiore di 0, con unità di misura* tra n, m, kg, l, set, Altro;
- seriale vecchio* e seriale nuovo*: un valore, oppure "Non applicabile" o "Non rilevato";
- fornitore del componente*;
- garanzia del costruttore*: Sì, No, Non applicabile, Non nota;
- componente della sezione 7 a cui si riferisce, facoltativo.

### 11. Esito
- Constatazione finale*: testo di almeno 20 caratteri.
- Ipotesi sull'origine del guasto*: testo, oppure "Non applicabile (attività programmata)".
- Operazioni da eseguire: un elenco oppure la casella "Nessuna operazione da eseguire". Per ogni operazione: descrizione*, priorità* (Alta, Media, Bassa), a carico di*, entro (data, facoltativa).

### 12. ESG (dati minimi)
- Km complessivi: calcolati dalla sezione 5, in sola lettura.
- Carburante consumato: litri, oppure "Non noto".
- Rifiuti prodotti: un elenco oppure la casella "Nessun rifiuto". Per ogni rifiuto:
  - descrizione*;
  - codice EER, facoltativo: 6 cifre, mostrate come "NN NN NN";
  - quantità*, con unità* tra kg, l, n, m;
  - destinazione*: Ritirati dal fornitore, Lasciati in sito in area dedicata, Altro.
- Acqua utilizzata: litri, oppure "Non utilizzata".
- Perdite o rabbocchi di gas isolanti delle apparecchiature, per esempio SF6*: Sì, No, Non verificato. Con Sì servono l'apparecchiatura* e la quantità in kg (oppure "Non nota").

### 13. Foto, allegati e firma
- Riepilogo di tutte le foto: numero, miniatura, didascalia*, riferimento (sezione e riga), nome del file originale.
- Allegati inviati a parte: elenco facoltativo. Per ogni allegato:
  - tipo*: Certificato di taratura, Scheda tecnica, Manuale, Report del fornitore, Altro;
  - descrizione*;
  - nome del file.
- Istruzione ben visibile: "Invia le foto originali ad alta risoluzione e gli allegati a {destinatario} con WeTransfer, e-mail o un altro canale. Nel PDF ogni foto riporta il nome del file originale, così si possono abbinare."
- Firma*: nome e cognome del firmatario*, ruolo*, firma grafica*.
- Dichiarazione stampata sopra la firma: "Il sottoscritto dichiara che quanto riportato nel presente rapporto corrisponde alle attività eseguite."

## PDF
- Formato A4 verticale, margini di 15 mm, font incluso nel repository, corpo 9–10 pt.
- Intestazione su ogni pagina: "RAPPORTO DI INTERVENTO", codice, "Rev. N", impianto (codice e nome), committente, "Pagina X di Y".
- Piè di pagina su ogni pagina: ragione sociale, sede, P.IVA e REA del committente, e la dicitura "Modulo V0 – generato il gg/mm/aaaa hh:mm".
- Prima pagina con un riepilogo: impianto, tipologia, ubicazione, coordinate, committente, fornitore, compilatore, periodo (dalla prima all'ultima giornata), oggetto, tipologie, regime.
- Seguono le sezioni dalla 2 alla 13, nell'ordine, con numeri e titoli del modulo.
- Le righe ripetibili vanno in tabelle che ripetono l'intestazione a ogni cambio pagina.
- Le sezioni non applicabili si stampano con la dicitura "Non applicabile". Anche i valori "Non applicabile" e "Non rilevato" si stampano per esteso.
- Formati italiani: date gg/mm/aaaa, ore hh:mm, decimali con la virgola.
- La firma si stampa con nome, ruolo, data e ora.
- In coda, l'allegato fotografico: una foto per pagina, adattata alla pagina, con la didascalia "Foto N – {didascalia} – Rif.: {sezione e riga} – File originale: {nome} ({larghezza}×{altezza} px)".
- Nome del file: `{codice} rev{N} - {oggetto}.pdf`, ripulito dai caratteri non ammessi nei nomi di file, al massimo 120 caratteri.
- Un PDF con 30 foto deve generarsi senza blocchi su un telefono di fascia media.

## Organizzazione del codice
- File principali: `index.html`, `css/app.css` e la cartella `js/`, con moduli separati almeno per configurazione, archivio (IndexedDB), modello e regole di validazione, foto, firma, PDF e interfaccia.
- La logica pura va in moduli che non dipendono dal browser, così da poterla testare con Node: validazione, codice del rapporto, controllo della P.IVA, revisione, nome del file, formati.
- `tests/`: test eseguibili con `node --test`, con Node 18 o superiore e senza dipendenze.
- `esempi/bozza-esempio.json`: una bozza completa con dati fittizi, importabile per vedere un PDF completo. Deve descrivere un riarmo con sopralluogo su due giornate e contenere almeno 3 immagini segnaposto.
- `README.md`, con:
  - cos'è la V0;
  - come pubblicarla su GitHub Pages (Settings → Pages → Deploy from a branch → `main`, cartella root);
  - come modificare `js/config.js`;
  - le versioni delle librerie;
  - i limiti noti.
- `TEST.md`: il collaudo manuale su iPhone (Safari) e Android (Chrome), con esiti da spuntare. Deve coprire:
  - apertura dal link e compilazione completa;
  - chiusura e riapertura della pagina, con dati e foto ripristinati;
  - funzionamento in modalità aereo dopo il caricamento;
  - 30 foto, comprese foto ruotate;
  - firma con il dito;
  - PDF valido e bozza PDF;
  - esportazione e importazione della bozza tra telefono e PC;
  - foto in formato HEIC da PC;
  - controllo della P.IVA;
  - avviso di firma decaduta.

## Modo di lavorare
- Lavora su un ramo dedicato, con commit piccoli e descrittivi. Al termine apri una pull request verso `main`.
- Non chiedere conferme intermedie, salvo impedimenti bloccanti. Nel dubbio scegli la soluzione più semplice e annotala nel report finale.
- Verifica tu stesso il lavoro:
  - esegui i test;
  - servi il sito in locale, per esempio con `python3 -m http.server`;
  - se nell'ambiente c'è un browser automatizzato, prova caricamento della pagina, importazione dell'esempio e generazione del PDF. Se non c'è, dichiaralo.

## Criteri di accettazione
1. La pagina si apre da un sottopercorso senza errori in console e senza richieste di rete verso altri domini.
2. Ci sono tutte le 13 sezioni, con i campi, le liste e le regole descritti.
3. Dopo il ricaricamento della pagina, dati e foto sono ripristinati.
4. "Scarica PDF" produce un PDF valido solo se la verifica non trova errori; negli altri casi è disponibile la bozza con filigrana.
5. Il PDF rispetta quanto descritto nella sezione "PDF": intestazione, piè di pagina, numerazione, ordine, "Non applicabile", allegato fotografico, firma, nome del file.
6. Revisione e decadenza della firma funzionano come descritto.
7. Esportazione e importazione della bozza conservano tutti i dati, foto comprese.
8. La bozza di esempio si importa e genera un PDF valido.
9. Tutti i test eseguiti con `node --test` passano.
10. A 360 px di larghezza non c'è scorrimento orizzontale.
11. Se la configurazione contiene valori tra «», compare l'avviso rosso e il PDF stampa "DA COMPILARE".

## Report finale (in chat)
- Elenco dei file creati.
- Per ogni criterio di accettazione: verificato o non verificato, e in che modo.
- Le scelte fatte in autonomia e i limiti noti.
- I passaggi per pubblicare su GitHub Pages.
