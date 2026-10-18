"use strict";

// Editor visual de metadatos (ver docs/editor-metadatos.md): lee los casilleros de un operativo y aplica los cambios
// que arma el editor sobre la tabla casilleros. Los triggers de la base siguen validando (irrepetible_trg calcula
// id_casillero y var_name; control_disform_cerrado_trg no deja tocar un operativo cerrado).

import type { ProcedureContext } from "backend-plus";
import type { PerfilTablero } from "../unlogged/tipos-tablero";
import {
    CAMPOS_EDITABLES, CasilleroEditable, DatosEditorMetadatos, hijosDe, OperacionMetadatos, PermisosEditor, validarOperacion
} from "../unlogged/editor-metadatos-comun";
import type { Context, ProcedureDef } from "./types-dmencu";
import { tienePermiso } from "./ayuda";
import { ClienteTablero, FilaSql, numero, texto, ValorSql } from "./tablero";

/* permisos: ve y cambia textos quien tiene casilleros_texto.editar (como el menú metadatos); la estructura, el superuser
   (como la grilla casilleros, que sólo edita el admin) */

export function permisosEditor(context: Pick<Context, 'puede' | 'superuser'>): PermisosEditor & { ver: boolean } {
    var superuser = !!context.superuser;
    var textos = superuser || tienePermiso(context.puede, 'casilleros_texto.editar');
    return { ver: textos, textos, estructura: superuser };
}

/* lectura */

function verdaderoONull(fila: FilaSql, campo: string): boolean | null {
    var valor = fila[campo];
    return valor == null ? null : valor === true || valor === 'true' || valor === 't';
}

function numeroONull(fila: FilaSql, campo: string): number | null {
    return fila[campo] == null ? null : numero(fila, campo);
}

export function casilleroDesdeFila(fila: FilaSql): CasilleroEditable {
    var especial = fila.especial;
    return {
        id_casillero: texto(fila, 'id_casillero') ?? '',
        padre: texto(fila, 'padre'),
        tipoc: texto(fila, 'tipoc') ?? '',
        casillero: texto(fila, 'casillero') ?? '',
        orden: numeroONull(fila, 'orden'),
        irrepetible: verdaderoONull(fila, 'irrepetible'),
        nombre: texto(fila, 'nombre'),
        aclaracion: texto(fila, 'aclaracion'),
        tipovar: texto(fila, 'tipovar'),
        longitud: texto(fila, 'longitud'),
        tipoe: texto(fila, 'tipoe'),
        salto: texto(fila, 'salto'),
        salto_ns_nc: texto(fila, 'salto_ns_nc'),
        unidad_analisis: texto(fila, 'unidad_analisis'),
        cantidad_resumen: numeroONull(fila, 'cantidad_resumen'),
        despliegue: texto(fila, 'despliegue'),
        ver_id: texto(fila, 'ver_id'),
        optativo: verdaderoONull(fila, 'optativo'),
        es_activo: verdaderoONull(fila, 'es_activo') ?? true,
        formulario_principal: verdaderoONull(fila, 'formulario_principal'),
        var_name: texto(fila, 'var_name'),
        var_name_especial: texto(fila, 'var_name_especial'),
        expresion_habilitar: texto(fila, 'expresion_habilitar'),
        valor_ns_nc: texto(fila, 'valor_ns_nc'),
        valor_sin_dato: texto(fila, 'valor_sin_dato'),
        leer: verdaderoONull(fila, 'leer'),
        calculada: verdaderoONull(fila, 'calculada'),
        libre: verdaderoONull(fila, 'libre'),
        especial: especial == null ? null : typeof especial == 'string' ? especial : JSON.stringify(especial),
    };
}

async function filas(client: ClienteTablero, sql: string, params: ValorSql[]): Promise<FilaSql[]> {
    return (await client.query(sql, params).fetchAll()).rows;
}

const CAMPOS_LEIDOS = ['id_casillero', 'padre', 'tipoc', 'casillero', 'orden', 'irrepetible', 'var_name', ...CAMPOS_EDITABLES];

export async function leerCasilleros(client: ClienteTablero, operativo: string): Promise<CasilleroEditable[]> {
    return (await filas(client, `
        select ${CAMPOS_LEIDOS.map(campo => `c.${campo}`).join(', ')}
            from casilleros c
            where c.operativo = $1
            order by c.padre nulls first, c.orden nulls last, c.casillero`, [operativo])).map(casilleroDesdeFila);
}

