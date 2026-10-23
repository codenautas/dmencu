import { describe, it } from 'mocha';

import assert = require('node:assert');

import { quienConsultaTablero } from '../server/app-dmencu';
import { CampoCalculado, control_campo, controlCamposOpts } from '../server/table-control_campo';
import {
    acomodarCalendario, accesosDelMenu, armarSecciones, buscarEnMenu, ClienteTablero, combinarSecciones, ConsultaTablero,
    CORTES_DESGLOSE, DefinicionSeccionTablero, FilaSql, ordenarTareas, partesDeControl, SECCIONES_TABLERO, seccionAvance,
    seccionCalendario, seccionCircuito, seccionDelAmbito, seccionDesglose, seccionesVisibles, seccionMiAvance, seccionMiDetalle, seccionOperativos, seccionParaAsignar, seccionParaRecibir, seccionRecepcionistas,
    seccionNoRespuesta, ValorSql
} from '../server/tablero';
import type { GrupoNoRea, NoReaGrupo0, TableDefinition } from '../server/types-dmencu';
import type { ContenidoTablero, SeccionTablero } from '../unlogged/tipos-tablero';
import { AppParaTests, contextoDelRol, crearAppParaTests } from './app-para-tests';

const GABINETE = '';
const RELEVAMIENTO = 'web';

type ConsultaHecha = { sql: string, params: ValorSql[] };

// cliente de base simulado: responde con las filas que devuelve "responder" y anota cada consulta
function clienteSimulado(responder: (sql: string, params: ValorSql[]) => FilaSql[]): ClienteTablero & { consultas: ConsultaHecha[] } {
    var consultas: ConsultaHecha[] = [];
    return {
        consultas,
        query(sql: string, params: ValorSql[] = []) {
            consultas.push({ sql, params });
            return {
                fetchAll: async () => ({ rows: responder(sql, params) }),
            };
        }
    };
}

// las tablas control_* se simulan: lo que importa es que el tablero use el sql de su definición y los campos de grupos de no respuesta
function tablaSimulada(nombre: string): TableDefinition {
    var grupoEncuestable: CampoCalculado = { name: 'ausentes', typeName: 'bigint', inTable: false, title: 'ausentes', tasa_efectividad: true };
    var grupoNoEncuestable: CampoCalculado = { name: 'no_encuestables', typeName: 'bigint', inTable: false, title: 'no encuestables', tasa_efectividad: false };
    return {
        name: nombre,
        fields: [{ name: 'total', typeName: 'bigint' }, grupoEncuestable, grupoNoEncuestable],
        primaryKey: [],
        sql: { from: `(select '${nombre}' as tabla_simulada)` },
    };
}

function consultaDelRol(be: AppParaTests, rol: string, client: ClienteTablero, idper: string = 'PER1'): ConsultaTablero {
    var context = contextoDelRol(be, rol, idper);
    return {
        client,
        quien: quienConsultaTablero(context),
        operativo: 'OPE1',
        menu: be.getMenu(context).menu,
        variosOperativos: false,
        tabla: tablaSimulada,
    };
}

// las secciones que ve el rol en una instancia de campo (un solo operativo) o de diseño (varios)
function idsVisibles(rol: string, variosOperativos: boolean = false): string[] {
    var be = crearAppParaTests(GABINETE);
    var consulta = consultaDelRol(be, rol, clienteSimulado(() => []));
    return seccionesVisibles(be.getSeccionesTablero(), consulta.quien)
        .filter(seccion => seccionDelAmbito(seccion, variosOperativos)).map(seccion => seccion.id);
}

function seccionDePrueba(id: string, orden: number, obtener: DefinicionSeccionTablero['obtener'], extra: Partial<DefinicionSeccionTablero> = {}): DefinicionSeccionTablero {
    return { id, titulo: id, orden, obtener, ...extra };
}

