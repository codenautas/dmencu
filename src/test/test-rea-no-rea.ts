import { describe, it } from 'mocha';
import * as ExpresionParser from 'expre-parser';

import assert = require('node:assert');

import { buscarReaNoReaEnRespuestas, EvaluadorExpresion } from '../unlogged/calculos-encuesta';
import { helpersCasilleros } from '../unlogged/helpers-casilleros';
import type { Estructura, NoRea, NoReaSup, Rea, ReaSup, UnidadAnalisis } from '../unlogged/tipos';

// Evaluador simple para tests: compila la expresión JS con new Function
const evaluarMock: EvaluadorExpresion = (condicionJs, valores) => {
    var internalFun = new Function('valores', 'helpers', 'return ' + condicionJs);
    try {
        var result = internalFun(valores, helpersCasilleros);
    } catch (err) {
        throw err;
    }
    return result;
}

const operativo = 'dmencu';

const uaPrincipalMock: UnidadAnalisis = {
    unidad_analisis: 'viviendas',
    padre: undefined,
    pk_agregada: 'vivienda',
    hijas: {
        hogares: { unidad_analisis: 'hogares', padre: 'viviendas', pk_agregada: 'hogar', hijas: {} }
    }
};

var funcionesConocidas: { [k in string]: boolean } = {}

var compiler = new ExpresionParser.Compiler({
    language: 'js',
    varWrapper: (var_name: string) => `helpers.null2zero(valores.${var_name})`,
    funWrapper: (functionName: string) => {
        if (!funcionesConocidas[functionName]) {
            funcionesConocidas[functionName] = true;
        }
        return `helpers.funs.${functionName}`
    }
})

