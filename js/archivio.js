// Archivio locale in IndexedDB: la bozza corrente, le immagini delle foto e le
// miniature. I dati restano nel browser finché il fornitore non invia il PDF.
// Se IndexedDB non è disponibile, l'archivio lavora solo in memoria e la pagina
// avvisa di esportare la bozza.

const NOME_DB = 'rapporto-intervento-v0';
const VERSIONE_DB = 1;
const BOZZA = 'bozza'; // un solo record, chiave "corrente"
const IMMAGINI = 'immagini'; // { id, dati: dataURL JPEG fino a 1600 px }
const MINIATURE = 'miniature'; // { id, dati: dataURL JPEG piccola, per la pagina }
const CHIAVE_BOZZA = 'corrente';

let promessaDb = null;
let soloMemoria = false;
const memoria = { bozza: null, immagini: new Map(), miniature: new Map() };

function richiesta(r) {
  return new Promise((risolvi, rifiuta) => {
    r.onsuccess = () => risolvi(r.result);
    r.onerror = () => rifiuta(r.error);
  });
}

function apriDb() {
  if (!promessaDb) {
    promessaDb = new Promise((risolvi, rifiuta) => {
      if (!globalThis.indexedDB) {
        rifiuta(new Error('IndexedDB non disponibile'));
        return;
      }
      const r = indexedDB.open(NOME_DB, VERSIONE_DB);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(BOZZA)) db.createObjectStore(BOZZA);
        if (!db.objectStoreNames.contains(IMMAGINI)) db.createObjectStore(IMMAGINI, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(MINIATURE)) db.createObjectStore(MINIATURE, { keyPath: 'id' });
      };
      r.onsuccess = () => {
        const db = r.result;
        db.onversionchange = () => db.close();
        risolvi(db);
      };
      r.onerror = () => rifiuta(r.error || new Error('Apertura archivio non riuscita'));
      r.onblocked = () => rifiuta(new Error("Archivio bloccato da un'altra scheda"));
    });
  }
  return promessaDb;
}

// Esegue "operazione(tx)" in una transazione; risolve al completamento con il
// valore restituito da "operazione" (eventualmente una Promise di richieste).
async function transazione(negozi, modo, operazione) {
  const db = await apriDb();
  return new Promise((risolvi, rifiuta) => {
    const tx = db.transaction(negozi, modo);
    let risultato;
    tx.oncomplete = () => Promise.resolve(risultato).then(risolvi, rifiuta);
    tx.onerror = () => rifiuta(tx.error || new Error('Errore di archivio'));
    tx.onabort = () => rifiuta(tx.error || new Error('Salvataggio annullato (spazio insufficiente?)'));
    risultato = operazione(tx);
  });
}

// Da chiamare all'avvio: false se si lavora solo in memoria.
export async function inizializzaArchivio() {
  try {
    await apriDb();
    soloMemoria = false;
  } catch {
    soloMemoria = true;
  }
  return !soloMemoria;
}

export function archivioInMemoria() {
  return soloMemoria;
}

export async function caricaBozza() {
  if (soloMemoria) return memoria.bozza;
  const valore = await transazione([BOZZA], 'readonly', (tx) => richiesta(tx.objectStore(BOZZA).get(CHIAVE_BOZZA)));
  return valore || null;
}

export async function salvaBozza(dati) {
  if (soloMemoria) {
    memoria.bozza = JSON.parse(JSON.stringify(dati));
    return;
  }
  await transazione([BOZZA], 'readwrite', (tx) => {
    tx.objectStore(BOZZA).put(dati, CHIAVE_BOZZA);
  });
}

// { id: dataURL } di tutte le miniature.
export async function caricaMiniature() {
  if (soloMemoria) return Object.fromEntries(memoria.miniature);
  const righe = await transazione([MINIATURE], 'readonly', (tx) => richiesta(tx.objectStore(MINIATURE).getAll()));
  return Object.fromEntries(righe.map((r) => [r.id, r.dati]));
}

