import { describe, it } from 'mocha';
import * as ExpresionParser from 'expre-parser';

import assert = require('node:assert');

import { buscarReaNoReaEnRespuestas, EvaluadorExpresion } from '../unlogged/calculos-encuesta';
import { helpersCasilleros } from '../unlogged/helpers-casilleros';
import type { NoRea, NoReaSup, Rea, ReaSup, UnidadAnalisis } from '../unlogged/tipos';

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

const uaTresNivelesMock: UnidadAnalisis = {
    unidad_analisis: 'viviendas',
    padre: undefined,
    pk_agregada: 'vivienda',
    hijas: {
        hogares: {
            unidad_analisis: 'hogares',
            padre: 'viviendas',
            pk_agregada: 'hogar',
            hijas: {
                personas: {
                    unidad_analisis: 'personas',
                    padre: 'hogares',
                    pk_agregada: 'persona',
                    hijas: {}
                }
            }
        }
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

// Helper para compilar e inyectar condicion_js a un objeto o array
function conCondicionJs<T extends { condicion: string }>(item: T): T & { condicion_js: string };
function conCondicionJs<T extends { condicion: string }>(items: T[]): (T & { condicion_js: string })[];
function conCondicionJs(input: any) {
    if (Array.isArray(input)) {
        return input.map((item) => ({
            ...item,
            condicion_js: compilarExpresion(item.condicion)
        }));
    }
    return {
        ...input,
        condicion_js: compilarExpresion(input.condicion)
    };
}

// ---- Fixtures de datos ----

const reasBase = conCondicionJs([
    { operativo, rea: 1, descripcion: 'Completa', condicion: "v_rea = 1", orden: 1, es_positiva: true, tarea: 'encu' },
    { operativo, rea: 2, descripcion: 'Incompleta', condicion: "v_rea = 2", orden: 2, es_positiva: false, tarea: 'encu' },
]);

const reasSinTarea = conCondicionJs([
    { operativo, rea: 1, descripcion: 'Global', condicion: "v_rea = 1", orden: 1, es_positiva: true, tarea: null },
]);

const reasConMultiplesTareas = conCondicionJs([
    { operativo, rea: 1, descripcion: 'Encu', condicion: "v_rea = 1", orden: 1, es_positiva: true, tarea: 'encu' },
    { operativo, rea: 2, descripcion: 'Recu', condicion: "v_rea = 1", orden: 2, es_positiva: true, tarea: 'recu' },
]);

const reasSup = conCondicionJs([
    { operativo, rea_sup: 10, descripcion: 'Sup Completa', condicion: "v_rea_sup = 1", orden: 1, es_positiva: false, tarea: null },
]);

const noReas: NoRea[] = [
    { operativo, no_rea: 101, descripcion: 'Ausente', grupo: 'G1', variable: 'v_norea', valor: '1', grupo0: '0', orden: 1 },
];

const noReasSup: NoReaSup[] = [
    { operativo, no_rea_sup: 201, desc_norea_sup: 'Ausente Sup', grupo_sup: 'GS1', variable_sup: 'v_norea_sup', valor_sup: '1', grupo0_sup: '0', orden: 1 },
];

// =========================================================
describe('dmencu - buscarReaNoReaEnRespuestas', () => {

    // ---- Casos Borde y Listas Vacías ----
    describe('casos borde y estructuras vacías', () => {
        it('devuelve { codigo: null, resultado: false } si la lista de REA/NO_REA está vacía', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea: '1' } as any, [], 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
        });

        it('devuelve { codigo: null, resultado: false } si el objeto respuestas está vacío', () => {
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, {} as any, reasBase, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
        });

        it('ignora REAs con tarea específica cuando se busca otra tarea distinta', () => {
            const reasSoloRecu = conCondicionJs([
                { operativo, rea: 9, descripcion: 'Solo Recu', condicion: "v_rea = 1", orden: 1, es_positiva: true, tarea: 'recu' },
            ]);

            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea: '1' } as any, reasSoloRecu, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
        });
    });

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
            const listaDesordenada = conCondicionJs([
                { operativo, rea: 2, descripcion: 'Segundo', condicion: "v_rea = 2", orden: 2, es_positiva: false, tarea: null },
                { operativo, rea: 1, descripcion: 'Primero', condicion: "v_rea = 1", orden: 1, es_positiva: true, tarea: null },
            ]);

            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { v_rea: '1' } as any, listaDesordenada, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: 1, resultado: true });
        });

        it('aplica una condición JS compleja con múltiples variables', () => {
            const reasComplejas = conCondicionJs([
                { operativo, rea: 5, descripcion: 'Doble condición', condicion: "v1 = 1 and v2 = 2", orden: 1, es_positiva: true, tarea: null },
            ]);

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

    // ---- Búsqueda recursiva y Multinivel ----
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

        it('maneja de forma segura hogares null, vacíos o undefined', () => {
            const resultadoNull = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { vivienda_id: 1, hogares: null } as any, noReas, 'no_rea', 'encu'
            );
            assert.deepStrictEqual(resultadoNull, { codigo: null, resultado: false });

            const resultadoVacio = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, { vivienda_id: 1, hogares: [] } as any, noReas, 'no_rea', 'encu'
            );
            assert.deepStrictEqual(resultadoVacio, { codigo: null, resultado: false });
        });

        it('encuentra una rea en unidad hija cuando todos cumplen condición JS (es_positiva = true)', () => {
            const respuestas = {
                vivienda_id: 1,
                hogares: [
                    { id: 1, v_rea: '1' },
                    { id: 2, v_rea: '1' },
                ]
            } as any;
            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, respuestas, reasBase, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: 1, resultado: true });
        });

        it('evalúa una rea con condición que combina una variable de la UA principal (vivienda) y una de la UA hija (hogar)', () => {
            const reasMultilevel = conCondicionJs([
                {
                    operativo,
                    rea: 10,
                    descripcion: 'Vivienda habitada con hogar completo',
                    condicion: "vivienda_habitada = 1 and hogar_completo = 1",
                    orden: 1,
                    es_positiva: true,
                    tarea: 'encu'
                },
            ]);

            const respuestas = {
                vivienda_id: 1,
                vivienda_habitada: '1',
                hogares: [
                    { id: 1, hogar_completo: '0' },
                    { id: 2, hogar_completo: '1' },
                ]
            } as any;

            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, respuestas, reasMultilevel, 'rea', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
        });

        it('evalúa una rea_sup con condición que combina una variable de la UA principal y una de la UA hija', () => {
            const reasSupMultilevel = conCondicionJs([
                {
                    operativo,
                    rea_sup: 20,
                    descripcion: 'Supervisión aprobada multinivel',
                    condicion: "vivienda_status = 1 and hogar_supervisado = 1",
                    orden: 1,
                    es_positiva: true,
                    tarea: 'encu'
                },
            ]);

            const respuestas = {
                vivienda_id: 1,
                vivienda_status: '1',
                hogares: [
                    { id: 1, hogar_supervisado: '1' },
                ]
            } as any;

            const resultado = buscarReaNoReaEnRespuestas(
                uaPrincipalMock, respuestas, reasSupMultilevel, 'rea_sup', 'encu', evaluarMock
            );
            assert.deepStrictEqual(resultado, { codigo: 20, resultado: true });
        });

        it('encuentra una no_rea anidada a 3 niveles (Vivienda -> Hogar -> Persona)', () => {
            const respuestas = {
                vivienda_id: 1,
                hogares: [
                    {
                        hogar_id: 1,
                        personas: [
                            { persona_id: 1, v_norea: '9' },
                            { persona_id: 2, v_norea: '1' }
                        ]
                    }
                ]
            } as any;

            const resultado = buscarReaNoReaEnRespuestas(
                uaTresNivelesMock, respuestas, noReas, 'no_rea', 'encu'
            );
            assert.deepStrictEqual(resultado, { codigo: 101, resultado: true });
        });

        describe('evaluación de es_positiva en múltiples unidades hijas', () => {

            it('si es_positiva = true y NO todos los hogares cumplen la condición, NO debe matchear la rea positiva', () => {
                const reasPositiva = conCondicionJs([
                    {
                        operativo,
                        rea: 1,
                        descripcion: 'Todos los hogares completos',
                        condicion: "hogar_completo = 1",
                        orden: 1,
                        es_positiva: true,
                        tarea: 'encu'
                    },
                ]);

                const respuestas = {
                    vivienda_id: 1,
                    hogares: [
                        { id: 1, hogar_completo: '1' },
                        { id: 2, hogar_completo: '0' },
                    ]
                } as any;

                const resultado = buscarReaNoReaEnRespuestas(
                    uaPrincipalMock, respuestas, reasPositiva, 'rea', 'encu', evaluarMock
                );
                assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
            });

            it('si es_positiva = true y una unidad hija anterior no tiene un campo cargado aún (undefined), NO debe matchear la rea positiva', () => {
                const reasPositiva = conCondicionJs([
                    {
                        operativo,
                        rea: 1,
                        descripcion: 'Todos los hogares completos',
                        condicion: "hogar_completo = 1",
                        orden: 1,
                        es_positiva: true,
                        tarea: 'encu'
                    },
                ]);

                const respuestas = {
                    vivienda_id: 1,
                    hogares: [
                        { id: 1 }, // Primer hogar sin 'hogar_completo' cargado aún
                        { id: 2, hogar_completo: '1' }, // Último hogar cumple la condición
                    ]
                } as any;

                const resultado = buscarReaNoReaEnRespuestas(
                    uaPrincipalMock, respuestas, reasPositiva, 'rea', 'encu', evaluarMock
                );
                assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
            });

            it('si es_positiva = true y TODOS los hogares cumplen la condición, debe matchear la rea positiva', () => {
                const reasPositiva = conCondicionJs([
                    {
                        operativo,
                        rea: 1,
                        descripcion: 'Todos los hogares completos',
                        condicion: "hogar_completo = 1",
                        orden: 1,
                        es_positiva: true,
                        tarea: 'encu'
                    },
                ]);

                const respuestas = {
                    vivienda_id: 1,
                    hogares: [
                        { id: 1, hogar_completo: '1' },
                        { id: 2, hogar_completo: '1' },
                    ]
                } as any;

                const resultado = buscarReaNoReaEnRespuestas(
                    uaPrincipalMock, respuestas, reasPositiva, 'rea', 'encu', evaluarMock
                );
                assert.deepStrictEqual(resultado, { codigo: 1, resultado: true });
            });

            it('si es_positiva = false y al menos un hogar cumple la condición, debe matchear la rea negativa', () => {
                const reasNegativa = conCondicionJs([
                    {
                        operativo,
                        rea: 2,
                        descripcion: 'Al menos un hogar rechazado',
                        condicion: "hogar_rechazado = 1",
                        orden: 1,
                        es_positiva: false,
                        tarea: 'encu'
                    },
                ]);

                const respuestas = {
                    vivienda_id: 1,
                    hogares: [
                        { id: 1, hogar_rechazado: '0' },
                        { id: 2, hogar_rechazado: '1' },
                    ]
                } as any;

                const resultado = buscarReaNoReaEnRespuestas(
                    uaPrincipalMock, respuestas, reasNegativa, 'rea', 'encu', evaluarMock
                );
                assert.deepStrictEqual(resultado, { codigo: 2, resultado: false });
            });

            it('evalúa 2 REAs (positiva y negativa): si la positiva no se cumple para todos los hogares pero la negativa sí, devuelve la REA negativa', () => {
                const reasMixtas = conCondicionJs([
                    {
                        operativo,
                        rea: 1,
                        descripcion: 'Todos los hogares completos',
                        condicion: "hogar_completo = 1",
                        orden: 1,
                        es_positiva: true,
                        tarea: 'encu'
                    },
                    {
                        operativo,
                        rea: 2,
                        descripcion: 'Al menos un hogar completo',
                        condicion: "hogar_completo = 1",
                        orden: 2,
                        es_positiva: false,
                        tarea: 'encu'
                    }
                ]);

                const respuestas = {
                    vivienda_id: 1,
                    hogares: [
                        { id: 1, hogar_completo: '1' },
                        { id: 2, hogar_completo: '0' },
                    ]
                } as any;

                const resultado = buscarReaNoReaEnRespuestas(
                    uaPrincipalMock, respuestas, reasMixtas, 'rea', 'encu', evaluarMock
                );
                assert.deepStrictEqual(resultado, { codigo: 2, resultado: false });
            });
            it('si es_positiva = true y una persona de OTRO hogar (prima) no cumple la condición, NO debe matchear la rea positiva', () => {
                const reasPositiva = conCondicionJs([
                    {
                        operativo,
                        rea: 1,
                        descripcion: 'Todas las personas con p2 = 1',
                        condicion: "p2 = 1",
                        orden: 1,
                        es_positiva: true,
                        tarea: 'encu'
                    },
                ]);

                const respuestasConPrimaFallida = {
                    vivienda_id: 1,
                    hogares: [
                        {
                            hogar_id: 1,
                            personas: [
                                { persona_id: 1, p2: '1' },
                                { persona_id: 2, p2: '1' }
                            ]
                        },
                        {
                            hogar_id: 2,
                            personas: [
                                { persona_id: 3, p2: '0' } // La "prima" en el Hogar 2 no cumple
                            ]
                        }
                    ]
                } as any;

                const resultado = buscarReaNoReaEnRespuestas(
                    uaTresNivelesMock, respuestasConPrimaFallida, reasPositiva, 'rea', 'encu', evaluarMock
                );
                assert.deepStrictEqual(resultado, { codigo: null, resultado: false });
            });

            it('si es_positiva = true, todas las personasde OTRO hogar (primas) deben cumplir la condicion de rea positiva', () => {
                const reasPositiva = conCondicionJs([
                    {
                        operativo,
                        rea: 1,
                        descripcion: 'Todas las personas con p2 = 1',
                        condicion: "realizadav = 1 and realizadoh and p2 = 1",
                        orden: 1,
                        es_positiva: true,
                        tarea: 'encu'
                    },
                ]);

                const respuestasConPrimaFallida = {
                    vivienda_id: 1,
                    realizadav: 1,
                    hogares: [
                        {
                            hogar_id: 1,
                            realizadoh: 1,
                            personas: [
                                { persona_id: 1, p2: '1' },
                                { persona_id: 2, p2: '1' }
                            ]
                        },
                        {
                            hogar_id: 2,
                            personas: [
                                { persona_id: 3, p2: '1' } 
                            ]
                        }
                    ]
                } as any;

                const resultado = buscarReaNoReaEnRespuestas(
                    uaTresNivelesMock, respuestasConPrimaFallida, reasPositiva, 'rea', 'encu', evaluarMock
                );
                assert.deepStrictEqual(resultado, { codigo: 1, resultado: true });
            });
        });
    });
});