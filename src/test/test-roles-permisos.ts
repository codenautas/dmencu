import { describe, it } from 'mocha';

import assert = require('node:assert');

import type { ClienteDb } from '../server/app-dmencu';
import type { MenuInfoBase } from '../server/types-dmencu';
import {
    armarRolesYPermisos, DESCRIPCION_PERMISOS, FilasRolesYPermisos, proceduresRolesYPermisos,
    puedeEditarRolesYPermisos, puedeVerRolesYPermisos, refrescarPermisosAlModificarTabla, validarCambioDePermiso, validarCambioDeSubordinado
} from '../server/roles-permisos';
import { contextoDelRol, crearAppParaTests, permisosDeInstalacion } from './app-para-tests';

const GABINETE = '';

function filasDeEjemplo(): FilasRolesYPermisos {
    return {
        roles: [
            { rol: 'admin', nombre: 'Administrador', superuser: true },
            { rol: 'coor_campo', nombre: 'Coordinador de Campo', superuser: false },
            { rol: 'auxiliar', nombre: null, superuser: 'f' },
        ],
        permisos: [
            { permiso: 'campo', accion: 'editar' },
            { permiso: 'campo', accion: 'ver' },
            { permiso: 'propio', accion: 'usar' },
        ],
        rolesPermisos: [
            { rol: 'coor_campo', permiso: 'campo', accion: 'editar', habilitado: true },
            { rol: 'coor_campo', permiso: 'campo', accion: 'ver', habilitado: 't' },
            { rol: 'auxiliar', permiso: 'campo', accion: 'ver', habilitado: false },
            { rol: 'inexistente', permiso: 'campo', accion: 'ver', habilitado: true },
        ],
        subordinados: [
            { rol: 'coor_campo', rol_subordinado: 'auxiliar' },
            { rol: 'coor_campo', rol_subordinado: 'coor_campo' },
        ],
        usuarios: [
            { rol: 'coor_campo', activo: true, cantidad: '3' },
            { rol: 'coor_campo', activo: false, cantidad: '2' },
            { rol: 'admin', activo: 't', cantidad: 1 },
        ],
    };
}

