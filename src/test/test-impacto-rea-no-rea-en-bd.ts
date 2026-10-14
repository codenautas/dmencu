import { describe, it } from 'mocha';

import assert = require('node:assert');

import {
    ClienteParaTem, consultaUpdateTareasTemPorDescarga, consultaUpdateTem, guardarEncuestaEnTem
} from '../server/procedures-dmencu';
import type { ParametroSql } from '../server/setters-rea-no-rea';
import type { IdOperativo, IdTarea, ResultadoResumen } from '../unlogged/tipos';

type Valor = string | number | boolean | null | object;
type Fila = { [columna: string]: Valor };

// Mini base en memoria: aplica un "update ... set col=$n, col='lit', col=null, col=current_timestamp where col=$n and ..."
// sobre las filas de una tabla. Sólo entiende las asignaciones y condiciones que arman las consultas de dmencu.
class TablaFalsa {
    ahora = '2026-01-01T00:00:00.000Z';
    constructor(public nombre: string, public filas: Fila[]) { }

    update(sql: string, params: ParametroSql[]): number {
        var partes = /^\s*update (\w+)\s+set ([\s\S]+?)\s+where ([\s\S]+?)\s+returning/.exec(sql);
        assert.ok(partes, `consulta no reconocida: ${sql}`);
        assert.strictEqual(partes[1], this.nombre, 'la consulta actualiza otra tabla');
        var asignaciones = partes[2].split(',').map(asignacion => asignacion.trim());
        var condiciones = partes[3].split(/\s+and\s+/).map(condicion => condicion.trim());
        var valorDe = (expresion: string): Valor => {
            var parametro = /^\$(\d+)$/.exec(expresion);
            if (parametro) {
                assert.ok(Number(parametro[1]) <= params.length, `falta el parámetro ${expresion}`);
                return params[Number(parametro[1]) - 1];
            }
            if (expresion == 'null') return null;
            if (expresion == 'current_timestamp') return this.ahora;
            var literal = /^'(.*)'$/.exec(expresion);
            assert.ok(literal, `expresión no reconocida: ${expresion}`);
            return literal[1];
        };
        var cumple = (fila: Fila) => condiciones.every(condicion => {
            var [columna, expresion] = condicion.split(/\s*=\s*/);
            return fila[columna] === valorDe(expresion);
        });
        var cambios = asignaciones.map(asignacion => {
            var [columna, expresion] = asignacion.split(/\s*=\s*/);
            assert.ok(columna in (this.filas[0] ?? {}), `la tabla ${this.nombre} no tiene la columna ${columna}`);
            return { columna, valor: valorDe(expresion) };
        });
        var afectadas = this.filas.filter(cumple);
        afectadas.forEach(fila => cambios.forEach(cambio => { fila[cambio.columna] = cambio.valor; }));
        return afectadas.length;
    }
}

const OPERATIVO = 'etoi211' as IdOperativo;
const ENC = '1001';
const OTRA_ENC = '1002';
const TOKEN = 'token-dm-1';

const respuestasReal: ResultadoResumen = {
    resumenEstado: 'ok', codRea: 1, codNoRea: null,
    resumenEstadoSup: 'vacio', codReaSup: null, codNoReaSup: null,
};
const respuestasNoRea: ResultadoResumen = {
    resumenEstado: 'no rea', codRea: null, codNoRea: 3,
    resumenEstadoSup: 'vacio', codReaSup: null, codNoReaSup: null,
};
const respuestasSup: ResultadoResumen = {
    resumenEstado: 'ok', codRea: 1, codNoRea: null,
    resumenEstadoSup: 'no rea', codReaSup: null, codNoReaSup: 71,
};

function filaTem(enc: string): Fila {
    return {
        operativo: OPERATIVO, enc, json_encuesta: null, fecha_modif_encuesta: null,
        resumen_estado: 'vacio', norea: null, rea: null,
        resumen_estado_sup: 'vacio', norea_sup: null, rea_sup: null,
    };
}

function filaTareasTem(enc: string, tarea: string, cargadoDm: string | null = TOKEN): Fila {
    return {
        operativo: OPERATIVO, enc, tarea, estado: 'C', cargado_dm: cargadoDm, operacion: null,
        dm_resumen_estado: 'vacio', dm_norea: null, dm_rea: null,
        dm_resumen_estado_sup: 'vacio', dm_norea_sup: null, dm_rea_sup: null,
    };
}

