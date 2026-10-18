import { describe, it } from 'mocha';

import assert = require('node:assert');

import {
    aplicarOperacionLocal, CasilleroEditable, ContextoValidacion, hijosDe, idQueTendria, Inclusion, inversaDeOperacion, OperacionMetadatos, operacionesInversas, ordenParaInsertar, problemasDelCasillero, proximoCodigo, TipoCasillero,
    validarOperacion, variablesDeExpresion, variablesDesconocidas, varNameDerivado
} from '../unlogged/editor-metadatos-comun';
import { aplicarOperaciones, CAMPOS_DE_LA_COPIA, guardarVersion, idsConInsertado, permisosEditor, proceduresEditorMetadatos } from '../server/editor-metadatos';
import type { ClienteTablero, FilaSql, ValorSql } from '../server/tablero';
import type { MenuInfoBase } from '../server/types-dmencu';
import { contextoDelRol, crearAppParaTests } from './app-para-tests';

const TIPOS: TipoCasillero[] = [
    { tipoc: 'F', denominacion: 'formulario', irrepetible: false, puedeSerVar: false, despHijos: null },
    { tipoc: 'B', denominacion: 'bloque', irrepetible: true, puedeSerVar: false, despHijos: null },
    { tipoc: 'P', denominacion: 'pregunta', irrepetible: true, puedeSerVar: null, despHijos: 'tabla' },
    { tipoc: 'O', denominacion: 'opción', irrepetible: false, puedeSerVar: false, despHijos: 'nueva_fila' },
    { tipoc: 'TEXTO', denominacion: 'texto aclaratorio', irrepetible: false, puedeSerVar: false, despHijos: null },
    { tipoc: 'FILTRO', denominacion: 'filtro', irrepetible: true, puedeSerVar: false, despHijos: null },
    { tipoc: 'BF', denominacion: 'botón para formulario', irrepetible: true, puedeSerVar: null, despHijos: null },
];
const INCLUSIONES: Inclusion[] = [
    { padre: 'F', hijo: 'B' }, { padre: 'F', hijo: 'P' }, { padre: 'B', hijo: 'P' }, { padre: 'B', hijo: 'TEXTO' }, { padre: 'P', hijo: 'O' }, { padre: 'O', hijo: 'P' },
    { padre: 'F', hijo: 'BF' }, { padre: 'B', hijo: 'FILTRO' },
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
        casillero('F:F1', null, 'F', 'F1', { nombre: 'Formulario 1', unidad_analisis: 'viviendas' }),
        casillero('B1', 'F:F1', 'B', 'B1', { orden: 10, nombre: 'Bloque 1' }),
        casillero('P1', 'B1', 'P', 'P1', { orden: 10, tipovar: 'si_no', nombre: '¿...?', var_name: 'p1' }),
        casillero('P1/1', 'P1', 'O', '1', { orden: 10, nombre: 'Sí' }),
        casillero('P1/2', 'P1', 'O', '2', { orden: 20, nombre: 'No' }),
        casillero('P3', 'P1/2', 'P', 'P3', { tipovar: 'texto', nombre: '¿Por qué?', var_name: 'p3' }),
        casillero('P2', 'B1', 'P', 'P2', { orden: 20, tipovar: 'numero', nombre: '¿Cuántos?', var_name: 'p2' }),
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
            var lista = [...arbol(), casillero('B9', 'P2', 'B', 'B9', { nombre: 'Bloque 9' })];
            assert.deepStrictEqual(problemas(lista, 'B9').filter(m => !/vacío/.test(m)), ['un/a bloque no puede estar dentro de un/a pregunta']);
        });
        it('sólo los formularios van sueltos', () => {
            assert.deepStrictEqual(problemas([casillero('P9', null, 'P', 'P9', { tipovar: 'texto', nombre: '¿...?' })], 'P9'), ['sólo los formularios pueden estar fuera de otro casillero']);
        });
        it('tipo de variable que sobra o falta', () => {
            assert.deepStrictEqual(problemas([...arbol(), casillero('B2', 'F:F1', 'B', 'B2', { tipovar: 'texto', nombre: 'Bloque 2' })], 'B2').filter(m => !/vacío/.test(m)),
                ['este tipo de casillero no lleva tipo de variable']);
        });
        it('opciones y tipo de variable', () => {
            var conOpcionesSinTipo = arbol().map(c => c.id_casillero == 'P1' ? { ...c, tipovar: 'numero' } : c);
            assert.deepStrictEqual(problemas(conOpcionesSinTipo, 'P1'), ['tiene opciones: el tipo de variable debe ser opciones o si_no']);
            var siNoComoOpciones = arbol().map(c => c.id_casillero == 'P1' ? { ...c, tipovar: 'opciones' } : c);
            assert.deepStrictEqual(problemas(siNoComoOpciones, 'P1'), ['tiene opciones Sí y No: el tipo de variable debería ser si_no']);
            var siSinTilde = arbol().map(c => c.id_casillero == 'P1/1' ? { ...c, nombre: 'Si' } : c);
            assert.deepStrictEqual(problemas(siSinTilde, 'P1'), ['la opción "Si" va con tilde: "Sí"']);
            assert.deepStrictEqual(problemas([...arbol(), casillero('P5', 'B1', 'P', 'P5', { tipovar: 'opciones', nombre: '¿...?' })], 'P5'), ['faltan las opciones']);
        });
        it('salto a un casillero que no existe (aviso)', () => {
            var lista = arbol().map(c => c.id_casillero == 'P2' ? { ...c, salto: 'P99' } : c);
            assert.deepStrictEqual(problemasDelCasillero(lista.find(c => c.id_casillero == 'P2')!, lista, TIPOS, INCLUSIONES),
                [{ id_casillero: 'P2', gravedad: 'aviso', mensaje: 'el salto apunta a P99, que no está en el operativo', campo: 'salto' }]);
        });
    });

    describe('datos que faltan según el tipo (aunque la base los deje vacíos)', () => {
        function faltas(lista: CasilleroEditable[], id: string) {
            return problemasDelCasillero(lista.find(c => c.id_casillero == id)!, lista, TIPOS, INCLUSIONES).filter(p => p.gravedad == 'falta');
        }
        it('una pregunta sin texto', () => {
            var lista = arbol().map(c => c.id_casillero == 'P2' ? { ...c, nombre: null } : c);
            assert.deepStrictEqual(faltas(lista, 'P2').map(p => [p.mensaje, p.campo]), [['falta el texto de la pregunta', 'nombre']]);
        });
        it('un formulario sin título ni unidad de análisis ni contenido', () => {
            var lista = [casillero('F:F2', null, 'F', 'F2')];
            assert.deepStrictEqual(faltas(lista, 'F:F2').map(p => p.mensaje),
                ['falta el título del formulario', 'falta la unidad de análisis', 'está vacío: arrastrá casilleros adentro']);
        });
        it('un bloque vacío es un aviso (puede ser a propósito); un formulario vacío es un dato faltante', () => {
            var lista = [...arbol(), casillero('B7', 'F:F1', 'B', 'B7', { nombre: 'Vacío' })];
            assert.deepStrictEqual(faltas(lista, 'B7'), []);
            var avisos = problemasDelCasillero(lista.find(c => c.id_casillero == 'B7')!, lista, TIPOS, INCLUSIONES).filter(p => p.gravedad == 'aviso');
            assert.deepStrictEqual(avisos.map(p => p.mensaje), ['está vacío: arrastrá casilleros adentro']);
        });
        // casos de la base real de etoi (ver la prueba con datos reales)
        it('un título de un solo espacio es un título en blanco a propósito, no un dato faltante', () => {
            var lista = [...arbol(), casillero('S1.2', 'F:F1', 'B', 'S1.2', { nombre: ' ' }), casillero('P8', 'S1.2', 'P', 'P8', { nombre: '¿...?', tipovar: 'texto' })];
            assert.deepStrictEqual(faltas(lista, 'S1.2'), []);
            lista = lista.map(c => c.id_casillero == 'S1.2' ? { ...c, nombre: '' } : c);
            assert.deepStrictEqual(faltas(lista, 'S1.2').map(p => p.mensaje), ['falta el título del bloque']);
        });
        it('una pregunta de opciones sin texto es un aviso; una pregunta de otro tipo sin texto es un dato faltante', () => {
            var lista = arbol().map(c => c.id_casillero == 'P1' ? { ...c, nombre: null } : c);
            assert.deepStrictEqual(faltas(lista, 'P1'), []);
            var avisos = problemasDelCasillero(lista.find(c => c.id_casillero == 'P1')!, lista, TIPOS, INCLUSIONES).filter(p => p.gravedad == 'aviso');
            assert.deepStrictEqual(avisos.map(p => p.mensaje), ['falta el texto de la pregunta']);
            assert.strictEqual(faltas(arbol().map(c => c.id_casillero == 'P2' ? { ...c, nombre: null } : c), 'P2').length, 1);
        });
        it('un filtro sin texto ni salto, y un botón sin formulario', () => {
            var lista = [...arbol(), casillero('FIL', 'B1', 'FILTRO', 'FIL'), casillero('BF_X', 'F:F1', 'BF', 'BF_X')];
            assert.deepStrictEqual(faltas(lista, 'FIL').map(p => p.campo), ['nombre', 'salto']);
            assert.deepStrictEqual(faltas(lista, 'BF_X').map(p => p.campo), ['salto']);
        });
        it('el texto del filtro puede estar en la aclaración', () => {
            var lista = [...arbol(), casillero('FIL', 'B1', 'FILTRO', 'FIL', { aclaracion: 'Si no trabaja, pase a...', salto: 'P2' })];
            assert.deepStrictEqual(faltas(lista, 'FIL'), []);
        });
        it('un botón que abre algo que no es un formulario es un error', () => {
            var lista = [...arbol(), casillero('BF_X', 'F:F1', 'BF', 'BF_X', { salto: 'P2' })];
            var errores = problemasDelCasillero(lista.find(c => c.id_casillero == 'BF_X')!, lista, TIPOS, INCLUSIONES).filter(p => p.gravedad == 'error');
            assert.deepStrictEqual(errores.map(p => p.mensaje), ['el botón abre P2, que no es un formulario del operativo']);
        });
        it('el salto a "fin" no es un salto roto', () => {
            var lista = arbol().map(c => c.id_casillero == 'P2' ? { ...c, salto: 'fin' } : c);
            assert.deepStrictEqual(problemas(lista, 'P2'), []);
        });
    });

    describe('expresiones', () => {
        it('variablesDeExpresion deja afuera funciones, palabras y textos', () => {
            assert.deepStrictEqual(variablesDeExpresion("p1 = 1 and not blanco(p2) or v_x is null and nombre = 'juan perez'"), ['p1', 'p2', 'v_x', 'nombre']);
            assert.deepStrictEqual(variablesDeExpresion('$B.salto > 0'), []);
        });
        it('avisa las variables que no están en el operativo', () => {
            var lista = arbol().map(c => c.id_casillero == 'P2' ? { ...c, expresion_habilitar: 'p1 = 1 and p99 > 2' } : c);
            var avisos = problemasDelCasillero(lista.find(c => c.id_casillero == 'P2')!, lista, TIPOS, INCLUSIONES).filter(p => p.gravedad == 'aviso');
            assert.deepStrictEqual(avisos.map(p => [p.mensaje, p.campo]), [['la condición usa variables que no están en el operativo: p99', 'expresion_habilitar']]);
        });
        it('un esquema.función (dbo.fun(...)) no cuenta como variable', () => {
            assert.deepStrictEqual(variablesDeExpresion('dbo.f_hijos(vivienda, hogar) > 2 and p1 = 1'), ['vivienda', 'hogar', 'p1']);
            assert.deepStrictEqual(variablesDeExpresion('t.col = 1 and p2 = 2'), ['p2']);
        });
        it('las claves de las unidades de análisis (vivienda, hogar, persona) son variables válidas', () => {
            var lista = arbol().map(c => c.id_casillero == 'P2' ? { ...c, expresion_habilitar: 'hogar = 1 and p1 = 1' } : c);
            var avisosCon = (extra: string[]) => problemasDelCasillero(lista.find(c => c.id_casillero == 'P2')!, lista, TIPOS, INCLUSIONES, extra).filter(p => p.gravedad == 'aviso');
            assert.deepStrictEqual(avisosCon([]).map(p => p.mensaje), ['la condición usa variables que no están en el operativo: hogar']);
            assert.deepStrictEqual(avisosCon(['vivienda', 'hogar', 'persona']), []);
        });
        it('variablesDesconocidas no distingue mayúsculas y acepta las variables internas con $', () => {
            assert.deepStrictEqual(variablesDesconocidas('P1 = 1 and $x = 2', ['p1']), []);
        });
    });

    describe('simulación local (modo borrador)', () => {
        it('crear una pregunta con opciones calcula los ids y el orden', () => {
            var resultado = aplicarOperacionLocal(arbol(), TIPOS, 'OPE', { tipo: 'crear', posicion: 1, nuevo: {
                padre: 'B1', tipoc: 'P', casillero: 'P9', nombre: 'x', tipovar: 'si_no', opciones: [{ casillero: '1', nombre: 'Sí' }, { casillero: '2', nombre: 'No' }],
            } });
            assert.deepStrictEqual(resultado.filter(c => c.padre == 'B1').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).map(c => c.id_casillero), ['P1', 'P9', 'P2']);
            assert.deepStrictEqual(resultado.filter(c => c.padre == 'P9').map(c => c.id_casillero), ['P9/1', 'P9/2']);
            assert.strictEqual(resultado.find(c => c.id_casillero == 'P9')!.var_name, 'p9');
        });
        it('mover una opción cambia su id y el de lo que tiene adentro, como el servidor', () => {
            var resultado = aplicarOperacionLocal(arbol(), TIPOS, 'OPE', { tipo: 'mover', id_casillero: 'P1/2', padre: 'P2', posicion: 0 });
            assert.strictEqual(resultado.find(c => c.casillero == '2' && c.tipoc == 'O')!.id_casillero, 'P2/2');
            assert.strictEqual(resultado.find(c => c.id_casillero == 'P3')!.padre, 'P2/2');
        });
        it('cambiar el código de una opción lleva a sus hijos al id nuevo', () => {
            var resultado = aplicarOperacionLocal(arbol(), TIPOS, 'OPE', { tipo: 'modificar', id_casillero: 'P1/2', cambios: { casillero: '9' } });
            assert.ok(resultado.some(c => c.id_casillero == 'P1/9'));
            assert.strictEqual(resultado.find(c => c.id_casillero == 'P3')!.padre, 'P1/9');
        });
        it('el var_name se calcula como irrepetible_trg', () => {
            assert.strictEqual(varNameDerivado({ id_casillero: '1A/x', tipovar: 'texto', var_name_especial: null }, 'ETOI274'), 'etoi1a_x');
            assert.strictEqual(varNameDerivado({ id_casillero: 'Pañal', tipovar: 'texto', var_name_especial: null }, 'ope'), 'pannial');
            assert.strictEqual(varNameDerivado({ id_casillero: 'P1', tipovar: 'texto', var_name_especial: 'mi_var' }, 'ope'), 'mi_var');
            assert.strictEqual(varNameDerivado({ id_casillero: 'B1', tipovar: null, var_name_especial: null }, 'ope'), null);
        });
        it('eliminar saca todo el subárbol', () => {
            assert.deepStrictEqual(aplicarOperacionLocal(arbol(), TIPOS, 'OPE', { tipo: 'eliminar', id_casillero: 'P1' }).map(c => c.id_casillero).sort(), ['B1', 'F:F1', 'P2']);
        });
        it('las operaciones inversas dejan el formulario como estaba (deshacer) y como quedó (rehacer)', () => {
            var antes = arbol();
            var despues = aplicarOperacionLocal(antes, TIPOS, 'OPE', { tipo: 'eliminar', id_casillero: 'P1' });
            var inversas = operacionesInversas(antes, despues, 'F:F1', 'F:F1');
            var vuelto = inversas.deshacer.reduce((c, op) => aplicarOperacionLocal(c, TIPOS, 'OPE', op), despues);
            assert.deepStrictEqual(vuelto.map(c => c.id_casillero).sort(), antes.map(c => c.id_casillero).sort());
            var rehecho = inversas.rehacer.reduce((c, op) => aplicarOperacionLocal(c, TIPOS, 'OPE', op), vuelto);
            assert.deepStrictEqual(rehecho.map(c => c.id_casillero).sort(), despues.map(c => c.id_casillero).sort());
        });
        it('crear y mover respetan los órdenes irregulares: sólo ocupan un hueco, no renumeran a los hermanos', () => {
            var irregular = arbol().map(c => c.id_casillero == 'P1' ? { ...c, orden: 2 } : c.id_casillero == 'P2' ? { ...c, orden: 7 } : c);
            var ordenes = (lista: CasilleroEditable[]) => Object.fromEntries(hijosDe(lista, 'B1').map(c => [c.id_casillero, c.orden]));
            var creado = aplicarOperacionLocal(irregular, TIPOS, 'OPE', { tipo: 'crear', posicion: 1, nuevo: { padre: 'B1', tipoc: 'P', casillero: 'P9', nombre: 'x', tipovar: 'numero' } });
            assert.deepStrictEqual(ordenes(creado), { P1: 2, P9: 4, P2: 7 });
            var movido = aplicarOperacionLocal(irregular, TIPOS, 'OPE', { tipo: 'mover', id_casillero: 'P2', padre: 'B1', posicion: 0 });
            assert.deepStrictEqual(ordenes(movido), { P2: 1, P1: 2 });
            var exacto = aplicarOperacionLocal(movido, TIPOS, 'OPE', { tipo: 'mover', id_casillero: 'P2', padre: 'B1', posicion: 1, orden: 7 });
            assert.deepStrictEqual(ordenes(exacto), { P1: 2, P2: 7 });
        });
        it('ordenParaInsertar: huecos y renumerado', () => {
            var h = (...ordenes: (number | null)[]) => ordenes.map((orden, i) => casillero('X' + i, 'B1', 'P', 'X' + i, { orden }));
            assert.deepStrictEqual(ordenParaInsertar([], 0), { orden: 10, renumerar: false });
            assert.deepStrictEqual(ordenParaInsertar(h(10, 20), null), { orden: 30, renumerar: false });
            assert.deepStrictEqual(ordenParaInsertar(h(10, 20), 1), { orden: 15, renumerar: false });
            assert.deepStrictEqual(ordenParaInsertar(h(10, 20), 0), { orden: 5, renumerar: false });
            assert.deepStrictEqual(ordenParaInsertar(h(1, 2), 1), { orden: 20, renumerar: true });
            assert.deepStrictEqual(ordenParaInsertar(h(1, 2), 0), { orden: 10, renumerar: true });
            assert.deepStrictEqual(ordenParaInsertar(h(5, 5), 1), { orden: 20, renumerar: true });
            assert.deepStrictEqual(ordenParaInsertar(h(null, null), 1), { orden: 20, renumerar: true });
        });
        // aplica la operación, su inversa (deshacer) y otra vez la operación (rehacer): tiene que dar lo mismo que la primera vez
        function ciclo(operacion: OperacionMetadatos) {
            var antes = arbol();
            var inversa = inversaDeOperacion(antes, TIPOS, operacion)!;
            assert.ok(inversa, 'tiene que haber una inversa');
            var despues = aplicarOperacionLocal(antes, TIPOS, 'OPE', operacion);
            var deshecho = inversa.deshacer.reduce((c, op) => aplicarOperacionLocal(c, TIPOS, 'OPE', op), despues);
            var rehecho = inversa.rehacer.reduce((c, op) => aplicarOperacionLocal(c, TIPOS, 'OPE', op), deshecho);
            // el número de orden puede cambiar (se renumera de 10 en 10); lo que importa es el lugar entre los hermanos
            var resumen = (lista: CasilleroEditable[]) => lista.map(c => `${c.id_casillero}<${c.padre}>#${hijosDe(lista, c.padre).findIndex(h => h.id_casillero == c.id_casillero)}:${c.nombre}:${c.salto}`).sort();
            assert.deepStrictEqual(resumen(deshecho), resumen(antes), 'deshacer');
            assert.deepStrictEqual(resumen(rehecho), resumen(despues), 'rehacer');
            return inversa;
        }
        it('inversas precisas: crear, modificar, mover y eliminar vuelven atrás y adelante', () => {
            ciclo({ tipo: 'crear', posicion: 1, nuevo: { padre: 'B1', tipoc: 'P', casillero: 'P9', nombre: 'x', tipovar: 'si_no', opciones: [{ casillero: '1', nombre: 'Sí' }] } });
            ciclo({ tipo: 'modificar', id_casillero: 'P2', cambios: { nombre: 'otro texto', salto: 'P3' } });
            ciclo({ tipo: 'modificar', id_casillero: 'P1/2', cambios: { casillero: '9' } });
            ciclo({ tipo: 'mover', id_casillero: 'P2', padre: 'B1', posicion: 0 });
            ciclo({ tipo: 'mover', id_casillero: 'P1/2', padre: 'P2', posicion: 0 });
            ciclo({ tipo: 'eliminar', id_casillero: 'P1' });
        });
        it('la inversa de modificar guarda sólo los campos que se cambiaron, con sus valores anteriores', () => {
            var inversa = inversaDeOperacion(arbol(), TIPOS, { tipo: 'modificar', id_casillero: 'P2', cambios: { nombre: 'nuevo' } })!;
            assert.deepStrictEqual(inversa.deshacer, [{ tipo: 'modificar', id_casillero: 'P2', cambios: { nombre: '¿Cuántos?' } }]);
        });
        it('deshacer un borrado restaura el subárbol sin tocar el resto (reemplazar de lo que se borró)', () => {
            var inversa = inversaDeOperacion(arbol(), TIPOS, { tipo: 'eliminar', id_casillero: 'P1' })!;
            var op = inversa.deshacer[0];
            assert.strictEqual(op.tipo, 'reemplazar');
            assert.deepStrictEqual(op.tipo == 'reemplazar' && op.casilleros.map(c => c.id_casillero).sort(), ['P1', 'P1/1', 'P1/2', 'P3']);
            assert.strictEqual(validarOperacion(contexto({ casilleros: aplicarOperacionLocal(arbol(), TIPOS, 'OPE', { tipo: 'eliminar', id_casillero: 'P1' }) }), op), null);
        });
        it('una operación reemplazar no tiene inversa precisa (se usa la copia del formulario)', () => {
            assert.strictEqual(inversaDeOperacion(arbol(), TIPOS, { tipo: 'reemplazar', raiz: 'F:F1', casilleros: arbol() }), null);
        });
        it('deshacer la creación de un formulario nuevo lo elimina', () => {
            var antes = arbol();
            var despues = aplicarOperacionLocal(antes, TIPOS, 'OPE', { tipo: 'crear', posicion: null, nuevo: { padre: null, tipoc: 'F', casillero: 'F2', nombre: 'Otro', tipovar: null, unidad_analisis: 'hogares' } });
            var inversas = operacionesInversas(antes, despues, null, 'F:F2');
            assert.deepStrictEqual(inversas.deshacer, [{ tipo: 'eliminar', id_casillero: 'F:F2' }]);
        });
    });

    describe('formularios nuevos y reemplazar (restaurar versiones)', () => {
        it('un formulario nuevo necesita unidad de análisis y es el único tipo que va suelto', () => {
            var nuevo = { padre: null, tipoc: 'F', casillero: 'F2', nombre: 'Otro', tipovar: null };
            assert.match(validarOperacion(contexto(), { tipo: 'crear', nuevo, posicion: null })!, /unidad de análisis/);
            assert.strictEqual(validarOperacion(contexto(), { tipo: 'crear', nuevo: { ...nuevo, unidad_analisis: 'hogares' }, posicion: null }), null);
            assert.match(validarOperacion(contexto(), { tipo: 'crear', nuevo: { ...nuevo, tipoc: 'B', unidad_analisis: 'hogares' }, posicion: null })!, /sólo los formularios/);
            assert.match(validarOperacion(contexto(), { tipo: 'crear', nuevo: { ...nuevo, casillero: 'F1', unidad_analisis: 'hogares' }, posicion: null })!, /ya existe el casillero F:F1/);
        });
        it('reemplazar acepta una copia consistente', () => {
            assert.strictEqual(validarOperacion(contexto(), { tipo: 'reemplazar', raiz: 'F:F1', casilleros: arbol() }), null);
        });
        it('reemplazar rechaza copias rotas, repetidas o que chocan con otros formularios', () => {
            assert.match(validarOperacion(contexto(), { tipo: 'reemplazar', raiz: 'F:F1', casilleros: [...arbol(), arbol()[1]] })!, /repetidos/);
            assert.match(validarOperacion(contexto(), { tipo: 'reemplazar', raiz: 'F:F1', casilleros: [arbol()[0], arbol()[1], casillero('X', 'NOEXISTE', 'P', 'X')] })!, /único casillero de arriba/);
            var conOtro = contexto({ casilleros: [...arbol(), casillero('F:F2', null, 'F', 'F2'), casillero('B1b', 'F:F2', 'B', 'B1b')] });
            assert.match(validarOperacion(conOtro, { tipo: 'reemplazar', raiz: 'F:F1', casilleros: [arbol()[0], casillero('B1b', 'F:F1', 'B', 'B1b')] })!, /ya existe el casillero B1b/);
        });
        it('sin permiso de estructura no se restaura', () => {
            assert.match(validarOperacion(contexto({ permisos: { textos: true, estructura: false } }), { tipo: 'reemplazar', raiz: 'F:F1', casilleros: arbol() })!, /no tiene permiso/);
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
                            var padre = params[1] == null ? null : String(params[1]);
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
        it('reemplazar vuelve el formulario a una copia: borra lo actual e inserta la copia con los mismos ids', async () => {
            var copia = arbol();
            var base = baseSimulada([...arbol().filter(c => c.id_casillero != 'P2'), casillero('PX', 'B1', 'P', 'PX', { tipovar: 'texto', nombre: 'de más' })]);
            var resultado = await aplicarOperaciones(base.client, admin, 'OPE', [{ tipo: 'reemplazar', raiz: 'F:F1', casilleros: copia }]);
            assert.deepStrictEqual(resultado.map(c => c.id_casillero).sort(), copia.map(c => c.id_casillero).sort());
            assert.ok(!resultado.some(c => c.id_casillero == 'PX'));
        });
        it('el insert de la copia no repite columnas (la base real rechaza una columna repetida) y no incluye las que calcula el trigger', () => {
            assert.strictEqual(new Set(CAMPOS_DE_LA_COPIA).size, CAMPOS_DE_LA_COPIA.length);
            ['id_casillero', 'irrepetible', 'var_name', 'operativo'].forEach(calculada => assert.ok(!CAMPOS_DE_LA_COPIA.includes(calculada), calculada));
        });
        it('reemplazar manda un solo insert por casillero, con las columnas sin repetir', async () => {
            var base = baseSimulada(arbol());
            await aplicarOperaciones(base.client, admin, 'OPE', [{ tipo: 'reemplazar', raiz: 'P1', casilleros: arbol().filter(c => ['P1', 'P1/1', 'P1/2', 'P3'].includes(c.id_casillero)) }]);
            var inserts = base.consultas.filter(c => /^insert into casilleros \(operativo, padre/.test(c));
            assert.strictEqual(inserts.length, 4);
            inserts.forEach(sql => {
                var columnas = sql.slice(sql.indexOf('(') + 1, sql.indexOf(')')).split(',').map(c => c.trim());
                assert.strictEqual(new Set(columnas).size, columnas.length, sql);
            });
        });
        it('los procedimientos del editor y quién puede cada uno', () => {
            var app = { perfilDelUsuario: () => { throw new Error('no se usa'); }, estructuraModificada: () => { }, estructuraDelOperativo: async () => ({}) };
            assert.deepStrictEqual(proceduresEditorMetadatos(app).map(p => p.action), [
                'editor_metadatos_traer', 'editor_metadatos_aplicar', 'editor_metadatos_previsualizar',
                'editor_metadatos_versiones_traer', 'editor_metadatos_version_guardar', 'editor_metadatos_version_restaurar',
            ]);
        });
        it('guardar una versión copia el formulario con todo lo que tiene adentro', async () => {
            var guardado: ValorSql[] = [];
            var client: ClienteTablero = {
                query(sql: string, params: ValorSql[] = []) {
                    var limpio = sql.replace(/\s+/g, ' ').trim();
                    var filas = (): FilaSql[] => {
                        if (/^select c\.id_casillero/.test(limpio)) return arbol().map(c => ({ ...c }));
                        if (/^insert into casilleros_versiones/.test(limpio)) { guardado = params; return [{ version: 7 }]; }
                        return [];
                    };
                    return { fetchAll: async () => ({ rows: filas() }), execute: async () => { filas(); return {}; } };
                }
            };
            assert.strictEqual(await guardarVersion(client, admin, 'OPE', 'F:F1', 'antes de cambiar el bloque 1'), 7);
            assert.deepStrictEqual(guardado.slice(0, 4), ['OPE', 'F:F1', 'usu_admin', 'antes de cambiar el bloque 1']);
            assert.strictEqual(JSON.parse(String(guardado[4])).length, arbol().length);
            await assert.rejects(guardarVersion(client, admin, 'OPE', 'F:NO', null), /no existe el formulario/);
        });
        it('una operación inválida no se aplica y dice por qué', async () => {
            var base = baseSimulada(arbol());
            await assert.rejects(aplicarOperaciones(base.client, admin, 'OPE', [{ tipo: 'mover', id_casillero: 'P1/1', padre: 'B1', posicion: 0 }]), /no puede ir dentro/);
            await assert.rejects(aplicarOperaciones(base.client, contextoDelRol(crearAppParaTests(''), 'coor_campo'), 'OPE', []), /no tiene permiso/);
        });
    });
});
