// Area di firma: disegno con dito, penna o mouse (eventi pointer).
// La firma si conserva come immagine PNG (data URL) con fondo trasparente.

const COLORE = '#10205a';
const SPESSORE = 2.4;
const RAPPORTO_MAX = 2; // risoluzione massima rispetto ai pixel CSS: PNG leggeri

// canvas: l'elemento <canvas>; alCambio(png) viene chiamata a fine tratto;
// primaDelTratto() può restituire true per cancellare prima di disegnare
// (serve quando la firma precedente è decaduta).
export function creaAreaFirma(canvas, { alCambio, primaDelTratto }) {
  const ctx = canvas.getContext('2d');
  let disegnando = false;
  let ultimo = null;
  let immagineCorrente = '';

  function prepara() {
    const rapporto = Math.min(RAPPORTO_MAX, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    canvas.width = Math.round(r.width * rapporto);
    canvas.height = Math.round(r.height * rapporto);
    ctx.setTransform(rapporto, 0, 0, rapporto, 0, 0);
    ctx.lineWidth = SPESSORE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COLORE;
    ctx.fillStyle = COLORE;
    return true;
  }

  function punto(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function pulisci() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // Ridisegna una firma salvata, adattandola all'area (es. dopo una rotazione).
  function mostra(png) {
    immagineCorrente = png || '';
    if (!prepara()) return;
    pulisci();
    if (!png) return;
    const img = new Image();
    img.onload = () => {
      const r = canvas.getBoundingClientRect();
      const scala = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
      const larghezza = img.naturalWidth * scala;
      const altezza = img.naturalHeight * scala;
      ctx.drawImage(img, (r.width - larghezza) / 2, (r.height - altezza) / 2, larghezza, altezza);
    };
    img.src = png;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (primaDelTratto && primaDelTratto()) pulisci();
    canvas.setPointerCapture(e.pointerId);
    disegnando = true;
    ultimo = punto(e);
    ctx.beginPath();
    ctx.arc(ultimo.x, ultimo.y, SPESSORE / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!disegnando) return;
    e.preventDefault();
    const eventi = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [e];
    ctx.beginPath();
    ctx.moveTo(ultimo.x, ultimo.y);
    for (const ev of eventi.length ? eventi : [e]) {
      const p = punto(ev);
      ctx.lineTo(p.x, p.y);
      ultimo = p;
    }
    ctx.stroke();
  });

  const fine = (e) => {
    if (!disegnando) return;
    disegnando = false;
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    immagineCorrente = canvas.toDataURL('image/png');
    alCambio(immagineCorrente);
  };
  canvas.addEventListener('pointerup', fine);
  canvas.addEventListener('pointercancel', fine);

  return {
    mostra,
    pulisci: () => {
      immagineCorrente = '';
      pulisci();
    },
    // da chiamare quando cambia la larghezza dell'area (rotazione del telefono)
    adatta: () => mostra(immagineCorrente),
  };
}