describe('dmencu - tablero de inicio', () => {

    describe('menú', () => {
        it('en GABINETE el tablero es la primera opción y la que se abre al entrar', () => {
            var be = crearAppParaTests(GABINETE);
            var [primera] = be.getMenu(contextoDelRol(be, 'coor_campo')).menu;
            assert.deepStrictEqual(primera, { menuType: 'tablero', name: 'tablero', label: 'inicio', selectedByDefault: true });
        });
        it('no aparece en RELEVAMIENTO ni para quien no tiene menú en GABINETE', () => {
            var relevamiento = crearAppParaTests(RELEVAMIENTO);
            assert.ok(!relevamiento.getMenu(contextoDelRol(relevamiento, 'encuestador')).menu.some(opcion => opcion.name == 'tablero'));
            var gabinete = crearAppParaTests(GABINETE);
            assert.deepStrictEqual(gabinete.getMenu(contextoDelRol(gabinete, 'auxiliar')).menu, []);
        });
        it('buscarEnMenu encuentra opciones por su ruta', () => {
            var be = crearAppParaTests(GABINETE);
            var menu = be.getMenu(contextoDelRol(be, 'coor_campo')).menu;
            assert.strictEqual(buscarEnMenu(menu, ['control', 'resumen'])?.name, 'resumen');
            assert.strictEqual(buscarEnMenu(menu, ['configurar', 'muestra', 'tem'])?.name, 'tem');
            assert.strictEqual(buscarEnMenu(menu, ['control', 'inexistente']), null);
            assert.strictEqual(buscarEnMenu(menu, ['inexistente']), null);
        });
        it('los accesos son las opciones de primer y segundo nivel, sin el tablero ni la ayuda', () => {
            var be = crearAppParaTests(GABINETE);
            var accesos = accesosDelMenu(be.getMenu(contextoDelRol(be, 'ingresador')).menu);
            assert.deepStrictEqual(accesos.map(acceso => acceso.ruta.join('/')), [
                'asignacion/encuestador', 'asignacion/ingresador', 'asignacion/recuperador',
                'recepcion/encuestador', 'recepcion/recuperador', 'recepcion/ingresador',
                'supervision/supervisar',
                'varios/abrir_encuesta', 'varios/hoja_ruta',
            ]);
            assert.deepStrictEqual(accesos[0], { titulo: 'encuestador', grupo: 'asignación', ruta: ['asignacion', 'encuestador'] });
            assert.strictEqual(accesos.find(acceso => acceso.ruta[1] == 'hoja_ruta')?.titulo, 'hoja de ruta');
        });
        it('una opción de primer nivel que no es submenú es un acceso sin grupo', () => {
            assert.deepStrictEqual(accesosDelMenu([
                { menuType: 'tablero', name: 'tablero' },
                { menuType: 'table', name: 'tareas_tem_fin_campo', label: 'espera fin de campo' },
                { menuType: 'ayuda', name: 'ayuda' },
            ]), [{ titulo: 'espera fin de campo', ruta: ['tareas_tem_fin_campo'] }]);
        });
    });

    describe('secciones visibles según rol', () => {
        it('admin (superuser) ve todas las secciones de campo', () => {
            assert.deepStrictEqual(idsVisibles('admin').sort(), SECCIONES_TABLERO.filter(seccion => seccionDelAmbito(seccion, false)).map(seccion => seccion.id).sort());
        });
        it('con varios operativos (instancia de diseño) todos ven operativos y sus accesos, y nada de campo', () => {
            ['admin', 'dis_conceptual', 'coor_campo', 'recepcionista'].forEach(rol => {
                assert.deepStrictEqual(idsVisibles(rol, true), ['operativos', 'accesos'], rol);
            });
        });
        it('con un solo operativo no se ve el tablero de diseño', () => {
            assert.ok(!idsVisibles('admin').includes('operativos'));
            assert.ok(idsVisibles('admin').includes('avance'));
        });
        it('coordinación ve el campo, la gestión y los dispositivos', () => {
            assert.deepStrictEqual(idsVisibles('coor_campo'), [
                'titulo_mis_encuestas', 'para_asignar', 'para_recibir', 'mi_avance', 'mi_detalle', 'titulo_seguimiento', 'avance', 'recepcionistas', 'no_respuesta', 'desglose', 'circuito', 'calendario', 'dispositivos', 'accesos'
            ]);
        });
        it('el subcoordinador ve los dispositivos', () => {
            assert.ok(idsVisibles('subcoor_campo').includes('dispositivos'));
        });
        it('recepción ve lo suyo, el calendario y sus accesos, pero no el panorama del operativo', () => {
            assert.deepStrictEqual(idsVisibles('recepcionista'), ['titulo_mis_encuestas', 'para_asignar', 'para_recibir', 'mi_avance', 'mi_detalle', 'calendario', 'accesos']);
            assert.deepStrictEqual(idsVisibles('ingresador'), ['titulo_mis_encuestas', 'para_asignar', 'para_recibir', 'mi_avance', 'mi_detalle', 'calendario', 'accesos']);
        });
        it('el avance del campo es de coordinación para arriba: admin, dirección, coordinación y procesamiento', () => {
            ['direccion', 'coor_campo', 'subcoor_campo', 'coor_proc', 'procesamiento'].forEach(rol => {
                assert.ok(idsVisibles(rol).includes('avance'), `${rol} debería ver el avance del campo`);
            });
            ['recepcionista', 'ingresador', 'dis_conceptual'].forEach(rol => {
                assert.ok(!idsVisibles(rol).includes('avance'), `${rol} no debería ver el avance del campo`);
            });
        });
        it('procesamiento ve la gestión, sin dispositivos', () => {
            var ids = idsVisibles('procesamiento');
            assert.ok(ids.includes('desglose'));
            assert.ok(ids.includes('no_respuesta'));
            assert.ok(!ids.includes('dispositivos'));
        });
        it('diseño conceptual ve el calendario y sus accesos', () => {
            assert.deepStrictEqual(idsVisibles('dis_conceptual'), ['calendario', 'accesos']);
        });
        it('el rol de la sección restringe aunque no pida permisos', () => {
            var be = crearAppParaTests(GABINETE);
            var soloDireccion = seccionDePrueba('solo_direccion', 1, async () => null, { roles: ['direccion'] });
            var quienCoordina = consultaDelRol(be, 'coor_campo', clienteSimulado(() => [])).quien;
            var quienDirige = consultaDelRol(be, 'direccion', clienteSimulado(() => [])).quien;
            assert.deepStrictEqual(seccionesVisibles([soloDireccion], quienCoordina), []);
            assert.deepStrictEqual(seccionesVisibles([soloDireccion], quienDirige).map(s => s.id), ['solo_direccion']);
        });
        it('combinarSecciones reemplaza por id y agrega las nuevas', () => {
            var reemplazo = seccionDePrueba('avance', 5, async () => null, { titulo: 'otro avance' });
            var nueva = seccionDePrueba('propia', 500, async () => null);
            var combinadas = combinarSecciones(SECCIONES_TABLERO, [reemplazo, nueva]);
            assert.strictEqual(combinadas.length, SECCIONES_TABLERO.length + 1);
            assert.strictEqual(combinadas.find(seccion => seccion.id == 'avance')?.titulo, 'otro avance');
        });
    });

    describe('control_campo: significado de los grupos de no rea según no_rea_grupo0', () => {
        function grupo(nombre: string, grupo0: string): GrupoNoRea {
            return { grupo: nombre, codigos: [{ operativo: 'OPE1', no_rea: 1, descripcion: nombre, grupo: nombre, variable: 'v', valor: '1', grupo0, orden: 1 }] };
        }
        // lo que declara el operativo en no_rea_grupo0 para cada grupo0
        function declarado(grupo0: string, marcas: Partial<NoReaGrupo0> = {}): NoReaGrupo0 {
            return { operativo: 'OPE1', grupo0, orden: 1, es_otras_causas: false, es_no_encuestable: false, es_en_curso: false, ...marcas };
        }
        function sqlDeControl(grupos: GrupoNoRea[], gruposDeclarados: NoReaGrupo0[], opts: Partial<controlCamposOpts> = {}): string {
            var be = crearAppParaTests(GABINETE);
            be.caches.tableContent = { conReaHogar: { con_rea_hogar: false, operativo: 'OPE1', config_sorteo: null }, no_rea_grupo0: gruposDeclarados, no_rea_groups: grupos, no_rea_groups0: grupos };
            var sql = control_campo(contextoDelRol(be, 'admin'), { nombre: 'control_campo', ...opts }).sql?.from;
            assert.ok(sql != null);
            return sql;
        }
        const sumaDe = (sql: string, alias: string): string | undefined => new RegExp(`(?:\\+|\\s)(coalesce\\(\\w+,0\\)(?:\\+coalesce\\(\\w+,0\\))*|0)\\s+as ${alias}`).exec(sql)?.[1];

        it('otras causas: suma los grupos cuyo grupo0 está marcado, sin pedir los que la base no tiene (como ggs, que no tiene seleccionado)', () => {
            var sql = sqlDeControl(
                [grupo('otras causas vivienda', 'otras causas'), grupo('Otras causas telefonica', 'noreatel'), grupo('rechazos', 'rechazos')],
                [declarado('otras causas', { es_otras_causas: true }), declarado('noreatel'), declarado('rechazos')]
            );
            assert.strictEqual(sumaDe(sql, 'otras_causas_gabinete'), 'coalesce(otras_causas_vivienda,0)');
        });
        it('otras causas: suma todos los grupos marcados que tenga la base (hogar, vivienda, seleccionado)', () => {
            var sql = sqlDeControl(
                [grupo('otras causas hogar', 'otras causas'), grupo('otras causas seleccionado', 'otras causas'), grupo('otras causas vivienda', 'otras causas')],
                [declarado('otras causas', { es_otras_causas: true })]
            );
            assert.strictEqual(sumaDe(sql, 'otras_causas_gabinete'), 'coalesce(otras_causas_hogar,0)+coalesce(otras_causas_seleccionado,0)+coalesce(otras_causas_vivienda,0)');
        });
        it('otras causas: en gabinete (agrupado por grupo0) suma el grupo marcado; sin marcas, o con un grupo0 no declarado, suma 0', () => {
            var grupo0 = [grupo('otras causas', 'otras causas')];
            assert.strictEqual(sumaDe(sqlDeControl(grupo0, [declarado('otras causas', { es_otras_causas: true })], { gabinete: true, agrupador: 'no_rea_groups0' }), 'otras_causas_gabinete'), 'coalesce(otras_causas,0)');
            assert.strictEqual(sumaDe(sqlDeControl(grupo0, [declarado('otras causas')]), 'otras_causas_gabinete'), '0');
            assert.strictEqual(sumaDe(sqlDeControl(grupo0, []), 'otras_causas_gabinete'), '0');
        });
        it('en curso: suma los grupos cuyo grupo0 está marcado como en curso; sin marcas suma 0', () => {
            var grupos = [grupo('sin finalizar dm', 'no finalizada'), grupo('sin finalizar incompleto', 'no finalizada'), grupo('rechazos', 'rechazos')];
            assert.strictEqual(sumaDe(sqlDeControl(grupos, [declarado('no finalizada', { es_en_curso: true }), declarado('rechazos')]), 'en_curso'), 'coalesce(sin_finalizar_dm,0)+coalesce(sin_finalizar_incompleto,0)');
            assert.strictEqual(sumaDe(sqlDeControl(grupos, [declarado('no finalizada')]), 'en_curso'), '0');
        });
        it('tasa de efectividad: los grupos marcados como no encuestables no suman al denominador', () => {
            var sql = sqlDeControl(
                [grupo('no encuestable hogar', 'no encuestable'), grupo('rechazos', 'rechazos')],
                [declarado('no encuestable', { es_no_encuestable: true }), declarado('rechazos')]
            );
            assert.strictEqual(/nullif\( (.*?),0\)/.exec(sql)?.[1], 'rea+rechazos');
        });
    });

    describe('armarSecciones', () => {
        it('arma las visibles en orden, omite las vacías y quita el acceso si el usuario no tiene esa opción', async () => {
            var be = crearAppParaTests(GABINETE);
            var consulta = consultaDelRol(be, 'ingresador', clienteSimulado(() => []));
            var { secciones, errores } = await armarSecciones([
                seccionDePrueba('segunda', 2, async () => ({ tipo: 'mensaje', texto: 'b' }), { ancho: 'mitad', acceso: { titulo: 'control', ruta: ['control', 'resumen'] } }),
                seccionDePrueba('primera', 1, async () => ({ tipo: 'mensaje', texto: 'a' }), { acceso: { titulo: 'asignar', ruta: ['asignacion', 'encuestador'] } }),
                seccionDePrueba('vacia', 3, async () => null),
            ], consulta);
            assert.deepStrictEqual(errores, []);
            assert.deepStrictEqual(secciones, [
                { id: 'primera', titulo: 'primera', ancho: 'completo', acceso: { titulo: 'asignar', ruta: ['asignacion', 'encuestador'] }, contenido: { tipo: 'mensaje', texto: 'a' } },
                { id: 'segunda', titulo: 'segunda', ancho: 'mitad', contenido: { tipo: 'mensaje', texto: 'b' } },
            ]);
        });
        it('los accesos de los indicadores y de los cortes sólo quedan si el usuario tiene la grilla', async () => {
            var be = crearAppParaTests(GABINETE);
            var consulta = consultaDelRol(be, 'recepcionista', clienteSimulado(() => []));
            var { secciones } = await armarSecciones([
                seccionDePrueba('indicadores', 1, async () => ({
                    tipo: 'indicadores',
                    indicadores: [
                        { id: 'con', titulo: 'con', valor: 1, acceso: { titulo: 'ver', ruta: ['recepcion', 'encuestador'] } },
                        { id: 'sin', titulo: 'sin', valor: 0, acceso: { titulo: 'ver', ruta: ['procesar', 'tareas_tem_procesamiento'] } },
                    ]
                })),
                seccionDePrueba('desglose', 2, async () => ({
                    tipo: 'desglose',
                    cortes: [
                        { id: 'con', titulo: 'con', filas: [], acceso: { titulo: 'ver', ruta: ['recepcion', 'recuperador'] } },
                        { id: 'sin', titulo: 'sin', filas: [], acceso: { titulo: 'ver', ruta: ['control', 'zona'] } },
                    ]
                })),
            ], consulta);
            var [indicadores, desglose] = secciones.map(seccion => seccion.contenido);
            assert.ok(indicadores.tipo == 'indicadores' && desglose.tipo == 'desglose');
            assert.deepStrictEqual(indicadores.indicadores.map(i => i.acceso?.ruta), [['recepcion', 'encuestador'], undefined]);
            assert.deepStrictEqual(desglose.cortes.map(c => c.acceso?.ruta), [['recepcion', 'recuperador'], undefined]);
        });
        it('el calendario va después de lo de recepción: tres tercios, dos mitades, y sin eso queda donde está', () => {
            var seccion = (id: string, ancho: SeccionTablero['ancho']): SeccionTablero => ({ id, titulo: id, ancho, contenido: { tipo: 'mensaje', texto: id } });
            var anchos = (secciones: SeccionTablero[]) => secciones.map(s => [s.id, s.ancho]);
            assert.deepStrictEqual(anchos(acomodarCalendario([
                seccion('para_asignar', 'mitad'), seccion('para_recibir', 'mitad'), seccion('mi_avance', 'completo'), seccion('calendario', 'tercio')
            ])), [['para_asignar', 'tercio'], ['para_recibir', 'tercio'], ['calendario', 'tercio'], ['mi_avance', 'completo']]);
            assert.deepStrictEqual(anchos(acomodarCalendario([
                seccion('mi_avance', 'completo'), seccion('para_recibir', 'mitad'), seccion('calendario', 'tercio')
            ])), [['mi_avance', 'completo'], ['para_recibir', 'mitad'], ['calendario', 'mitad']]);
            // con la tabla de recepcionistas, el calendario va a su derecha, en un cuarto
            assert.deepStrictEqual(anchos(acomodarCalendario([
                seccion('para_asignar', 'mitad'), seccion('avance', 'completo'), seccion('recepcionistas', 'completo'), seccion('desglose', 'completo'), seccion('calendario', 'tercio')
            ])), [['para_asignar', 'mitad'], ['avance', 'completo'], ['recepcionistas', 'tresCuartos'], ['calendario', 'cuarto'], ['desglose', 'completo']]);
            var sinRecepcion = [seccion('avance', 'completo'), seccion('calendario', 'tercio')];
            assert.deepStrictEqual(acomodarCalendario(sinRecepcion), sinRecepcion);
        });
        it('los accesos del detalle de un indicador sólo quedan si el usuario tiene la grilla', async () => {
            var be = crearAppParaTests(GABINETE);
            var consulta = consultaDelRol(be, 'recepcionista', clienteSimulado(() => []));
            var { secciones } = await armarSecciones([
                seccionDePrueba('indicadores', 1, async () => ({
                    tipo: 'indicadores',
                    indicadores: [{
                        id: 'encu', titulo: 'encu', valor: 2, desagregado: {
                            boton: 'ver estados', filas: [
                                { etiqueta: 'con', valor: 1, acceso: { titulo: 'ver', ruta: ['recepcion', 'encuestador'] } },
                                { etiqueta: 'sin', valor: 1, acceso: { titulo: 'ver', ruta: ['procesar', 'tareas_tem_procesamiento'] } },
                            ]
                        }
                    }]
                })),
            ], consulta);
            var [indicadores] = secciones.map(seccion => seccion.contenido);
            assert.ok(indicadores.tipo == 'indicadores');
            assert.deepStrictEqual(indicadores.indicadores[0].desagregado?.filas.map(f => f.acceso?.ruta), [['recepcion', 'encuestador'], undefined]);
        });
        it('si una sección falla se informa y se muestran las demás (sólo son consultas: sin savepoints)', async () => {
            var be = crearAppParaTests(GABINETE);
            var client = clienteSimulado(() => []);
            var { secciones, errores } = await armarSecciones([
                seccionDePrueba('rota', 1, async () => { throw new Error('columna inexistente'); }),
                seccionDePrueba('sana', 2, async () => ({ tipo: 'mensaje', texto: 'ok' })),
            ], consultaDelRol(be, 'admin', client));
            assert.deepStrictEqual(errores, [{ seccion: 'rota', mensaje: 'columna inexistente' }]);
            assert.deepStrictEqual(secciones.map(seccion => seccion.id), ['sana']);
            assert.deepStrictEqual(client.consultas, []);
        });
        it('con aislar, cada sección se ejecuta aislada (savepoint) para que una que falla no aborte la transacción de las demás', async () => {
            var be = crearAppParaTests(GABINETE);
            var consulta = consultaDelRol(be, 'admin', clienteSimulado(() => []));
            var eventos: string[] = [];
            consulta.aislar = async (obtener: () => Promise<ContenidoTablero | null>): Promise<ContenidoTablero | null> => {
                eventos.push('savepoint');
                try {
                    var contenido = await obtener();
                    eventos.push('release');
                    return contenido;
                } catch (err) {
                    eventos.push('rollback');
                    throw err;
                }
            };
            var { secciones, errores } = await armarSecciones([
                seccionDePrueba('rota', 1, async () => { throw new Error('columna inexistente'); }),
                seccionDePrueba('sana', 2, async () => ({ tipo: 'mensaje', texto: 'ok' })),
            ], consulta);
            assert.deepStrictEqual(eventos, ['savepoint', 'rollback', 'savepoint', 'release']);
            assert.deepStrictEqual(errores, [{ seccion: 'rota', mensaje: 'columna inexistente' }]);
            assert.deepStrictEqual(secciones.map(seccion => seccion.id), ['sana']);
        });
    });

    describe('secciones de dmencu', () => {
        async function obtener(seccion: DefinicionSeccionTablero, responder: (sql: string, params: ValorSql[]) => FilaSql[], rol: string = 'coor_campo'): Promise<{ contenido: ContenidoTablero | null, consultas: ConsultaHecha[] }> {
            var be = crearAppParaTests(GABINETE);
            var client = clienteSimulado(responder);
            var contenido = await seccion.obtener(consultaDelRol(be, rol, client, 'REC7'));
            return { contenido, consultas: client.consultas };
        }
        const control = { total: '200', salieron: '120', no_salieron: '80', rea: '80', en_curso: '25', grupo_0: '10', grupo_1: '5' };

        it('avance: usa el sql de control_resumen; las cifras toman el tono de su tramo y la tasa se calcula como control de campo (los count llegan como texto)', async () => {
            var { contenido, consultas } = await obtener(seccionAvance, () => [control]);
            assert.ok(consultas[0].sql.includes(`'control_resumen' as tabla_simulada`));
            assert.ok(contenido?.tipo == 'avance');
            var indicadores = contenido.indicadores ?? [];
            var partes = contenido.partes;
            assert.deepStrictEqual(indicadores.map(i => [i.id, i.valor, i.total, i.tono]), [
                ['muestra', 200, undefined, 'info'], ['salieron', 120, 200, 'info'], ['efectiva', 80, 120, 'bueno'], ['en_curso', 25, 120, 'atencion'],
                ['no_respuesta', 15, 120, 'alerta'], ['sin_salir', 80, 200, 'neutro'], ['tasa_respuesta', 88.9, undefined, 'bueno'],
            ]);
            // cada cifra de tramo tiene el tono de su parte de la barra
            assert.deepStrictEqual(partes.map(parte => [parte.id, parte.tono]), indicadores.filter(i => partes.some(p => p.id == i.id)).map(i => [i.id, i.tono]));
            // 80 efectivas sobre 80 + 10 ausentes (los no encuestables no cuentan)
            assert.strictEqual(indicadores.find(i => i.id == 'tasa_respuesta')?.formato, 'porcentaje');
        });
        it('avance: la tasa queda vacía si todavía no hay resultados', async () => {
            var { contenido } = await obtener(seccionAvance, () => [{ total: '10', no_salieron: '10' }]);
            assert.ok(contenido?.tipo == 'avance');
            assert.strictEqual(contenido.indicadores?.find(indicador => indicador.id == 'tasa_respuesta')?.valor, null);
        });
        it('avance: efectivas, en curso, no respuesta (lo que sobra de las que salieron) y no salieron', async () => {
            var { contenido } = await obtener(seccionAvance, () => [control]);
            assert.ok(contenido?.tipo == 'avance');
            assert.deepStrictEqual(contenido.partes.map(parte => [parte.id, parte.valor]), [['efectiva', 80], ['en_curso', 25], ['no_respuesta', 15], ['sin_salir', 80]]);
        });
        it('avance: la no respuesta nunca es negativa y sin encuestas no se muestra', async () => {
            assert.strictEqual(partesDeControl({ total: 5, salieron: 3, no_salieron: 2, rea: 3, en_curso: 1 })[2].valor, 0);
            var { contenido } = await obtener(seccionAvance, () => [{}]);
            assert.strictEqual(contenido, null);
        });
        it('no respuesta: los grupos con casos, de mayor a menor', async () => {
            var { contenido } = await obtener(seccionNoRespuesta, () => [{ grupo_0: '4', grupo_1: '9' }]);
            assert.ok(contenido?.tipo == 'barras');
            assert.deepStrictEqual(contenido.filas.map(fila => [fila.etiqueta, fila.valor]), [['no encuestables', 9], ['ausentes', 4]]);
            var vacio = await obtener(seccionNoRespuesta, () => [{ grupo_0: '0', grupo_1: '0' }]);
            assert.strictEqual(vacio.contenido, null);
        });
        it('desglose: un corte por tabla de control_campo, con sus partes, y se omiten los que no tienen filas', async () => {
            var { contenido, consultas } = await obtener(seccionDesglose, sql => sql.includes(`'control_campo_zona'`) ? [] : [{ etiqueta: '3', ...control }, { etiqueta: '4', ...control }]);
            assert.deepStrictEqual(consultas.map(c => CORTES_DESGLOSE.find(corte => c.sql.includes(`'${corte.tabla}'`))?.id), ['area', 'dominio', 'zona', 'comuna']);
            assert.ok(contenido?.tipo == 'desglose');
            assert.deepStrictEqual(contenido.cortes.map(corte => corte.id), ['area', 'dominio', 'comuna']);
            assert.strictEqual(contenido.cortes[0].filas[0].etiqueta, 'área 3');
            assert.strictEqual(contenido.cortes[2].filas[0].etiqueta, 'comuna 3');
            assert.deepStrictEqual(contenido.cortes[0].filas[0].partes.map(parte => parte.valor), [80, 25, 15, 80]);
            assert.deepStrictEqual(contenido.cortes[2].acceso, { titulo: 'control por comuna', ruta: ['control', 'comuna'] });
        });
        it('desglose: las filas sin encuestas no se muestran', async () => {
            var { contenido } = await obtener(seccionDesglose, () => [{ etiqueta: '1', ...control }, { etiqueta: '2', total: '0' }, { etiqueta: '3', ...control }]);
            assert.ok(contenido?.tipo == 'desglose');
            assert.deepStrictEqual(contenido.cortes[0].filas.map(fila => fila.etiqueta), ['área 1', 'área 3']);
        });
        it('desglose: los cortes con una sola fila no se muestran, y si no queda ninguno se omite la sección', async () => {
            var { contenido } = await obtener(seccionDesglose, sql => sql.includes(`'control_campo_area'`) ? [{ etiqueta: '1', ...control }, { etiqueta: '2', ...control }] : [{ etiqueta: '3', ...control }]);
            assert.ok(contenido?.tipo == 'desglose');
            assert.deepStrictEqual(contenido.cortes.map(corte => corte.id), ['area']);
            var sinCortes = await obtener(seccionDesglose, () => [{ etiqueta: '1', ...control }]);
            assert.strictEqual(sinCortes.contenido, null);
        });
        it('desglose: los accesos apuntan a opciones del menú de control', () => {
            var be = crearAppParaTests(GABINETE);
            var menu = be.getMenu(contextoDelRol(be, 'coor_campo')).menu;
            CORTES_DESGLOSE.forEach(corte => assert.ok(buscarEnMenu(menu, corte.ruta) != null, `falta ${corte.ruta.join('/')} en el menú`));
        });
        it('ordenarTareas: sigue los pases, las que no tienen pases después y la final al último', () => {
            var tareas = ['anac', 'encu', 'finc', 'proc', 'recu', 'supe'].map(tarea => ({ tarea, es_inicial: tarea == 'encu', es_final: tarea == 'proc' }));
            var pases = [
                { origen: 'encu', destino: 'supe' }, { origen: 'encu', destino: 'finc' },
                { origen: 'recu', destino: 'supe' }, { origen: 'recu', destino: 'finc' }, { origen: 'supe', destino: 'finc' },
            ];
            assert.deepStrictEqual(ordenarTareas(tareas, pases), ['encu', 'recu', 'supe', 'finc', 'anac', 'proc']);
        });
        it('ordenarTareas: un pase hacia atrás no altera el orden', () => {
            var tareas = ['a', 'b', 'c'].map(tarea => ({ tarea, es_inicial: tarea == 'a', es_final: false }));
            var pases = [{ origen: 'a', destino: 'b' }, { origen: 'b', destino: 'c' }, { origen: 'c', destino: 'a' }, { origen: 'b', destino: 'b' }];
            assert.deepStrictEqual(ordenarTareas(tareas, pases), ['a', 'b', 'c']);
        });
        it('circuito: todas las tareas en el orden del circuito, también las que tienen cero, con link a su grilla y el detalle por estado', async () => {
            var tareasDelOperativo: FilaSql[] = ['proc', 'recu', 'otra', 'encu'].map(tarea => ({ tarea, es_inicial: tarea == 'encu', es_final: tarea == 'proc' }));
            var { contenido, consultas } = await obtener(seccionCircuito, sql =>
                sql.includes('from tareas_proximas') ? [{ tarea: 'encu', tarea_destino: 'recu' }] :
                sql.includes('select tarea, es_inicial') ? tareasDelOperativo :
                sql.includes('left join tareas_tem') ? [
                    { tarea: 'recu', estado: '0D', desc_estado: 'A verificar', cantidad: '1' },
                    { tarea: 'encu', estado: 'A', desc_estado: 'Asignada', cantidad: '4' },
                    { tarea: 'encu', estado: null, desc_estado: null, cantidad: '2' },
                ] : [
                    { tarea: 'proc', nombre: 'procesamiento', cantidad: '10' },
                    { tarea: 'recu', nombre: 'recuperador', cantidad: '0' },
                    { tarea: 'otra', nombre: 'otra', cantidad: '0' },
                    { tarea: 'encu', nombre: 'encuestador', cantidad: '30' },
                    { tarea: null, nombre: null, cantidad: '5' },
                ]);
            assert.deepStrictEqual(consultas[0].params, ['OPE1', 'usu_coor_campo']);
            assert.ok(contenido?.tipo == 'indicadores');
            // el total del pie es la suma de todas, con las sin asignar
            assert.strictEqual(contenido.total, 45);
            // las sin asignar (tarea_actual nula) van primero y llevan a la tem con tarea_actual vacía
            assert.deepStrictEqual(contenido.indicadores.map(i => [i.id, i.valor, i.total, i.tono, i.acceso?.ruta, i.acceso?.filtro]), [
                ['sin_asignar', 5, 45, 'info', ['configurar', 'muestra', 'tem'], { tarea_actual: null }],
                ['encu', 30, 45, 'info', ['recepcion', 'encuestador'], undefined],
                ['recu', 0, 45, 'neutro', ['recepcion', 'recuperador'], undefined],
                ['otra', 0, 45, 'neutro', undefined, undefined],
                ['proc', 10, 45, 'info', ['procesar', 'tareas_tem_procesamiento'], undefined],
            ]);
            // el detalle por estado (código y descripción; sin estado si no tiene) lleva a tareas_tem con ff por tarea y estado (sin estado: sólo por tarea)
            var indicadores = contenido.indicadores;
            var detalle = (id: string) => indicadores.find(i => i.id == id)?.desagregado?.filas.map(f => [f.etiqueta, f.valor, f.acceso?.ruta, f.acceso?.filtro]);
            assert.deepStrictEqual(detalle('encu'), [
                ['A · Asignada', 4, ['configurar', 'muestra', 'tareas_tem'], { tarea: 'encu', estado: 'A' }],
                ['Sin estado', 2, ['configurar', 'muestra', 'tareas_tem'], { tarea: 'encu' }],
            ]);
            assert.deepStrictEqual(detalle('recu'), [['0D · A verificar', 1, ['configurar', 'muestra', 'tareas_tem'], { tarea: 'recu', estado: '0D' }]]);
            // sin estados no hay detalle (ni las sin asignar)
            assert.strictEqual(detalle('sin_asignar'), undefined);
            assert.strictEqual(detalle('otra'), undefined);
        });
        // estados: 0D disponible (se asigna, no se ve en recepción), A asignada (se ve en las dos) y C cargada (sólo recepción)
        const encuestasDeRecepcion = (sql: string): FilaSql[] =>
            sql.includes('select tarea, es_inicial') ? [{ tarea: 'recu', es_inicial: false, es_final: false }, { tarea: 'encu', es_inicial: true, es_final: false }] :
            !sql.includes('tt.recepcionista') ? [] : [
                { tarea: 'recu', nombre: 'recuperador', estado: 'Disponible', permite_asignar: true, visible_en_recepcion: false, cantidad: '3' },
                { tarea: 'encu', nombre: 'encuestador', estado: 'Disponible', permite_asignar: true, visible_en_recepcion: false, cantidad: '9' },
                { tarea: 'encu', nombre: 'encuestador', estado: 'Asignada', permite_asignar: true, visible_en_recepcion: true, cantidad: '7' },
                { tarea: 'encu', nombre: 'encuestador', estado: 'Cargada', permite_asignar: false, visible_en_recepcion: true, cantidad: '5' },
                { tarea: 'recu', nombre: 'recuperador', estado: 'Cargada', permite_asignar: false, visible_en_recepcion: true, cantidad: '1' },
            ];
        it('para asignar: mis encuestas que se asignan y no se ven en recepción, con link a la asignación', async () => {
            var { contenido, consultas } = await obtener(seccionParaAsignar, encuestasDeRecepcion, 'recepcionista');
            assert.deepStrictEqual(consultas[0].params, ['OPE1', 'usu_recepcionista', 'REC7']);
            assert.ok(consultas[0].sql.includes('tt.recepcionista = $3'));
            // las disponibles todavía no tienen tarea_actual: están en la tarea inicial, como en los triggers
            assert.ok(consultas[0].sql.includes('tt.tarea = t.tarea_vigente'));
            assert.ok(consultas[0].sql.includes('ti.es_inicial'));
            assert.ok(contenido?.tipo == 'indicadores');
            assert.deepStrictEqual(contenido.indicadores.map(i => [i.id, i.valor, i.detalle, i.acceso?.ruta]), [
                ['encu', 9, 'Disponible: 9', ['asignacion', 'encuestador']],
                ['recu', 3, 'Disponible: 3', ['asignacion', 'recuperador']],
            ]);
        });
        it('en recepción: mis encuestas que se ven en recepción, por tarea y estado, con link a la recepción', async () => {
            var { contenido } = await obtener(seccionParaRecibir, encuestasDeRecepcion, 'recepcionista');
            assert.ok(contenido?.tipo == 'indicadores');
            assert.deepStrictEqual(contenido.indicadores.map(i => [i.id, i.valor, i.detalle, i.acceso?.ruta]), [
                ['encu', 12, 'Asignada: 7 · Cargada: 5', ['recepcion', 'encuestador']],
                ['recu', 1, 'Cargada: 1', ['recepcion', 'recuperador']],
            ]);
        });
        it('recepcionistas: cada uno con lo que falta asignar y lo que está en recepción, las sin recepcionista al final y el total', async () => {
            var { contenido, consultas } = await obtener(seccionRecepcionistas, sql => sql.includes(`'control_resumen_recepcionistas' as tabla_simulada`) ? [
                { idper: '101', persona: 'Ana Alva', total: '10', salieron: '8', no_salieron: '2', rea: '5', en_curso: '2', encuestables: '1' },
                { idper: '102', persona: 'Rita Rece', total: '40', salieron: '20', no_salieron: '20', rea: '10', en_curso: '5', encuestables: '10' },
                { idper: null, persona: null, total: '4', salieron: '0', no_salieron: '4', rea: '0', en_curso: '0', encuestables: '0' },
            ] : !sql.includes('tt.recepcionista') ? [] : [
                { tarea: 'encu', nombre: 'encuestador', estado: 'Disponible', permite_asignar: true, visible_en_recepcion: false, recepcionista: null, persona_recepcionista: null, cantidad: '4' },
                { tarea: 'encu', nombre: 'encuestador', estado: 'Disponible', permite_asignar: true, visible_en_recepcion: false, recepcionista: '102', persona_recepcionista: 'Rita Rece', cantidad: '10' },
                { tarea: 'encu', nombre: 'encuestador', estado: 'Asignada', permite_asignar: true, visible_en_recepcion: true, recepcionista: '102', persona_recepcionista: 'Rita Rece', cantidad: '20' },
                { tarea: 'encu', nombre: 'encuestador', estado: 'Cargada', permite_asignar: false, visible_en_recepcion: true, recepcionista: '101', persona_recepcionista: 'Ana Alva', cantidad: '6' },
            ]);
            // sin filtrar por la persona del usuario
            assert.deepStrictEqual(consultas[0].params, ['OPE1', 'usu_coor_campo', null]);
            assert.ok(contenido?.tipo == 'tabla');
            assert.deepStrictEqual(contenido.columnas.map(columna => columna.campo), [
                'recepcionista', 'para_asignar', 'en_recepcion', 'total', 'porcentaje_asignado', 'salieron', 'efectivas', 'porcentaje_efectividad', 'en_curso', 'no_respuesta', 'no_salieron'
            ]);
            assert.strictEqual(contenido.columnas.find(columna => columna.campo == 'porcentaje_asignado')?.formato, 'porcentaje');
            assert.strictEqual(contenido.ultimaFilaTotal, true);
            assert.deepStrictEqual(contenido.filas.map(fila => [fila.recepcionista, fila.para_asignar, fila.en_recepcion]), [
                ['(101) Ana Alva', 0, 6], ['(102) Rita Rece', 10, 20], ['sin recepcionista', 4, 0], ['Total', 14, 26],
            ]);
            // total, % asignado (lo que no está para asignar), salieron, efectivas, en curso, no respuesta (lo que sobra de las que salieron) y no salieron
            assert.deepStrictEqual(contenido.filas.map(fila => [fila.total, fila.porcentaje_asignado, fila.salieron, fila.efectivas, fila.porcentaje_efectividad, fila.en_curso, fila.no_respuesta, fila.no_salieron]), [
                [10, 100, 8, 5, 83.3, 2, 1, 2], [40, 75, 20, 10, 50, 5, 5, 20], [4, 0, 0, 0, null, 0, 0, 4], [54, 74.1, 28, 15, 57.7, 7, 6, 26],
            ]);
        });
        it('para asignar y en recepción: sin encuestas no se muestran', async () => {
            assert.strictEqual((await obtener(seccionParaAsignar, () => [], 'recepcionista')).contenido, null);
            assert.strictEqual((await obtener(seccionParaRecibir, () => [], 'recepcionista')).contenido, null);
        });
        it('recepción: sin persona asociada al usuario no se muestra nada y no consulta', async () => {
            var be = crearAppParaTests(GABINETE);
            var context = contextoDelRol(be, 'recepcionista');
            var client = clienteSimulado(() => []);
            var consulta: ConsultaTablero = { ...consultaDelRol(be, 'recepcionista', client), quien: { ...quienConsultaTablero(context), idper: null } };
            assert.strictEqual(await seccionParaAsignar.obtener(consulta), null);
            assert.strictEqual(await seccionParaRecibir.obtener(consulta), null);
            assert.strictEqual(await seccionMiAvance.obtener(consulta), null);
            assert.strictEqual(await seccionMiDetalle.obtener(consulta), null);
            assert.deepStrictEqual(client.consultas, []);
        });
        it('mi avance: el avance de control sobre las encuestas del usuario (control_resumen_recepcion)', async () => {
            var { contenido, consultas } = await obtener(seccionMiAvance, () => [control], 'recepcionista');
            assert.ok(consultas[0].sql.includes(`'control_resumen_recepcion' as tabla_simulada`));
            assert.ok(contenido?.tipo == 'avance');
            assert.deepStrictEqual(contenido.partes.map(parte => parte.valor), [80, 25, 15, 80]);
        });
        it('operativos: estructura, consistencias y problemas del editor de cada operativo', async () => {
            var { contenido, consultas } = await obtener(seccionOperativos, sql => sql.includes('from operativos o') ? [
                { operativo: 'op1', nombre: 'Uno', cerrado: true, formularios: '2', preguntas: '30', variables: '25', consistencias: '10', consistencias_inactivas: '3' },
                { operativo: 'op2', nombre: 'Dos', cerrado: false, formularios: '1', preguntas: '5', variables: '4', consistencias: '0', consistencias_inactivas: '0' },
            ] : [], 'dis_conceptual');
            assert.ok(contenido?.tipo == 'tabla');
            assert.deepStrictEqual(contenido.filas.map(fila => [fila.operativo, fila.diseno, fila.formularios, fila.preguntas, fila.variables, fila.consistencias, fila.consistencias_inactivas, fila.errores]), [
                ['op1', 'cerrado', 2, 30, 25, 10, 3, 0],
                ['op2', 'abierto', 1, 5, 4, 0, 0, 0],
            ]);
            // por cada operativo se leen los casilleros, los tipos y las inclusiones como lo hace el editor
            assert.ok(consultas.some(c => c.sql.includes('from casilleros c') && c.params[0] == 'op2'));
            assert.ok(consultas.some(c => c.sql.includes('from tipoc_tipoc')));
        });
        it('operativos: sin operativos no se muestra', async () => {
            assert.strictEqual((await obtener(seccionOperativos, () => [])).contenido, null);
        });
        it('mi detalle: una fila con lo del usuario como recepcionista, sin su nombre ni idper', async () => {
            var { contenido } = await obtener(seccionMiDetalle, sql => sql.includes(`'control_resumen_recepcionistas' as tabla_simulada`) ? [
                { idper: 'REC7', persona: 'Rita Rece', total: '40', salieron: '20', no_salieron: '20', rea: '10', en_curso: '5', encuestables: '10' },
                { idper: '101', persona: 'Ana Alva', total: '10', salieron: '8', no_salieron: '2', rea: '5', en_curso: '2', encuestables: '1' },
            ] : !sql.includes('tt.recepcionista') ? [] : [
                { tarea: 'encu', nombre: 'encuestador', estado: 'Disponible', permite_asignar: true, visible_en_recepcion: false, cantidad: '10' },
                { tarea: 'encu', nombre: 'encuestador', estado: 'Asignada', permite_asignar: true, visible_en_recepcion: true, cantidad: '20' },
            ], 'recepcionista');
            assert.ok(contenido?.tipo == 'tabla');
            var campos = contenido.columnas.map(columna => columna.campo);
            assert.deepStrictEqual(campos, [
                'para_asignar', 'en_recepcion', 'total', 'porcentaje_asignado', 'salieron', 'efectivas', 'porcentaje_efectividad', 'en_curso', 'no_respuesta', 'no_salieron'
            ]);
            assert.deepStrictEqual(contenido.filas.map(fila => campos.map(campo => fila[campo])), [[10, 20, 40, 75, 20, 10, 50, 5, 5, 20]]);
            assert.notStrictEqual(contenido.ultimaFilaTotal, true);
        });
        it('calendario: semana actual, aviso fuera de las semanas y nada si no hay semanas', async () => {
            var enSemana = await obtener(seccionCalendario, () => [{ semanas: '12', semana: 3, desde: '06/10', hasta: '19/10', dias_restantes: 2 }]);
            assert.ok(enSemana.contenido?.tipo == 'indicadores');
            assert.deepStrictEqual(enSemana.contenido.indicadores[0], { id: 'semana', titulo: 'Semana de carga', valor: 3, total: 12, detalle: 'del 06/10 al 19/10', tono: 'info' });
            var fuera = await obtener(seccionCalendario, () => [{ semanas: '12', semana: null }]);
            assert.strictEqual(fuera.contenido?.tipo, 'mensaje');
            var sinSemanas = await obtener(seccionCalendario, () => [{ semanas: '0', semana: null }]);
            assert.strictEqual(sinSemanas.contenido, null);
        });
        it('todas las secciones de dmencu tienen id único y corren con la base vacía', async () => {
            var ids = SECCIONES_TABLERO.map(seccion => seccion.id);
            assert.strictEqual(new Set(ids).size, ids.length);
            for (var seccion of SECCIONES_TABLERO.filter(s => !['accesos', 'titulo_mis_encuestas', 'titulo_seguimiento'].includes(s.id))) {
                var { consultas } = await obtener(seccion, () => []);
                assert.ok(consultas.length > 0 || ['para_asignar', 'para_recibir'].includes(seccion.id), `la sección ${seccion.id} no consultó la base`);
            }
        });
    });
});
