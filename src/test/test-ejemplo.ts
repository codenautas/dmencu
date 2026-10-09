"use strict";

import { describe, it } from 'mocha';
import assert = require('node:assert');

// Aquí puedes agrupar tus casos de uso usando 'describe'
describe('dmencu - Ejemplos de Tests', () => {

    // Cada 'it' representa un caso de prueba individual
    it('debería sumar dos números correctamente', () => {
        const resultado: number = 2 + 2;
        
        // Se utiliza assert para verificar que el comportamiento esperado se cumpla
        assert.strictEqual(resultado, 4, 'La matemática básica falló');
    });

    it('debería validar una condición simple con tipos explícitos', () => {
        const texto: string = 'hola mundo';
        
        assert.strictEqual(texto.length, 10);
        assert.strictEqual(texto.includes('hola'), true);
    });

});
