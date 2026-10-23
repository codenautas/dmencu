import { describe, it } from 'mocha';

import assert = require('node:assert');

import { ClienteDb, ConsultaDb, refrescarEstructuraAlModificarTabla, RefrescadorEstructura } from '../server/app-dmencu';
import { reasNoReasDelOperativo } from '../server/procedures-dmencu';
import { helpersCasilleros } from '../unlogged/helpers-casilleros';
import type { NoRea, NoReaSup, Rea, ReaSup, Valor } from '../unlogged/tipos';
import { crearAppParaTests } from './app-para-tests';

// se listan acá (y no se importa TABLAS_REA_NO_REA) para que el test falle si alguna deja de tratarse
const TABLAS_REA_NO_REA = ['rea', 'no_rea', 'no_rea_grupo0', 'rea_sup', 'no_rea_sup'];

type Fila = { [campo: string]: string | number | boolean | null | Fila[] };

// Base de datos en memoria: cada consulta se resuelve por la tabla del "from"
class BaseFalsa implements ClienteDb {
    consultas: string[] = [];
    constructor(public tablas: { [tabla: string]: Fila[] }) { }
    query(sql: string): ConsultaDb {
        this.consultas.push(sql);
        var tabla = /from (\w+)/.exec(sql)?.[1] ?? '';
        var filas = this.tablas[tabla] ?? [];
        if (/group by grupo0?(_sup)? /.test(sql + ' ')) {
            var campoGrupo = /select (\w+)/.exec(sql)?.[1] ?? 'grupo';
            var alias = /as grupo,/.test(sql) ? 'grupo' : campoGrupo;
            var grupos: { [grupo: string]: Fila[] } = {};
            filas.forEach(fila => {
                var grupo = String(fila[campoGrupo]);
                grupos[grupo] = grupos[grupo] || [];
                grupos[grupo].push(fila);
            });
            filas = Object.keys(grupos).sort().map(grupo => ({ [alias]: grupo, codigos: grupos[grupo] }));
        }
        return {
            fetchAll: async () => ({ rowCount: filas.length, rows: filas, fields: [] }),
            fetchUniqueRow: async () => ({ rowCount: 1, row: filas[0], fields: [] }),
        };
    }
}

const noReas: NoRea[] = [
    { operativo: 'etoi211', no_rea: 1, descripcion: 'ausente', grupo: 'ausencia', variable: 'v1', valor: '7', grupo0: 'encuestable', orden: 1 },
    { operativo: 'etoi211', no_rea: 2, descripcion: 'rechazo', grupo: 'rechazo', variable: 'v1', valor: '8', grupo0: 'encuestable', orden: 2 },
    { operativo: 'eah2022', no_rea: 1, descripcion: 'deshabitada', grupo: 'no encuestable', variable: 'v1', valor: '9', grupo0: 'no encuestable', orden: 1 },
];
const gruposNoRea0: Fila[] = [
    { operativo: 'etoi211', grupo0: 'encuestable', orden: 1, es_otras_causas: false, es_no_encuestable: false, es_en_curso: false },
    { operativo: 'eah2022', grupo0: 'no encuestable', orden: 1, es_otras_causas: false, es_no_encuestable: true, es_en_curso: false },
];
const noReasSup: NoReaSup[] = [
    { operativo: 'etoi211', no_rea_sup: 71, desc_norea_sup: 'no contacto', grupo_sup: 'sin contacto', variable_sup: 's1', valor_sup: '2', grupo0_sup: 'sup', orden: 1 },
    { operativo: 'eah2022', no_rea_sup: 72, desc_norea_sup: 'otro', grupo_sup: 'otro', variable_sup: 's1', valor_sup: '3', grupo0_sup: 'sup', orden: 1 },
];
const reas: Omit<Rea, 'condicion_js'>[] = [
    { operativo: 'etoi211', rea: 1, descripcion: 'completa', condicion: 'v1 = 1 and v2 > 10', orden: 1, es_positiva: true, tarea: null },
    { operativo: 'etoi211', rea: 2, descripcion: 'incompleta', condicion: 'v1 = 1', orden: 2, es_positiva: false, tarea: 'encu' },
    { operativo: 'eah2022', rea: 1, descripcion: 'otra', condicion: 'v3 = 5', orden: 1, es_positiva: true, tarea: null },
];
const reasSup: Omit<ReaSup, 'condicion_js'>[] = [
    { operativo: 'etoi211', rea_sup: 1, descripcion: 'supervisada', condicion: 's1 = 1', orden: 1, es_positiva: true, tarea: 'supe' },
];
const operativos: Fila[] = [{ con_rea_hogar: true, operativo: 'etoi211', config_sorteo: null }];

function baseConDatos() {
    return new BaseFalsa({ no_rea: noReas, no_rea_grupo0: gruposNoRea0, rea: reas, no_rea_sup: noReasSup, rea_sup: reasSup, operativos });
}

// evalúa una condición compilada (condicion_js) como lo hace el dispositivo
function evaluar(condicionJs: string, valores: Record<string, Valor>): boolean {
    var funcion = new Function('valores', 'helpers', 'return ' + condicionJs);
    return funcion(valores, helpersCasilleros);
}

