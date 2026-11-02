# Collaudo manuale – iPhone (Safari) e Android (Chrome)

Da eseguire sul sito pubblicato (`https://<utente>.github.io/<repository>/`) con un iPhone (Safari) e un telefono Android (Chrome), più un PC per i passi indicati. Segnare ☑ l'esito su ogni dispositivo e annotare i problemi nella colonna «Note».

| | iPhone | Android | PC |
| --- | --- | --- | --- |
| Modello | | | |
| Sistema operativo e versione | | | |
| Browser e versione | | | |
| Data del collaudo | | | |
| Collaudatore | | | |

Preparazione: tenere sul telefono una ventina di foto di prova (alcune scattate in verticale, cioè ruotate), e sul PC il file della bozza di esempio scaricato da `https://<utente>.github.io/<repository>/esempi/bozza-esempio.json`.

## 1. Apertura dal link e compilazione completa

| # | Passo | Esito atteso | iPhone | Android | Note |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Aprire il link (anche da e-mail o messaggio). | La pagina si apre senza errori; in alto codice del rapporto, revisione, dati dell'impianto e del committente. | ☐ | ☐ | |
| 1.2 | Guardare l'avviso in cima. | Compare l'avviso rosso «Configurazione incompleta: …» solo se in `js/config.js` restano valori tra «» (oggi può riguardare solo il destinatario delle foto); non cita mai impianto, tipologia, potenza, coordinate, committente, sede o P.IVA. | ☐ | ☐ | |
| 1.3 | Scorrere tutta la pagina in verticale, con le sezioni aperte. | Nessuno scorrimento orizzontale; testi e pulsanti leggibili; pulsanti facili da toccare. | ☐ | ☐ | |
| 1.4 | Aprire e chiudere le 13 sezioni. | Ogni intestazione mostra «Completa», «Da completare (N)» o «Non applicabile». | ☐ | ☐ | |
| 1.5 | Compilare tutte le sezioni (persone, operazioni, componenti, misure…), aggiungendo ed eliminando righe. | Le righe sono schede; l'eliminazione chiede conferma; nei campi numerici si può usare la virgola. | ☐ | ☐ | |
| 1.6 | Dettare un testo lungo con il microfono della tastiera in un'area di testo. | La dettatura funziona e il testo resta. | ☐ | ☐ | |
| 1.7 | Scegliere «Altro» in un elenco. | Compare «Specificare», obbligatorio. | ☐ | ☐ | |
| 1.8 | Rispondere «No» alle sezioni 4, 9 e 10. | I campi si nascondono e la sezione risulta «Non applicabile». | ☐ | ☐ | |
| 1.9 | Premere «Verifica». | Elenco dei campi mancanti per sezione; toccando una voce si apre la sezione e il cursore va sul campo. | ☐ | ☐ | |
| 1.10 | Durante la scrittura guardare la barra in basso. | Si nasconde con la tastiera aperta e ricompare chiudendola; mostra «Salvato alle hh:mm». | ☐ | ☐ | |

## 2. Chiusura e riapertura della pagina

| # | Passo | Esito atteso | iPhone | Android | Note |
| --- | --- | --- | --- | --- | --- |
| 2.1 | Con dati e foto inseriti, attendere «Salvato alle …», chiudere la scheda e il browser. | — | ☐ | ☐ | |
| 2.2 | Riaprire il link. | Dati, foto (con anteprime), firma e revisione sono ripristinati. | ☐ | ☐ | |
| 2.3 | Riaprire dopo aver spento e riacceso il telefono. | Come sopra. | ☐ | ☐ | |

## 3. Modalità aereo dopo il caricamento

| # | Passo | Esito atteso | iPhone | Android | Note |
| --- | --- | --- | --- | --- | --- |
| 3.1 | Con la pagina aperta, attivare la modalità aereo. | — | ☐ | ☐ | |
| 3.2 | Modificare dei campi, aggiungere una foto, firmare. | Tutto funziona; la barra mostra «Salvato alle …». | ☐ | ☐ | |
| 3.3 | Premere «Scarica PDF» (o «Scarica bozza PDF»). | Il PDF si genera e si scarica. | ☐ | ☐ | |
| 3.4 | Esportare la bozza dal menu. | Il file si scarica. | ☐ | ☐ | |

## 4. Trenta foto, comprese foto ruotate

