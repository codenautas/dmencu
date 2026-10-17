import { describe, it } from 'mocha';

import assert = require('node:assert');

import { quienConsultaTablero } from '../server/app-dmencu';
import {
    accesosDelMenu, armarSecciones, buscarEnMenu, buscarPerfil, ClienteTablero, combinarSecciones, ConsultaTablero,
    DefinicionSeccionTablero, FilaSql, PERFIL_GENERAL, PERFILES_TABLERO, perfilSegunRol, SECCIONES_TABLERO,
    seccionAvance, seccionCalendario, seccionesVisibles, seccionMiTrabajo, seccionResumen, ValorSql
} from '../server/tablero';
import type { ContenidoTablero } from '../unlogged/tipos-tablero';
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
                execute: async () => ({}),
            };
        }
    };
}

function consultaDelRol(be: AppParaTests, rol: string, client: ClienteTablero, idper: string = 'PER1'): ConsultaTablero {
    var context = contextoDelRol(be, rol, idper);
    return {
        client,
        quien: quienConsultaTablero(context, be.getPerfilTablero(context)),
        operativo: 'OPE1',
        menu: be.getMenu(context).menu,
    };
}

function idsVisibles(rol: string): string[] {
    var be = crearAppParaTests(GABINETE);
    var consulta = consultaDelRol(be, rol, clienteSimulado(() => []));
    return seccionesVisibles(be.getSeccionesTablero(), consulta.quien).map(seccion => seccion.id);
}

function seccionDePrueba(id: string, orden: number, obtener: DefinicionSeccionTablero['obtener'], extra: Partial<DefinicionSeccionTablero> = {}): DefinicionSeccionTablero {
    return { id, titulo: id, orden, obtener, ...extra };
}