function compilarExpresion(expresion: string) {
    return compiler.toCode(ExpresionParser.parse(
        expresion
            .replace(/\bis distinct from\b/gi, ' <> ')
            .replace(/!!/gi, ' ')
    )).replace(/helpers\.funs\.blanco\(helpers.null2zero\(/g, 'helpers.funs.blanco((')
        .replace(/helpers\.funs\.informado\(helpers.null2zero\(/g, 'helpers.funs.informado((');
}
// ---- Fixtures de datos ----

const reasBase: Rea[] = [
    { operativo, rea: 1, descripcion: 'Completa', condicion: "v_rea = 1", orden: 1, es_positiva: true, tarea: 'encu' },
    { operativo, rea: 2, descripcion: 'Incompleta', condicion: "v_rea = 2", orden: 2, es_positiva: false, tarea: 'encu' },
].map((rea) => {
    return {
        ...rea,
        condicion_js: compilarExpresion(rea.condicion)
    }
});

const reasSinTarea: Rea[] = [
    { operativo, rea: 1, descripcion: 'Global', condicion: "v_rea = 1", orden: 1, es_positiva: true, tarea: null },
].map(rea => ({
    ...rea,
    condicion_js: compilarExpresion(rea.condicion)
}));

const reasConMultiplesTareas: Rea[] = [
    { operativo, rea: 1, descripcion: 'Encu', condicion: "v_rea = 1", orden: 1, es_positiva: true, tarea: 'encu' },
    { operativo, rea: 2, descripcion: 'Recu', condicion: "v_rea = 1", orden: 2, es_positiva: true, tarea: 'recu' },
].map(rea => {
    return {
        ...rea,
        condicion_js: compilarExpresion(rea.condicion)
    }
});

const reasSup: ReaSup[] = [
    { operativo, rea_sup: 10, descripcion: 'Sup Completa', condicion: "v_rea_sup = 1", orden: 1, es_positiva: false, tarea: null },
].map(rea => {
    return {
        ...rea,
        condicion_js: compilarExpresion(rea.condicion)
    }
});

const noReas: NoRea[] = [
    { operativo, no_rea: 101, descripcion: 'Ausente', grupo: 'G1', variable: 'v_norea', valor: '1', grupo0: '0', orden: 1 },
];

const noReasSup: NoReaSup[] = [
    { operativo, no_rea_sup: 201, desc_norea_sup: 'Ausente Sup', grupo_sup: 'GS1', variable_sup: 'v_norea_sup', valor_sup: '1', grupo0_sup: '0', orden: 1 },
];

// =========================================================
describe('dmencu - buscarReaNoReaEnRespuestas', () => {

    // ---- REA ----
    describe('rea: evaluación de condición JS', () => {

        it('encuentra una rea cuando la condición JS es verdadera', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea: '1' } as any, reasBase, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: 1, resultado: true });
        });

        it('devuelve resultado=false cuando es_positiva=false', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea: '2' } as any, reasBase, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: 2, resultado: false });
        });

        it('devuelve { codigo: null, resultado: false } si ninguna condición se cumple', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea: '99' } as any, reasBase, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
        });

        it('respeta el orden de prioridad aunque la lista llegue desordenada', () => {
            const listaDesordenada: Rea[] = [
                { operativo, rea: 2, descripcion: 'Segundo', condicion: "v_rea = 2", orden: 2, es_positiva: false, tarea: null },
                { operativo, rea: 1, descripcion: 'Primero', condicion: "v_rea = 1", orden: 1, es_positiva: true, tarea: null },
            ].map(rea => {
                return {
                    ...rea,
                    condicion_js: compilarExpresion(rea.condicion)
                }
            });
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea: '1' } as any, listaDesordenada, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: 1, resultado: true });
        });

        it('aplica una condición JS compleja con múltiples variables', () => {
            const reasComplejas: Rea[] = [
                { operativo, rea: 5, descripcion: 'Doble condición', condicion: "v1 = 1 and v2 = 2", orden: 1, es_positiva: true, tarea: null },
            ].map(rea => {
                return {
                    ...rea,
                    condicion_js: compilarExpresion(rea.condicion)
                }
            });
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v1: '1', v2: '2' } as any, reasComplejas, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: 5, resultado: true });
        });

        it('no confunde rea de una tarea con la de otra tarea', () => {
            const resultadoEncu = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea: '1' } as any, reasConMultiplesTareas, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultadoEncu, { codigo: 1, resultado: true });

            const resultadoRecu = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea: '1' } as any, reasConMultiplesTareas, 'rea', 'recu', evaluarMock
            );
            assert.deepStrictEqual(resultadoRecu, { codigo: 2, resultado: true });

            const resultadoSupe = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea: '1' } as any, reasConMultiplesTareas, 'rea', 'supe', evaluarMock
            );
            assert.deepStrictEqual(resultadoSupe, { codigo: null, resultado: false });
        });

        it('una rea sin tarea aplica a cualquier tarea', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea: '1' } as any, reasSinTarea, 'rea', 'recu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: 1, resultado: true });
        });

        it('lanza error si condicion_js está definida pero no se pasa evaluarExpresion', () => {
            assert.throws(
                () => buscarReaNoReaEnRespuestas(uaPrincipalMock, { v_rea: '1' } as any, reasBase, 'rea', 'encu'),
                /Se requiere evaluarExpresion/
            );
        });
    });

    // ---- REA_SUP ----
    describe('rea_sup: evaluación de condición JS', () => {

        it('encuentra una rea_sup cuando la condición JS es verdadera', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea_sup: '1' } as any, reasSup, 'rea_sup', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: 10, resultado: false });
        });

        it('devuelve { codigo: null, resultado: false } si no cumple', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea_sup: '9' } as any, reasSup, 'rea_sup', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
        });
    });

    // ---- NO_REA ----
    describe('no_rea: comparación simple variable/valor', () => {

        it('encuentra una no_rea cuando variable == valor', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_norea: '1' } as any, noReas, 'no_rea', 'encu'
            );
            assert.deepStrictEqual(resultado, { codigo: 101, resultado: true });
        });

        it('devuelve { codigo: null, resultado: false } si el valor no coincide', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_norea: '9' } as any, noReas, 'no_rea', 'encu'
            );
            assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
        });
    });

    // ---- NO_REA_SUP ----
    describe('no_rea_sup: comparación simple variable_sup/valor_sup', () => {

        it('encuentra una no_rea_sup cuando variable_sup == valor_sup', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_norea_sup: '1' } as any, noReasSup, 'no_rea_sup', 'encu'
            );
            assert.deepStrictEqual(resultado, { codigo: 201, resultado: true });
        });

        it('devuelve { codigo: null, resultado: false } si no coincide', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_norea_sup: '9' } as any, noReasSup, 'no_rea_sup', 'encu'
            );
            assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
        });
    });

    // ---- Búsqueda recursiva ----
    describe('búsqueda recursiva en unidades hijas', () => {

        it('encuentra una no_rea dentro de un array de unidad hija (hogares)', () => {
            const respuestas = {
                vivienda_id: 1,
                hogares: [
                    { id: 1, v_norea: '9' },
                    { id: 2, v_norea: '1' },
                ]
            } as any;
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, respuestas, noReas, 'no_rea', 'encu'
            );
            assert.deepStrictEqual(resultado, { codigo: 101, resultado: true });
        });

        it('devuelve nulo si ninguna unidad hija cumple la condición', () => {
            const respuestas = {
                vivienda_id: 1,
                hogares: [{ id: 1, v_norea: '9' }]
            } as any;
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, respuestas, noReas, 'no_rea', 'encu'
            );
            assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
        });

        it('maneja de forma segura hogares null o vacío', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { vivienda_id: 1, hogares: null } as any, noReas, 'no_rea', 'encu'
            );
            assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
        });

        it('encuentra una rea en unidad hija con condición JS', () => {
            const respuestas = {
                vivienda_id: 1,
                hogares: [
                    { id: 1, v_rea: '99' },
                    { id: 2, v_rea: '1' },
                ]
            } as any;
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, respuestas, reasBase, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: 1, resultado: true });
        });
    });
});