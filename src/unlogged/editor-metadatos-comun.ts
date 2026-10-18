"use strict";

// Editor visual de metadatos (ver docs/editor-metadatos.md): tipos y reglas que usan el servidor y el cliente.
// Las reglas repiten las de la base (trigger irrepetible_trg y columna "ok" de la grilla casilleros) para
// avisar antes de guardar; la base las vuelve a controlar al guardar.

import type { PerfilTablero } from "./tipos-tablero";

export type CasilleroEditable = {
    id_casillero: string
    padre: string | null
    tipoc: string
    casillero: string
    orden: number | null
    irrepetible: boolean | null
    nombre: string | null
    aclaracion: string | null
    tipovar: string | null
    longitud: string | null
    tipoe: string | null
    salto: string | null
    salto_ns_nc: string | null
    unidad_analisis: string | null
    cantidad_resumen: number | null
    despliegue: string | null
    ver_id: string | null
    optativo: boolean | null
    es_activo: boolean
    formulario_principal: boolean | null
    var_name: string | null
    var_name_especial: string | null
    expresion_habilitar: string | null
    valor_ns_nc: string | null
    valor_sin_dato: string | null
    leer: boolean | null
    calculada: boolean | null
    libre: boolean | null
    especial: string | null // json como texto
}

// campos que se cambian desde el panel de propiedades (id_casillero, irrepetible y var_name los calcula la base)
export const CAMPOS_EDITABLES = [
    'casillero', 'nombre', 'aclaracion', 'tipovar', 'longitud', 'tipoe', 'salto', 'salto_ns_nc', 'unidad_analisis',
    'cantidad_resumen', 'despliegue', 'ver_id', 'optativo', 'es_activo', 'formulario_principal', 'var_name_especial',
    'expresion_habilitar', 'valor_ns_nc', 'valor_sin_dato', 'leer', 'calculada', 'libre', 'especial',
] as const;
export type CampoEditable = typeof CAMPOS_EDITABLES[number];

// los textos que ve el encuestado: los puede cambiar quien tiene casilleros_texto.editar; el resto, sólo el superuser
export const CAMPOS_DE_TEXTO: CampoEditable[] = ['nombre', 'aclaracion'];

export type CambiosDeCasillero = { [campo in CampoEditable]?: CasilleroEditable[campo] };

export type TipoCasillero = {
    tipoc: string
    denominacion: string
    irrepetible: boolean
    puedeSerVar: boolean | null // null: puede tener o no tipo de variable
    despHijos: string | null
}

export type Inclusion = { padre: string, hijo: string };

export type PermisosEditor = {
    textos: boolean
    estructura: boolean
}

export type DatosEditorMetadatos = {
    operativo: string
    operativos: string[]
    cerrado: boolean // operativos.disform_cerrado: la base no deja modificar
    permisos: PermisosEditor
    perfil: PerfilTablero
    tipos: TipoCasillero[]
    inclusiones: Inclusion[]
    tipovars: string[]
    unidadesAnalisis: string[]
    clavesUA: string[] // pk_agregada de cada unidad de análisis (vivienda, hogar, persona...): variables válidas en las condiciones
    casilleros: CasilleroEditable[]
}

export type NuevoCasillero = {
    padre: string | null // null: un formulario nuevo
    tipoc: string
    casillero: string
    nombre: string | null
    tipovar: string | null
    opciones?: { casillero: string, nombre: string }[] // opciones (tipoc O) que se crean adentro, por ejemplo Sí / No
    unidad_analisis?: string | null // para los formularios
    formulario_principal?: boolean | null
}

export type OperacionMetadatos =
    | { tipo: 'crear', nuevo: NuevoCasillero, posicion: number | null } // posicion entre los hermanos; null: al final
    | { tipo: 'modificar', id_casillero: string, cambios: CambiosDeCasillero }
    | { tipo: 'mover', id_casillero: string, padre: string, posicion: number, orden?: number | null } // orden: número exacto (al deshacer); si no, el hueco que corresponda
    | { tipo: 'eliminar', id_casillero: string }
    // vuelve un formulario (o cualquier casillero con lo que tiene adentro) a como estaba: deshacer y restaurar versiones
    | { tipo: 'reemplazar', raiz: string, casilleros: CasilleroEditable[] };

export type Problema = {
    id_casillero: string
    gravedad: 'error' | 'aviso' | 'falta' // falta: un dato que el tipo necesita para mostrarse bien, aunque la base lo deje vacío
    mensaje: string
    campo?: CampoEditable // el campo que hay que completar o corregir, si es uno
}

/* árbol */

export function ordenarHermanos(a: CasilleroEditable, b: CasilleroEditable): number {
    return (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER) || a.casillero.localeCompare(b.casillero, 'es', { numeric: true });
}