describe('dmencu - pantalla de roles y permisos', () => {

    describe('armarRolesYPermisos', () => {
        var armado = armarRolesYPermisos(filasDeEjemplo(), DESCRIPCION_PERMISOS);
        it('arma los roles con sus usuarios activos e inactivos (booleanos como true o "t")', () => {
            assert.deepStrictEqual(armado.roles, [
                { rol: 'admin', nombre: 'Administrador', superuser: true, usuariosActivos: 1, usuariosInactivos: 0 },
                { rol: 'coor_campo', nombre: 'Coordinador de Campo', superuser: false, usuariosActivos: 3, usuariosInactivos: 2 },
                { rol: 'auxiliar', nombre: 'auxiliar', superuser: false, usuariosActivos: 0, usuariosInactivos: 0 },
            ]);
        });
        it('arma los permisos con su descripción (null si no hay)', () => {
            assert.deepStrictEqual(armado.permisos.map(p => [p.permisoAccion, p.descripcion != null]), [
                ['campo.editar', true], ['campo.ver', true], ['propio.usar', false],
            ]);
        });
        it('sólo cuenta los habilitados y de roles que existen', () => {
            assert.deepStrictEqual(armado.habilitados, { admin: [], coor_campo: ['campo.editar', 'campo.ver'], auxiliar: [] });
        });
        it('arma los subordinados de cada rol', () => {
            assert.deepStrictEqual(armado.subordinados, { admin: [], coor_campo: ['auxiliar', 'coor_campo'], auxiliar: [] });
        });
    });

    describe('validaciones', () => {
        it('acepta un cambio de un rol y un permiso que existen', () => {
            validarCambioDePermiso(filasDeEjemplo(), { rol: 'auxiliar', permiso: 'campo', accion: 'ver', habilitado: true });
        });
        it('rechaza roles o permisos que no existen y habilitado que no es booleano', () => {
            assert.throws(() => validarCambioDePermiso(filasDeEjemplo(), { rol: 'otro', permiso: 'campo', accion: 'ver', habilitado: true }), /no existe el rol otro/);
            assert.throws(() => validarCambioDePermiso(filasDeEjemplo(), { rol: 'auxiliar', permiso: 'campo', accion: 'borrar', habilitado: true }), /no existe el permiso campo.borrar/);
            assert.throws(() => validarCambioDePermiso(filasDeEjemplo(), { rol: 'auxiliar', permiso: 'campo', accion: 'ver', habilitado: JSON.parse('"sí"') }), /true o false/);
        });
        it('valida los dos roles de un cambio de subordinado', () => {
            validarCambioDeSubordinado(filasDeEjemplo(), { rol: 'coor_campo', rol_subordinado: 'admin', incluido: false });
            assert.throws(() => validarCambioDeSubordinado(filasDeEjemplo(), { rol: 'coor_campo', rol_subordinado: 'nadie', incluido: true }), /no existe el rol nadie/);
        });
        it('todos los permisos que se instalan tienen descripción', () => {
            var permisos = permisosDeInstalacion().permisosSuperuser;
            Object.keys(permisos).forEach(permiso => Object.keys(Reflect.get(permisos, permiso)).forEach(accion =>
                assert.ok(DESCRIPCION_PERMISOS[`${permiso}.${accion}`], `falta la descripción de ${permiso}.${accion}`)
            ));
        });
    });

    describe('quién ve y quién edita', () => {
        var be = crearAppParaTests(GABINETE);
        it('la ven los que administran campo o procesan (los que ven configurar → usuarios)', () => {
            assert.ok(puedeVerRolesYPermisos(contextoDelRol(be, 'admin')));
            assert.ok(puedeVerRolesYPermisos(contextoDelRol(be, 'coor_campo')));
            assert.ok(puedeVerRolesYPermisos(contextoDelRol(be, 'procesamiento')));
            assert.ok(!puedeVerRolesYPermisos(contextoDelRol(be, 'recepcionista')));
            assert.ok(!puedeVerRolesYPermisos(contextoDelRol(be, 'encuestador')));
        });
        it('sólo el admin cambia permisos', () => {
            assert.ok(puedeEditarRolesYPermisos(contextoDelRol(be, 'admin')));
            assert.ok(!puedeEditarRolesYPermisos(contextoDelRol(be, 'coor_campo')));
        });
        it('los procedimientos que cambian están restringidos al rol admin', () => {
            var procedimientos = proceduresRolesYPermisos(be);
            assert.deepStrictEqual(procedimientos.map(p => [p.action, p.roles ?? null]), [
                ['roles_permisos_traer', null],
                ['rol_permiso_cambiar', ['admin']],
                ['rol_subordinado_cambiar', ['admin']],
                ['rol_menu_previsualizar', null],
            ]);
        });
        it('la pantalla está en configurar → usuarios de quien la puede ver', () => {
            var menu = be.getMenu(contextoDelRol(be, 'coor_campo')).menu;
            var usuarios = be.menuDelRol('coor_campo').find(o => o.name == 'configurar');
            assert.ok(menu.length > 0 && usuarios && usuarios.menuType == 'menu');
            var submenuUsuarios = usuarios.menuContent.find((o: MenuInfoBase) => o.name == 'usuarios');
            assert.ok(submenuUsuarios && submenuUsuarios.menuType == 'menu');
            assert.deepStrictEqual(submenuUsuarios.menuContent.map((o: MenuInfoBase) => o.name), ['usuarios', 'roles_y_permisos', 'roles', 'permisos', 'roles_permisos']);
        });
    });

    describe('menú de un rol y recarga de permisos', () => {
        it('menuDelRol es el menú que vería un usuario de ese rol', () => {
            var be = crearAppParaTests(GABINETE);
            // sin persona: los filtros por idper (supervisión) quedan vacíos
            assert.deepStrictEqual(be.menuDelRol('ingresador'), be.getMenu(contextoDelRol(be, 'ingresador', '')).menu);
            assert.deepStrictEqual(be.menuDelRol('encuestador'), []);
        });
        it('refrescarPermisos carga las caches desde la base', async () => {
            var be = crearAppParaTests(GABINETE);
            var consultas: string[] = [];
            var valores = [{ coor_campo: { puede: { campo: { ver: true } } } }, { solo: 'true' }, { campo: { ver: true } }, { campo: { ver: false } }];
            var client: ClienteDb = {
                query(sql: string) {
                    consultas.push(sql);
                    var valor = valores[consultas.length - 1];
                    return {
                        fetchAll: async () => ({ rowCount: 1, fields: [], rows: [{ jsonb_object_agg: valor }] }),
                        fetchUniqueRow: async () => ({ rowCount: 1, fields: [], row: { jsonb_object_agg: valor } }),
                    };
                }
            };
            await be.refrescarPermisos(client);
            assert.strictEqual(consultas.length, 4);
            assert.match(consultas[1], /"habilitado"/);
            assert.deepStrictEqual(be.caches.permisosRol, valores[0]);
            assert.deepStrictEqual(be.caches.permisosRolSoloTrue, valores[1]);
            assert.deepStrictEqual(be.caches.permisosSuperuser, valores[2]);
            assert.deepStrictEqual(be.caches.permisosParaNadie, valores[3]);
        });
        it('guardar en las grillas de roles, permisos o roles_permisos recarga los permisos', async () => {
            var recargas = 0;
            var client: ClienteDb = { query() { throw new Error('no debería consultar'); } };
            var guardar = refrescarPermisosAlModificarTabla({ refrescarPermisos: async () => { recargas++; } },
                async (_context: { client: ClienteDb }, parametros: { table: string }) => 'guardado ' + parametros.table);
            assert.strictEqual(await guardar({ client }, { table: 'roles_permisos' }), 'guardado roles_permisos');
            assert.strictEqual(recargas, 1);
            await guardar({ client }, { table: 'tem' });
            assert.strictEqual(recargas, 1);
            await guardar({ client }, { table: 'roles' });
            assert.strictEqual(recargas, 2);
        });
        it('después de recargar, el menú del rol refleja los permisos nuevos', () => {
            var be = crearAppParaTests(GABINETE);
            assert.deepStrictEqual(be.menuDelRol('auxiliar'), []);
            be.caches.permisosRol = { ...be.caches.permisosRol, auxiliar: { puede: { campo: { editar: true } } } };
            assert.ok(be.menuDelRol('auxiliar').some(opcion => opcion.name == 'asignacion'));
        });
    });
});