| # | Passo | Esito atteso | iPhone | Android | Note |
| --- | --- | --- | --- | --- | --- |
| 4.1 | «Aggiungi foto» in una sezione: verificare che si possa scegliere fotocamera o galleria. | Si apre la scelta tra fotocamera e galleria; si possono scegliere più foto insieme. | ☐ | ☐ | |
| 4.2 | Aggiungere 30 foto in più sezioni (4, 6, 7, 8), alcune scattate in verticale. | Messaggio di avanzamento durante l'elaborazione; le foto verticali compaiono dritte. | ☐ | ☐ | |
| 4.3 | Controllare il riepilogo nella sezione 13. | Numerazione unica Foto 1…30 nell'ordine delle sezioni; nome del file originale, dimensioni e peso. | ☐ | ☐ | |
| 4.4 | Lasciare una didascalia vuota e premere «Verifica». | La didascalia mancante è segnalata. | ☐ | ☐ | |
| 4.5 | Arrivare a 40 foto. | Avviso «Hai inserito 40 foto: il massimo è 60». | ☐ | ☐ | |
| 4.6 | Generare il PDF con 30 foto. | Messaggio di avanzamento; il PDF si genera senza blocchi; nelle pagine finali una foto per pagina, dritta, con la didascalia completa. | ☐ | ☐ | |

## 5. Firma con il dito

| # | Passo | Esito atteso | iPhone | Android | Note |
| --- | --- | --- | --- | --- | --- |
| 5.1 | Nella sezione 13 compilare nome e ruolo, poi firmare con il dito. | Il tratto segue il dito; la pagina non scorre mentre si firma; compare «Firmato il gg/mm/aaaa hh:mm». | ☐ | ☐ | |
| 5.2 | Dopo la firma. | Compare il consiglio «Esporta la bozza a fine giornata…». | ☐ | ☐ | |
| 5.3 | Premere «Cancella» e firmare di nuovo. | L'area si svuota e la nuova firma è registrata. | ☐ | ☐ | |
| 5.4 | Ruotare il telefono. | La firma resta visibile, adattata all'area. | ☐ | ☐ | |

## 6. PDF valido e bozza PDF

| # | Passo | Esito atteso | iPhone | Android | Note |
| --- | --- | --- | --- | --- | --- |
| 6.1 | Con campi mancanti, guardare il pulsante in basso. | Il pulsante dice «Scarica bozza PDF». | ☐ | ☐ | |
| 6.2 | Scaricare la bozza PDF e aprirla. | Filigrana «BOZZA – NON VALIDA» su ogni pagina; revisione non aumentata; nome del file che termina con « - BOZZA.pdf». | ☐ | ☐ | |
| 6.3 | Completare tutto e firmare. | Il pulsante dice «Scarica PDF». | ☐ | ☐ | |
| 6.4 | Scaricare il PDF e aprirlo. | Nome `{codice} rev0 - {oggetto}.pdf`; prima pagina con il riepilogo; sezioni 2–13 in ordine; intestazione e piè di pagina su ogni pagina con «Pagina X di Y»; firma con nome, ruolo, data e ora; allegato fotografico. | ☐ | ☐ | |
| 6.5 | Riscaricare il PDF senza modificare nulla. | Stessa revisione (rev0). | ☐ | ☐ | |
| 6.6 | Modificare un dato, firmare di nuovo, scaricare il PDF. | Revisione aumentata (rev1). | ☐ | ☐ | |
| 6.7 | Se il destinatario delle foto in configurazione è ancora tra «», cercarlo nel PDF (sezione 13). | È stampato come «DA COMPILARE». | ☐ | ☐ | |
| 6.8 | Nella prima pagina del PDF valido cercare i dati di impianto e committente. | Compaiono di seguito in quest'ordine: Impianto, Tipologia, Potenza, Coordinate, Committente, Sede, P.IVA; non ci sono ubicazione, REA né forma giuridica; le coordinate sono identiche a come scritte. | ☐ | ☐ | |

## 7. Esportazione e importazione della bozza tra telefono e PC

| # | Passo | Esito atteso | iPhone | Android | PC | Note |
| --- | --- | --- | --- | --- | --- | --- |
| 7.1 | Sul telefono: Menu → Esporta bozza. | Si scarica `{codice} bozza AAAAMMGG-hhmm.json`. | ☐ | ☐ | — | |
| 7.2 | Trasferire il file sul PC (e-mail, cloud…) e sul PC: Menu → Importa bozza. | Chiede conferma prima di sostituire i dati; dopo l'importazione dati, foto, firma, codice (stessa data di creazione) e revisione sono uguali al telefono. | — | — | ☐ | |
| 7.3 | Sul PC modificare un dato, esportare e importare sul telefono. | La modifica arriva sul telefono, con le foto. | ☐ | ☐ | ☐ | |
| 7.4 | Importare un file che non è una bozza (es. una foto). | Messaggio di errore chiaro, nessun dato sostituito. | ☐ | ☐ | ☐ | |
| 7.5 | Importare la bozza di esempio e scaricare il PDF. | PDF valido completo, Rev. 0. | ☐ | ☐ | ☐ | |
| 7.6 | Menu → Nuovo rapporto. | Chiede conferma e propone di esportare prima la bozza; il nuovo rapporto ha la data di oggi nel codice. | ☐ | ☐ | ☐ | |