export function hijosDe(casilleros: CasilleroEditable[], idPadre: string | null): CasilleroEditable[] {
    return casilleros.filter(c => c.padre == idPadre).sort(ordenarHermanos);
}

// ids de todos los descendientes (sin incluir el casillero)
export function descendientes(casilleros: CasilleroEditable[], id: string): string[] {
    var resultado: string[] = [];
    var pendientes = [id];
    while (pendientes.length) {
        var actual = pendientes.pop()!;
        casilleros.filter(c => c.padre == actual).forEach(hijo => {
            resultado.push(hijo.id_casillero);
            pendientes.push(hijo.id_casillero);
        });
    }
    return resultado;
}

export function buscarTipo(tipos: TipoCasillero[], tipoc: string): TipoCasillero | null {
    return tipos.find(t => t.tipoc == tipoc) ?? null;
}

export function puedeIncluir(inclusiones: Inclusion[], tipocPadre: string, tipocHijo: string): boolean {
    return inclusiones.some(i => i.padre == tipocPadre && i.hijo == tipocHijo);
}

// el id_casillero que calcula el trigger irrepetible_trg: el código si el tipo es irrepetible; si no, padre/código
export function idQueTendria(tipo: TipoCasillero | null, padre: string | null, casillero: string): string {
    return tipo?.irrepetible ? casillero : `${padre != null ? padre + '/' : (tipo?.tipoc ?? '') + ':'}${casillero}`;
}

/* datos que cada tipo necesita para desplegarse bien (la base los deja vacíos, pero el formulario queda incompleto) */

export type DatoRequerido = {
    campos: CampoEditable[] // alcanza con que esté alguno
    mensaje: string
}

export const DATOS_REQUERIDOS: { [tipoc: string]: DatoRequerido[] } = {
    F: [{ campos: ['nombre'], mensaje: 'falta el título del formulario' }, { campos: ['unidad_analisis'], mensaje: 'falta la unidad de análisis' }],
    B: [{ campos: ['nombre'], mensaje: 'falta el título del bloque' }],
    CP: [{ campos: ['nombre'], mensaje: 'falta el título del conjunto de preguntas' }],
    P: [{ campos: ['nombre'], mensaje: 'falta el texto de la pregunta' }],
    O: [{ campos: ['nombre'], mensaje: 'falta el texto de la opción' }],
    OM: [{ campos: ['nombre'], mensaje: 'falta el texto de la opción múltiple' }],
    MATRIZ: [{ campos: ['nombre'], mensaje: 'falta el título de la matriz' }],
    PMATRIZ: [{ campos: ['nombre'], mensaje: 'falta el texto de la pregunta' }],
    TEXTO: [{ campos: ['nombre', 'aclaracion'], mensaje: 'falta el texto' }],
    // el filtro muestra su texto y salta a otro casillero si no corresponde seguir
    FILTRO: [{ campos: ['nombre', 'aclaracion'], mensaje: 'falta el texto del filtro' }, { campos: ['salto'], mensaje: 'falta a dónde salta el filtro' }],
    // la consistencia se muestra cuando se cumple su condición
    CONS: [{ campos: ['nombre'], mensaje: 'falta el mensaje de la consistencia' }, { campos: ['expresion_habilitar'], mensaje: 'falta la condición de la consistencia' }],
    // el botón abre el formulario que dice salto (sin él, el formulario no se puede desplegar)
    BF: [{ campos: ['salto'], mensaje: 'falta el formulario que abre el botón' }],
};

// tipos que no tienen sentido vacíos
export const TIPOS_CON_CONTENIDO = ['F', 'B', 'CP', 'MATRIZ', 'PMATRIZ'];

function vacio(valor: CasilleroEditable[keyof CasilleroEditable]): boolean {
    // un solo espacio es un título en blanco a propósito (por ejemplo el bloque S1.2 de etoi): no cuenta como faltante
    return valor == null || valor === '';
}