describe('dmencu - impacto de rea / no rea en la base', () => {

    describe('tem (consultaUpdateTem)', () => {
        function aplicar(respuestas: ResultadoResumen, tarea: IdTarea, enc: string = ENC) {
            var tem = new TablaFalsa('tem', [filaTem(ENC), filaTem(OTRA_ENC)]);
            var consulta = consultaUpdateTem(OPERATIVO, enc, respuestas, tarea);
            var afectadas = tem.update(consulta.sql, consulta.params);
            return { tem, afectadas, consulta };
        }

        it('una encuesta realizada guarda resumen y código de rea, y deja norea en null', () => {
            var { tem, afectadas } = aplicar(respuestasReal, 'encu');
            assert.strictEqual(afectadas, 1);
            assert.strictEqual(tem.filas[0].resumen_estado, 'ok');
            assert.strictEqual(tem.filas[0].rea, 1);
            assert.strictEqual(tem.filas[0].norea, null);
        });
        it('una no rea guarda el código de no rea y deja rea en null', () => {
            var { tem } = aplicar(respuestasNoRea, 'encu');
            assert.strictEqual(tem.filas[0].resumen_estado, 'no rea');
            assert.strictEqual(tem.filas[0].norea, 3);
            assert.strictEqual(tem.filas[0].rea, null);
        });
        it('si la encuesta antes era no rea y ahora es rea, se borra la no rea', () => {
            var tem = new TablaFalsa('tem', [{ ...filaTem(ENC), norea: 3, resumen_estado: 'no rea' }]);
            var consulta = consultaUpdateTem(OPERATIVO, ENC, respuestasReal, 'encu');
            tem.update(consulta.sql, consulta.params);
            assert.strictEqual(tem.filas[0].norea, null);
            assert.strictEqual(tem.filas[0].rea, 1);
        });
        it('para la tarea supe guarda las columnas _sup y no toca las de la encuesta', () => {
            var { tem } = aplicar(respuestasSup, 'supe');
            assert.strictEqual(tem.filas[0].resumen_estado_sup, 'no rea');
            assert.strictEqual(tem.filas[0].norea_sup, 71);
            assert.strictEqual(tem.filas[0].rea_sup, null);
            assert.strictEqual(tem.filas[0].resumen_estado, 'vacio');
            assert.strictEqual(tem.filas[0].rea, null);
        });
        it('para una tarea que no es supe no toca las columnas _sup', () => {
            var { tem } = aplicar(respuestasSup, 'encu');
            assert.strictEqual(tem.filas[0].resumen_estado_sup, 'vacio');
            assert.strictEqual(tem.filas[0].norea_sup, null);
        });
        it('guarda las respuestas y la fecha de modificación', () => {
            var { tem } = aplicar(respuestasReal, 'encu');
            assert.deepStrictEqual(tem.filas[0].json_encuesta, respuestasReal);
            assert.strictEqual(tem.filas[0].fecha_modif_encuesta, tem.ahora);
        });
        it('sólo modifica la encuesta indicada', () => {
            var { tem } = aplicar(respuestasReal, 'encu');
            assert.deepStrictEqual(tem.filas[1], filaTem(OTRA_ENC));
        });
        it('no afecta ninguna fila si la encuesta no existe', () => {
            var { afectadas } = aplicar(respuestasReal, 'encu', '9999');
            assert.strictEqual(afectadas, 0);
        });
    });

    describe('guardarEncuestaEnTem (ejecuta la consulta sobre el cliente)', () => {
        function clienteSobre(tem: TablaFalsa): ClienteParaTem {
            return {
                query: (sql: string, params: ParametroSql[]) => ({
                    fetchUniqueRow: async () => {
                        var rowCount = tem.update(sql, params);
                        if (rowCount != 1) {
                            throw new Error(`se esperaba una fila y se actualizaron ${rowCount}`);
                        }
                        return { rowCount };
                    }
                })
            };
        }
        it('impacta el resultado en la TEM', async () => {
            var tem = new TablaFalsa('tem', [filaTem(ENC), filaTem(OTRA_ENC)]);
            await guardarEncuestaEnTem({ client: clienteSobre(tem) }, OPERATIVO, ENC, respuestasNoRea, 'encu');
            assert.strictEqual(tem.filas[0].norea, 3);
            assert.strictEqual(tem.filas[0].resumen_estado, 'no rea');
            assert.deepStrictEqual(tem.filas[1], filaTem(OTRA_ENC));
        });
        it('falla si la encuesta no existe en la TEM', async () => {
            var tem = new TablaFalsa('tem', [filaTem(OTRA_ENC)]);
            await assert.rejects(
                guardarEncuestaEnTem({ client: clienteSobre(tem) }, OPERATIVO, ENC, respuestasReal, 'encu'),
                /se esperaba una fila/
            );
        });
    });

    describe('tareas_tem (consultaUpdateTareasTemPorDescarga)', () => {
        function aplicar(respuestas: ResultadoResumen, tarea: IdTarea, opts: { token?: string, pasaADescargar?: boolean, filas?: Fila[] } = {}) {
            var filas = opts.filas ?? [filaTareasTem(ENC, 'encu'), filaTareasTem(ENC, 'supe'), filaTareasTem(OTRA_ENC, 'encu')];
            var tareasTem = new TablaFalsa('tareas_tem', filas);
            var consulta = consultaUpdateTareasTemPorDescarga({
                operativo: OPERATIVO, idEnc: ENC, tarea, token: opts.token ?? TOKEN,
                respuestasUAPrincipal: respuestas, pasaADescargar: opts.pasaADescargar ?? false
            });
            var afectadas = tareasTem.update(consulta.sql, consulta.params);
            return { tareasTem, afectadas };
        }

        it('una encuesta realizada guarda en dm_* el resumen y el código de rea', () => {
            var { tareasTem, afectadas } = aplicar(respuestasReal, 'encu');
            assert.strictEqual(afectadas, 1);
            assert.strictEqual(tareasTem.filas[0].dm_resumen_estado, 'ok');
            assert.strictEqual(tareasTem.filas[0].dm_rea, 1);
            assert.strictEqual(tareasTem.filas[0].dm_norea, null);
        });
        it('una no rea guarda en dm_* el código de no rea', () => {
            var { tareasTem } = aplicar(respuestasNoRea, 'encu');
            assert.strictEqual(tareasTem.filas[0].dm_resumen_estado, 'no rea');
            assert.strictEqual(tareasTem.filas[0].dm_norea, 3);
            assert.strictEqual(tareasTem.filas[0].dm_rea, null);
        });
        it('para la tarea supe guarda dm_*_sup y no toca los de la encuesta', () => {
            var { tareasTem } = aplicar(respuestasSup, 'supe');
            var supe = tareasTem.filas[1];
            assert.strictEqual(supe.dm_resumen_estado_sup, 'no rea');
            assert.strictEqual(supe.dm_norea_sup, 71);
            assert.strictEqual(supe.dm_resumen_estado, 'vacio');
            assert.strictEqual(supe.dm_rea, null);
        });
        it('pasa la tarea a descargada y libera el token del dispositivo', () => {
            var { tareasTem } = aplicar(respuestasReal, 'encu');
            assert.strictEqual(tareasTem.filas[0].estado, 'D');
            assert.strictEqual(tareasTem.filas[0].cargado_dm, null);
        });
        it('sólo modifica la tarea de la encuesta indicada', () => {
            var { tareasTem } = aplicar(respuestasReal, 'encu');
            assert.deepStrictEqual(tareasTem.filas[1], filaTareasTem(ENC, 'supe'));
            assert.deepStrictEqual(tareasTem.filas[2], filaTareasTem(OTRA_ENC, 'encu'));
        });
        it('si el dispositivo ya no es el dueño de la encuesta (otro token) no modifica nada', () => {
            var filas = [filaTareasTem(ENC, 'encu', 'token-de-otro-dm')];
            var { tareasTem, afectadas } = aplicar(respuestasReal, 'encu', { filas });
            assert.strictEqual(afectadas, 0);
            assert.deepStrictEqual(tareasTem.filas[0], filaTareasTem(ENC, 'encu', 'token-de-otro-dm'));
        });
        it('si la encuesta ya no está cargada en ningún dispositivo no modifica nada', () => {
            var filas = [filaTareasTem(ENC, 'encu', null)];
            var { afectadas } = aplicar(respuestasReal, 'encu', { filas });
            assert.strictEqual(afectadas, 0);
        });
        it('con cambio de modo o de usuario marca la operación como descargar', () => {
            var { tareasTem } = aplicar(respuestasReal, 'encu', { pasaADescargar: true });
            assert.strictEqual(tareasTem.filas[0].operacion, 'descargar');
        });
        it('sin cambio de modo ni de usuario no modifica la operación', () => {
            var { tareasTem } = aplicar(respuestasReal, 'encu', { pasaADescargar: false });
            assert.strictEqual(tareasTem.filas[0].operacion, null);
        });
    });
});
