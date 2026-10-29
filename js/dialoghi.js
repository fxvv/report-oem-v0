// Finestre di dialogo, indicatore di avanzamento e messaggi brevi.

import { h, sostituisciFigli } from './dom.js';

// Apre una finestra modale e restituisce una Promise con il valore del pulsante
// premuto (null se si chiude con Esc o con la X).
// pulsanti: [{ testo, valore, classe }]
export function apriDialogo({ titolo, contenuto, pulsanti = [{ testo: 'Chiudi', valore: null }], classe = '' }) {
  return new Promise((risolvi) => {
    const dialogo = h('dialog', { classe: `dialogo ${classe}`, 'aria-labelledby': 'titolo-dialogo' });
    const chiudi = (valore) => {
      if (!dialogo.isConnected) return;
      if (typeof dialogo.close === 'function' && dialogo.open) dialogo.close();
      dialogo.remove();
      risolvi(valore);
    };
    sostituisciFigli(
      dialogo,
      h(
        'div',
        { classe: 'dialogo-testa' },
        h('h2', { id: 'titolo-dialogo' }, titolo),
        h('button', { type: 'button', classe: 'dialogo-chiudi', 'aria-label': 'Chiudi', onclick: () => chiudi(null) }, '×'),
      ),
      h('div', { classe: 'dialogo-corpo' }, contenuto),
      pulsanti.length
        ? h(
            'div',
            { classe: 'dialogo-pulsanti' },
            pulsanti.map((p) => h('button', { type: 'button', classe: p.classe || 'secondario', onclick: () => chiudi(p.valore) }, p.testo)),
          )
        : null,
    );
    dialogo.addEventListener('cancel', (e) => {
      e.preventDefault();
      chiudi(null);
    });
    // gli elementi con data-chiudi-con chiudono la finestra restituendo quel valore
    dialogo.addEventListener('click', (e) => {
      const voce = e.target.closest('[data-chiudi-con]');
      if (voce && dialogo.contains(voce)) chiudi(voce.dataset.chiudiCon || null);
    });
    document.body.append(dialogo);
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', ''); // browser senza <dialog>: resta comunque visibile
    const primo = dialogo.querySelector('.dialogo-pulsanti .primario, .dialogo-pulsanti button, .dialogo-corpo button');
    if (primo) primo.focus();
  });
}

export function conferma({ titolo, testo, ok = 'Conferma', annulla = 'Annulla', pericolo = false }) {
  return apriDialogo({
    titolo,
    contenuto: typeof testo === 'string' ? h('p', {}, testo) : testo,
    pulsanti: [
      { testo: annulla, valore: false, classe: 'secondario' },
      { testo: ok, valore: true, classe: pericolo ? 'pericolo' : 'primario' },
    ],
  }).then((v) => v === true);
}

export function avviso({ titolo, testo }) {
  return apriDialogo({
    titolo,
    contenuto: typeof testo === 'string' ? h('p', {}, testo) : testo,
    pulsanti: [{ testo: 'OK', valore: true, classe: 'primario' }],
  });
}

// --- Indicatore di avanzamento: copre la pagina e mostra cosa sta succedendo.

let velo = null;

export function mostraAvanzamento(testo) {
  if (!velo) {
    velo = h('div', { classe: 'avanzamento', role: 'status', 'aria-live': 'polite' }, h('div', { classe: 'avanzamento-riquadro' }, h('div', { classe: 'ruota', 'aria-hidden': 'true' }), h('p', { classe: 'avanzamento-testo' })));
    document.body.append(velo);
  }
  velo.querySelector('.avanzamento-testo').textContent = testo;
  velo.hidden = false;
}

export function nascondiAvanzamento() {
  if (velo) velo.hidden = true;
}

// --- Messaggio breve in basso, che sparisce da solo.

let timerMessaggio = null;

export function messaggio(testo, durata = 4500) {
  let el = document.getElementById('messaggio');
  if (!el) {
    el = h('div', { id: 'messaggio', classe: 'messaggio', role: 'status', 'aria-live': 'polite' });
    document.body.append(el);
  }
  el.textContent = testo;
  el.hidden = false;
  clearTimeout(timerMessaggio);
  timerMessaggio = setTimeout(() => (el.hidden = true), durata);
}