export function datosFaltantes(casillero: CasilleroEditable, casilleros: CasilleroEditable[]): Problema[] {
    var hijos = casilleros.filter(c => c.padre == casillero.id_casillero);
    // una pregunta de opciones sin texto es habitual (filas de una tabla de razones, por ejemplo): se avisa pero no se cuenta como dato faltante
    var conOpciones = casillero.tipoc == 'P' && hijos.some(h => h.tipoc == 'O');
    var faltantes: Problema[] = (DATOS_REQUERIDOS[casillero.tipoc] ?? [])
        .filter(dato => dato.campos.every(campo => vacio(casillero[campo])))
        .map((dato): Problema => ({ id_casillero: casillero.id_casillero, gravedad: conOpciones && dato.campos[0] == 'nombre' ? 'aviso' : 'falta', mensaje: dato.mensaje, campo: dato.campos[0] }));
    if (TIPOS_CON_CONTENIDO.includes(casillero.tipoc) && hijos.length == 0) {
        // un bloque vacío puede ser a propósito (el formulario de la TEM se completa desde código): sólo el formulario vacío es un dato faltante
        faltantes.push({ id_casillero: casillero.id_casillero, gravedad: casillero.tipoc == 'F' ? 'falta' : 'aviso', mensaje: 'está vacío: arrastrá casilleros adentro' });
    }
    if (casillero.tipoc == 'P' && casillero.tipovar == null && hijos.length == 0) {
        faltantes.push({ id_casillero: casillero.id_casillero, gravedad: 'falta', mensaje: 'la pregunta no tiene tipo de variable ni preguntas adentro', campo: 'tipovar' });
    }
    if (casillero.tipoc == 'OM' && !hijos.some(h => h.tipoc == 'O')) {
        faltantes.push({ id_casillero: casillero.id_casillero, gravedad: 'falta', mensaje: 'faltan las opciones' });
    }
    if (casillero.tipoc == 'BF' && !vacio(casillero.salto)
        && !casilleros.some(c => c.tipoc == 'F' && (c.casillero == casillero.salto || c.id_casillero == casillero.salto))) {
        faltantes.push({ id_casillero: casillero.id_casillero, gravedad: 'error', mensaje: `el botón abre ${casillero.salto}, que no es un formulario del operativo`, campo: 'salto' });
    }
    return faltantes;
}

/* reglas (las de la columna "ok" de casilleros y las del trigger irrepetible_trg) */

const TIPOS_CON_OPCIONES = ['P', 'OM'];
const TIPOVARS_DE_OPCIONES = ['opciones', 'si_no', 'si_no_nn'];

function nombreDeTipo(tipos: TipoCasillero[], tipoc: string): string {
    return buscarTipo(tipos, tipoc)?.denominacion ?? tipoc;
}

export function problemasDelCasillero(casillero: CasilleroEditable, casilleros: CasilleroEditable[], tipos: TipoCasillero[], inclusiones: Inclusion[], variablesExtra: string[] = []): Problema[] {
    var problemas: Problema[] = [];
    var problema = (gravedad: Problema['gravedad'], mensaje: string, campo?: CampoEditable) =>
        problemas.push({ id_casillero: casillero.id_casillero, gravedad, mensaje, ...(campo ? { campo } : {}) });
    var tipo = buscarTipo(tipos, casillero.tipoc);
    if (tipo == null) {
        problema('error', `no existe el tipo de casillero ${casillero.tipoc}`);
    }
    if (casillero.padre == null) {
        if (casillero.tipoc != 'F') {
            problema('error', 'sólo los formularios pueden estar fuera de otro casillero');
        }
    } else {
        var padre = casilleros.find(c => c.id_casillero == casillero.padre);
        if (padre == null) {
            problema('error', `no existe el casillero padre ${casillero.padre}`);
        } else if (!puedeIncluir(inclusiones, padre.tipoc, casillero.tipoc)) {
            problema('error', `un/a ${nombreDeTipo(tipos, casillero.tipoc)} no puede estar dentro de un/a ${nombreDeTipo(tipos, padre.tipoc)}`);
        }
    }
    if (tipo?.puedeSerVar === false && casillero.tipovar != null) {
        problema('error', 'este tipo de casillero no lleva tipo de variable', 'tipovar');
    } else if (tipo?.puedeSerVar === true && casillero.tipovar == null) {
        problema('error', 'falta el tipo de variable', 'tipovar');
    }
    var opciones = casilleros.filter(c => c.padre == casillero.id_casillero && c.tipoc == 'O');
    var nombresDeOpciones = opciones.map(o => (o.nombre ?? '').toLowerCase()).sort().join(',');
    var conOpciones = TIPOS_CON_OPCIONES.includes(casillero.tipoc);
    // el error primero (la columna "ok" sugiere si_no antes, aunque el tipo de variable no sea de opciones)
    if (opciones.length && conOpciones && (casillero.tipovar == null || !TIPOVARS_DE_OPCIONES.includes(casillero.tipovar))) {
        problema('error', 'tiene opciones: el tipo de variable debe ser opciones o si_no', 'tipovar');
    } else if (nombresDeOpciones == 'no,sí' && conOpciones && casillero.tipovar != 'si_no') {
        problema('aviso', 'tiene opciones Sí y No: el tipo de variable debería ser si_no', 'tipovar');
    } else if (nombresDeOpciones == 'no,si') {
        problema('aviso', 'la opción "Si" va con tilde: "Sí"');
    } else if (opciones.length && !conOpciones) {
        problema('error', 'sólo las preguntas pueden tener opciones');
    } else if (opciones.length == 0 && conOpciones && casillero.tipovar != null && TIPOVARS_DE_OPCIONES.includes(casillero.tipovar)) {
        problema('error', 'faltan las opciones');
    }
    if (casillero.casillero.includes('/')) {
        problema('error', 'el código no puede tener "/"', 'casillero');
    }
    if (casillero.tipoc != 'BF' && casillero.salto != null && casillero.salto != '' && casillero.salto.toLowerCase() != 'fin' && !casilleros.some(c => c.id_casillero == casillero.salto || c.casillero == casillero.salto)) {
        problemas.push({ id_casillero: casillero.id_casillero, gravedad: 'aviso', mensaje: `el salto apunta a ${casillero.salto}, que no está en el operativo`, campo: 'salto' });
    }
    if (casillero.expresion_habilitar) {
        var desconocidas = variablesDesconocidas(casillero.expresion_habilitar, [...variablesDelOperativo(casilleros), ...variablesExtra]);
        if (desconocidas.length) {
            problema('aviso', `la condición usa variables que no están en el operativo: ${desconocidas.join(', ')}`, 'expresion_habilitar');
        }
    }
    return problemas.concat(datosFaltantes(casillero, casilleros));
}

