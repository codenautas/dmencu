import { describe, it } from 'mocha';

import assert = require('node:assert');

import {
    accionDesdeJson, aplicarConSavepoints, armarAreas, armarPersonasRecepcion, cambiarAreas, cambiarEncuestas,
    proceduresAsignacion, QuienAsigna, quienAsigna, setDelCambio, traerContextoAsignacion, traerEncuestasRecepcion
} from '../server/asignacion';
import type { FilaSql, ValorSql } from '../server/tablero';
import type { ClienteAsignacion } from '../server/asignacion';
import type { MenuInfoBase } from '../server/types-dmencu';
import { contextoDelRol, crearAppParaTests } from './app-para-tests';

const GABINETE = '';

type ConsultaHecha = { sql: string, params: ValorSql[] };

// cliente simulado: "responder" decide las filas (o tira un error, como un trigger) y se anotan las consultas
function clienteSimulado(responder: (sql: string, params: ValorSql[]) => FilaSql[] = () => []): ClienteAsignacion & { consultas: ConsultaHecha[] } {
    var consultas: ConsultaHecha[] = [];
    return {
        consultas,
        query(sql: string, params: ValorSql[] = []) {
            consultas.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
            return {
                fetchAll: async () => ({ rows: responder(sql, params) }),
                execute: async () => { responder(sql, params); return {}; },
            };
        }
    };
}

function quienDelRol(rol: string, idper: string = 'PER1'): QuienAsigna {
    return quienAsigna(contextoDelRol(crearAppParaTests(GABINETE), rol, idper));
}

function submenu(rol: string, nombre: string): string[] {
    var be = crearAppParaTests(GABINETE);
    var opcion = be.getMenu(contextoDelRol(be, rol)).menu.find((o: MenuInfoBase) => o.name == nombre);
    assert.ok(opcion && opcion.menuType == 'menu', `falta el menú ${nombre}`);
    return opcion.menuContent.map((o: MenuInfoBase) => o.name);
}