## 8. Foto in formato HEIC da PC

| # | Passo | Esito atteso | PC Windows (Chrome o Edge) | Mac (Safari) | Note |
| --- | --- | --- | --- | --- | --- |
| 8.1 | Aggiungere una foto .HEIC copiata da un iPhone. | Su Windows: «Formato non supportato da questo browser: convertilo in JPEG o caricalo da telefono.» Su Mac con Safari la foto viene accettata. | ☐ | ☐ | |
| 8.2 | Aggiungere la stessa foto dal telefono. | La foto viene accettata. | ☐ (iPhone) | ☐ (Android) | |

## 9. Controllo della partita IVA

| # | Passo | Esito atteso | iPhone | Android | Note |
| --- | --- | --- | --- | --- | --- |
| 9.1 | Sezione 1: scrivere `12345678901`. | «Partita IVA non valida: il carattere di controllo non corrisponde…» | ☐ | ☐ | |
| 9.2 | Scrivere `12345678903`. | «Partita IVA valida». | ☐ | ☐ | |
| 9.3 | Scrivere 10 cifre. | «deve contenere 11 cifre» (dopo «Verifica» anche accanto al campo). | ☐ | ☐ | |
| 9.4 | Selezionare «Fornitore estero» e scrivere un identificativo estero. | Nessun controllo; il campo diventa «Identificativo fiscale». | ☐ | ☐ | |

## 10. Avviso di firma decaduta

| # | Passo | Esito atteso | iPhone | Android | Note |
| --- | --- | --- | --- | --- | --- |
| 10.1 | Con il rapporto firmato, modificare un campo qualsiasi (anche nome o ruolo del firmatario). | Compare «I dati sono cambiati dopo la firma: firma di nuovo», in cima alla pagina e nella sezione 13. | ☐ | ☐ | |
| 10.2 | Premere «Verifica». | La firma è segnalata come mancante. | ☐ | ☐ | |
| 10.3 | Firmare di nuovo. | L'avviso sparisce e il pulsante torna «Scarica PDF». | ☐ | ☐ | |

## 11. Impianto e committente nella sezione 1

| # | Passo | Esito atteso | iPhone | Android | Note |
| --- | --- | --- | --- | --- | --- |
| 11.1 | Aprire un rapporto nuovo e guardare la scheda in alto. | Impianto, Tipologia, Coordinate, Committente, Sede e P.IVA risultano «DA COMPILARE» (in rosso); la potenza «Non indicata». Il codice del rapporto inizia con `XXX-R-` finché l'impianto non è scelto. | ☐ | ☐ | |
| 11.2 | Sezione 1, gruppo «Impianto e committente»: aprire i menu. | Partono vuoti con «— Seleziona —». Impianto: solo «FI01A2MEL»; Tipologia: «Fotovoltaico», «Eolico»; Committente: «ENERGY ITALIA 9»; Sede: «Via Giacomo Puccini 3, 20121 Milano (MI)»; P.IVA: «01776210765». Tutti con *. | ☐ | ☐ | |
| 11.3 | Toccare il campo Potenza (kWp). | Si apre la tastiera numerica; il campo non ha *. | ☐ | ☐ | |
| 11.4 | Scrivere `998,5`, poi `1.000`. | Subito, senza premere «Verifica»: «Inserisci solo cifre, senza decimali né separatori». | ☐ | ☐ | |
| 11.5 | Scrivere `998`. | Il messaggio sparisce. | ☐ | ☐ | |
| 11.6 | Nelle coordinate scrivere un formato in gradi-primi-secondi (es. `45°27'51"N 9°11'25"E`), poi un formato decimale. | Entrambi accettati, senza messaggi di formato. | ☐ | ☐ | |
| 11.7 | Lasciare vuoto un menu e premere «Verifica». | Il campo è nell'elenco della sezione 1; il pulsante in basso offre solo «Scarica bozza PDF». | ☐ | ☐ | |
| 11.8 | Scegliere tutte le voci. | La scheda in alto mostra i valori scelti; il codice del rapporto inizia con `EI9-R-`. | ☐ | ☐ | |
| 11.9 | Con il rapporto firmato, cambiare la tipologia. | Compare «I dati sono cambiati dopo la firma: firma di nuovo». | ☐ | ☐ | |
| 11.10 | Aprire su questo telefono una bozza salvata con la versione precedente (o importare un file di bozza esportato prima dell'aggiornamento). | Si apre senza errori; i nuovi campi sono vuoti e richiesti da «Verifica»; firma e revisione restano quelle di prima finché non si compilano. | ☐ | ☐ | |

## Esito complessivo

| | iPhone | Android | PC |
| --- | --- | --- | --- |
| Collaudo superato | ☐ | ☐ | ☐ |
| Problemi da correggere | | | |