export function problemasDelOperativo(casilleros: CasilleroEditable[], tipos: TipoCasillero[], inclusiones: Inclusion[], variablesExtra: string[] = []): Problema[] {
    return casilleros.reduce((problemas: Problema[], casillero) => problemas.concat(problemasDelCasillero(casillero, casilleros, tipos, inclusiones, variablesExtra)), []);
}

/* validación de una operación antes de aplicarla (el servidor la repite) */

export type ContextoValidacion = Pick<DatosEditorMetadatos, 'casilleros' | 'tipos' | 'inclusiones' | 'permisos' | 'cerrado'>;

function validarCodigo(casillero: string): string | null {
    if (casillero.trim() == '') return 'falta el código';
    if (casillero.includes('/')) return 'el código no puede tener "/"';
    return null;
}

function validarTipovar(tipo: TipoCasillero | null, tipovar: string | null): string | null {
    if (tipo?.puedeSerVar === false && tipovar != null) return 'este tipo de casillero no lleva tipo de variable';
    if (tipo?.puedeSerVar === true && tipovar == null) return 'falta el tipo de variable';
    return null;
}

function validarLugar(contexto: ContextoValidacion, tipoc: string, idPadre: string | null, casillero: string, idPropio: string | null): string | null {
    if (idPadre == null) {
        if (tipoc != 'F') return 'sólo los formularios pueden estar fuera de otro casillero';
    } else {
        var padre = contexto.casilleros.find(c => c.id_casillero == idPadre);
        if (padre == null) return `no existe el casillero ${idPadre}`;
        if (!puedeIncluir(contexto.inclusiones, padre.tipoc, tipoc)) {
            return `un/a ${nombreDeTipo(contexto.tipos, tipoc)} no puede ir dentro de un/a ${nombreDeTipo(contexto.tipos, padre.tipoc)}`;
        }
    }
    var id = idQueTendria(buscarTipo(contexto.tipos, tipoc), idPadre, casillero);
    if (contexto.casilleros.some(c => c.id_casillero == id && c.id_casillero != idPropio)) {
        return `ya existe el casillero ${id}`;
    }
    return null;
}

