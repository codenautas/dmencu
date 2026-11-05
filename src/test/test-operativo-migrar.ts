import { describe, it } from 'mocha';

import assert = require('node:assert');

import * as pg from 'pg-promise-strict';

import { ContextoParaMigrar, operativoMigrarSql } from '../server/procedures-dmencu';
import type { ParametroSql } from '../server/setters-rea-no-rea';

type Valor = string | number | boolean | null;
type FilaBd = { [columna: string]: Valor };
type TablaBd = { columnas: string[], filas: FilaBd[] };

const ORIGEN = 'op_origen';
const DESTINO = 'op_destino';
const ESQUEMA = 'base';

function campo(name: string): pg.ResultRows['fields'][number] {
    return { name, tableID: 0, columnID: 0, dataTypeID: 0, dataTypeSize: 0, dataTypeModifier: 0, format: 'text' };
}

function resultado(columnas: string[], filas: FilaBd[]): pg.ResultRows {
    return { rowCount: filas.length, fields: columnas.map(campo), rows: filas };
}

// base simulada: sólo las tablas que se le pasan existen en el esquema; responde las consultas de operativoMigrarSql
function contextoConTablas(tablas: { [nombre: string]: TablaBd }): ContextoParaMigrar {
    return {
        be: { db: pg },
        client: {
            query(sql: string, params: ParametroSql[]) {
                return {
                    fetchAll: async () => {
                        if (/information_schema\.tables/.test(sql)) {
                            var pedidas = params[0] as string[];
                            return resultado(['table_name'], Object.keys(tablas).filter(t => pedidas.includes(t)).map(t => ({ table_name: t })));
                        }
                        if (/information_schema\.columns/.test(sql)) {
                            return resultado(['column_name'], tablas[params[0] as string].columnas.map(c => ({ column_name: c })));
                        }
                        var tabla = /^\s*select \* from "(\w+)"/.exec(sql);
                        assert.ok(tabla, `consulta no reconocida: ${sql}`);
                        var { columnas, filas } = tablas[tabla[1]];
                        var filtraPorOperativo = /where operativo = \$1/.test(sql);
                        return resultado(columnas, filas.filter(fila => !filtraPorOperativo || fila.operativo === params[0]).map(fila => ({ ...fila })));
                    }
                };
            }
        }
    };
}

function tablaVacia(columnas: string[]): TablaBd {
    return { columnas, filas: [] };
}

const COLUMNAS_NO_REA_GRUPO0 = ['operativo', 'grupo0', 'orden', 'es_otras_causas', 'es_no_encuestable', 'es_en_curso'];
const COLUMNAS_NO_REA = ['operativo', 'orden', 'no_rea', 'descripcion', 'grupo', 'variable', 'valor', 'grupo0', 'pasa_a_recuperacion', 'pasa_a_supervision'];

function tablasBase(): { [nombre: string]: TablaBd } {
    return {
        operativos: { columnas: ['operativo'], filas: [{ operativo: ORIGEN }, { operativo: 'otro' }] },
        tareas: tablaVacia(['operativo', 'tarea']),
        unidad_analisis: tablaVacia(['operativo', 'unidad_analisis']),
        casilleros: tablaVacia(['operativo', 'casillero']),
        rea: { columnas: ['operativo', 'rea', 'descripcion'], filas: [{ operativo: ORIGEN, rea: 1, descripcion: 'completa' }] },
        no_rea_grupo0: {
            columnas: COLUMNAS_NO_REA_GRUPO0,
            filas: [
                { operativo: ORIGEN, grupo0: 'rechazo', orden: 1, es_otras_causas: false, es_no_encuestable: false, es_en_curso: false },
                { operativo: ORIGEN, grupo0: 'sin ocupantes', orden: 2, es_otras_causas: false, es_no_encuestable: true, es_en_curso: false },
                { operativo: 'otro', grupo0: 'ajeno', orden: 1, es_otras_causas: true, es_no_encuestable: false, es_en_curso: false },
            ],
        },
        no_rea: {
            columnas: COLUMNAS_NO_REA,
            filas: [{ operativo: ORIGEN, orden: 1, no_rea: 3, descripcion: 'se negó', grupo: 'g', variable: 'v', valor: '1', grupo0: 'rechazo', pasa_a_recuperacion: true, pasa_a_supervision: false }],
        },
        rea_sup: tablaVacia(['operativo', 'rea_sup']),
        no_rea_sup: tablaVacia(['operativo', 'no_rea_sup']),
    };
}

