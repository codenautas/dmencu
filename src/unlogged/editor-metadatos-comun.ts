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
    casilleros: CasilleroEditable[]
}

export type NuevoCasillero = {
    padre: string
    tipoc: string
    casillero: string
    nombre: string | null
    tipovar: string | null
    opciones?: { casillero: string, nombre: string }[] // opciones (tipoc O) que se crean adentro, por ejemplo Sí / No
}

export type OperacionMetadatos =
    | { tipo: 'crear', nuevo: NuevoCasillero, posicion: number | null } // posicion entre los hermanos; null: al final
    | { tipo: 'modificar', id_casillero: string, cambios: CambiosDeCasillero }
    | { tipo: 'mover', id_casillero: string, padre: string, posicion: number }
    | { tipo: 'eliminar', id_casillero: string };

export type Problema = {
    id_casillero: string
    gravedad: 'error' | 'aviso'
    mensaje: string
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

/* reglas (las de la columna "ok" de casilleros y las del trigger irrepetible_trg) */

const TIPOS_CON_OPCIONES = ['P', 'OM'];
const TIPOVARS_DE_OPCIONES = ['opciones', 'si_no', 'si_no_nn'];

function nombreDeTipo(tipos: TipoCasillero[], tipoc: string): string {
    return buscarTipo(tipos, tipoc)?.denominacion ?? tipoc;
}

export function problemasDelCasillero(casillero: CasilleroEditable, casilleros: CasilleroEditable[], tipos: TipoCasillero[], inclusiones: Inclusion[]): Problema[] {
    var problemas: Problema[] = [];
    var problema = (gravedad: Problema['gravedad'], mensaje: string) => problemas.push({ id_casillero: casillero.id_casillero, gravedad, mensaje });
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
        problema('error', 'este tipo de casillero no lleva tipo de variable');
    } else if (tipo?.puedeSerVar === true && casillero.tipovar == null) {
        problema('error', 'falta el tipo de variable');
    }
    var opciones = casilleros.filter(c => c.padre == casillero.id_casillero && c.tipoc == 'O');
    var nombresDeOpciones = opciones.map(o => (o.nombre ?? '').toLowerCase()).sort().join(',');
    var conOpciones = TIPOS_CON_OPCIONES.includes(casillero.tipoc);
    // el error primero (la columna "ok" sugiere si_no antes, aunque el tipo de variable no sea de opciones)
    if (opciones.length && conOpciones && (casillero.tipovar == null || !TIPOVARS_DE_OPCIONES.includes(casillero.tipovar))) {
        problema('error', 'tiene opciones: el tipo de variable debe ser opciones o si_no');
    } else if (nombresDeOpciones == 'no,sí' && conOpciones && casillero.tipovar != 'si_no') {
        problema('aviso', 'tiene opciones Sí y No: el tipo de variable debería ser si_no');
    } else if (nombresDeOpciones == 'no,si') {
        problema('aviso', 'la opción "Si" va con tilde: "Sí"');
    } else if (opciones.length && !conOpciones) {
        problema('error', 'sólo las preguntas pueden tener opciones');
    } else if (opciones.length == 0 && conOpciones && casillero.tipovar != null && TIPOVARS_DE_OPCIONES.includes(casillero.tipovar)) {
        problema('error', 'faltan las opciones');
    }
    if (casillero.casillero.includes('/')) {
        problema('error', 'el código no puede tener "/"');
    }
    if (casillero.salto != null && casillero.salto != '' && !casilleros.some(c => c.id_casillero == casillero.salto || c.casillero == casillero.salto)) {
        problema('aviso', `el salto apunta a ${casillero.salto}, que no está en el operativo`);
    }
    return problemas;
}

export function problemasDelOperativo(casilleros: CasilleroEditable[], tipos: TipoCasillero[], inclusiones: Inclusion[]): Problema[] {
    return casilleros.reduce((problemas: Problema[], casillero) => problemas.concat(problemasDelCasillero(casillero, casilleros, tipos, inclusiones)), []);
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

function validarLugar(contexto: ContextoValidacion, tipoc: string, idPadre: string, casillero: string, idPropio: string | null): string | null {
    var padre = contexto.casilleros.find(c => c.id_casillero == idPadre);
    if (padre == null) return `no existe el casillero ${idPadre}`;
    if (!puedeIncluir(contexto.inclusiones, padre.tipoc, tipoc)) {
        return `un/a ${nombreDeTipo(contexto.tipos, tipoc)} no puede ir dentro de un/a ${nombreDeTipo(contexto.tipos, padre.tipoc)}`;
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
                ?? (nuevo.opciones?.length && !puedeIncluir(contexto.inclusiones, nuevo.tipoc, 'O') ? `un/a ${tipo.denominacion} no puede tener opciones` : null);
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
export function proximoCodigo(casilleros: CasilleroEditable[], tipoc: string, idPadre: string): string {
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
