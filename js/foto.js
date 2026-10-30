// Elaborazione delle foto nel browser: lato lungo a 1600 px, JPEG con qualità
// 0,72, orientamento dello scatto rispettato, miniatura per la pagina.
//
// L'orientamento: i browser attuali applicano da soli l'orientamento EXIF quando
// disegnano un'immagine <img> (image-orientation: from-image è il comportamento
// predefinito); anche naturalWidth/naturalHeight sono già "raddrizzati".

export const LATO_MAX = 1600;
export const QUALITA_JPEG = 0.72;
export const LATO_MINIATURA = 320;
export const QUALITA_MINIATURA = 0.7;
export const MESSAGGIO_FORMATO = 'Formato non supportato da questo browser: convertilo in JPEG o caricalo da telefono.';

function caricaImmagine(url) {
  return new Promise((risolvi, rifiuta) => {
    const img = new Image();
    img.onload = () => risolvi(img);
    img.onerror = () => rifiuta(new Error(MESSAGGIO_FORMATO));
    img.src = url;
  });
}

function canvasInBlob(canvas, qualita) {
  return new Promise((risolvi, rifiuta) => {
    canvas.toBlob((blob) => (blob ? risolvi(blob) : rifiuta(new Error('Impossibile elaborare la foto (memoria insufficiente?)'))), 'image/jpeg', qualita);
  });
}

function blobInDataUrl(blob) {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader();
    lettore.onload = () => risolvi(lettore.result);
    lettore.onerror = () => rifiuta(lettore.error);
    lettore.readAsDataURL(blob);
  });
}

// Disegna "sorgente" in un nuovo canvas ridotto al lato massimo indicato.
function ridimensiona(sorgente, larghezza, altezza, latoMax) {
  const scala = Math.min(1, latoMax / Math.max(larghezza, altezza));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(larghezza * scala));
  canvas.height = Math.max(1, Math.round(altezza * scala));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // eventuali trasparenze (PNG) diventano bianche
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sorgente, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function liberaCanvas(canvas) {
  // su iOS la memoria dei canvas si libera prima azzerandone le dimensioni
  canvas.width = 0;
  canvas.height = 0;
}

async function creaMiniatura(sorgente, larghezza, altezza) {
  const canvas = ridimensiona(sorgente, larghezza, altezza, LATO_MINIATURA);
  try {
    return await blobInDataUrl(await canvasInBlob(canvas, QUALITA_MINIATURA));
  } finally {
    liberaCanvas(canvas);
  }
}

// Elabora un file scelto dal fornitore. Restituisce i dati della foto oppure
// lancia un errore con un messaggio da mostrare.
export async function elaboraFoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await caricaImmagine(url);
    const larghezzaOriginale = img.naturalWidth;
    const altezzaOriginale = img.naturalHeight;
    if (!larghezzaOriginale || !altezzaOriginale) throw new Error(MESSAGGIO_FORMATO);
    const canvas = ridimensiona(img, larghezzaOriginale, altezzaOriginale, LATO_MAX);
    try {
      const jpeg = await blobInDataUrl(await canvasInBlob(canvas, QUALITA_JPEG));
      const miniatura = await creaMiniatura(canvas, canvas.width, canvas.height);
      return {
        jpeg,
        miniatura,
        larghezza: canvas.width,
        altezza: canvas.height,
        larghezzaOriginale,
        altezzaOriginale,
        pesoOriginaleMB: Math.round((file.size / (1024 * 1024)) * 100) / 100,
        nomeOriginale: file.name || 'foto.jpg',
      };
    } finally {
      liberaCanvas(canvas);
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Miniatura ricavata da un'immagine già salvata (bozze importate senza miniature).
export async function miniaturaDaImmagine(dataUrl) {
  const img = await caricaImmagine(dataUrl);
  return creaMiniatura(img, img.naturalWidth, img.naturalHeight);
}
