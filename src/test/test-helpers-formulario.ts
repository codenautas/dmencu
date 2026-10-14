import { describe, it } from 'mocha';

import assert = require('node:assert');

import {
    REGEX_SPLIT_COMODINES,
    IS_TEM_PATTERN,
    IS_VARIABLE_HASH_PATTERN,
    IS_COMODIN_REDUX_PATTERN,
    extraerComodinesRedux,
    extraerVariablesInteres,
    getBFVarNames,
    replaceSpecialWords,
    numberOrStringIncIfArray,
} from '../unlogged/helpers-formulario';

describe('dmencu - helpersFormulario', () => {

    describe('extraerComodinesRedux', () => {
        it('devuelve [] para textos vacíos o sin @', () => {
            assert.deepStrictEqual(extraerComodinesRedux(''), []);
            assert.deepStrictEqual(extraerComodinesRedux('texto sin comodines'), []);
        });
        it('extrae los comodines @comodin@ sin repetir y en orden de aparición', () => {
            assert.deepStrictEqual(
                extraerComodinesRedux('En @MES_REF@ (semana @SEM_NUM@) de @MES_REF@'),
                ['MES_REF', 'SEM_NUM']
            );
        });
        it('ignora variables (@#var@) y datos de tem (@$tem...@)', () => {
            assert.deepStrictEqual(
                extraerComodinesRedux('@#p3@ vive en @$tem.dominio@ desde @D30_REF@'),
                ['D30_REF']
            );
        });
    });

    describe('extraerVariablesInteres', () => {
        it('devuelve [] para textos vacíos o sin variables', () => {
            assert.deepStrictEqual(extraerVariablesInteres(''), []);
            assert.deepStrictEqual(extraerVariablesInteres('En @MES_REF@'), []);
        });
        it('extrae las variables @#var@ sin repetir', () => {
            assert.deepStrictEqual(
                extraerVariablesInteres('¿@#nombre@ trabajó? Si @#nombre@ tiene @#edad-1@ años'),
                ['nombre', 'edad-1']
            );
        });
    });

    describe('REGEX_SPLIT_COMODINES y patrones de tipo', () => {
        const texto = 'Hola @#p3@, en @MES_REF@ en @$tem.dominio@.';
        it('split conserva el texto y separa cada token', () => {
            assert.deepStrictEqual(
                texto.split(REGEX_SPLIT_COMODINES),
                ['Hola ', '@#p3@', ', en ', '@MES_REF@', ' en ', '@$tem.dominio@', '.']
            );
        });
        it('cada token se reconoce con un solo patrón', () => {
            assert.strictEqual(IS_VARIABLE_HASH_PATTERN.exec('@#p3@')?.[1], 'p3');
            assert.strictEqual(IS_COMODIN_REDUX_PATTERN.exec('@MES_REF@')?.[1], 'MES_REF');
            assert.strictEqual(IS_TEM_PATTERN.exec('@$tem.dominio@')?.[1], 'tem.dominio');

            assert.strictEqual(IS_COMODIN_REDUX_PATTERN.test('@#p3@'), false);
            assert.strictEqual(IS_COMODIN_REDUX_PATTERN.test('@$tem.dominio@'), false);
            assert.strictEqual(IS_VARIABLE_HASH_PATTERN.test('@MES_REF@'), false);
        });
        it('el prefijo $tem no distingue mayúsculas', () => {
            assert.deepStrictEqual('a @$TEM.x@ b'.split(REGEX_SPLIT_COMODINES), ['a ', '@$TEM.x@', ' b']);
            assert.strictEqual(IS_TEM_PATTERN.exec('@$TEM.x@')?.[1], 'TEM.x');
        });
    });

    describe('getBFVarNames', () => {
        it('arma los nombres a partir del salto con prefijo F:', () => {
            assert.deepStrictEqual(getBFVarNames('F:F2'), {
                listo: '$B.F:F2',
                agregar: '$B.F:F2_agregar',
                idFormulario: 'F:F2'
            });
        });
        it('da lo mismo si el salto viene sin prefijo F:', () => {
            assert.deepStrictEqual(getBFVarNames('F2'), getBFVarNames('F:F2'));
        });
    });

    describe('replaceSpecialWords', () => {
        it('reemplaza #nombre, #apellido y #resultado capitalizando nombre y apellido', () => {
            assert.strictEqual(
                replaceSpecialWords('Encuesta de #nombre #apellido: #resultado', 'juana', 'pérez', 'completa'),
                'Encuesta de Juana Pérez: completa'
            );
        });
        it('no distingue mayúsculas en las palabras especiales', () => {
            assert.strictEqual(replaceSpecialWords('#NOMBRE y #Apellido', 'ana', 'gómez', ''), 'Ana y Gómez');
        });
        it('no capitaliza el resultado y deja el resto del texto intacto', () => {
            assert.strictEqual(replaceSpecialWords('estado: #resultado (#otro)', 'a', 'b', 'no rea'), 'estado: no rea (#otro)');
        });
    });

    describe('numberOrStringIncIfArray', () => {
        it('en un array convierte la posición (base 0) en número de elemento (base 1)', () => {
            assert.strictEqual(numberOrStringIncIfArray('0', []), 1);
            assert.strictEqual(numberOrStringIncIfArray(2, []), 3);
        });
        it('en un objeto deja la clave numérica sin incrementar', () => {
            assert.strictEqual(numberOrStringIncIfArray('5', {}), 5);
        });
        it('deja las claves no numéricas como están', () => {
            assert.strictEqual(numberOrStringIncIfArray('abc', []), 'abc');
            assert.strictEqual(numberOrStringIncIfArray('abc', {}), 'abc');
        });
    });
});