describe('dmencu - caches de rea/no rea', () => {

    describe('refreshCaches', () => {
        it('carga rea, no rea y sus versiones _sup', async () => {
            var be = crearAppParaTests();
            await be.refreshCaches(baseConDatos());
            assert.deepStrictEqual(be.caches.tableContent.no_rea, noReas);
            assert.deepStrictEqual(be.caches.tableContent.no_rea_grupo0, gruposNoRea0);
            assert.deepStrictEqual(be.caches.tableContent.rea, reas);
            assert.deepStrictEqual(be.caches.tableContent.no_rea_sup, noReasSup);
            assert.deepStrictEqual(be.caches.tableContent.rea_sup, reasSup);
        });
        it('pide a la base las listas ordenadas por operativo y orden (define la prioridad de evaluación)', async () => {
            var be = crearAppParaTests();
            var base = baseConDatos();
            await be.refreshCaches(base);
            for (var tabla of TABLAS_REA_NO_REA) {
                var consulta = base.consultas.find(sql => new RegExp(`from ${tabla} order by`).test(sql));
                assert.ok(consulta, `no se consultó ${tabla}`);
                assert.match(consulta, new RegExp(`order by operativo, orden, ${tabla == 'no_rea_grupo0' ? 'grupo0' : tabla}`));
            }
        });
        it('agrupa los no rea por grupo y por grupo0', async () => {
            var be = crearAppParaTests();
            await be.refreshCaches(baseConDatos());
            assert.deepStrictEqual(
                be.caches.tableContent.no_rea_groups.map((g: Fila) => g.grupo),
                ['ausencia', 'no encuestable', 'rechazo']
            );
            assert.deepStrictEqual(
                be.caches.tableContent.no_rea_groups0.map((g: Fila) => g.grupo),
                ['encuestable', 'no encuestable']
            );
        });
        it('carga la configuración del operativo actual (con_rea_hogar)', async () => {
            var be = crearAppParaTests();
            await be.refreshCaches(baseConDatos());
            assert.deepStrictEqual(be.caches.tableContent.conReaHogar, operativos[0]);
        });
        it('al recargar reemplaza los datos anteriores', async () => {
            var be = crearAppParaTests();
            var base = baseConDatos();
            await be.refreshCaches(base);
            base.tablas.rea = [reas[0]];
            await be.refreshCaches(base);
            assert.deepStrictEqual(be.caches.tableContent.rea, [reas[0]]);
        });
    });

    describe('refrescarEstructuraAlModificarTabla (envuelve table_record_save y table_record_delete)', () => {
        type ContextoFalso = { client: ClienteDb };
        type Llamada = { tabla: string, extra: object | undefined };

        function prepararRefrescador() {
            var eventos: string[] = [];
            var clientesRefrescados: ClienteDb[] = [];
            var be: RefrescadorEstructura = {
                caches: { timestampEstructura: 0 },
                refreshCaches: async (client: ClienteDb) => {
                    eventos.push('refrescar');
                    clientesRefrescados.push(client);
                },
            };
            var llamadas: Llamada[] = [];
            var guardar = async (_context: ContextoFalso, parameters: { table: string }, extra?: object) => {
                eventos.push('guardar');
                llamadas.push({ tabla: parameters.table, extra });
                return { guardado: parameters.table };
            };
            return { be, eventos, clientesRefrescados, llamadas, guardar };
        }

        for (const tabla of TABLAS_REA_NO_REA) {
            it(`al modificar ${tabla} recarga las caches después de guardar y cambia la estructura`, async () => {
                var { be, eventos, clientesRefrescados, guardar } = prepararRefrescador();
                var client = new BaseFalsa({});
                var resultado = await refrescarEstructuraAlModificarTabla(be, guardar)({ client }, { table: tabla });
                assert.deepStrictEqual(resultado, { guardado: tabla });
                assert.deepStrictEqual(eventos, ['guardar', 'refrescar']);
                assert.strictEqual(clientesRefrescados[0], client, 'debe recargar con el mismo cliente (misma transacción)');
                assert.ok(be.caches.timestampEstructura > 0);
            });
        }
        for (const tabla of ['casilleros', 'semanas']) {
            it(`al modificar ${tabla} cambia la estructura sin recargar las caches de rea`, async () => {
                var { be, eventos, guardar } = prepararRefrescador();
                await refrescarEstructuraAlModificarTabla(be, guardar)({ client: new BaseFalsa({}) }, { table: tabla });
                assert.deepStrictEqual(eventos, ['guardar']);
                assert.ok(be.caches.timestampEstructura > 0);
            });
        }
        it('al modificar otras tablas no toca la estructura ni las caches', async () => {
            var { be, eventos, guardar } = prepararRefrescador();
            await refrescarEstructuraAlModificarTabla(be, guardar)({ client: new BaseFalsa({}) }, { table: 'usuarios' });
            assert.deepStrictEqual(eventos, ['guardar']);
            assert.strictEqual(be.caches.timestampEstructura, 0);
        });
        it('si falla el guardado no recarga ni cambia la estructura', async () => {
            var { be, eventos } = prepararRefrescador();
            var guardarConError = async (_context: ContextoFalso, _parameters: { table: string }) => {
                eventos.push('guardar');
                throw new Error('error al guardar');
            };
            await assert.rejects(
                refrescarEstructuraAlModificarTabla(be, guardarConError)({ client: new BaseFalsa({}) }, { table: 'rea' }),
                /error al guardar/
            );
            assert.deepStrictEqual(eventos, ['guardar']);
            assert.strictEqual(be.caches.timestampEstructura, 0);
        });
        it('pasa a la función original los argumentos extra (files/opts de table_record_save)', async () => {
            var { be, llamadas, guardar } = prepararRefrescador();
            var extra = { files: [] };
            await refrescarEstructuraAlModificarTabla(be, guardar)({ client: new BaseFalsa({}) }, { table: 'no_rea' }, extra);
            assert.strictEqual(llamadas[0].extra, extra);
        });
    });

    describe('reasNoReasDelOperativo (rea/no rea en la estructura que recibe el dispositivo)', () => {
        const tableContent = { no_rea: noReas, no_rea_sup: noReasSup, rea: reas, rea_sup: reasSup };

        it('filtra cada lista por operativo', () => {
            var resultado = reasNoReasDelOperativo(tableContent, 'etoi211');
            assert.deepStrictEqual(resultado.noReas, [noReas[0], noReas[1]]);
            assert.deepStrictEqual(resultado.noReasSup, [noReasSup[0]]);
            assert.deepStrictEqual(resultado.reas.map(rea => rea.rea), [1, 2]);
            assert.deepStrictEqual(resultado.reasSup.map(reaSup => reaSup.rea_sup), [1]);
        });
        it('conserva el orden de las caches (que viene ordenado por orden)', () => {
            var resultado = reasNoReasDelOperativo({ ...tableContent, rea: [reas[1], reas[0]] }, 'etoi211');
            assert.deepStrictEqual(resultado.reas.map(rea => rea.rea), [2, 1]);
        });
        it('compila las condiciones de rea a js evaluable en el dispositivo', () => {
            var [completa, incompleta] = reasNoReasDelOperativo(tableContent, 'etoi211').reas;
            assert.strictEqual(evaluar(completa.condicion_js, { v1: 1, v2: 11 }), true);
            assert.strictEqual(evaluar(completa.condicion_js, { v1: 1, v2: 5 }), false);
            assert.strictEqual(evaluar(incompleta.condicion_js, { v1: 1 }), true);
            assert.strictEqual(evaluar(incompleta.condicion_js, { v1: 2 }), false);
        });
        it('compila las condiciones de rea_sup', () => {
            var [supervisada] = reasNoReasDelOperativo(tableContent, 'etoi211').reasSup;
            assert.strictEqual(evaluar(supervisada.condicion_js, { s1: 1 }), true);
            assert.strictEqual(evaluar(supervisada.condicion_js, { s1: 2 }), false);
        });
        it('las variables sin cargar se toman como 0 (no rompen la evaluación)', () => {
            var [completa] = reasNoReasDelOperativo(tableContent, 'etoi211').reas;
            assert.strictEqual(evaluar(completa.condicion_js, {}), false);
        });
        it('no modifica las caches', () => {
            var antes = JSON.stringify(tableContent);
            reasNoReasDelOperativo(tableContent, 'etoi211');
            assert.strictEqual(JSON.stringify(tableContent), antes);
        });
        it('si las caches no se cargaron devuelve listas vacías', () => {
            assert.deepStrictEqual(reasNoReasDelOperativo({}, 'etoi211'), { noReas: [], noReasSup: [], reas: [], reasSup: [] });
        });
    });

    describe('de punta a punta: modificar una rea llega a la estructura del dispositivo', () => {
        it('después de guardar una rea, la estructura del operativo la incluye compilada', async () => {
            var be = crearAppParaTests();
            var base = baseConDatos();
            await be.refreshCaches(base);
            var timestampAnterior = be.caches.timestampEstructura;
            var nuevaRea: Omit<Rea, 'condicion_js'> = { operativo: 'etoi211', rea: 3, descripcion: 'nueva', condicion: 'v4 = 2', orden: 3, es_positiva: true, tarea: null };
            var guardar = async (_context: { client: ClienteDb }, _parameters: { table: string }) => {
                base.tablas.rea = [...reas, nuevaRea];
                return 'ok';
            };
            await new Promise(resolve => setTimeout(resolve, 2));
            await refrescarEstructuraAlModificarTabla(be, guardar)({ client: base }, { table: 'rea' });
            assert.ok(be.caches.timestampEstructura > timestampAnterior, 'los dispositivos deben recibir la estructura nueva');
            var reasOP1 = reasNoReasDelOperativo(be.caches.tableContent, 'etoi211').reas;
            assert.deepStrictEqual(reasOP1.map(rea => rea.rea), [1, 2, 3]);
            assert.strictEqual(evaluar(reasOP1[2].condicion_js, { v4: 2 }), true);
        });
    });
});