describe('dmencu - asignación y recepción', () => {

    describe('quién puede qué (igual que las grillas)', () => {
        it('coordinación ve, edita y asigna por área', () => {
            assert.deepStrictEqual(quienDelRol('coor_campo'), { puedeVer: true, puedeEditar: true, puedeAsignarGeneral: true, soloComoRecepcionista: null, usuario: 'usu_coor_campo' });
        });
        it('el recepcionista edita sólo lo que tiene a cargo y no asigna por área', () => {
            var quien = quienDelRol('recepcionista', 'REC7');
            assert.strictEqual(quien.puedeEditar, true);
            assert.strictEqual(quien.puedeAsignarGeneral, false);
            assert.strictEqual(quien.soloComoRecepcionista, 'REC7');
        });
        it('el ingresador ve pero no asigna', () => {
            var quien = quienDelRol('ingresador');
            assert.strictEqual(quien.puedeVer, true);
            assert.strictEqual(quien.puedeEditar, false);
        });
        it('procesamiento no ve la asignación', () => {
            assert.strictEqual(quienDelRol('procesamiento').puedeVer, false);
        });
    });

    describe('menú', () => {
        it('las pantallas nuevas se agregan al final de asignación y recepción', () => {
            assert.deepStrictEqual(submenu('coor_campo', 'asignacion'), ['general', 'encuestador', 'ingresador', 'recuperador', 'supervisor', 'asignar_por_area', 'asignar_por_tarea']);
            assert.deepStrictEqual(submenu('coor_campo', 'recepcion'), ['encuestador', 'recuperador', 'ingresador', 'supervisor', 'mis_supervisores', 'recibir_por_persona']);
        });
        it('la asignación por área sólo para quien administra campo', () => {
            assert.deepStrictEqual(submenu('ingresador', 'asignacion'), ['encuestador', 'ingresador', 'recuperador', 'asignar_por_tarea']);
        });
        it('los procedimientos', () => {
            var nombres = proceduresAsignacion({ ejecutarAccion: async () => null }).map(p => p.action);
            assert.deepStrictEqual(nombres, [
                'asignacion_contexto_traer', 'asignacion_areas_traer', 'asignacion_areas_cambiar', 'asignacion_encuestas_traer',
                'asignacion_encuestas_cambiar', 'recepcion_personas_traer', 'recepcion_encuestas_traer', 'recepcion_acciones_ejecutar',
            ]);
        });
    });

    describe('contexto', () => {
        it('sólo ofrece las tareas con formulario (anac, finc y proc tienen filas en tareas_areas pero no se asignan por área)', async () => {
            var client = clienteSimulado((sql) => /from tareas ta/.test(sql) ? [{ tarea: 'encu', nombre: 'encuestador', es_inicial: true, rol_sugerido: 'encuestador' }]
                : /from parametros/.test(sql) ? [{ operativo: 'OPE1' }] : []);
            var contexto = await traerContextoAsignacion(client, quienDelRol('coor_campo'));
            assert.deepStrictEqual(contexto.tareas.map(t => t.tarea), ['encu']);
            var consulta = client.consultas.find(c => /from tareas ta/.test(c.sql))!;
            assert.match(consulta.sql, /ta\.main_form is not null/);
            assert.doesNotMatch(consulta.sql, /from tareas_areas/);
        });
    });

    describe('setDelCambio', () => {
        it('arma el set sólo con los campos que vienen, numerando después de los parámetros fijos', () => {
            assert.deepStrictEqual(setDelCambio({ asignado: 'P1' }, 4), { set: 'asignado = $4', params: ['P1'] });
            assert.deepStrictEqual(setDelCambio({ recepcionista: 'R1', asignado: null }, 4), { set: 'recepcionista = $4, asignado = $5', params: ['R1', null] });
        });
        it('rechaza un cambio vacío', () => {
            assert.throws(() => setDelCambio({}, 4), /no se indicó qué cambiar/);
        });
    });

    describe('cambios masivos con savepoints', () => {
        it('un error (por ejemplo de un trigger) vuelve al savepoint y no frena los demás', async () => {
            var client = clienteSimulado();
            var resultados = await aplicarConSavepoints(client, ['1', '2', '3'], async clave => {
                if (clave == '2') throw new Error('Error: no es posible asignar en la encuesta 2 ya que su estado no lo permite');
            });
            assert.deepStrictEqual(resultados, [
                { clave: '1', ok: true, mensaje: null },
                { clave: '2', ok: false, mensaje: 'no es posible asignar en la encuesta 2 ya que su estado no lo permite' },
                { clave: '3', ok: true, mensaje: null },
            ]);
            assert.deepStrictEqual(client.consultas.map(c => c.sql), [
                'savepoint asignacion_cambio', 'release savepoint asignacion_cambio',
                'savepoint asignacion_cambio', 'rollback to savepoint asignacion_cambio',
                'savepoint asignacion_cambio', 'release savepoint asignacion_cambio',
            ]);
        });
        it('cambiarEncuestas actualiza tareas_tem de cada encuesta (sin repetir) y avisa las que no existen', async () => {
            var client = clienteSimulado((sql, params) => /update tareas_tem/.test(sql) && params[2] != '999' ? [{ enc: params[2] }] : []);
            var resultados = await cambiarEncuestas(client, quienDelRol('coor_campo'), 'OPE1', { tarea: 'encu', encs: ['101', '999', '101'], asignado: 'P9' });
            assert.deepStrictEqual(resultados.map(r => [r.clave, r.ok, r.mensaje]), [['101', true, null], ['999', false, 'no existe la encuesta en esa tarea']]);
            var update = client.consultas.find(c => c.sql.startsWith('update tareas_tem'));
            assert.ok(update);
            assert.match(update.sql, /set asignado = \$4 where operativo = \$1 and tarea = \$2 and enc = \$3 returning enc/);
            assert.deepStrictEqual(update.params, ['OPE1', 'encu', '101', 'P9']);
        });
        it('al recepcionista sólo le cambia las encuestas que tiene a cargo', async () => {
            var client = clienteSimulado(() => []);
            var resultados = await cambiarEncuestas(client, quienDelRol('recepcionista', 'REC7'), 'OPE1', { tarea: 'encu', encs: ['101'], asignado: 'P9' });
            assert.deepStrictEqual(resultados, [{ clave: '101', ok: false, mensaje: 'no existe o no está a su cargo' }]);
            var update = client.consultas.find(c => c.sql.startsWith('update tareas_tem'));
            assert.ok(update);
            assert.match(update.sql, /and recepcionista = \$5/);
            assert.deepStrictEqual(update.params, ['OPE1', 'encu', '101', 'P9', 'REC7']);
        });
        it('quien no puede editar no asigna', async () => {
            await assert.rejects(cambiarEncuestas(clienteSimulado(), quienDelRol('ingresador'), 'OPE1', { tarea: 'encu', encs: ['1'], asignado: 'P' }), /no tiene permiso para asignar/);
        });
        it('cambiarAreas crea la fila de tareas_areas si falta y la actualiza (los triggers la pasan a las encuestas)', async () => {
            var client = clienteSimulado();
            var resultados = await cambiarAreas(client, quienDelRol('coor_campo'), 'OPE1', [{ area: 12, tarea: 'encu', recepcionista: 'R1', asignado: 'P1' }]);
            assert.deepStrictEqual(resultados, [{ clave: '12/encu', ok: true, mensaje: null }]);
            var [insert, update] = client.consultas.filter(c => /tareas_areas/.test(c.sql));
            assert.match(insert.sql, /insert into tareas_areas .* on conflict do nothing/);
            assert.deepStrictEqual(update.params, ['OPE1', 'encu', 12, 'R1', 'P1']);
            await assert.rejects(cambiarAreas(clienteSimulado(), quienDelRol('recepcionista'), 'OPE1', []), /asignación general/);
        });
    });

    describe('armado de datos', () => {
        it('armarAreas junta los conteos con la asignación de cada tarea', () => {
            assert.deepStrictEqual(armarAreas(
                [{ area: '12', encuestas: '30', comunas: '4', sin_asignar: '5' }, { area: 13, encuestas: 0, comunas: null, sin_asignar: 0 }],
                [{ area: 12, tarea: 'encu', recepcionista: 'R1', asignado: 'P1', cargado: 't' }, { area: 99, tarea: 'encu', asignado: 'X' }]
            ), [
                { area: 12, encuestas: 30, comunas: '4', sinAsignar: 5, porTarea: { encu: { recepcionista: 'R1', asignado: 'P1', cargado: true } } },
                { area: 13, encuestas: 0, comunas: null, sinAsignar: 0, porTarea: {} },
            ]);
        });
        it('armarPersonasRecepcion suma por persona y ordena por nombre', () => {
            assert.deepStrictEqual(armarPersonasRecepcion([
                { idper: 'P2', nombre: 'Zoe', dispositivo: null, estado: 'A', cantidad: '3', cargadas: '0' },
                { idper: 'P1', nombre: 'Ana', dispositivo: 'T07', estado: 'C', cantidad: '4', cargadas: '4' },
                { idper: 'P1', nombre: 'Ana', dispositivo: 'T07', estado: 'D', cantidad: '2', cargadas: '0' },
            ]), [
                { idper: 'P1', nombre: 'Ana', dispositivo: 'T07', total: 6, cargadas: 4, porEstado: [{ estado: 'C', cantidad: 4 }, { estado: 'D', cantidad: 2 }] },
                { idper: 'P2', nombre: 'Zoe', dispositivo: null, total: 3, cargadas: 0, porEstado: [{ estado: 'A', cantidad: 3 }] },
            ]);
        });
        it('accionDesdeJson se queda sólo con acciones válidas', () => {
            assert.deepStrictEqual(accionDesdeJson(null), []);
            assert.deepStrictEqual(accionDesdeJson([{ eaccion: 'cargar', estado: 'A' }, { otra: 1 }, null]).map(a => a.eaccion), ['cargar']);
        });
        it('las encuestas de recepción se piden por persona o por lista (como jsonb), con las acciones disponibles', async () => {
            var client = clienteSimulado(() => [{ enc: '101', area: 3, estado: 'A', habilitada: true, acciones: [{ eaccion: 'cargar' }] }]);
            var porPersona = await traerEncuestasRecepcion(client, quienDelRol('coor_campo'), 'OPE1', 'encu', { asignado: 'P1' });
            assert.deepStrictEqual(porPersona.map(e => [e.enc, e.area, e.acciones.map(a => a.eaccion)]), [['101', 3, ['cargar']]]);
            await traerEncuestasRecepcion(client, quienDelRol('recepcionista', 'REC7'), 'OPE1', 'encu', { encs: ['101', '102'] });
            var [primera, segunda] = client.consultas;
            assert.match(primera.sql, /tt\.asignado = \$4/);
            assert.match(primera.sql, /accion_cumple_condicion/);
            assert.deepStrictEqual(primera.params, ['OPE1', 'usu_coor_campo', 'encu', 'P1']);
            assert.match(segunda.sql, /jsonb_array_elements_text\(\$4::jsonb\)/);
            assert.match(segunda.sql, /tt\.recepcionista = \$5/);
            assert.deepStrictEqual(segunda.params, ['OPE1', 'usu_recepcionista', 'encu', '["101","102"]', 'REC7']);
        });
    });
});