// null si se puede aplicar; si no, el motivo
export function validarOperacion(contexto: ContextoValidacion, operacion: OperacionMetadatos): string | null {
    if (contexto.cerrado) return 'el diseño de formularios del operativo está cerrado';
    switch (operacion.tipo) {
        case 'crear': {
            if (!contexto.permisos.estructura) return 'no tiene permiso para agregar casilleros';
            var { nuevo } = operacion;
            var tipo = buscarTipo(contexto.tipos, nuevo.tipoc);
            if (tipo == null) return `no existe el tipo de casillero ${nuevo.tipoc}`;
            return validarCodigo(nuevo.casillero)
                ?? validarTipovar(tipo, nuevo.tipovar)
                ?? validarLugar(contexto, nuevo.tipoc, nuevo.padre, nuevo.casillero, null)
                ?? (nuevo.opciones?.length && !puedeIncluir(contexto.inclusiones, nuevo.tipoc, 'O') ? `un/a ${tipo.denominacion} no puede tener opciones` : null)
                ?? (nuevo.padre == null && vacio(nuevo.unidad_analisis ?? null) ? 'falta la unidad de análisis del formulario' : null);
        }
        case 'reemplazar': {
            if (!contexto.permisos.estructura) return 'no tiene permiso para restaurar formularios';
            // raiz es lo que se saca (puede no existir); la copia tiene que colgar de un único casillero (puede tener otro id)
            var ids = new Set(operacion.casilleros.map(c => c.id_casillero));
            if (ids.size != operacion.casilleros.length) return 'la copia tiene casilleros repetidos';
            var raices = operacion.casilleros.filter(c => c.padre == null || !ids.has(c.padre));
            if (raices.length != 1) return 'la copia tiene que tener un único casillero de arriba';
            var raiz = raices[0];
            var reemplazados = new Set([operacion.raiz, ...descendientes(contexto.casilleros, operacion.raiz)]);
            var choca = operacion.casilleros.find(c => !reemplazados.has(c.id_casillero) && contexto.casilleros.some(otro => otro.id_casillero == c.id_casillero));
            if (choca) return `ya existe el casillero ${choca.id_casillero} fuera de lo que se restaura`;
            var actualRaiz = contexto.casilleros.find(c => c.id_casillero == operacion.raiz);
            return actualRaiz != null && actualRaiz.padre != raiz.padre ? 'la copia está en otro lugar del formulario' : null;
        }
        case 'modificar': {
            var actual = contexto.casilleros.find(c => c.id_casillero == operacion.id_casillero);
            if (actual == null) return `no existe el casillero ${operacion.id_casillero}`;
            var campos = Object.keys(operacion.cambios);
            if (campos.some(campo => !(CAMPOS_EDITABLES as readonly string[]).includes(campo))) return 'hay campos que no se pueden cambiar';
            var soloTextos = campos.every(campo => (CAMPOS_DE_TEXTO as string[]).includes(campo));
            if (!(soloTextos ? contexto.permisos.textos || contexto.permisos.estructura : contexto.permisos.estructura)) {
                return 'no tiene permiso para cambiar esos campos';
            }
            var resultado: CasilleroEditable = { ...actual, ...operacion.cambios };
            var tipoActual = buscarTipo(contexto.tipos, actual.tipoc);
            return validarCodigo(resultado.casillero)
                ?? ('tipovar' in operacion.cambios ? validarTipovar(tipoActual, resultado.tipovar) : null)
                ?? (resultado.casillero != actual.casillero
                    ? (contexto.casilleros.some(c => c.id_casillero == idQueTendria(tipoActual, actual!.padre, resultado.casillero) && c.id_casillero != actual!.id_casillero)
                        ? `ya existe el casillero ${idQueTendria(tipoActual, actual.padre, resultado.casillero)}` : null)
                    : null);
        }
        case 'mover': {
            if (!contexto.permisos.estructura) return 'no tiene permiso para mover casilleros';
            var movido = contexto.casilleros.find(c => c.id_casillero == operacion.id_casillero);
            if (movido == null) return `no existe el casillero ${operacion.id_casillero}`;
            if (operacion.padre == movido.id_casillero || descendientes(contexto.casilleros, movido.id_casillero).includes(operacion.padre)) {
                return 'no se puede mover un casillero adentro de sí mismo';
            }
            return validarLugar(contexto, movido.tipoc, operacion.padre, movido.casillero, movido.id_casillero);
        }
        case 'eliminar': {
            if (!contexto.permisos.estructura) return 'no tiene permiso para borrar casilleros';
            return contexto.casilleros.some(c => c.id_casillero == operacion.id_casillero) ? null : `no existe el casillero ${operacion.id_casillero}`;
        }
    }
}

/* ayudas para crear */

// código sugerido para un casillero nuevo: el siguiente número entre los hermanos (opciones) o entre los del mismo tipo
export function proximoCodigo(casilleros: CasilleroEditable[], tipoc: string, idPadre: string | null): string {
    var numeros = (lista: CasilleroEditable[], prefijo: string) => lista
        .map(c => c.casillero.startsWith(prefijo) ? Number(c.casillero.slice(prefijo.length)) : NaN)
        .filter(n => Number.isInteger(n));
    if (tipoc == 'O') {
        var deHermanos = numeros(casilleros.filter(c => c.padre == idPadre && c.tipoc == 'O'), '');
        return String(deHermanos.length ? Math.max(...deHermanos) + 1 : 1);
    }
    var prefijo = tipoc == 'P' ? 'P' : tipoc;
    var delTipo = numeros(casilleros.filter(c => c.tipoc == tipoc), prefijo);
    return prefijo + (delTipo.length ? Math.max(...delTipo) + 1 : 1);
}

export type PlantillaCasillero = {
    id: string
    titulo: string
    descripcion: string
    tipoc: string
    tipovar: string | null
    nombre: string
    opciones?: { casillero: string, nombre: string }[]
}

