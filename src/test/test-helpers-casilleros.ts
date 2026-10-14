import { describe, it } from 'mocha';

import assert = require('node:assert');

import { helpersCasilleros } from '../unlogged/helpers-casilleros';

const { funs } = helpersCasilleros;

describe('dmencu - helpersCasilleros', () => {

    describe('null2zero', () => {
        it('convierte null y undefined en 0', () => {
            assert.strictEqual(helpersCasilleros.null2zero(null), 0);
            assert.strictEqual(helpersCasilleros.null2zero(undefined), 0);
        });
        it('deja intactos los demás valores (incluso 0, "" y false)', () => {
            assert.strictEqual(helpersCasilleros.null2zero(5), 5);
            assert.strictEqual(helpersCasilleros.null2zero(0), 0);
            assert.strictEqual(helpersCasilleros.null2zero(''), '');
            assert.strictEqual(helpersCasilleros.null2zero(false), false);
        });
    });

    describe('div0err', () => {
        it('divide normalmente', () => {
            assert.strictEqual(helpersCasilleros.div0err(10, 4, 'v1'), 2.5);
        });
        it('lanza error indicando la pk si el denominador es 0', () => {
            assert.throws(() => helpersCasilleros.div0err(10, 0, 'viv 7'), /Error en viv 7 division por cero de 10/);
        });
    });

    describe('funs.blanco', () => {
        it('null, undefined y "" son blanco', () => {
            assert.strictEqual(funs.blanco(null), true);
            assert.strictEqual(funs.blanco(undefined), true);
            assert.strictEqual(funs.blanco(''), true);
        });
        it('0 NO es blanco (es una respuesta válida)', () => {
            assert.strictEqual(funs.blanco(0), false);
        });
        it('valores cargados no son blanco', () => {
            assert.strictEqual(funs.blanco(1), false);
            assert.strictEqual(funs.blanco('a'), false);
        });
    });

    describe('funs.informado', () => {
        it('null y undefined no están informados', () => {
            assert.strictEqual(funs.informado(null), false);
            assert.strictEqual(funs.informado(undefined), false);
        });
        it('arrays y objetos vacíos no están informados', () => {
            assert.strictEqual(funs.informado([]), false);
            assert.strictEqual(funs.informado({}), false);
        });
        it('valores, arrays y objetos con contenido están informados', () => {
            assert.strictEqual(funs.informado(0), true);
            assert.strictEqual(funs.informado(''), true);
            assert.strictEqual(funs.informado([1]), true);
            assert.strictEqual(funs.informado({ a: 1 }), true);
        });
    });

    describe('funs.nsnc y funs.par', () => {
        it('nsnc solo es verdadero para -9 (número o texto)', () => {
            assert.strictEqual(funs.nsnc(-9), true);
            assert.strictEqual(funs.nsnc('-9'), true);
            assert.strictEqual(funs.nsnc(9), false);
            assert.strictEqual(funs.nsnc(null), false);
        });
        it('par', () => {
            assert.strictEqual(funs.par(4), true);
            assert.strictEqual(funs.par(0), true);
            assert.strictEqual(funs.par(7), false);
        });
    });

    describe('funs.hoy', () => {
        it('devuelve la fecha de hoy en formato dd/mm/aaaa', () => {
            const ahora = new Date();
            const hoy = funs.hoy();
            assert.match(hoy, /^\d{1,2}\/\d{1,2}\/\d{4}$/);
            const [d, m, y] = hoy.split('/').map(Number);
            assert.deepStrictEqual([d, m, y], [ahora.getDate(), ahora.getMonth() + 1, ahora.getFullYear()]);
        });
    });

    describe('funs.fecha_valida', () => {
        it('acepta fechas válidas con y sin ceros a la izquierda', () => {
            assert.strictEqual(funs.fecha_valida('01/01/2025'), true);
            assert.strictEqual(funs.fecha_valida('1/1/2025'), true);
            assert.strictEqual(funs.fecha_valida('31/12/2025'), true);
        });
        it('acepta el 29/02 de un año bisiesto', () => {
            assert.strictEqual(funs.fecha_valida('29/02/2024'), true);
        });
        it('rechaza días inexistentes en el mes', () => {
            assert.strictEqual(funs.fecha_valida('31/02/2025'), false);
            assert.strictEqual(funs.fecha_valida('30/02/2025'), false);
            assert.strictEqual(funs.fecha_valida('31/04/2025'), false);
            assert.strictEqual(funs.fecha_valida('31/06/2025'), false);
        });
        it('rechaza el 29/02 de un año no bisiesto', () => {
            assert.strictEqual(funs.fecha_valida('29/02/2023'), false);
        });
        it('rechaza formatos inválidos', () => {
            assert.strictEqual(funs.fecha_valida('15/13/2025'), false);
            assert.strictEqual(funs.fecha_valida('00/01/2025'), false);
            assert.strictEqual(funs.fecha_valida('32/01/2025'), false);
            assert.strictEqual(funs.fecha_valida('2025-01-01'), false);
            assert.strictEqual(funs.fecha_valida('01/01/25'), false);
            assert.strictEqual(funs.fecha_valida(''), false);
        });
        it('solo acepta años 20xx', () => {
            assert.strictEqual(funs.fecha_valida('01/01/1999'), false);
            assert.strictEqual(funs.fecha_valida('01/01/2100'), false);
        });
    });

    describe('funs.mesanio_valido', () => {
        it('acepta mm/aaaa con años 19xx y 20xx', () => {
            assert.strictEqual(funs.mesanio_valido('01/1995'), true);
            assert.strictEqual(funs.mesanio_valido('1/1995'), true);
            assert.strictEqual(funs.mesanio_valido('12/2025'), true);
        });
        it('rechaza meses fuera de rango y años fuera de 19xx/20xx', () => {
            assert.strictEqual(funs.mesanio_valido('13/2025'), false);
            assert.strictEqual(funs.mesanio_valido('00/2025'), false);
            assert.strictEqual(funs.mesanio_valido('01/1895'), false);
            assert.strictEqual(funs.mesanio_valido('01/25'), false);
        });
    });

    describe('funs.edad_mes_annio_valido', () => {
        it('acepta la edad que corresponde a los meses cumplidos', () => {
            // feb/1995 a ene/2025: 359 meses -> 29 años
            assert.strictEqual(funs.edad_mes_annio_valido(29, '02/1995', '15/01/2025'), true);
            assert.strictEqual(funs.edad_mes_annio_valido(30, '02/1995', '15/01/2025'), false);
        });
        it('en el mes de cumpleaños acepta ambas edades (tolerancia de un mes)', () => {
            // ene/1995 a ene/2025: 360 meses exactos -> 30, o 29 si todavía no cumplió
            assert.strictEqual(funs.edad_mes_annio_valido(30, '01/1995', '15/01/2025'), true);
            assert.strictEqual(funs.edad_mes_annio_valido(29, '01/1995', '15/01/2025'), true);
            assert.strictEqual(funs.edad_mes_annio_valido(28, '01/1995', '15/01/2025'), false);
        });
        it('un bebé nacido en el mes de la realización tiene 0 años', () => {
            assert.strictEqual(funs.edad_mes_annio_valido(0, '01/2025', '15/01/2025'), true);
        });
        it('rechaza edades muy distintas', () => {
            assert.strictEqual(funs.edad_mes_annio_valido(40, '06/1995', '15/01/2025'), false);
        });
    });
});
