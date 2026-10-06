"use strict";

import { describe, it } from 'mocha';
import assert = require('node:assert');

import { buscarReaNoReaEnRespuestas } from '../unlogged/calculos-encuesta';
import type { Estructura } from '../unlogged/tipos';

describe('dmencu - buscarReaNoReaEnRespuestas', () => {

    let estructuraMock: Partial<Estructura>;
    let uaPrincipalMock: any;

    beforeEach(() => {
        uaPrincipalMock = {
            unidad_analisis: 'viviendas',
            padre: null,
            hijas: [
                { unidad_analisis: 'hogares', padre: 'viviendas', hijas: [] }
            ]
        };

        const operativo = 'dmencu';

        estructuraMock = {
            noReas: [
                { operativo, no_rea: 'NR1', descripcion: 'Ausente', grupo: 'G1', variable: 'v_norea', valor: '1', grupo0: '0', orden: 1 }
            ],
            noReasSup: [
                { operativo, no_rea_sup: 'NRS1', desc_norea_sup: 'Ausente Sup', grupo_sup: 'GS1', variable_sup: 'v_norea_sup', valor_sup: '1', grupo0_sup: '0', orden: 1 }
            ],
            reas: [
                {
                    operativo, rea: '1', descripcion: 'Completa', variable: 'v_rea', valor: '1', orden: 1,
                    es_positiva: true, tarea: 'encu'
                },
                {
                    operativo, rea: '2', descripcion: 'Incompleta', variable: 'v_rea', valor: '2', orden: 2,
                    es_positiva: false, tarea: 'encu'
                }
            ],
            reasSup: [
                {
                    operativo, rea_sup: '1', descripcion: 'Completa Sup', variable_sup: 'v_rea_sup', valor_sup: '1', orden: 1,
                    es_positiva: false, tarea: null
                }
            ]
        };
    });

    describe('Casos de Realizadas y No Realizadas (rea / no_rea)', () => {
        it('encuentra una encuesta realizada en la unidad principal', () => {
            const respuestas = { v_rea: '1' } as any;
            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.reas!, 'rea', 'encu');

            assert.deepStrictEqual(resultado, {
                codigo: '1',
                esResultado: true
            });
        });

        it('encuentra otra encuesta realizada con código 2 en la unidad principal', () => {
            const respuestas = { v_rea: '2' } as any;
            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.reas!, 'rea', 'encu');

            assert.deepStrictEqual(resultado, {
                codigo: '2',
                esResultado: true // Corregido: si encuentra código válido, esResultado es true
            });
        });

        it('encuentra una no-rea en la unidad principal', () => {
            const respuestas = { v_norea: '1' } as any;
            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.noReas!, 'no_rea', 'encu');

            assert.deepStrictEqual(resultado, {
                codigo: 'NR1',
                esResultado: true
            });
        });

        it('devuelve null y false si no coincide ninguna regla', () => {
            const respuestas = { v_rea: '99' } as any;
            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.reas!, 'rea', 'encu');

            assert.deepStrictEqual(resultado, {
                codigo: null,
                esResultado: false
            });
        });
        it('respeta el orden de prioridad independientemente de cómo venga ordenada la lista', () => {
            const respuestas = { v_rea: '1' } as any; // Ambas cumplirían, pero el orden 1 debe ganar

            // Pasamos la lista deliberadamente desordenada (orden 2 primero, orden 1 después)
            const listaDesordenada = [
                { rea: '2', descripcion: 'Incompleta', variable: 'v_rea', valor: '1', orden: 2 },
                { rea: '1', descripcion: 'Completa', variable: 'v_rea', valor: '1', orden: 1 }
            ];

            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, listaDesordenada as any, 'rea', 'encu');

            assert.deepStrictEqual(resultado, {
                codigo: '1', // Debe ganar el orden 1, no el 2
                esResultado: true
            });
        });

        it('respeta la propiedad es_positiva devolviendo false cuando es una rea negativa', () => {
            const respuestas = { v_rea: '0' } as any;
            const reasConNegativa = [
                { operativo: 'dmencu', rea: '0', descripcion: 'No Realizada', variable: 'v_rea', valor: '0', orden: 1, es_positiva: false }
            ];

            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, reasConNegativa as any, 'rea', 'encu');

            assert.deepStrictEqual(resultado, {
                codigo: '0',
                esResultado: false
            });
        });

        it('filtra correctamente las reglas según la tarea especificada', () => {
            const respuestas = { v_rea: '1' } as any;
            const reasConTarea = [
                { operativo: 'dmencu', rea: '1', descripcion: 'Encu', variable: 'v_rea', valor: '1', orden: 1, tarea: 'encu' },
                { operativo: 'dmencu', rea: '2', descripcion: 'Recu', variable: 'v_rea', valor: '1', orden: 2, tarea: 'encu' }
            ];

            const resultadoEncu = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, reasConTarea as any, 'rea', 'encu');
            assert.deepStrictEqual(resultadoEncu, {
                codigo: '1',
                esResultado: true
            });

            const resultadoRecu = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, reasConTarea as any, 'rea', 'recu');
            assert.deepStrictEqual(resultadoRecu, {
                codigo: '2',
                esResultado: true
            });

            const resultadoSupe = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, reasConTarea as any, 'rea', 'supe');
            assert.deepStrictEqual(resultadoSupe, {
                codigo: null,
                esResultado: false
            });
        });
    });

    describe('Casos de Supervisión (rea_sup y no_rea_sup)', () => {
        it('encuentra una supervisión realizada correctamente', () => {
            const respuestas = { v_rea_sup: '1' } as any;
            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.reasSup!, 'rea_sup', 'encu');

            assert.deepStrictEqual(resultado, {
                codigo: '1',
                esResultado: true
            });
        });

        it('encuentra una no-rea de supervisión', () => {
            const respuestas = { v_norea_sup: '1' } as any;
            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.noReasSup!, 'no_rea_sup', 'encu');

            assert.deepStrictEqual(resultado, {
                codigo: 'NRS1',
                esResultado: true
            });
        });
    });

    describe('Búsqueda recursiva en unidades hijas (ej. hogar dentro de vivienda)', () => {
        it('encuentra una no-rea dentro de un array de una unidad hija', () => {
            const respuestas = {
                vivienda_id: 1,
                hogares: [
                    { id: 1, v_norea: '2' },
                    { id: 2, v_norea: '1' }
                ]
            } as any;

            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.noReas!, 'no_rea', 'encu');

            assert.deepStrictEqual(resultado, {
                codigo: 'NR1',
                esResultado: true
            });
        });

        it('devuelve nulo si la unidad hija no tiene respuestas válidas', () => {
            const respuestas = {
                vivienda_id: 1,
                hogares: [
                    { id: 1, v_norea: '9' }
                ]
            } as any;

            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.noReas!, 'no_rea', 'encu');

            assert.deepStrictEqual(resultado, {
                codigo: null,
                esResultado: false
            });
        });

        it('maneja de forma segura si la unidad hija viene vacía o no es un array', () => {
            const respuestas = {
                vivienda_id: 1,
                hogares: null
            } as any;

            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.noReas!, 'no_rea', 'encu');

            assert.deepStrictEqual(resultado, {
                codigo: null,
                esResultado: false
            });
        });
    });
});