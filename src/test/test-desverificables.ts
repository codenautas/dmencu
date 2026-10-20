import { describe, it } from 'mocha';

import assert = require('node:assert');

import { desverificables, ROLES_DESVERIFICAN, sqlDesverificables } from '../server/table-desverificables';
import { historial_tem } from '../server/table-historial_tem';
import { ProceduresDmEncu } from '../server/procedures-dmencu';
import type { MenuInfoBase } from '../server/types-dmencu';
import { contextoDelRol, crearAppParaTests } from './app-para-tests';

function varios(rol: string): string[] {
    var be = crearAppParaTests('');
    var menu: MenuInfoBase[] = be.getMenu(contextoDelRol(be, rol)).menu;
    var item = menu.find(item => item.name == 'varios');
    return item ? item.menuContent.map((opcion: MenuInfoBase) => opcion.name) : [];
}

describe('dmencu - desverificación excepcional', () => {

    describe('estado destino (sale de estados_acciones)', () => {
        it('toma la transición de encuesta_no_verificar y, si hay varias, la inmediatamente anterior al estado verificado', () => {
            assert.ok(/nombre_procedure = 'encuesta_no_verificar'/.test(sqlDesverificables));
            assert.ok(/ed.orden_estado < eo.orden_estado as anterior/.test(sqlDesverificables));
            assert.ok(/cantidad = 1 or anterior/.test(sqlDesverificables));
            assert.ok(/order by operativo, estado, orden_estado desc/.test(sqlDesverificables));
        });
    });

    describe('grilla desverificables', () => {
        var def = desverificables(contextoDelRol(crearAppParaTests(''), 'admin'));
        it('es de sólo lectura y tiene el botón para desverificar', () => {
            assert.strictEqual(def.editable, false);
            assert.strictEqual(def.allow?.insert, false);
            assert.strictEqual(def.allow?.delete, false);
            assert.strictEqual(def.fields.find(campo => campo.name == 'desverificar')?.clientSide, 'desverificar');
        });
        it('se arma sólo con la consulta que usa el procedimiento', () => {
            assert.strictEqual(def.sql?.from, `(${sqlDesverificables})`);
            assert.strictEqual(def.sql?.where, undefined);
            assert.strictEqual(def.sql?.fields, undefined);
        });
        it('sólo trae encuestas cuya tarea actual no está verificada', () => {
            assert.ok(/ta.verificado is null/.test(sqlDesverificables));
            assert.ok(/tt.verificado is not null/.test(sqlDesverificables));
        });
        it('muestra la descripción de los estados de origen y destino con softForeignKeys a estados', () => {
            var estadosRelacionados = (def.softForeignKeys ?? []).filter(fk => fk.references == 'estados');
            assert.deepStrictEqual(estadosRelacionados.map(fk => fk.alias), ['origen', 'destino']);
            estadosRelacionados.forEach(fk => assert.deepStrictEqual(fk.displayFields, ['desc_estado']));
            assert.ok(def.fields.some(campo => campo.name == 'estado_destino'));
            assert.ok(!def.fields.some(campo => campo.name == 'asignado_actual'));
        });
    });

    describe('menú', () => {
        it('lo ven subcoordinador, coordinadores, procesamiento y admin', () => {
            ['subcoor_campo', 'coor_campo', 'coor_proc', 'procesamiento', 'admin'].forEach(rol => {
                assert.ok(varios(rol).includes('desverificables'), rol);
            });
        });
        it('no lo ven recepcionista, ingresador ni dirección', () => {
            ['recepcionista', 'ingresador', 'direccion', 'encuestador', 'dis_conceptual'].forEach(rol => {
                assert.ok(!varios(rol).includes('desverificables'), rol);
            });
        });
        it('los roles del menú son los que pueden ejecutar el procedimiento', () => {
            var roles = ProceduresDmEncu.find(procedimiento => procedimiento.action == 'encuesta_desverificar_excepcional')?.roles;
            assert.deepStrictEqual(roles, ROLES_DESVERIFICAN);
        });
    });

    describe('historial_tem', () => {
        it('guarda quién desverificó y por qué', () => {
            var campos = historial_tem(contextoDelRol(crearAppParaTests(''), 'admin')).fields.map(campo => campo.name);
            assert.ok(campos.includes('usuario_accion'));
            assert.ok(campos.includes('motivo'));
        });
    });
});