// { id: dataURL } delle immagini indicate (quelle mancanti non compaiono).
export async function caricaImmagini(ids) {
  if (soloMemoria) {
    return Object.fromEntries(ids.filter((id) => memoria.immagini.has(id)).map((id) => [id, memoria.immagini.get(id)]));
  }
  return transazione([IMMAGINI], 'readonly', (tx) => {
    const negozio = tx.objectStore(IMMAGINI);
    return Promise.all(ids.map((id) => richiesta(negozio.get(id)))).then((righe) =>
      Object.fromEntries(righe.filter(Boolean).map((r) => [r.id, r.dati])),
    );
  });
}

export async function salvaFoto(id, jpeg, miniatura) {
  if (soloMemoria) {
    memoria.immagini.set(id, jpeg);
    memoria.miniature.set(id, miniatura);
    return;
  }
  await transazione([IMMAGINI, MINIATURE], 'readwrite', (tx) => {
    tx.objectStore(IMMAGINI).put({ id, dati: jpeg });
    tx.objectStore(MINIATURE).put({ id, dati: miniatura });
  });
}

export async function salvaMiniatura(id, miniatura) {
  if (soloMemoria) {
    memoria.miniature.set(id, miniatura);
    return;
  }
  await transazione([MINIATURE], 'readwrite', (tx) => {
    tx.objectStore(MINIATURE).put({ id, dati: miniatura });
  });
}

export async function eliminaFoto(ids) {
  if (ids.length === 0) return;
  if (soloMemoria) {
    ids.forEach((id) => {
      memoria.immagini.delete(id);
      memoria.miniature.delete(id);
    });
    return;
  }
  await transazione([IMMAGINI, MINIATURE], 'readwrite', (tx) => {
    ids.forEach((id) => {
      tx.objectStore(IMMAGINI).delete(id);
      tx.objectStore(MINIATURE).delete(id);
    });
  });
}

// Elimina immagini e miniature che la bozza non usa più (es. dopo un'interruzione).
export async function eliminaOrfane(idValidi) {
  const validi = new Set(idValidi);
  if (soloMemoria) {
    for (const id of Array.from(memoria.immagini.keys())) if (!validi.has(id)) memoria.immagini.delete(id);
    for (const id of Array.from(memoria.miniature.keys())) if (!validi.has(id)) memoria.miniature.delete(id);
    return;
  }
  const [chiaviImmagini, chiaviMiniature] = await transazione([IMMAGINI, MINIATURE], 'readonly', (tx) =>
    Promise.all([richiesta(tx.objectStore(IMMAGINI).getAllKeys()), richiesta(tx.objectStore(MINIATURE).getAllKeys())]),
  );
  const orfane = new Set([...chiaviImmagini, ...chiaviMiniature].filter((id) => !validi.has(id)));
  await eliminaFoto(Array.from(orfane));
}

// Sostituisce tutto il contenuto (importazione, nuovo rapporto).
export async function sostituisciTutto(dati, immagini, miniature) {
  if (soloMemoria) {
    memoria.bozza = JSON.parse(JSON.stringify(dati));
    memoria.immagini = new Map(Object.entries(immagini));
    memoria.miniature = new Map(Object.entries(miniature));
    return;
  }
  await transazione([BOZZA, IMMAGINI, MINIATURE], 'readwrite', (tx) => {
    tx.objectStore(BOZZA).clear();
    tx.objectStore(IMMAGINI).clear();
    tx.objectStore(MINIATURE).clear();
    tx.objectStore(BOZZA).put(dati, CHIAVE_BOZZA);
    for (const [id, jpeg] of Object.entries(immagini)) tx.objectStore(IMMAGINI).put({ id, dati: jpeg });
    for (const [id, mini] of Object.entries(miniature)) tx.objectStore(MINIATURE).put({ id, dati: mini });
  });
}

// Chiede al browser di non cancellare i dati in automatico (se supportato).
export async function richiediPersistenza() {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // alcuni browser rifiutano la richiesta: non è un errore bloccante
  }
  return false;
}

export async function statoPersistenza() {
  try {
    if (navigator.storage && typeof navigator.storage.persisted === 'function') return await navigator.storage.persisted();
  } catch {
    // ignorato
  }
  return null;
}
