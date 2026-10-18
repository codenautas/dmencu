import { describe, it } from 'mocha';

import assert = require('node:assert');

import {
    CasilleroEditable, ContextoValidacion, idQueTendria, Inclusion, problemasDelCasillero, proximoCodigo, TipoCasillero, validarOperacion
} from '../unlogged/editor-metadatos-comun';
import { aplicarOperaciones, idsConInsertado, permisosEditor } from '../server/editor-metadatos';
import type { ClienteTablero, FilaSql, ValorSql } from '../server/tablero';
import type { MenuInfoBase } from '../server/types-dmencu';
import { contextoDelRol, crearAppParaTests } from './app-para-tests';

const TIPOS: TipoCasillero[] = [
    { tipoc: 'F', denominacion: 'formulario', irrepetible: false, puedeSerVar: false, despHijos: null },
    { tipoc: 'B', denominacion: 'bloque', irrepetible: true, puedeSerVar: false, despHijos: null },
    { tipoc: 'P', denominacion: 'pregunta', irrepetible: true, puedeSerVar: null, despHijos: 'tabla' },
    { tipoc: 'O', denominacion: 'opción', irrepetible: false, puedeSerVar: false, despHijos: 'nueva_fila' },
    { tipoc: 'TEXTO', denominacion: 'texto aclaratorio', irrepetible: false, puedeSerVar: false, despHijos: null },
];
const INCLUSIONES: Inclusion[] = [
    { padre: 'F', hijo: 'B' }, { padre: 'F', hijo: 'P' }, { padre: 'B', hijo: 'P' }, { padre: 'B', hijo: 'TEXTO' }, { padre: 'P', hijo: 'O' }, { padre: 'O', hijo: 'P' },
];

function casillero(id: string, padre: string | null, tipoc: string, codigo: string, otros: Partial<CasilleroEditable> = {}): CasilleroEditable {
    return {
        id_casillero: id, padre, tipoc, casillero: codigo, orden: null, irrepetible: null, nombre: null, aclaracion: null, tipovar: null,
        longitud: null, tipoe: null, salto: null, salto_ns_nc: null, unidad_analisis: null, cantidad_resumen: null, despliegue: null,
        ver_id: null, optativo: null, es_activo: true, formulario_principal: null, var_name: null, var_name_especial: null,
        expresion_habilitar: null, valor_ns_nc: null, valor_sin_dato: null, leer: null, calculada: null, libre: null, especial: null, ...otros,
    };
}

// F:F1 > B1 > P1 (si_no, opciones 1 y 2) y P2; la opción P1/2 tiene adentro la pregunta P3
function arbol(): CasilleroEditable[] {
    return [
        casillero('F:F1', null, 'F', 'F1'),
        casillero('B1', 'F:F1', 'B', 'B1', { orden: 10 }),
        casillero('P1', 'B1', 'P', 'P1', { orden: 10, tipovar: 'si_no', nombre: '¿...?' }),
        casillero('P1/1', 'P1', 'O', '1', { orden: 10, nombre: 'Sí' }),
        casillero('P1/2', 'P1', 'O', '2', { orden: 20, nombre: 'No' }),
        casillero('P3', 'P1/2', 'P', 'P3', { tipovar: 'texto' }),
        casillero('P2', 'B1', 'P', 'P2', { orden: 20, tipovar: 'numero' }),
    ];
}

function contexto(otros: Partial<ContextoValidacion> = {}): ContextoValidacion {
    return { casilleros: arbol(), tipos: TIPOS, inclusiones: INCLUSIONES, permisos: { textos: true, estructura: true }, cerrado: false, ...otros };
}

function problemas(lista: CasilleroEditable[], id: string): string[] {
    return problemasDelCasillero(lista.find(c => c.id_casillero == id)!, lista, TIPOS, INCLUSIONES).map(p => p.mensaje);
}

