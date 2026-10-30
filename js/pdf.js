// Generazione del PDF nel browser con pdfmake (copia locale in vendor/).
// pdfmake si carica all'avvio della pagina, così il PDF si genera anche se poi
// la connessione cade. Nessuna richiesta di rete: gli URL esterni sono vietati.

let caricamento = null;

function caricaScript(src) {
  return new Promise((risolvi, rifiuta) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => risolvi();
    s.onerror = () => rifiuta(new Error(`Impossibile caricare ${src}`));
    document.head.append(s);
  });
}

export function caricaPdfmake() {
  if (!caricamento) {
    caricamento = caricaScript('vendor/pdfmake/pdfmake.min.js')
      .then(() => caricaScript('vendor/pdfmake/vfs_fonts.js'))
      .then(() => {
        const pdfMake = globalThis.pdfMake;
        if (!pdfMake || typeof pdfMake.createPdf !== 'function') throw new Error('pdfmake non disponibile');
        pdfMake.setUrlAccessPolicy(() => false);
        return pdfMake;
      })
      .catch((errore) => {
        caricamento = null;
        throw new Error(`Libreria PDF non caricata: ricarica la pagina con la connessione attiva. (${errore.message})`);
      });
  }
  return caricamento;
}

// Genera il PDF e restituisce un Blob.
export async function generaPdf(definizione) {
  const pdfMake = await caricaPdfmake();
  return pdfMake.createPdf(definizione).getBlob();
}

// Scarica un Blob con il nome indicato (PDF o bozza JSON).
export function scaricaFile(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  // l'URL resta valido per un po': alcuni browser aprono il file con ritardo
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}
