// Impronta (hash) dei dati, numero di revisione e validità della firma.
// Modulo puro: non usa il browser, si testa con Node.

// cyrb53: hash non crittografico a 53 bit (dominio pubblico). Serve solo a
// riconoscere se i dati sono cambiati, non a proteggerli.
function cyrb53(testo, seme) {
  let h1 = 0xdeadbeef ^ seme;
  let h2 = 0x41c6ce57 ^ seme;
  for (let i = 0; i < testo.length; i++) {
    const c = testo.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// Impronta di un testo: 28 cifre esadecimali (due cyrb53 con semi diversi).
export function impronta(testo) {
  const s = String(testo);
  return cyrb53(s, 1).toString(16).padStart(14, '0') + cyrb53(s, 2).toString(16).padStart(14, '0');
}

// JSON con le chiavi in ordine alfabetico: lo stesso contenuto dà sempre lo stesso testo.
export function jsonCanonico(valore) {
  if (valore === null || valore === undefined) return 'null';
  if (Array.isArray(valore)) return '[' + valore.map(jsonCanonico).join(',') + ']';
  if (typeof valore === 'object') {
    const chiavi = Object.keys(valore).filter((k) => valore[k] !== undefined).sort();
    return '{' + chiavi.map((k) => JSON.stringify(k) + ':' + jsonCanonico(valore[k])).join(',') + '}';
  }
  return JSON.stringify(valore);
}

// Impronta del contenuto del rapporto. Restano fuori l'identificativo interno e lo
// stato della revisione. Le foto contano tramite la loro impronta (calcolata
// sull'immagine quando la foto viene aggiunta o importata).
// - conFirma = false: senza la firma grafica e la sua data (serve alla decadenza);
// - conFirma = true: tutto, firma compresa (serve alla revisione del PDF).
export function improntaContenuto(dati, { conFirma }) {
  const firma = dati.s13.firma;
  const copia = {
    ...dati,
    id: undefined,
    revisione: undefined,
    s13: {
      ...dati.s13,
      firma: conFirma
        ? { ...firma, improntaDati: undefined }
        : { nome: firma.nome, ruolo: firma.ruolo },
    },
  };
  return impronta(jsonCanonico(copia));
}

// 'assente' | 'valida' | 'decaduta' (i dati sono cambiati dopo la firma).
export function statoFirma(dati) {
  const firma = dati.s13.firma;
  if (!firma.immagine) return 'assente';
  return firma.improntaDati === improntaContenuto(dati, { conFirma: false }) ? 'valida' : 'decaduta';
}

// Numero di revisione del prossimo PDF valido.
// - nessun PDF valido finora: Rev. 0;
// - dati invariati rispetto all'ultimo PDF valido: stessa revisione;
// - dati cambiati: revisione successiva.
export function prossimaRevisione(revisione, improntaAttuale) {
  if (!revisione || !Number.isInteger(revisione.numero) || !revisione.impronta) return 0;
  return revisione.impronta === improntaAttuale ? revisione.numero : revisione.numero + 1;
}

// Revisione stampata sulla bozza PDF: quella corrente, senza aumentarla
// (l'ultima assegnata a un PDF valido, oppure 0 se non ce ne sono).
export function revisioneCorrente(revisione) {
  return revisione && Number.isInteger(revisione.numero) ? revisione.numero : 0;
}