// casilleros armados que se arrastran de la paleta (además de cada tipo suelto)
export const PLANTILLAS: PlantillaCasillero[] = [
    { id: 'si_no', titulo: 'pregunta sí / no', descripcion: 'pregunta con opciones Sí (1) y No (2)', tipoc: 'P', tipovar: 'si_no', nombre: '¿...?', opciones: [{ casillero: '1', nombre: 'Sí' }, { casillero: '2', nombre: 'No' }] },
    { id: 'opciones', titulo: 'pregunta de opciones', descripcion: 'pregunta con tres opciones para completar', tipoc: 'P', tipovar: 'opciones', nombre: '¿...?', opciones: [{ casillero: '1', nombre: 'opción 1' }, { casillero: '2', nombre: 'opción 2' }, { casillero: '3', nombre: 'opción 3' }] },
    { id: 'numero', titulo: 'pregunta numérica', descripcion: 'respuesta con un número', tipoc: 'P', tipovar: 'numero', nombre: '¿Cuántos...?' },
    { id: 'texto', titulo: 'pregunta de texto', descripcion: 'respuesta abierta', tipoc: 'P', tipovar: 'texto', nombre: '¿...?' },
    { id: 'fecha', titulo: 'pregunta de fecha', descripcion: 'respuesta con una fecha', tipoc: 'P', tipovar: 'fecha', nombre: '¿Qué fecha...?' },
];

/* expresiones (expresion_habilitar): variables que usan y ayuda para escribirlas */

// palabras de las expresiones (sintaxis sql que se compila a js en operativo_estructura_completa) y funciones de helpers-casilleros
export const PALABRAS_DE_EXPRESIONES = ['and', 'or', 'not', 'is', 'null', 'true', 'false', 'in', 'between', 'like', 'distinct', 'from'];
export const FUNCIONES_DE_EXPRESIONES = ['blanco', 'informado', 'hoy', 'fecha_valida', 'mesanio_valido', 'nsnc', 'par', 'edad_mes_annio_valido'];

// identificadores que usa la expresión como variables (los seguidos de "(" son funciones; lo que está entre comillas, texto)
export function variablesDeExpresion(expresion: string): string[] {
    var sinTextos = expresion.replace(/'[^']*'/g, ' ').replace(/"[^"]*"/g, ' ');
    var variables: string[] = [];
    var identificador = /\$?[A-Za-z_][A-Za-z0-9_]*/g;
    var encontrado: RegExpExecArray | null;
    while ((encontrado = identificador.exec(sinTextos)) != null) {
        var nombre = encontrado[0];
        var despues = sinTextos.slice(identificador.lastIndex).replace(/^\s+/, '');
        var antes = sinTextos.slice(0, encontrado.index);
        // seguido de ( es una función; con . es un esquema o tabla (dbo.fun(...)); precedido de . es un miembro de ellos
        if (despues.startsWith('(') || despues.startsWith('.') || /\.\s*$/.test(antes) || PALABRAS_DE_EXPRESIONES.includes(nombre.toLowerCase())) continue;
        if (!variables.includes(nombre)) variables.push(nombre);
    }
    return variables;
}

export function variablesDelOperativo(casilleros: CasilleroEditable[]): string[] {
    return casilleros.map(c => c.var_name).filter((v): v is string => v != null);
}

export function variablesDesconocidas(expresion: string, conocidas: string[]): string[] {
    var minusculas = new Set(conocidas.map(v => v.toLowerCase()));
    return variablesDeExpresion(expresion).filter(v => !minusculas.has(v.toLowerCase()) && !v.startsWith('$'));
}

/* simulación local de las operaciones (modo borrador): hace lo mismo que el servidor y los triggers */

export function subarbol(casilleros: CasilleroEditable[], raiz: string): CasilleroEditable[] {
    var ids = new Set([raiz, ...descendientes(casilleros, raiz)]);
    return casilleros.filter(c => ids.has(c.id_casillero));
}

// el var_name que calcula irrepetible_trg a partir del id (o var_name_especial si hay)
export function varNameDerivado(casillero: Pick<CasilleroEditable, 'id_casillero' | 'tipovar' | 'var_name_especial'>, operativo: string): string | null {
    if (casillero.tipovar == null) return null;
    if (casillero.var_name_especial != null) return casillero.var_name_especial;
    var base = casillero.id_casillero.toLowerCase()
        .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i').replace(/[óò]/g, 'o').replace(/[úùü]/g, 'u')
        .replace(/ñ/g, 'nni').replace(/[^0-9a-z]/g, '_');
    return /^[0-9]/.test(base) ? operativo.toLowerCase().replace(/[^a-z]/g, '') + base : base;
}

function conIdRecalculado(casillero: CasilleroEditable, tipos: TipoCasillero[], operativo: string): CasilleroEditable {
    var tipo = buscarTipo(tipos, casillero.tipoc);
    var recalculado = { ...casillero, id_casillero: idQueTendria(tipo, casillero.padre, casillero.casillero), irrepetible: tipo?.irrepetible ?? null };
    return { ...recalculado, var_name: varNameDerivado(recalculado, operativo) };
}

