// Piccolo aiuto per creare elementi DOM senza framework.
//
// h('input', { type: 'text', classe: 'x', dataset: { percorso: 's1.a' }, value: 'testo' })
// - "classe" imposta className, "dataset" i data-*, "testo" il textContent;
// - i valori booleani e "value" si impostano come proprietà dell'elemento;
// - le funzioni "onclick", "oninput"… diventano listener;
// - null, undefined e false vengono ignorati (attributi e figli).

const PROPRIETA = new Set(['checked', 'disabled', 'hidden', 'multiple', 'selected', 'readOnly', 'open']);

export function h(tag, attributi, ...figli) {
  const el = document.createElement(tag);
  let valore;
  for (const [chiave, v] of Object.entries(attributi || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (chiave === 'classe') el.className = v;
    else if (chiave === 'dataset') {
      for (const [k, x] of Object.entries(v)) if (x !== undefined && x !== null && x !== false) el.dataset[k] = x === true ? '' : String(x);
    } else if (chiave === 'testo') el.textContent = v;
    else if (chiave === 'value') valore = v;
    else if (chiave.startsWith('on') && typeof v === 'function') el.addEventListener(chiave.slice(2), v);
    else if (PROPRIETA.has(chiave)) el[chiave] = !!v;
    else el.setAttribute(chiave, v === true ? '' : String(v));
  }
  aggiungi(el, figli);
  // il valore si imposta dopo i figli: per le <select> servono già le <option>
  if (valore !== undefined) el.value = valore;
  return el;
}

export function aggiungi(el, figli) {
  for (const f of figli.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

// Svuota un elemento e ci mette i nuovi figli.
export function sostituisciFigli(el, ...figli) {
  el.textContent = '';
  return aggiungi(el, figli);
}

// Attende che il browser abbia disegnato (per mostrare un messaggio prima di un lavoro pesante).
export function attendiDisegno() {
  return new Promise((risolvi) => requestAnimationFrame(() => setTimeout(risolvi, 30)));
}