export async function traerDatosEditor(client: ClienteTablero, context: Context, perfil: PerfilTablero, operativoPedido: string | null): Promise<DatosEditorMetadatos> {
    var permisos = permisosEditor(context);
    if (!permisos.ver) {
        throw new Error('no tiene permiso para editar metadatos');
    }
    var operativos = (await filas(client, `select operativo from operativos order by operativo`, [])).map(f => texto(f, 'operativo') ?? '');
    var [parametros] = await filas(client, `select operativo from parametros where unico_registro`, []);
    var operativo = operativoPedido ?? texto(parametros, 'operativo') ?? operativos[0] ?? '';
    if (!operativos.includes(operativo)) {
        throw new Error(`no existe el operativo ${operativo}`);
    }
    var [datosOperativo] = await filas(client, `select disform_cerrado from operativos where operativo = $1`, [operativo]);
    return {
        operativo,
        operativos,
        cerrado: verdaderoONull(datosOperativo, 'disform_cerrado') ?? false,
        permisos: { textos: permisos.textos, estructura: permisos.estructura },
        perfil,
        tipos: (await filas(client, `select tipoc, denominacion, irrepetible, puede_ser_var, desp_hijos from tipoc order by tipoc`, [])).map(f => ({
            tipoc: texto(f, 'tipoc') ?? '',
            denominacion: texto(f, 'denominacion') ?? texto(f, 'tipoc') ?? '',
            irrepetible: verdaderoONull(f, 'irrepetible') ?? false,
            puedeSerVar: verdaderoONull(f, 'puede_ser_var'),
            despHijos: texto(f, 'desp_hijos'),
        })),
        inclusiones: (await filas(client, `select tipoc_padre, tipoc_hijo from tipoc_tipoc`, [])).map(f => ({
            padre: texto(f, 'tipoc_padre') ?? '', hijo: texto(f, 'tipoc_hijo') ?? '',
        })),
        tipovars: (await filas(client, `select tipovar from tipovar order by tipovar`, [])).map(f => texto(f, 'tipovar') ?? ''),
        unidadesAnalisis: (await filas(client, `select unidad_analisis from unidad_analisis where operativo = $1 order by unidad_analisis`, [operativo]))
            .map(f => texto(f, 'unidad_analisis') ?? ''),
        casilleros: await leerCasilleros(client, operativo),
    };
}

/* escritura */

// cuando cambia el id de un casillero (porque cambió su padre o su código y no es irrepetible) hay que llevar a sus hijos
// al id nuevo; el trigger recalcula el id de cada hijo que tampoco es irrepetible, y así hacia abajo
export async function llevarHijosAlIdNuevo(client: ClienteTablero, operativo: string, idViejo: string, idNuevo: string): Promise<void> {
    if (idViejo == idNuevo) return;
    var hijos = await filas(client, `select id_casillero from casilleros where operativo = $1 and padre = $2`, [operativo, idViejo]);
    for (var hijo of hijos) {
        var idHijo = texto(hijo, 'id_casillero') ?? '';
        var [actualizado] = await filas(client, `
            update casilleros set padre = $3 where operativo = $1 and id_casillero = $2 returning id_casillero`,
            [operativo, idHijo, idNuevo]);
        await llevarHijosAlIdNuevo(client, operativo, idHijo, texto(actualizado, 'id_casillero') ?? idHijo);
    }
}

// numera los hermanos de 10 en 10 en el orden dado
export async function numerarHermanos(client: ClienteTablero, operativo: string, ids: string[]): Promise<void> {
    for (var i = 0; i < ids.length; i++) {
        await client.query(`update casilleros set orden = $3 where operativo = $1 and id_casillero = $2 and orden is distinct from $3`,
            [operativo, ids[i], (i + 1) * 10]).execute();
    }
}

// el orden de los hermanos con el casillero ubicado en la posición pedida
export function idsConInsertado(hermanos: CasilleroEditable[], id: string, posicion: number | null): string[] {
    var ids = hermanos.map(h => h.id_casillero).filter(otro => otro != id);
    var lugar = posicion == null ? ids.length : Math.max(0, Math.min(posicion, ids.length));
    ids.splice(lugar, 0, id);
    return ids;
}

function valorSql(valor: CasilleroEditable[keyof CasilleroEditable] | undefined): ValorSql {
    return valor === undefined ? null : valor;
}

