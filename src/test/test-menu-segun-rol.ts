import { describe, it } from 'mocha';

import assert = require('node:assert');

import { getModoByPolicy, permisosSegunUsuario } from '../server/app-dmencu';
import type { MenuInfoBase } from '../server/types-dmencu';
import { contextoDelRol, crearAppParaTests, permisosDeInstalacion } from './app-para-tests';

const GABINETE = '';
const RELEVAMIENTO = 'web';

function nombres(menu: MenuInfoBase[]): string[] {
    return menu.map(item => item.name);
}

function submenu(menu: MenuInfoBase[], nombre: string): MenuInfoBase[] {
    var item = menu.find(item => item.name == nombre);
    assert.ok(item, `falta el menú ${nombre}`);
    return item.menuContent;
}

function menuDelRol(policy: string, rol: string, idper?: string): MenuInfoBase[] {
    var be = crearAppParaTests(policy);
    return be.getMenu(contextoDelRol(be, rol, idper)).menu;
}

describe('dmencu - menú según rol y policy', () => {

    describe('getModoByPolicy', () => {
        it('policy web es RELEVAMIENTO (dispositivos)', () => {
            assert.strictEqual(getModoByPolicy(crearAppParaTests(RELEVAMIENTO)), 'RELEVAMIENTO');
        });
        it('cualquier otra policy es GABINETE', () => {
            assert.strictEqual(getModoByPolicy(crearAppParaTests('')), 'GABINETE');
            assert.strictEqual(getModoByPolicy(crearAppParaTests('otra')), 'GABINETE');
        });
    });

    describe('permisosSegunUsuario (lo que getContext agrega al contexto)', () => {
        const permisos = permisosDeInstalacion();
        const caches = { ...permisos, permisosRolSoloTrue: permisos.permisosRol };
        it('sin usuario logueado no puede nada', () => {
            assert.deepStrictEqual(permisosSegunUsuario(caches, undefined), { puede: permisos.permisosParaNadie });
        });
        it('un rol superuser (admin) es superuser y puede todo', () => {
            assert.deepStrictEqual(permisosSegunUsuario(caches, { rol: 'admin' }), { superuser: true, puede: permisos.permisosSuperuser });
        });
        it('un rol común tiene los permisos de su rol y no es superuser', () => {
            var resultado = permisosSegunUsuario(caches, { rol: 'encuestador' });
            assert.strictEqual(resultado.superuser, undefined);
            assert.strictEqual(resultado.puede?.encuestas?.relevar, true);
            assert.strictEqual(resultado.puede?.campo?.editar, false);
        });
        it('un rol que no existe no tiene permisos', () => {
            assert.deepStrictEqual(permisosSegunUsuario(caches, { rol: 'inexistente' }), { puede: undefined });
        });
        it('los permisos para nadie tienen todas las acciones en false', () => {
            assert.strictEqual(permisos.permisosParaNadie.encuestas?.relevar, false);
            assert.strictEqual(permisos.permisosParaNadie.campo?.administrar, false);
            assert.strictEqual(permisos.permisosParaNadie.casilleros_texto?.editar, false);
        });
    });

    describe('en RELEVAMIENTO (policy web)', () => {
        it('quien releva (encuestador) ve hoja de ruta, sincronizar y cambiar modo', () => {
            assert.deepStrictEqual(menuDelRol(RELEVAMIENTO, 'encuestador'), [
                { menuType: 'path', name: 'relevamiento', path: '/campo' },
                { menuType: 'sincronizar_dm', name: 'sincronizar' },
                { menuType: 'cambiar_modo_dm', name: 'cambiar_modo' },
            ]);
        });
        it('recuperador y supervisor también relevan', () => {
            assert.deepStrictEqual(nombres(menuDelRol(RELEVAMIENTO, 'recuperador')), ['relevamiento', 'sincronizar', 'cambiar_modo']);
            assert.deepStrictEqual(nombres(menuDelRol(RELEVAMIENTO, 'supervisor')), ['relevamiento', 'sincronizar', 'cambiar_modo']);
        });
        it('quien no releva no ve nada aunque tenga permisos de gabinete', () => {
            assert.deepStrictEqual(menuDelRol(RELEVAMIENTO, 'recepcionista'), []);
            assert.deepStrictEqual(menuDelRol(RELEVAMIENTO, 'coor_campo'), []);
            assert.deepStrictEqual(menuDelRol(RELEVAMIENTO, 'dis_conceptual'), []);
        });
    });

    describe('en GABINETE', () => {
        it('el encuestador no ve nada (releva sólo en el dispositivo)', () => {
            assert.deepStrictEqual(menuDelRol(GABINETE, 'encuestador'), []);
        });
        it('un rol sin permisos (auxiliar) no ve nada', () => {
            assert.deepStrictEqual(menuDelRol(GABINETE, 'auxiliar'), []);
        });
        it('admin (superuser) ve todos los menús', () => {
            var menu = menuDelRol(GABINETE, 'admin');
            assert.deepStrictEqual(nombres(menu), [
                'tablero', 'asignacion', 'recepcion', 'tareas_tem_fin_campo', 'tareas_tem_analisis_campo', 'supervision',
                'varios', 'control', 'procesar', 'configurar', 'carto'
            ]);
            assert.deepStrictEqual(nombres(submenu(menu, 'configurar')), [
                'muestra', 'metadatos', 'estados_acciones_tareas', 'momentos_consistencia', 'parametros', 'modos_dm', 'usuarios'
            ]);
        });
        it('el coordinador de campo administra campo y procesa, pero no edita metadatos ni ve lo de superuser', () => {
            var menu = menuDelRol(GABINETE, 'coor_campo');
            assert.deepStrictEqual(nombres(menu), [
                'tablero', 'asignacion', 'recepcion', 'tareas_tem_fin_campo', 'tareas_tem_analisis_campo', 'supervision',
                'varios', 'control', 'procesar', 'configurar', 'carto'
            ]);
            assert.deepStrictEqual(nombres(submenu(menu, 'configurar')), ['muestra', 'usuarios']);
            assert.deepStrictEqual(nombres(submenu(menu, 'asignacion')), ['general', 'encuestador', 'ingresador', 'recuperador', 'supervisor', 'asignar_por_area', 'asignar_por_tarea']);
            assert.deepStrictEqual(nombres(submenu(menu, 'recepcion')), ['encuestador', 'recuperador', 'ingresador', 'supervisor', 'mis_supervisores', 'recibir_por_persona']);
            assert.ok(nombres(submenu(menu, 'varios')).includes('operativo_migrar'));
            assert.ok(nombres(submenu(menu, 'varios')).includes('intercambiar_encuestas'));
        });
        it('el subcoordinador administra campo pero no procesa', () => {
            var menu = menuDelRol(GABINETE, 'subcoor_campo');
            assert.deepStrictEqual(nombres(menu), [
                'tablero', 'asignacion', 'recepcion', 'tareas_tem_fin_campo', 'tareas_tem_analisis_campo', 'supervision',
                'varios', 'control', 'configurar', 'carto'
            ]);
            assert.ok(!nombres(submenu(menu, 'varios')).includes('intercambiar_encuestas'));
        });
        it('procesamiento procesa pero no edita campo', () => {
            var menu = menuDelRol(GABINETE, 'procesamiento');
            assert.deepStrictEqual(nombres(menu), ['tablero', 'varios', 'control', 'procesar', 'configurar']);
            assert.deepStrictEqual(nombres(submenu(menu, 'varios')), ['abrir_encuesta', 'intercambiar_encuestas', 'desverificables']);
        });
        it('el ingresador edita campo sin administrar: asignación y recepción reducidas, sin control ni configuración', () => {
            var menu = menuDelRol(GABINETE, 'ingresador');
            assert.deepStrictEqual(nombres(menu), ['tablero', 'asignacion', 'recepcion', 'supervision', 'varios']);
            assert.deepStrictEqual(nombres(submenu(menu, 'asignacion')), ['encuestador', 'ingresador', 'recuperador', 'asignar_por_tarea']);
            assert.deepStrictEqual(nombres(submenu(menu, 'recepcion')), ['encuestador', 'recuperador', 'ingresador', 'recibir_por_persona']);
            assert.deepStrictEqual(nombres(submenu(menu, 'varios')), ['abrir_encuesta', 'hoja_ruta']);
        });
        it('diseño conceptual sólo edita metadatos (incluidas las tablas de rea/no rea)', () => {
            var menu = menuDelRol(GABINETE, 'dis_conceptual');
            assert.deepStrictEqual(nombres(menu), ['tablero', 'configurar']);
            var metadatos = submenu(submenu(menu, 'configurar'), 'metadatos');
            assert.deepStrictEqual(nombres(submenu(metadatos, 'rea/norea')), ['rea', 'no_rea', 'rea_sup', 'no_rea_sup']);
        });
        it('al recepcionista la asignación le filtra sus propias áreas', () => {
            var asignacion = submenu(menuDelRol(GABINETE, 'recepcionista', 'REC7'), 'asignacion');
            assert.deepStrictEqual(asignacion.filter(item => item.menuType == 'table').map(item => item.ff), [
                { tarea: 'encu', recepcionista: 'REC7' },
                { tarea: 'ingr', recepcionista: 'REC7' },
                { tarea_actual: 'recu', tarea: 'recu', recepcionista: 'REC7' },
            ]);
        });
        it('a los demás roles la asignación no les filtra por recepcionista', () => {
            var asignacion = submenu(menuDelRol(GABINETE, 'ingresador'), 'asignacion');
            assert.deepStrictEqual(asignacion.filter(item => item.menuType == 'table').map(item => item.ff), [
                { tarea: 'encu' },
                { tarea: 'ingr' },
                { tarea_actual: 'recu', tarea: 'recu' },
            ]);
        });
        it('la supervisión muestra las encuestas asignadas al usuario', () => {
            var supervision = submenu(menuDelRol(GABINETE, 'ingresador', 'ING3'), 'supervision');
            assert.deepStrictEqual(supervision, [
                { menuType: 'table', name: 'supervisar', table: 'tareas_tem_ingreso', ff: { tarea: 'supe', asignado: 'ING3' } }
            ]);
        });
    });

    describe('getMenu sin context', () => {
        it('lanza un error claro', () => {
            var be = crearAppParaTests(GABINETE);
            assert.throws(() => be.getMenu(), /requiere el context/);
        });
    });
});