// cambia un casillero y, si cambió su id, lleva a sus hijos (y a los de ellos) al id nuevo, como llevarHijosAlIdNuevo
function renombrar(casilleros: CasilleroEditable[], idViejo: string, cambiado: CasilleroEditable, tipos: TipoCasillero[], operativo: string): CasilleroEditable[] {
    var nuevo = conIdRecalculado(cambiado, tipos, operativo);
    var resultado = casilleros.map(c => c.id_casillero == idViejo ? nuevo : c);
    if (nuevo.id_casillero != idViejo) {
        resultado.filter(c => c.padre == idViejo).forEach(hijo => {
            resultado = renombrar(resultado, hijo.id_casillero, { ...hijo, padre: nuevo.id_casillero }, tipos, operativo);
        });
    }
    return resultado;
}

function numerar(casilleros: CasilleroEditable[], ids: string[]): CasilleroEditable[] {
    return casilleros.map(c => ids.includes(c.id_casillero) ? { ...c, orden: (ids.indexOf(c.id_casillero) + 1) * 10 } : c);
}

// el orden de los hermanos con el casillero ubicado en la posición pedida (también lo usa el servidor)
export function idsConInsertado(hermanos: CasilleroEditable[], id: string, posicion: number | null): string[] {
    var ids = hermanos.map(h => h.id_casillero).filter(otro => otro != id);
    ids.splice(posicion == null ? ids.length : Math.max(0, Math.min(posicion, ids.length)), 0, id);
    return ids;
}

// el orden que le toca a un casillero que se inserta entre sus hermanos (sin él, en el orden en que se muestran) en la posición dada,
// tocando lo menos posible: ocupa el hueco entre sus vecinos. Los órdenes de la base suelen tener huecos irregulares (1,2,4,10,20 o 15,17,19)
// y hay que respetarlos; sólo si no hay lugar se renumera a los hermanos de 10 en 10
export function ordenParaInsertar(hermanos: CasilleroEditable[], posicion: number | null): { orden: number, renumerar: boolean } {
    var n = hermanos.length;
    if (n == 0) return { orden: 10, renumerar: false };
    var lugar = posicion == null ? n : Math.max(0, Math.min(posicion, n));
    var antes = lugar > 0 ? hermanos[lugar - 1].orden : null;
    var despues = lugar < n ? hermanos[lugar].orden : null;
    var sinLugar = { orden: (lugar + 1) * 10, renumerar: true };
    if (lugar == n) return antes != null ? { orden: antes + 10, renumerar: false } : sinLugar;
    if (lugar == 0) return despues != null && despues >= 2 ? { orden: Math.floor(despues / 2), renumerar: false } : sinLugar;
    if (antes != null && despues != null && despues - antes >= 2) return { orden: Math.floor((antes + despues) / 2), renumerar: false };
    return sinLugar;
}
export function casilleroVacio(id_casillero: string, padre: string | null, tipoc: string, casillero: string): CasilleroEditable {
    return {
        id_casillero, padre, tipoc, casillero, orden: null, irrepetible: null, nombre: null, aclaracion: null, tipovar: null,
        longitud: null, tipoe: null, salto: null, salto_ns_nc: null, unidad_analisis: null, cantidad_resumen: null, despliegue: null,
        ver_id: null, optativo: null, es_activo: true, formulario_principal: null, var_name: null, var_name_especial: null,
        expresion_habilitar: null, valor_ns_nc: null, valor_sin_dato: null, leer: null, calculada: null, libre: null, especial: null,
    };
}

// deja al casillero en la posición pedida entre sus hermanos tocando lo mínimo (ver ordenParaInsertar); orden: número exacto (deshacer)
function ubicar(casilleros: CasilleroEditable[], idPadre: string | null, id: string, posicion: number | null, ordenExacto?: number | null): CasilleroEditable[] {
    if (ordenExacto !== undefined) return casilleros.map(c => c.id_casillero == id ? { ...c, orden: ordenExacto } : c);
    var hermanos = hijosDe(casilleros, idPadre).filter(h => h.id_casillero != id);
    var { orden, renumerar } = ordenParaInsertar(hermanos, posicion);
    return renumerar
        ? numerar(casilleros, idsConInsertado(hermanos, id, posicion))
        : casilleros.map(c => c.id_casillero == id ? { ...c, orden } : c);
}
// los casilleros como quedarían después de la operación (no valida: llamar antes a validarOperacion)
export function aplicarOperacionLocal(casilleros: CasilleroEditable[], tipos: TipoCasillero[], operativo: string, operacion: OperacionMetadatos): CasilleroEditable[] {
    switch (operacion.tipo) {
        case 'crear': {
            var { nuevo } = operacion;
            var creado = conIdRecalculado({
                ...casilleroVacio('', nuevo.padre, nuevo.tipoc, nuevo.casillero), nombre: nuevo.nombre, tipovar: nuevo.tipovar,
                unidad_analisis: nuevo.unidad_analisis ?? null, formulario_principal: nuevo.formulario_principal ?? null,
            }, tipos, operativo);
            var opciones = (nuevo.opciones ?? []).map((opcion, i) => conIdRecalculado({
                ...casilleroVacio('', creado.id_casillero, 'O', opcion.casillero), nombre: opcion.nombre, orden: (i + 1) * 10,
            }, tipos, operativo));
            return ubicar([...casilleros, creado, ...opciones], nuevo.padre, creado.id_casillero, operacion.posicion);
        }
        case 'modificar': {
            var actual = casilleros.find(c => c.id_casillero == operacion.id_casillero);
            return actual == null ? casilleros : renombrar(casilleros, actual.id_casillero, { ...actual, ...operacion.cambios }, tipos, operativo);
        }
        case 'mover': {
            var movido = casilleros.find(c => c.id_casillero == operacion.id_casillero);
            if (movido == null) return casilleros;
            var conMovido = renombrar(casilleros, movido.id_casillero, { ...movido, padre: operacion.padre }, tipos, operativo);
            var idMovido = idQueTendria(buscarTipo(tipos, movido.tipoc), operacion.padre, movido.casillero);
            return ubicar(conMovido, operacion.padre, idMovido, operacion.posicion, operacion.orden);
        }
        case 'eliminar': {
            var borrar = new Set([operacion.id_casillero, ...descendientes(casilleros, operacion.id_casillero)]);
            return casilleros.filter(c => !borrar.has(c.id_casillero));
        }
        case 'reemplazar': {
            var reemplazados = new Set([operacion.raiz, ...descendientes(casilleros, operacion.raiz)]);
            return [...casilleros.filter(c => !reemplazados.has(c.id_casillero)), ...operacion.casilleros];
        }
    }
}