async function aplicarOperacion(client: ClienteTablero, operativo: string, casilleros: CasilleroEditable[], operacion: OperacionMetadatos): Promise<void> {
    switch (operacion.tipo) {
        case 'crear': {
            var { nuevo } = operacion;
            var [creado] = await filas(client, `
                insert into casilleros (operativo, padre, tipoc, casillero, nombre, tipovar, orden)
                    values ($1, $2, $3, $4, $5, $6, 0)
                    returning id_casillero`,
                [operativo, nuevo.padre, nuevo.tipoc, nuevo.casillero, nuevo.nombre, nuevo.tipovar]);
            var idCreado = texto(creado, 'id_casillero') ?? '';
            await numerarHermanos(client, operativo, idsConInsertado(hijosDe(casilleros, nuevo.padre), idCreado, operacion.posicion));
            for (var [i, opcion] of (nuevo.opciones ?? []).entries()) {
                await client.query(`insert into casilleros (operativo, padre, tipoc, casillero, nombre, orden) values ($1, $2, 'O', $3, $4, $5)`,
                    [operativo, idCreado, opcion.casillero, opcion.nombre, (i + 1) * 10]).execute();
            }
            return;
        }
        case 'modificar': {
            var campos = Object.keys(operacion.cambios).filter((campo): campo is typeof CAMPOS_EDITABLES[number] =>
                (CAMPOS_EDITABLES as readonly string[]).includes(campo));
            if (campos.length == 0) return;
            var [modificado] = await filas(client, `
                update casilleros set ${campos.map((campo, i) => `${campo} = $${i + 3}${campo == 'especial' ? '::jsonb' : ''}`).join(', ')}
                    where operativo = $1 and id_casillero = $2
                    returning id_casillero`,
                [operativo, operacion.id_casillero, ...campos.map(campo => valorSql(operacion.cambios[campo]))]);
            await llevarHijosAlIdNuevo(client, operativo, operacion.id_casillero, texto(modificado, 'id_casillero') ?? operacion.id_casillero);
            return;
        }
        case 'mover': {
            var [movido] = await filas(client, `
                update casilleros set padre = $3 where operativo = $1 and id_casillero = $2 returning id_casillero`,
                [operativo, operacion.id_casillero, operacion.padre]);
            var idMovido = texto(movido, 'id_casillero') ?? operacion.id_casillero;
            await llevarHijosAlIdNuevo(client, operativo, operacion.id_casillero, idMovido);
            await numerarHermanos(client, operativo, idsConInsertado(hijosDe(casilleros, operacion.padre), idMovido, operacion.posicion));
            return;
        }
        case 'eliminar': {
            await client.query(`
                with recursive arbol as (
                    select id_casillero from casilleros where operativo = $1 and id_casillero = $2
                    union all
                    select c.id_casillero from casilleros c join arbol a on c.padre = a.id_casillero where c.operativo = $1
                )
                delete from casilleros where operativo = $1 and id_casillero in (select id_casillero from arbol)`,
                [operativo, operacion.id_casillero]).execute();
            return;
        }
    }
}

// aplica las operaciones en orden, todas o ninguna (corre en la transacción del procedimiento); devuelve los casilleros como quedaron
export async function aplicarOperaciones(client: ClienteTablero, context: Context, operativo: string, operaciones: OperacionMetadatos[]): Promise<CasilleroEditable[]> {
    var permisos = permisosEditor(context);
    if (!permisos.ver) {
        throw new Error('no tiene permiso para editar metadatos');
    }
    if (!Array.isArray(operaciones)) {
        throw new Error('operaciones debe ser una lista');
    }
    var [datosOperativo] = await filas(client, `select disform_cerrado from operativos where operativo = $1`, [operativo]);
    if (datosOperativo == null) {
        throw new Error(`no existe el operativo ${operativo}`);
    }
    var cerrado = verdaderoONull(datosOperativo, 'disform_cerrado') ?? false;
    var tipos = (await filas(client, `select tipoc, denominacion, irrepetible, puede_ser_var, desp_hijos from tipoc`, [])).map(f => ({
        tipoc: texto(f, 'tipoc') ?? '', denominacion: texto(f, 'denominacion') ?? '', irrepetible: verdaderoONull(f, 'irrepetible') ?? false,
        puedeSerVar: verdaderoONull(f, 'puede_ser_var'), despHijos: texto(f, 'desp_hijos'),
    }));
    var inclusiones = (await filas(client, `select tipoc_padre, tipoc_hijo from tipoc_tipoc`, [])).map(f => ({ padre: texto(f, 'tipoc_padre') ?? '', hijo: texto(f, 'tipoc_hijo') ?? '' }));
    // los cambios de id dejan por un momento hijos apuntando a un padre que ya no existe
    await client.query(`set constraints all deferred`, []).execute();
    var casilleros = await leerCasilleros(client, operativo);
    for (var [i, operacion] of operaciones.entries()) {
        var motivo = validarOperacion({ casilleros, tipos, inclusiones, permisos, cerrado }, operacion);
        if (motivo != null) {
            throw new Error(operaciones.length > 1 ? `cambio ${i + 1}: ${motivo}` : motivo);
        }
        await aplicarOperacion(client, operativo, casilleros, operacion);
        casilleros = await leerCasilleros(client, operativo);
    }
    return casilleros;
}

/* procedimientos */

export type AppEditorMetadatos = {
    perfilDelUsuario(context: ProcedureContext): PerfilTablero
    // avisa que cambió la estructura (los dispositivos y la vista previa la vuelven a pedir)
    estructuraModificada(): void
}

export function proceduresEditorMetadatos(app: AppEditorMetadatos): ProcedureDef[] {
    return [
        {
            action: 'editor_metadatos_traer',
            parameters: [{ name: 'operativo', typeName: 'text', defaultValue: null }],
            coreFunction: async (context: ProcedureContext, parametros: { operativo: string | null }) =>
                traerDatosEditor(context.client, context, app.perfilDelUsuario(context), parametros.operativo ?? null)
        },
        {
            action: 'editor_metadatos_aplicar',
            parameters: [{ name: 'operativo', typeName: 'text' }, { name: 'operaciones', typeName: 'jsonb' }],
            coreFunction: async (context: ProcedureContext, parametros: { operativo: string, operaciones: OperacionMetadatos[] }) => {
                var casilleros = await aplicarOperaciones(context.client, context, parametros.operativo, parametros.operaciones);
                app.estructuraModificada();
                return casilleros;
            }
        },
    ];
}
