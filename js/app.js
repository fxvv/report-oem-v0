// Punto di ingresso della pagina.

import { avvia } from './interfaccia.js';

avvia().catch((errore) => {
  // errore inatteso all'avvio: lo si mostra invece di lasciare la pagina vuota
  const el = document.getElementById('avvisi');
  const p = document.createElement('div');
  p.className = 'avviso-rosso';
  p.setAttribute('role', 'alert');
  p.textContent = `Errore all'avvio della pagina: ${errore.message}. Ricarica la pagina; se il problema continua, avvisa il committente.`;
  if (el) el.append(p);
  console.error(errore);
});