// las operaciones que deshacen y rehacen una operación sola (sin reescribir el formulario entero); null si no hay una inversa precisa
export function inversaDeOperacion(antes: CasilleroEditable[], tipos: TipoCasillero[], operacion: OperacionMetadatos): { deshacer: OperacionMetadatos[], rehacer: OperacionMetadatos[] } | null {
    switch (operacion.tipo) {
        case 'crear': {
            var creado = idQueTendria(buscarTipo(tipos, operacion.nuevo.tipoc), operacion.nuevo.padre, operacion.nuevo.casillero);
            return { deshacer: [{ tipo: 'eliminar', id_casillero: creado }], rehacer: [operacion] };
        }
        case 'modificar': {
            const actual = antes.find(c => c.id_casillero == operacion.id_casillero);
            if (actual == null) return null;
            var previos: CambiosDeCasillero = {};
            Object.keys(operacion.cambios).forEach(campo => Object.assign(previos, { [campo]: actual[campo as CampoEditable] }));
            var idNuevo = operacion.cambios.casillero != null ? idQueTendria(buscarTipo(tipos, actual.tipoc), actual.padre, operacion.cambios.casillero) : actual.id_casillero;
            return { deshacer: [{ tipo: 'modificar', id_casillero: idNuevo, cambios: previos }], rehacer: [operacion] };
        }
        case 'mover': {
            var movido = antes.find(c => c.id_casillero == operacion.id_casillero);
            if (movido == null || movido.padre == null) return null;
            var lugar = hijosDe(antes, movido.padre).findIndex(h => h.id_casillero == movido!.id_casillero);
            var idMovido = idQueTendria(buscarTipo(tipos, movido.tipoc), operacion.padre, movido.casillero);
            return { deshacer: [{ tipo: 'mover', id_casillero: idMovido, padre: movido.padre, posicion: Math.max(0, lugar), orden: movido.orden }], rehacer: [operacion] };
        }
        case 'eliminar': {
            var copia = subarbol(antes, operacion.id_casillero);
            return copia.length ? { deshacer: [{ tipo: 'reemplazar', raiz: operacion.id_casillero, casilleros: copia }], rehacer: [operacion] } : null;
        }
        case 'reemplazar':
            return null;
    }
}

// las operaciones que vuelven el formulario afectado a como estaba (y las que lo rehacen): el recurso general, reescribe el formulario
export function operacionesInversas(antes: CasilleroEditable[], despues: CasilleroEditable[], raizAntes: string | null, raizDespues: string | null): { deshacer: OperacionMetadatos[], rehacer: OperacionMetadatos[] } {
    var copiaAntes = raizAntes ? subarbol(antes, raizAntes) : [];
    var copiaDespues = raizDespues ? subarbol(despues, raizDespues) : [];
    return {
        deshacer: copiaAntes.length ? [{ tipo: 'reemplazar', raiz: raizDespues ?? raizAntes!, casilleros: copiaAntes }] : raizDespues ? [{ tipo: 'eliminar', id_casillero: raizDespues }] : [],
        rehacer: copiaDespues.length ? [{ tipo: 'reemplazar', raiz: raizAntes ?? raizDespues!, casilleros: copiaDespues }] : raizAntes ? [{ tipo: 'eliminar', id_casillero: raizAntes }] : [],
    };
}
