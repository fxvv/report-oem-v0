// Controllo della partita IVA italiana (11 cifre con carattere di controllo).
// Modulo puro: non usa il browser, si testa con Node.

// Toglie spazi, punti e trattini e l'eventuale prefisso "IT".
export function normalizzaPartitaIva(valore) {
  let v = String(valore ?? '').toUpperCase().replace(/[\s.\-]/g, '');
  if (v.startsWith('IT')) v = v.slice(2);
  return v;
}

// Cifra di controllo calcolata sulle prime 10 cifre: le cifre in posizione pari
// (2ª, 4ª, …) si raddoppiano, togliendo 9 se il doppio supera 9.
export function cifraControlloPartitaIva(primeDieci) {
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    let cifra = primeDieci.charCodeAt(i) - 48;
    if (i % 2 === 1) {
      cifra *= 2;
      if (cifra > 9) cifra -= 9;
    }
    somma += cifra;
  }
  return (10 - (somma % 10)) % 10;
}

// Restituisce { valida, messaggio }: il messaggio spiega il problema in italiano.
export function verificaPartitaIva(valore) {
  const v = normalizzaPartitaIva(valore);
  if (v === '') return { valida: false, messaggio: 'campo obbligatorio' };
  if (!/^\d{11}$/.test(v)) return { valida: false, messaggio: 'deve contenere 11 cifre' };
  if (/^0{11}$/.test(v)) return { valida: false, messaggio: 'partita IVA non valida' };
  if (cifraControlloPartitaIva(v.slice(0, 10)) !== v.charCodeAt(10) - 48) {
    return { valida: false, messaggio: 'il carattere di controllo non corrisponde: verifica le cifre' };
  }
  return { valida: true, messaggio: '' };
}