describe('dmencu - tablero de inicio', () => {

    describe('perfiles', () => {
        it('cada rol instalado tiene su perfil', () => {
            var be = crearAppParaTests(GABINETE);
            var perfilDe = (rol: string) => be.getPerfilTablero(contextoDelRol(be, rol));
            assert.strictEqual(perfilDe('admin'), 'administracion');
            assert.strictEqual(perfilDe('direccion'), 'direccion');
            assert.strictEqual(perfilDe('coor_campo'), 'coordinacion');
            assert.strictEqual(perfilDe('subcoor_campo'), 'coordinacion');
            assert.strictEqual(perfilDe('coor_proc'), 'coordinacion');
            assert.strictEqual(perfilDe('recepcionista'), 'recepcion');
            assert.strictEqual(perfilDe('ingresador'), 'recepcion');
            assert.strictEqual(perfilDe('procesamiento'), 'procesamiento');
            assert.strictEqual(perfilDe('dis_conceptual'), 'diseno');
            assert.strictEqual(perfilDe('auxiliar'), PERFIL_GENERAL);
        });
        it('un rol que no está en la tabla de perfiles toma el de sus permisos', () => {
            assert.strictEqual(perfilSegunRol({ rol: 'nuevo', superuser: false, puede: { campo: { administrar: true } } }), 'coordinacion');
            assert.strictEqual(perfilSegunRol({ rol: 'nuevo', superuser: false, puede: { encuestas: { procesar: true } } }), 'procesamiento');
            assert.strictEqual(perfilSegunRol({ rol: 'nuevo', superuser: false, puede: { campo: { editar: true } } }), 'recepcion');
            assert.strictEqual(perfilSegunRol({ rol: 'nuevo', superuser: true, puede: {} }), 'administracion');
            assert.strictEqual(perfilSegunRol({ rol: null, superuser: false, puede: undefined }), PERFIL_GENERAL);
        });
        it('la app puede pasar su propia tabla de perfiles por rol', () => {
            assert.strictEqual(perfilSegunRol({ rol: 'coor_campo', superuser: false, puede: {} }, { coor_campo: 'direccion' }), 'direccion');
        });
        it('buscarPerfil usa el general si el perfil no existe', () => {
            assert.strictEqual(buscarPerfil(PERFILES_TABLERO, 'coordinacion').perfil, 'coordinacion');
            assert.strictEqual(buscarPerfil(PERFILES_TABLERO, 'inexistente').perfil, PERFIL_GENERAL);
            assert.throws(() => buscarPerfil([], 'x'), /no hay perfiles/);
        });
        it('los perfiles tienen ids únicos y colores en hexadecimal', () => {
            var ids = PERFILES_TABLERO.map(perfil => perfil.perfil);
            assert.strictEqual(new Set(ids).size, ids.length);
            PERFILES_TABLERO.forEach(perfil => {
                assert.match(perfil.colores.primario, /^#[0-9A-F]{6}$/i);
                assert.match(perfil.colores.secundario, /^#[0-9A-F]{6}$/i);
            });
        });
    });

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
        it('admin (superuser) ve todas las secciones', () => {
            assert.deepStrictEqual(idsVisibles('admin').sort(), SECCIONES_TABLERO.map(seccion => seccion.id).sort());
        });
        it('coordinación ve el campo, los dispositivos y el procesamiento', () => {
            assert.deepStrictEqual(idsVisibles('coor_campo'), [
                'resumen', 'mi_trabajo', 'avance', 'circuito', 'estados', 'comunas', 'no_respuesta', 'calendario', 'dispositivos', 'procesamiento', 'accesos'
            ]);
        });
        it('el subcoordinador no ve procesamiento', () => {
            assert.ok(!idsVisibles('subcoor_campo').includes('procesamiento'));
            assert.ok(idsVisibles('subcoor_campo').includes('dispositivos'));
        });
        it('recepción ve su trabajo y el campo, pero no lo de gestión', () => {
            assert.deepStrictEqual(idsVisibles('recepcionista'), ['resumen', 'mi_trabajo', 'avance', 'circuito', 'estados', 'calendario', 'accesos']);
            assert.deepStrictEqual(idsVisibles('ingresador'), ['resumen', 'mi_trabajo', 'avance', 'circuito', 'estados', 'calendario', 'accesos']);
        });
        it('procesamiento ve el avance y su sección, sin dispositivos', () => {
            var ids = idsVisibles('procesamiento');
            assert.ok(ids.includes('procesamiento'));
            assert.ok(ids.includes('comunas'));
            assert.ok(!ids.includes('dispositivos'));
        });
        it('diseño conceptual ve el panorama y sus accesos', () => {
            assert.deepStrictEqual(idsVisibles('dis_conceptual'), ['resumen', 'avance', 'circuito', 'estados', 'calendario', 'accesos']);
        });
        it('perfiles restringe la sección aunque tenga los permisos', () => {
            var be = crearAppParaTests(GABINETE);
            var soloDireccion = seccionDePrueba('solo_direccion', 1, async () => null, { perfiles: ['direccion'] });
            var quienCoordina = consultaDelRol(be, 'coor_campo', clienteSimulado(() => [])).quien;
            var quienDirige = consultaDelRol(be, 'direccion', clienteSimulado(() => [])).quien;
            assert.deepStrictEqual(seccionesVisibles([soloDireccion], quienCoordina), []);
            assert.deepStrictEqual(seccionesVisibles([soloDireccion], quienDirige).map(s => s.id), ['solo_direccion']);
        });
        it('combinarSecciones reemplaza por id y agrega las nuevas', () => {
            var reemplazo = seccionDePrueba('resumen', 5, async () => null, { titulo: 'otro resumen' });
            var nueva = seccionDePrueba('propia', 500, async () => null);
            var combinadas = combinarSecciones(SECCIONES_TABLERO, [reemplazo, nueva]);
            assert.strictEqual(combinadas.length, SECCIONES_TABLERO.length + 1);
            assert.strictEqual(combinadas.find(seccion => seccion.id == 'resumen')?.titulo, 'otro resumen');
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
        it('si una sección falla se informa, se vuelve al savepoint y se muestran las demás', async () => {
            var be = crearAppParaTests(GABINETE);
            var client = clienteSimulado(() => []);
            var { secciones, errores } = await armarSecciones([
                seccionDePrueba('rota', 1, async () => { throw new Error('columna inexistente'); }),
                seccionDePrueba('sana', 2, async () => ({ tipo: 'mensaje', texto: 'ok' })),
            ], consultaDelRol(be, 'admin', client));
            assert.deepStrictEqual(errores, [{ seccion: 'rota', mensaje: 'columna inexistente' }]);
            assert.deepStrictEqual(secciones.map(seccion => seccion.id), ['sana']);
            assert.deepStrictEqual(client.consultas.map(consulta => consulta.sql), [
                'savepoint tablero_rota', 'rollback to savepoint tablero_rota',
                'savepoint tablero_sana', 'release savepoint tablero_sana',
            ]);
        });
    });

    describe('secciones de dmencu', () => {
        async function obtener(seccion: DefinicionSeccionTablero, filas: FilaSql[], rol: string = 'coor_campo'): Promise<{ contenido: ContenidoTablero | null, consultas: ConsultaHecha[] }> {
            var be = crearAppParaTests(GABINETE);
            var client = clienteSimulado(() => filas);
            var contenido = await seccion.obtener(consultaDelRol(be, rol, client, 'REC7'));
            return { contenido, consultas: client.consultas };
        }
        it('resumen: calcula los indicadores y la tasa de respuesta (los count llegan como texto)', async () => {
            var { contenido, consultas } = await obtener(seccionResumen, [{
                total: '200', habilitadas: '190', salieron: '120', efectivas: '80', en_curso: '25', no_respuesta_encuestable: '20'
            }]);
            assert.deepStrictEqual(consultas[0].params, ['OPE1', 'usu_coor_campo']);
            assert.ok(contenido?.tipo == 'indicadores');
            var porId = new Map(contenido.indicadores.map(indicador => [indicador.id, indicador]));
            assert.strictEqual(porId.get('muestra')?.valor, 200);
            assert.strictEqual(porId.get('muestra')?.detalle, '190 habilitadas');
            assert.strictEqual(porId.get('salieron')?.total, 200);
            assert.strictEqual(porId.get('efectivas')?.valor, 80);
            assert.strictEqual(porId.get('efectivas')?.total, 120);
            assert.strictEqual(porId.get('tasa_respuesta')?.valor, 80);
            assert.strictEqual(porId.get('tasa_respuesta')?.formato, 'porcentaje');
        });
        it('resumen: sin muestra muestra un mensaje', async () => {
            var { contenido } = await obtener(seccionResumen, [{ total: '0' }]);
            assert.deepStrictEqual(contenido, { tipo: 'mensaje', texto: 'Todavía no hay encuestas en la muestra del operativo.', tono: 'info' });
        });
        it('resumen: la tasa queda vacía si todavía no hay resultados', async () => {
            var { contenido } = await obtener(seccionResumen, [{ total: '10', salieron: '0', efectivas: '0', no_respuesta_encuestable: '0' }]);
            assert.ok(contenido?.tipo == 'indicadores');
            assert.strictEqual(contenido.indicadores.find(indicador => indicador.id == 'tasa_respuesta')?.valor, null);
        });
        it('avance: una parte por categoría, en cero las que no vienen', async () => {
            var { contenido } = await obtener(seccionAvance, [{ categoria: 'efectiva', cantidad: '7' }, { categoria: 'sin_salir', cantidad: '3' }]);
            assert.ok(contenido?.tipo == 'avance');
            assert.deepStrictEqual(contenido.partes.map(parte => [parte.id, parte.valor]), [['efectiva', 7], ['en_curso', 0], ['no_respuesta', 0], ['sin_salir', 3]]);
        });
        it('avance: sin encuestas no se muestra', async () => {
            var { contenido } = await obtener(seccionAvance, []);
            assert.strictEqual(contenido, null);
        });
        it('mi trabajo: filtra por la persona del usuario y no se muestra si no tiene nada', async () => {
            var { contenido, consultas } = await obtener(seccionMiTrabajo, [], 'recepcionista');
            assert.strictEqual(contenido, null);
            assert.deepStrictEqual(consultas[0].params, ['OPE1', 'usu_recepcionista', 'REC7']);
            var conFilas = await obtener(seccionMiTrabajo, [{ tarea: 'encuestador', estado: 'Asignada', asignadas: '0', recibe: '12' }], 'recepcionista');
            assert.ok(conFilas.contenido?.tipo == 'tabla');
            assert.deepStrictEqual(conFilas.contenido.filas, [{ tarea: 'encuestador', estado: 'Asignada', asignadas: 0, recibe: 12 }]);
        });
        it('calendario: semana actual, aviso fuera de las semanas y nada si no hay semanas', async () => {
            var enSemana = await obtener(seccionCalendario, [{ semanas: '12', semana: 3, desde: '06/10', hasta: '19/10', dias_restantes: 2 }]);
            assert.ok(enSemana.contenido?.tipo == 'indicadores');
            assert.deepStrictEqual(enSemana.contenido.indicadores[0], { id: 'semana', titulo: 'Semana de carga', valor: 3, total: 12, detalle: 'del 06/10 al 19/10', tono: 'info' });
            var fuera = await obtener(seccionCalendario, [{ semanas: '12', semana: null }]);
            assert.strictEqual(fuera.contenido?.tipo, 'mensaje');
            var sinSemanas = await obtener(seccionCalendario, [{ semanas: '0', semana: null }]);
            assert.strictEqual(sinSemanas.contenido, null);
        });
        it('todas las secciones de dmencu tienen id único y las consultas filtran por operativo', async () => {
            var ids = SECCIONES_TABLERO.map(seccion => seccion.id);
            assert.strictEqual(new Set(ids).size, ids.length);
            for (var seccion of SECCIONES_TABLERO.filter(s => !['accesos', 'dispositivos'].includes(s.id))) {
                var { consultas } = await obtener(seccion, []);
                assert.ok(consultas.length > 0, `la sección ${seccion.id} no consultó la base`);
                consultas.forEach(consulta => assert.strictEqual(consulta.params[0], 'OPE1', `la sección ${seccion.id} no filtra por operativo`));
            }
        });
    });
});