async function migrar(tablas: { [nombre: string]: TablaBd }): Promise<string> {
    return operativoMigrarSql(contextoConTablas(tablas), { operativo_origen: ORIGEN, operativo_destino: DESTINO, schema_name: ESQUEMA });
}

function lineasInsert(sql: string, tabla: string): string[] {
    return sql.split('\n').filter(linea => linea.startsWith(`insert into "${ESQUEMA}"."${tabla}" `));
}

describe('dmencu - operativo_migrar (rea y no rea)', () => {

    it('copia los grupos de no rea con sus banderas al operativo destino, sólo los del origen', async () => {
        var sql = await migrar(tablasBase());
        var grupos = lineasInsert(sql, 'no_rea_grupo0');
        assert.strictEqual(grupos.length, 2);
        assert.ok(grupos.every(linea => linea.includes(`'${DESTINO}'`) && !linea.includes(`'${ORIGEN}'`)));
        assert.ok(grupos.some(linea => linea.includes(`'sin ocupantes'`) && linea.includes('true')));
        assert.ok(!sql.includes('ajeno'));
    });

    it('los grupos de no rea se insertan antes que las no rea, que los referencian', async () => {
        var sql = await migrar(tablasBase());
        assert.ok(sql.indexOf(`."no_rea_grupo0"`) < sql.indexOf(`."no_rea" `));
        assert.strictEqual(lineasInsert(sql, 'no_rea').length, 1);
        assert.strictEqual(lineasInsert(sql, 'rea').length, 1);
    });

    it('las tablas de rea sin columna operativo se copian enteras y reciben el operativo destino', async () => {
        var tablas = tablasBase();
        tablas.rea_sup = { columnas: ['rea_sup', 'descripcion'], filas: [{ rea_sup: 1, descripcion: 'sup' }, { rea_sup: 2, descripcion: 'sup2' }] };
        var sql = await migrar(tablas);
        var lineas = lineasInsert(sql, 'rea_sup');
        assert.strictEqual(lineas.length, 2);
        assert.ok(lineas.every(linea => linea.includes('"operativo"') && linea.includes(`'${DESTINO}'`)));
    });

    it('si una tabla opcional no existe se avisa y se omite', async () => {
        var tablas = tablasBase();
        delete tablas.no_rea_grupo0;
        var sql = await migrar(tablas);
        assert.ok(sql.includes(`RAISE NOTICE`) && sql.includes(`'no_rea_grupo0'`));
        assert.strictEqual(lineasInsert(sql, 'no_rea_grupo0').length, 0);
        assert.strictEqual(lineasInsert(sql, 'no_rea').length, 1);
    });

    it('los deletes comentados incluyen todas las tablas de rea y no rea, y los grupos van después de las no rea', async () => {
        var sql = await migrar(tablasBase());
        var deletes = sql.split('\n').filter(linea => linea.trim().startsWith('--delete from'));
        var tablas = deletes.map(linea => /--delete from (\w+) /.exec(linea)?.[1]);
        ['rea', 'no_rea', 'rea_sup', 'no_rea_sup', 'no_rea_grupo0'].forEach(tabla => assert.ok(tablas.includes(tabla), `falta el delete de ${tabla}`));
        assert.ok(tablas.indexOf('no_rea') < tablas.indexOf('no_rea_grupo0'));
        assert.ok(deletes.every(linea => linea.includes(`'${DESTINO}'`)));
    });

    it('el script usa el esquema indicado y deshabilita los triggers de casilleros mientras inserta', async () => {
        var sql = await migrar(tablasBase());
        assert.ok(sql.startsWith(`set search_path = "${ESQUEMA}";`));
        assert.ok(sql.indexOf('DISABLE TRIGGER ALL') < sql.indexOf('insert into') && sql.indexOf('insert into') < sql.indexOf('ENABLE TRIGGER ALL'));
    });
});
