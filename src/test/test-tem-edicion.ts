import { describe, it } from 'mocha';

import assert = require('node:assert');

import { tem } from '../server/table-tem';
import { tem_edicion } from '../server/table-tem_edicion';
import type { FieldDefinition, MenuInfoBase, TableDefinition } from '../server/types-dmencu';
import { contextoDelRol, crearAppParaTests } from './app-para-tests';

function definicion(armar: typeof tem | typeof tem_edicion, rol: string): TableDefinition {
    var be = crearAppParaTests();
    return armar(contextoDelRol(be, rol));
}

function nombres(campos: FieldDefinition[]): string[] {
    return campos.map(campo => campo.name);
}

// como completeEditablesProperties de backend-plus: si el campo define editable (aunque sea undefined) manda ese valor
function editables(def: TableDefinition): string[] {
    return nombres(def.fields.filter(campo => 'editable' in campo ? !!campo.editable : !!def.editable));
}

function submenu(menu: MenuInfoBase[], nombre: string): MenuInfoBase[] {
    var item = menu.find(item => item.name == nombre);
    assert.ok(item, `falta el menú ${nombre}`);
    return item.menuContent;
}

describe('dmencu - tem y edición de la tem', () => {

    describe('grilla de la tem', () => {
        it('sólo habilitada es editable', () => {
            assert.deepStrictEqual(editables(definicion(tem, 'coor_campo')), ['habilitada']);
            assert.deepStrictEqual(editables(definicion(tem, 'admin')), ['habilitada']);
        });
        it('casa es visible y va después de nrolado', () => {
            var def = definicion(tem, 'coor_campo');
            assert.ok(!(def.hiddenColumns ?? []).includes('casa'));
            var campos = nombres(def.fields);
            assert.strictEqual(campos.indexOf('casa'), campos.indexOf('nrolado') + 1);
            assert.strictEqual(campos.filter(campo => campo == 'casa').length, 1);
        });
    });

    describe('grilla edición TEM (tem_edicion)', () => {
        it('tiene los campos en el orden de la tem', () => {
            assert.deepStrictEqual(nombres(definicion(tem_edicion, 'coor_campo').fields), [
                'operativo', 'enc', 'area', 'zona', 'cita', 'result_sup', 'fin_campo', 'proie',
                'dominio', 'nrocomuna', 'nrofraccion', 'nroradio', 'nromanzana', 'casa'
            ]);
        });
        it('respeta el orden de los campos en la tem', () => {
            var camposTem = nombres(definicion(tem, 'coor_campo').fields);
            var posiciones = nombres(definicion(tem_edicion, 'coor_campo').fields).map(campo => camposTem.indexOf(campo));
            assert.ok(posiciones.every(posicion => posicion >= 0), 'todos los campos existen en la tem');
            assert.deepStrictEqual(posiciones, [...posiciones].sort((a, b) => a - b));
        });
        it('cada campo editable se persiste en tem y los demás no', () => {
            var def = definicion(tem_edicion, 'admin');
            def.fields.forEach(campo => {
                assert.strictEqual(campo.table, campo.editable === false ? undefined : 'tem', campo.name);
            });
        });
        it('no permite insertar ni borrar y la cita es visible', () => {
            var def = definicion(tem_edicion, 'admin');
            assert.strictEqual(def.allow?.insert, false);
            assert.strictEqual(def.allow?.delete, false);
            assert.ok(!(def.hiddenColumns ?? []).includes('cita'));
            assert.notStrictEqual(def.fields.find(campo => campo.name == 'cita')?.visible, false);
        });
        it('del subcoordinador para arriba editan todo, incluidas manzana y casa', () => {
            ['subcoor_campo', 'coor_campo', 'coor_proc', 'admin'].forEach(rol => {
                assert.deepStrictEqual(editables(definicion(tem_edicion, rol)), [
                    'cita', 'result_sup', 'fin_campo', 'proie', 'nromanzana', 'casa'
                ], rol);
            });
        });
        it('el recepcionista edita lo de campo pero no manzana ni casa', () => {
            assert.deepStrictEqual(editables(definicion(tem_edicion, 'recepcionista')), [
                'cita', 'result_sup', 'fin_campo', 'proie'
            ]);
        });
        it('procesamiento sólo edita cita y proie', () => {
            assert.deepStrictEqual(editables(definicion(tem_edicion, 'procesamiento')), ['cita', 'proie']);
        });
        it('quien no administra campo ni procesa no edita nada', () => {
            assert.deepStrictEqual(editables(definicion(tem_edicion, 'encuestador')), []);
        });
    });

    describe('menú', () => {
        it('edición TEM está al lado de TEM en configurar → muestra', () => {
            var be = crearAppParaTests();
            var muestra = submenu(submenu(be.getMenu(contextoDelRol(be, 'coor_campo')).menu, 'configurar'), 'muestra');
            assert.deepStrictEqual(muestra.map(item => item.name).slice(0, 2), ['tem', 'tem_edicion']);
        });
    });
});
