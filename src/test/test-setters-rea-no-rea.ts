import { describe, it } from 'mocha';

import assert = require('node:assert');

import { getSettersAndParametersForReaNoReaResumenEstado } from '../server/setters-rea-no-rea';
import type { ResultadoResumen } from '../unlogged/tipos';

const respuestas: ResultadoResumen = {
    resumenEstado: 'ok',
    codNoRea: null,
    codRea: 1,
    resumenEstadoSup: 'no rea',
    codNoReaSup: 71,
    codReaSup: null,
};

describe('dmencu - getSettersAndParametersForReaNoReaResumenEstado', () => {

    it('para tareas_tem usa prefijo dm_ y numera los parámetros a continuación de los recibidos', () => {
        const { setters, params } = getSettersAndParametersForReaNoReaResumenEstado({
            tarea: 'encu',
            respuestasUAPrincipal: respuestas,
            setters: [`estado = 'D'`, `cargado_dm=null`],
            params: ['op1', 1001, 'encu', 'token-x'],
            destino: 'tareas_tem'
        });
        assert.deepStrictEqual(setters, [
            `estado = 'D'`,
            `cargado_dm=null`,
            'dm_resumen_estado=$5',
            'dm_norea=$6',
            'dm_rea=$7',
        ]);
        assert.deepStrictEqual(params, ['op1', 1001, 'encu', 'token-x', 'ok', null, 1]);
    });

    it('para tem no usa prefijo', () => {
        const { setters } = getSettersAndParametersForReaNoReaResumenEstado({
            tarea: 'encu',
            respuestasUAPrincipal: respuestas,
            setters: [],
            params: ['op1', 1001],
            destino: 'tem'
        });
        assert.deepStrictEqual(setters, ['resumen_estado=$3', 'norea=$4', 'rea=$5']);
    });

    it('para la tarea supe usa las columnas y los valores _sup', () => {
        const { setters, params } = getSettersAndParametersForReaNoReaResumenEstado({
            tarea: 'supe',
            respuestasUAPrincipal: respuestas,
            setters: ['json_encuesta = $3'],
            params: ['op1', 1001, '{}'],
            destino: 'tareas_tem'
        });
        assert.deepStrictEqual(setters, [
            'json_encuesta = $3',
            'dm_resumen_estado_sup=$4',
            'dm_norea_sup=$5',
            'dm_rea_sup=$6',
        ]);
        assert.deepStrictEqual(params, ['op1', 1001, '{}', 'no rea', 71, null]);
    });

    it('cada $n de los setters apunta al valor correcto en params', () => {
        const { setters, params } = getSettersAndParametersForReaNoReaResumenEstado({
            tarea: 'encu',
            respuestasUAPrincipal: respuestas,
            setters: [],
            params: ['a', 'b', 'c'],
            destino: 'tareas_tem'
        });
        const valorDe = (setter: string) => params[Number(setter.split('=$')[1]) - 1];
        assert.strictEqual(valorDe(setters[0]), 'ok');
        assert.strictEqual(valorDe(setters[1]), null);
        assert.strictEqual(valorDe(setters[2]), 1);
    });

    it('no modifica los arrays recibidos', () => {
        const settersEntrada = ['x = $1'];
        const paramsEntrada = ['v'];
        getSettersAndParametersForReaNoReaResumenEstado({
            tarea: 'encu',
            respuestasUAPrincipal: respuestas,
            setters: settersEntrada,
            params: paramsEntrada,
            destino: 'tem'
        });
        assert.deepStrictEqual(settersEntrada, ['x = $1']);
        assert.deepStrictEqual(paramsEntrada, ['v']);
    });
});
