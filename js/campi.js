// Componenti dei campi del modulo. Ogni controllo ha l'attributo data-percorso
// con il percorso del dato che modifica; i messaggi di errore hanno
// data-errore-per con lo stesso percorso. Gli eventi sono gestiti in interfaccia.js.

import { h } from './dom.js';
import { risolviPercorso, ALTRO, ALTERNATIVE } from './modello.js';
import { decimaleIt } from './formati.js';

export const idDa = (percorso, suffisso = '') => `c-${percorso.replace(/[^A-Za-z0-9_-]/g, '-')}${suffisso}`;

const asterisco = (obbligatorio) => (obbligatorio ? h('span', { classe: 'obbl', title: 'Obbligatorio' }, ' *') : null);

export function erroreDi(percorso) {
  return h('p', { classe: 'errore', id: idDa(percorso, '-errore'), dataset: { errorePer: percorso }, hidden: true });
}

export function avvisoDi(percorso) {
  return h('p', { classe: 'avviso-campo', dataset: { avvisoPer: percorso }, hidden: true });
}

// contesto: { miniature: Map id→dataURL, numeriFoto: Map id→numero }
export function creaCampi(dati, contesto = {}) {
  const valore = (percorso) => risolviPercorso(dati, percorso);

  function campo(percorso, etichetta, controllo, { obbligatorio, aiuto, classe = '', idControllo, dopo } = {}) {
    return h(
      'div',
      { classe: `campo ${classe}`, dataset: { campo: percorso } },
      h('label', { for: idControllo || idDa(percorso) }, etichetta, asterisco(obbligatorio)),
      controllo,
      dopo,
      aiuto ? h('p', { classe: 'aiuto' }, aiuto) : null,
      erroreDi(percorso),
    );
  }

  const attributiBase = (percorso, obbligatorio, suffisso = '') => ({
    id: idDa(percorso, suffisso),
    dataset: { percorso },
    'aria-required': obbligatorio ? 'true' : null,
    'aria-describedby': idDa(percorso, '-errore'),
  });

  // Testo su una riga. lista: id di una <datalist> con i suggerimenti.
  function testo(percorso, etichetta, o = {}) {
    const input = h('input', {
      ...attributiBase(percorso, o.obbligatorio),
      type: o.tipo || 'text',
      value: valore(percorso) ?? '',
      maxlength: o.maxlength,
      list: o.lista,
      autocomplete: o.autocomplete || 'off',
      autocapitalize: o.autocapitalize,
      inputmode: o.inputmode,
      placeholder: o.segnaposto,
      disabled: o.disabilitato,
      dataset: { percorso, trasforma: o.trasforma, massimo: o.contatore ? o.maxlength : undefined },
    });
    const contatore = o.contatore
      ? h('p', { classe: 'contatore', dataset: { contatorePer: percorso } }, `${String(valore(percorso) || '').length}/${o.maxlength}`)
      : null;
    return campo(percorso, etichetta, input, { ...o, dopo: [o.dopo, contatore] });
  }

  // Testo lungo: area ampia, adatta anche alla dettatura vocale.
  function area(percorso, etichetta, o = {}) {
    const corrente = String(valore(percorso) || '');
    const textarea = h('textarea', {
      ...attributiBase(percorso, o.obbligatorio),
      rows: o.righe || 4,
      value: corrente,
      placeholder: o.segnaposto,
      disabled: o.disabilitato,
      dataset: { percorso, minimo: o.minimo },
    });
    const contatore = o.minimo
      ? h('p', { classe: 'contatore', dataset: { contatorePer: percorso, minimo: o.minimo } }, `${corrente.trim().length} caratteri (minimo ${o.minimo})`)
      : null;
    return campo(percorso, etichetta, textarea, { ...o, dopo: contatore });
  }

  // Numero: testo con tastiera decimale, accetta la virgola e il punto.
  function numero(percorso, etichetta, o = {}) {
    const input = h('input', {
      ...attributiBase(percorso, o.obbligatorio),
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      value: valore(percorso) ?? '',
      disabled: o.disabilitato,
      dataset: { percorso },
    });
    const segno = o.segno
      ? h('button', { type: 'button', classe: 'pulsante-segno', 'aria-label': 'Cambia segno (positivo/negativo)', dataset: { azione: 'cambia-segno', percorso } }, '±')
      : null;
    const unita = o.unita ? h('span', { classe: 'unita' }, o.unita) : null;
    return campo(percorso, etichetta, h('div', { classe: 'con-unita' }, input, segno, unita), { ...o, idControllo: idDa(percorso) });
  }

  function dataOra(tipo) {
    return (percorso, etichetta, o = {}) =>
      campo(
        percorso,
        etichetta,
        h('input', { ...attributiBase(percorso, o.obbligatorio), type: tipo, value: valore(percorso) || '', disabled: o.disabilitato, dataset: { percorso, riordina: o.riordina } }),
        o,
      );
  }

  // Scelta singola con pulsanti grandi (radio). opzioni: stringhe.
  function scelta(percorso, etichetta, opzioni, o = {}) {
    const corrente = valore(percorso);
    const nome = `r-${idDa(percorso)}`;
    return h(
      'fieldset',
      { classe: `campo scelta ${o.verticale ? 'verticale' : ''} ${o.classe || ''}`, dataset: { campo: percorso }, 'aria-describedby': idDa(percorso, '-errore') },
      h('legend', {}, etichetta, asterisco(o.obbligatorio)),
      h(
        'div',
        { classe: 'opzioni' },
        opzioni.map((op, i) =>
          h(
            'label',
            { classe: 'opzione' },
            h('input', { type: 'radio', name: nome, id: i === 0 ? idDa(percorso) : null, value: op, checked: corrente === op, dataset: { percorso } }),
            h('span', {}, op),
          ),
        ),
      ),
      o.aiuto ? h('p', { classe: 'aiuto' }, o.aiuto) : null,
      erroreDi(percorso),
    );
  }

  // Scelta multipla (caselle). Il valore è un array nell'ordine delle opzioni.
  function multipla(percorso, etichetta, opzioni, o = {}) {
    const correnti = valore(percorso) || [];
    return h(
      'fieldset',
      { classe: `campo scelta verticale ${o.classe || ''}`, dataset: { campo: percorso }, 'aria-describedby': idDa(percorso, '-errore') },
      h('legend', {}, etichetta, asterisco(o.obbligatorio)),
      h(
        'div',
        { classe: 'opzioni' },
        opzioni.map((op, i) =>
          h(
            'label',
            { classe: 'opzione' },
            h('input', { type: 'checkbox', id: i === 0 ? idDa(percorso) : null, value: op, checked: correnti.includes(op), dataset: { percorso, multipla: true } }),
            h('span', {}, op),
          ),
        ),
      ),
      o.aiuto ? h('p', { classe: 'aiuto' }, o.aiuto) : null,
      erroreDi(percorso),
    );
  }

  // Elenco a tendina. opzioni: stringhe o { valore, testo }.
  // dinamiche: nome dell'elenco che interfaccia.js aggiorna (componenti, strumenti…).
  function tendina(percorso, etichetta, opzioni, o = {}) {
    const voci = opzioni.map((op) => (typeof op === 'string' ? { valore: op, testo: op } : op));
    const corrente = valore(percorso) || '';
    if (corrente && !voci.some((v) => v.valore === corrente)) voci.push({ valore: corrente, testo: o.testoMancante || `${corrente} (non più disponibile)` });
    const select = h(
      'select',
      { ...attributiBase(percorso, o.obbligatorio), dataset: { percorso, opzioni: o.dinamiche }, value: corrente },
      h('option', { value: '' }, o.vuota || '— Scegli —'),
      voci.map((v) => h('option', { value: v.valore }, v.testo)),
    );
    return campo(percorso, etichetta, select, o);
  }

  // Casella singola (vero/falso).
  function casella(percorso, testoCasella, o = {}) {
    return h(
      'div',
      { classe: `campo casella ${o.classe || ''}`, dataset: { campo: percorso } },
      h(
        'label',
        { classe: 'opzione' },
        h('input', { type: 'checkbox', id: idDa(percorso), checked: valore(percorso) === true, dataset: { percorso }, 'aria-describedby': idDa(percorso, '-errore') }),
        h('span', {}, testoCasella),
      ),
      o.aiuto ? h('p', { classe: 'aiuto' }, o.aiuto) : null,
      erroreDi(percorso),
    );
  }

  // Campo "specificare", obbligatorio quando la scelta è "Altro".
  function altro(percorsoScelta, percorsoAltro, etichetta = 'Specificare') {
    const v = valore(percorsoScelta);
    const conAltro = Array.isArray(v) ? v.includes(ALTRO) : v === ALTRO;
    return conAltro ? testo(percorsoAltro, `${etichetta} (Altro)`, { obbligatorio: true, classe: 'rientrato' }) : null;
  }

  // Valore con le alternative "Non applicabile" e "Non rilevato".
  function conAlternativa(percorso, etichetta, o = {}) {
    const v = valore(percorso);
    const input = h('input', {
      ...attributiBase(`${percorso}.valore`, true),
      type: 'text',
      autocomplete: 'off',
      value: v.valore,
      disabled: !!v.alternativa,
      placeholder: v.alternativa || '',
    });
    return h(
      'div',
      { classe: `campo con-alternativa ${o.classe || ''}`, dataset: { campo: `${percorso}.valore` } },
      h('label', { for: idDa(`${percorso}.valore`) }, etichetta, asterisco(true)),
      input,
      h(
        'div',
        { classe: 'opzioni compatte' },
        ALTERNATIVE.map((alt) =>
          h(
            'label',
            { classe: 'opzione' },
            h('input', { type: 'checkbox', checked: v.alternativa === alt, dataset: { percorso: `${percorso}.alternativa`, valoreCasella: alt } }),
            h('span', {}, alt),
          ),
        ),
      ),
      erroreDi(`${percorso}.valore`),
    );
  }

  // Valore in sola lettura (codice, totali, dati di configurazione…).
  function solaLettura(etichetta, contenuto, o = {}) {
    return h(
      'div',
      { classe: `campo sola-lettura ${o.classe || ''}` },
      h('span', { classe: 'etichetta' }, etichetta),
      h('div', { classe: `valore ${o.classeValore || ''}`, id: o.id, dataset: o.dataset }, contenuto),
    );
  }

  // Elenco di righe mostrate come schede, con "Aggiungi" ed "Elimina".
  // o.casella: { percorso, testo } per gli elenchi che possono restare vuoti solo
  // con una casella esplicita (es. "Nessuna anomalia").
  function elenco(percorso, o) {
    const righe = o.righe || valore(percorso) || [];
    const casellaAttiva = o.casella ? valore(o.casella.percorso) === true : false;
    const mostraCasella = o.casella && (righe.length === 0 || casellaAttiva);
    return h(
      'div',
      { classe: `elenco ${o.classe || ''}`, dataset: { elenco: percorso, campo: percorso } },
      o.titolo ? h('h3', { classe: 'titolo-elenco' }, o.titolo, asterisco(o.obbligatorio)) : null,
      o.aiuto ? h('p', { classe: 'aiuto' }, o.aiuto) : null,
      righe.map((r, i) =>
        h(
          'article',
          { classe: 'scheda', dataset: { riga: r.id } },
          h(
            'div',
            { classe: 'scheda-testa' },
            h('h4', {}, `${o.nomeRiga} ${i + 1}`),
            h(
              'div',
              { classe: 'scheda-azioni' },
              o.azioniRiga ? o.azioniRiga(r, i) : null,
              h(
                'button',
                { type: 'button', classe: 'pulsante-elimina', dataset: { azione: 'elimina-riga', elenco: percorso, id: r.id, nome: `${o.nomeRiga.toLowerCase()} ${i + 1}` } },
                'Elimina',
              ),
            ),
          ),
          o.riga(r, i),
        ),
      ),
      mostraCasella ? casella(o.casella.percorso, o.casella.testo, { classe: 'casella-elenco' }) : null,
      erroreDi(percorso),
      casellaAttiva
        ? null
        : h('button', { type: 'button', classe: 'pulsante-aggiungi', dataset: { azione: 'aggiungi-riga', elenco: percorso, tipo: o.tipo } }, `+ ${o.testoAggiungi}`),
    );
  }

  // Scheda di una foto: miniatura, numero, didascalia, file originale.
  function schedaFoto(f, percorsoElenco, o = {}) {
    const percorso = `${percorsoElenco}.${f.id}`;
    const mini = contesto.miniature && contesto.miniature.get(f.id);
    const numero = contesto.numeriFoto && contesto.numeriFoto.get(f.id);
    const dettagli = [
      f.nomeOriginale,
      f.larghezzaOriginale ? `${f.larghezzaOriginale}×${f.altezzaOriginale} px` : '',
      f.pesoOriginaleMB ? `${decimaleIt(String(f.pesoOriginaleMB))} MB` : '',
    ].filter(Boolean).join(' · ');
    const suffisso = o.riepilogo ? '-riepilogo' : '';
    return h(
      'figure',
      { classe: 'foto', dataset: { foto: f.id } },
      mini ? h('img', { src: mini, alt: `Miniatura della foto ${numero || ''}`, loading: 'lazy', decoding: 'async' }) : h('div', { classe: 'foto-segnaposto' }, 'Anteprima non disponibile'),
      h(
        'figcaption',
        {},
        h('div', { classe: 'foto-testa' }, h('strong', { dataset: { numeroFoto: f.id } }, numero ? `Foto ${numero}` : 'Foto'), o.riferimento ? h('span', { classe: 'foto-rif' }, o.riferimento) : null),
        h('label', { for: idDa(`${percorso}.didascalia`, suffisso) }, 'Didascalia', asterisco(true)),
        h('textarea', {
          id: idDa(`${percorso}.didascalia`, suffisso),
          rows: 2,
          value: f.didascalia,
          dataset: { percorso: `${percorso}.didascalia` },
          'aria-required': 'true',
        }),
        o.riepilogo ? null : erroreDi(`${percorso}.didascalia`),
        h('p', { classe: 'foto-file' }, dettagli),
        o.riepilogo
          ? null
          : h('button', { type: 'button', classe: 'pulsante-elimina', dataset: { azione: 'elimina-foto', elenco: percorsoElenco, id: f.id } }, 'Elimina foto'),
      ),
    );
  }

  // Blocco foto di una sezione o di una riga, con "Aggiungi foto".
  function foto(percorsoElenco, o = {}) {
    const elencoFoto = valore(percorsoElenco) || [];
    return h(
      'div',
      { classe: 'campo blocco-foto', dataset: { campo: percorsoElenco, elenco: percorsoElenco } },
      h('div', { classe: 'etichetta' }, o.etichetta || 'Foto', asterisco(o.obbligatorio)),
      o.aiuto ? h('p', { classe: 'aiuto' }, o.aiuto) : null,
      elencoFoto.length ? h('div', { classe: 'griglia-foto' }, elencoFoto.map((f) => schedaFoto(f, percorsoElenco))) : null,
      erroreDi(percorsoElenco),
      h('button', { type: 'button', classe: 'pulsante-aggiungi', dataset: { azione: 'aggiungi-foto', elenco: percorsoElenco } }, '+ Aggiungi foto'),
    );
  }

  return { valore, campo, testo, area, numero, data: dataOra('date'), ora: dataOra('time'), dataOra: dataOra('datetime-local'), scelta, multipla, tendina, casella, altro, conAlternativa, solaLettura, elenco, foto, schedaFoto };
}
