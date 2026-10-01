"use strict";

import { describe, it } from 'mocha';
import assert from 'node:assert';

import { buscarReaNoReaEnRespuestas } from '../unlogged/calculos-encuesta';
import type { Estructura } from '../unlogged/tipos';

describe('dmencu - buscarReaNoReaEnRespuestas', () => {

    let estructuraMock: Partial<Estructura>;
    let uaPrincipalMock: any;

    beforeEach(() => {
        uaPrincipalMock = {
            unidad_analisis: 'vivienda',
            padre: null,
            hijas: [
                { unidad_analisis: 'persona', padre: 'vivienda', hijas: [] }
            ]
        };

        estructuraMock = {
            noReas: [
                { no_rea: 'NR1', descripcion: 'Ausente', grupo: 'G1', variable: 'v_norea', valor: '1', grupo0: '0', orden: 1 }
            ],
            noReasSup: [
                { no_rea_sup: 'NRS1', desc_norea_sup: 'Ausente Sup', grupo_sup: 'GS1', variable_sup: 'v_norea_sup', valor_sup: '1', grupo0_sup: '0', orden: 1 }
            ],
            reas: [
                { rea: '1', descripcion: 'Completa', variable: 'v_rea', valor: '1', orden: 1, es_rea: true },
                { rea: '2', descripcion: 'Incompleta', variable: 'v_rea', valor: '2', orden: 2, es_rea: false }
            ],
            reasSup: [
                { rea_sup: '1', descripcion: 'Completa Sup', variable_sup: 'v_rea_sup', valor_sup: '1', orden: 1, es_rea_sup: true }
            ]
        };
    });

    describe('Casos de Realizadas (rea)', () => {
        it('encuentra una encuesta realizada en la unidad principal', () => {
            const respuestas = { v_rea: '1' } as any;
            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.reas!, 'rea');

            assert.deepStrictEqual(resultado, {
                codigo: '1',
                esResultado: true
            });
        });

        it('encuentra una encuesta no realizada (es_rea: false) en la unidad principal', () => {
            const respuestas = { v_rea: '2' } as any;
            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.reas!, 'rea');

            assert.deepStrictEqual(resultado, {
                codigo: '2',
                esResultado: false
            });
        });

        it('devuelve null y false si no coincide ninguna regla de rea', () => {
            const respuestas = { v_rea: '99' } as any;
            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.reas!, 'rea');

            assert.deepStrictEqual(resultado, {
                codigo: null,
                esResultado: false
            });
        });
    });

    describe('Casos de Supervisión (rea_sup y no_rea_sup)', () => {
        it('encuentra una supervisión realizada correctamente', () => {
            const respuestas = { v_rea_sup: '1' } as any;
            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.reasSup!, 'rea_sup');

            assert.deepStrictEqual(resultado, {
                codigo: '1',
                esResultado: true
            });
        });

        it('encuentra una no-rea de supervisión', () => {
            const respuestas = { v_norea_sup: '1' } as any;
            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.noReasSup!, 'no_rea_sup');

            assert.deepStrictEqual(resultado, {
                codigo: 'NRS1',
                esResultado: true
            });
        });
    });

    describe('Búsqueda recursiva en unidades hijas (ej. persona dentro de vivienda)', () => {
        it('encuentra una no-rea dentro de un array de una unidad hija', () => {
            const respuestas = {
                vivienda_id: 1,
                persona: [
                    { id: 1, v_norea: '2' },
                    { id: 2, v_norea: '1' }
                ]
            } as any;

            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.noReas!, 'no_rea');

            assert.deepStrictEqual(resultado, {
                codigo: 'NR1',
                esResultado: true
            });
        });

        it('devuelve nulo si la unidad hija no tiene respuestas válidas', () => {
            const respuestas = {
                vivienda_id: 1,
                persona: [
                    { id: 1, v_norea: '9' }
                ]
            } as any;

            const resultado = buscarReaNoReaEnRespuestas(uaPrincipalMock, respuestas, estructuraMock.noReas!, 'no_rea');

            assert.deepStrictEqual(resultado, {
                codigo: null,
                esResultado: false
            });
        });
    });

});