describe('dmencu - editor visual de metadatos', () => {

    describe('reglas de los casilleros (las de la columna ok de casilleros)', () => {
        it('un formulario bien armado no tiene problemas', () => {
            arbol().forEach(c => assert.deepStrictEqual(problemas(arbol(), c.id_casillero), [], c.id_casillero));
        });
        it('inclusión inválida', () => {
            var lista = [...arbol(), casillero('B9', 'P2', 'B', 'B9')];
            assert.deepStrictEqual(problemas(lista, 'B9'), ['un/a bloque no puede estar dentro de un/a pregunta']);
        });
        it('sólo los formularios van sueltos', () => {
            assert.deepStrictEqual(problemas([casillero('P9', null, 'P', 'P9', { tipovar: 'texto' })], 'P9'), ['sólo los formularios pueden estar fuera de otro casillero']);
        });
        it('tipo de variable que sobra o falta', () => {
            assert.deepStrictEqual(problemas([...arbol(), casillero('B2', 'F:F1', 'B', 'B2', { tipovar: 'texto' })], 'B2'), ['este tipo de casillero no lleva tipo de variable']);
        });
        it('opciones y tipo de variable', () => {
            var conOpcionesSinTipo = arbol().map(c => c.id_casillero == 'P1' ? { ...c, tipovar: 'numero' } : c);
            assert.deepStrictEqual(problemas(conOpcionesSinTipo, 'P1'), ['tiene opciones: el tipo de variable debe ser opciones o si_no']);
            var siNoComoOpciones = arbol().map(c => c.id_casillero == 'P1' ? { ...c, tipovar: 'opciones' } : c);
            assert.deepStrictEqual(problemas(siNoComoOpciones, 'P1'), ['tiene opciones Sí y No: el tipo de variable debería ser si_no']);
            var siSinTilde = arbol().map(c => c.id_casillero == 'P1/1' ? { ...c, nombre: 'Si' } : c);
            assert.deepStrictEqual(problemas(siSinTilde, 'P1'), ['la opción "Si" va con tilde: "Sí"']);
            assert.deepStrictEqual(problemas([...arbol(), casillero('P5', 'B1', 'P', 'P5', { tipovar: 'opciones' })], 'P5'), ['faltan las opciones']);
        });
        it('salto a un casillero que no existe (aviso)', () => {
            var lista = arbol().map(c => c.id_casillero == 'P2' ? { ...c, salto: 'P99' } : c);
            assert.deepStrictEqual(problemasDelCasillero(lista.find(c => c.id_casillero == 'P2')!, lista, TIPOS, INCLUSIONES),
                [{ id_casillero: 'P2', gravedad: 'aviso', mensaje: 'el salto apunta a P99, que no está en el operativo' }]);
        });
    });

    describe('id_casillero, códigos y orden', () => {
        it('idQueTendria repite el trigger irrepetible_trg', () => {
            assert.strictEqual(idQueTendria(TIPOS[2], 'B1', 'P7'), 'P7');
            assert.strictEqual(idQueTendria(TIPOS[3], 'P1', '3'), 'P1/3');
            assert.strictEqual(idQueTendria(TIPOS[0], null, 'F2'), 'F:F2');
        });
        it('proximoCodigo sigue la numeración de las opciones hermanas o del tipo', () => {
            assert.strictEqual(proximoCodigo(arbol(), 'O', 'P1'), '3');
            assert.strictEqual(proximoCodigo(arbol(), 'O', 'P2'), '1');
            assert.strictEqual(proximoCodigo(arbol(), 'P', 'B1'), 'P4');
            assert.strictEqual(proximoCodigo(arbol(), 'B', 'F:F1'), 'B2');
        });
        it('idsConInsertado ubica al casillero entre sus hermanos', () => {
            var hermanos = arbol().filter(c => c.padre == 'B1');
            assert.deepStrictEqual(idsConInsertado(hermanos, 'NUEVO', 1), ['P1', 'NUEVO', 'P2']);
            assert.deepStrictEqual(idsConInsertado(hermanos, 'NUEVO', null), ['P1', 'P2', 'NUEVO']);
            assert.deepStrictEqual(idsConInsertado(hermanos, 'P1', 1), ['P2', 'P1']);
        });
    });

    describe('validarOperacion', () => {
        it('crear: inclusión, código, id repetido y tipo de variable', () => {
            assert.strictEqual(validarOperacion(contexto(), { tipo: 'crear', nuevo: { padre: 'B1', tipoc: 'P', casillero: 'P9', nombre: null, tipovar: 'texto' }, posicion: null }), null);
            assert.match(validarOperacion(contexto(), { tipo: 'crear', nuevo: { padre: 'P2', tipoc: 'B', casillero: 'B9', nombre: null, tipovar: null }, posicion: null })!, /no puede ir dentro/);
            assert.match(validarOperacion(contexto(), { tipo: 'crear', nuevo: { padre: 'B1', tipoc: 'P', casillero: 'P2', nombre: null, tipovar: null }, posicion: null })!, /ya existe el casillero P2/);
            assert.match(validarOperacion(contexto(), { tipo: 'crear', nuevo: { padre: 'B1', tipoc: 'P', casillero: 'a/b', nombre: null, tipovar: null }, posicion: null })!, /"\/"/);
            assert.match(validarOperacion(contexto(), { tipo: 'crear', nuevo: { padre: 'B1', tipoc: 'TEXTO', casillero: 'T1', nombre: null, tipovar: 'texto' }, posicion: null })!, /no lleva tipo de variable/);
        });
        it('mover: no adentro de sí mismo ni donde no puede ir', () => {
            assert.strictEqual(validarOperacion(contexto(), { tipo: 'mover', id_casillero: 'P2', padre: 'P1/1', posicion: 0 }), null);
            assert.match(validarOperacion(contexto(), { tipo: 'mover', id_casillero: 'P1', padre: 'P1/2', posicion: 0 })!, /adentro de sí mismo/);
            assert.match(validarOperacion(contexto(), { tipo: 'mover', id_casillero: 'P1/1', padre: 'B1', posicion: 0 })!, /un\/a opción no puede ir dentro de un\/a bloque/);
            // la opción 1 de P1 no choca con nada en P2 (queda P2/1)
            assert.strictEqual(validarOperacion(contexto(), { tipo: 'mover', id_casillero: 'P1/1', padre: 'P2', posicion: 0 }), null);
        });
        it('modificar: textos con casilleros_texto.editar, el resto sólo el superuser', () => {
            var soloTextos = contexto({ permisos: { textos: true, estructura: false } });
            assert.strictEqual(validarOperacion(soloTextos, { tipo: 'modificar', id_casillero: 'P2', cambios: { nombre: 'nuevo texto' } }), null);
            assert.match(validarOperacion(soloTextos, { tipo: 'modificar', id_casillero: 'P2', cambios: { salto: 'P1' } })!, /no tiene permiso/);
            assert.match(validarOperacion(contexto(), { tipo: 'modificar', id_casillero: 'P2', cambios: { casillero: 'P1' } })!, /ya existe el casillero P1/);
        });
        it('nada se puede con el diseño cerrado y sin permiso de estructura no se agrega, mueve ni borra', () => {
            assert.match(validarOperacion(contexto({ cerrado: true }), { tipo: 'modificar', id_casillero: 'P2', cambios: { nombre: 'x' } })!, /cerrado/);
            var soloTextos = contexto({ permisos: { textos: true, estructura: false } });
            assert.match(validarOperacion(soloTextos, { tipo: 'eliminar', id_casillero: 'P2' })!, /no tiene permiso/);
            assert.match(validarOperacion(soloTextos, { tipo: 'mover', id_casillero: 'P2', padre: 'B1', posicion: 0 })!, /no tiene permiso/);
        });
    });

    describe('permisos y menú', () => {
        it('textos con casilleros_texto.editar; estructura sólo el superuser', () => {
            var be = crearAppParaTests('');
            assert.deepStrictEqual(permisosEditor(contextoDelRol(be, 'admin')), { ver: true, textos: true, estructura: true });
            assert.deepStrictEqual(permisosEditor(contextoDelRol(be, 'dis_conceptual')), { ver: true, textos: true, estructura: false });
            assert.deepStrictEqual(permisosEditor(contextoDelRol(be, 'coor_campo')), { ver: false, textos: false, estructura: false });
        });
        it('el editor está en configurar → metadatos', () => {
            var be = crearAppParaTests('');
            var configurar = be.getMenu(contextoDelRol(be, 'dis_conceptual')).menu.find((o: MenuInfoBase) => o.name == 'configurar');
            assert.ok(configurar && configurar.menuType == 'menu');
            var metadatos = configurar.menuContent.find((o: MenuInfoBase) => o.name == 'metadatos');
            assert.ok(metadatos && metadatos.menuType == 'menu');
            assert.ok(metadatos.menuContent.some((o: MenuInfoBase) => o.name == 'editor_visual' && o.menuType == 'editor_metadatos'));
        });
    });

    describe('aplicarOperaciones (con una tabla casilleros simulada)', () => {
        // simula casilleros con el trigger que calcula id_casillero, para ver qué consultas se hacen y cómo queda
        function baseSimulada(inicial: CasilleroEditable[]) {
            var tabla = inicial.map(c => ({ ...c }));
            var consultas: string[] = [];
            var tipoDe = (tipoc: string) => TIPOS.find(t => t.tipoc == tipoc)!;
            var client: ClienteTablero = {
                query(sql: string, params: ValorSql[] = []) {
                    var limpio = sql.replace(/\s+/g, ' ').trim();
                    consultas.push(limpio);
                    var resultado = (): FilaSql[] => {
                        if (/^select disform_cerrado/.test(limpio)) return [{ disform_cerrado: false }];
                        if (/^select tipoc, denominacion/.test(limpio)) return TIPOS.map(t => ({ tipoc: t.tipoc, denominacion: t.denominacion, irrepetible: t.irrepetible, puede_ser_var: t.puedeSerVar, desp_hijos: t.despHijos }));
                        if (/^select tipoc_padre/.test(limpio)) return INCLUSIONES.map(i => ({ tipoc_padre: i.padre, tipoc_hijo: i.hijo }));
                        if (/^select c\.id_casillero/.test(limpio)) return tabla.map(c => ({ ...c }));
                        if (/^insert into casilleros/.test(limpio)) {
                            var tipoc = /'O'/.test(limpio) ? 'O' : String(params[2]);
                            var padre = String(params[1]);
                            var codigo = String(/'O'/.test(limpio) ? params[2] : params[3]);
                            var nuevo = casillero(idQueTendria(tipoDe(tipoc), padre, codigo), padre, tipoc, codigo);
                            tabla.push(nuevo);
                            return [{ id_casillero: nuevo.id_casillero }];
                        }
                        if (/^update casilleros set padre = \$3/.test(limpio)) {
                            var fila = tabla.find(c => c.id_casillero == params[1])!;
                            fila.padre = String(params[2]);
                            fila.id_casillero = idQueTendria(tipoDe(fila.tipoc), fila.padre, fila.casillero);
                            return [{ id_casillero: fila.id_casillero }];
                        }
                        if (/^select id_casillero from casilleros where operativo = \$1 and padre = \$2/.test(limpio)) {
                            return tabla.filter(c => c.padre == params[1]).map(c => ({ id_casillero: c.id_casillero }));
                        }
                        if (/^update casilleros set orden/.test(limpio)) {
                            var ordenado = tabla.find(c => c.id_casillero == params[1]);
                            if (ordenado) ordenado.orden = Number(params[2]);
                            return [];
                        }
                        if (/^with recursive arbol/.test(limpio)) {
                            var borrar = [String(params[1])];
                            for (var i = 0; i < borrar.length; i++) tabla.filter(c => c.padre == borrar[i]).forEach(c => borrar.push(c.id_casillero));
                            tabla = tabla.filter(c => !borrar.includes(c.id_casillero));
                            return [];
                        }
                        return [];
                    };
                    return { fetchAll: async () => ({ rows: resultado() }), execute: async () => { resultado(); return {}; } };
                }
            };
            return { client, consultas, tabla: () => tabla };
        }
        var admin = contextoDelRol(crearAppParaTests(''), 'admin');

        it('crear una pregunta con opciones la ubica en su lugar y crea las opciones', async () => {
            var base = baseSimulada(arbol());
            var resultado = await aplicarOperaciones(base.client, admin, 'OPE', [{ tipo: 'crear', posicion: 1, nuevo: {
                padre: 'B1', tipoc: 'P', casillero: 'P9', nombre: '¿Trabaja?', tipovar: 'si_no', opciones: [{ casillero: '1', nombre: 'Sí' }, { casillero: '2', nombre: 'No' }],
            } }]);
            assert.ok(base.consultas.includes('set constraints all deferred'));
            assert.deepStrictEqual(resultado.filter(c => c.padre == 'B1').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).map(c => c.id_casillero), ['P1', 'P9', 'P2']);
            assert.deepStrictEqual(resultado.filter(c => c.padre == 'P9').map(c => c.id_casillero), ['P9/1', 'P9/2']);
        });
        it('mover una opción a otra pregunta le cambia el id a ella y a lo que tiene adentro', async () => {
            var base = baseSimulada(arbol());
            await aplicarOperaciones(base.client, admin, 'OPE', [{ tipo: 'mover', id_casillero: 'P1/2', padre: 'P2', posicion: 0 }]);
            var opcion = base.tabla().find(c => c.casillero == '2' && c.tipoc == 'O')!;
            assert.strictEqual(opcion.id_casillero, 'P2/2');
            assert.strictEqual(base.tabla().find(c => c.id_casillero == 'P3')!.padre, 'P2/2');
        });
        it('borrar se lleva todo lo que tiene adentro', async () => {
            var base = baseSimulada(arbol());
            var resultado = await aplicarOperaciones(base.client, admin, 'OPE', [{ tipo: 'eliminar', id_casillero: 'P1' }]);
            assert.deepStrictEqual(resultado.map(c => c.id_casillero).sort(), ['B1', 'F:F1', 'P2']);
        });
        it('una operación inválida no se aplica y dice por qué', async () => {
            var base = baseSimulada(arbol());
            await assert.rejects(aplicarOperaciones(base.client, admin, 'OPE', [{ tipo: 'mover', id_casillero: 'P1/1', padre: 'B1', posicion: 0 }]), /no puede ir dentro/);
            await assert.rejects(aplicarOperaciones(base.client, contextoDelRol(crearAppParaTests(''), 'coor_campo'), 'OPE', []), /no tiene permiso/);
        });
    });
});
