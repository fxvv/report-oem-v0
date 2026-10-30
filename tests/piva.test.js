import test from 'node:test';
import assert from 'node:assert/strict';
import { verificaPartitaIva, normalizzaPartitaIva, cifraControlloPartitaIva } from '../js/piva.js';
import { CONFIG } from '../js/config.js';

test('partite IVA valide', () => {
  for (const piva of ['12345678903', '00000010009', CONFIG.pivaCommittente]) {
    assert.equal(verificaPartitaIva(piva).valida, true, piva);
  }
});

test('carattere di controllo errato', () => {
  const esito = verificaPartitaIva('12345678901');
  assert.equal(esito.valida, false);
  assert.match(esito.messaggio, /carattere di controllo/);
});

test('lunghezza e caratteri non validi', () => {
  assert.equal(verificaPartitaIva('1234567890').valida, false);
  assert.equal(verificaPartitaIva('123456789012').valida, false);
  assert.equal(verificaPartitaIva('1234567890A').valida, false);
  assert.match(verificaPartitaIva('').messaggio, /obbligatorio/);
  assert.match(verificaPartitaIva('123').messaggio, /11 cifre/);
});

test('tutti zeri non è valida anche se il controllo torna', () => {
  assert.equal(cifraControlloPartitaIva('0000000000'), 0);
  assert.equal(verificaPartitaIva('00000000000').valida, false);
});

test('spazi, punti e prefisso IT vengono ignorati', () => {
  assert.equal(normalizzaPartitaIva(' IT 123.456.789-03 '), '12345678903');
  assert.equal(verificaPartitaIva('IT12345678903').valida, true);
  assert.equal(verificaPartitaIva('123 4567 8903').valida, true);
});

test('ogni cifra di controllo diversa da quella giusta è rifiutata', () => {
  for (let c = 0; c <= 9; c++) {
    const piva = `1234567890${c}`;
    assert.equal(verificaPartitaIva(piva).valida, c === 3, piva);
  }
});
