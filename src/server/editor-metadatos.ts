"use strict";

// Editor visual de metadatos (ver docs/editor-metadatos.md): lee los casilleros de un operativo y aplica los cambios
// que arma el editor sobre la tabla casilleros. Los triggers de la base siguen validando (irrepetible_trg calcula
// id_casillero y var_name; control_disform_cerrado_trg no deja tocar un operativo cerrado).

import type { ProcedureContext } from "backend-plus";
import type { PerfilTablero } from "../unlogged/tipos-tablero";
import {
    CAMPOS_EDITABLES, CasilleroEditable, DatosEditorMetadatos, hijosDe, idsConInsertado, OperacionMetadatos, PermisosEditor, subarbol, validarOperacion
} from "../unlogged/editor-metadatos-comun";
export { idsConInsertado };
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
        clavesUA: (await filas(client, `select pk_agregada from unidad_analisis where operativo = $1 and pk_agregada is not null`, [operativo])).map(f => texto(f, 'pk_agregada') ?? ''),
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

function valorSql(valor: CasilleroEditable[keyof CasilleroEditable] | undefined): ValorSql {
    return valor === undefined ? null : valor;
}

async function aplicarOperacion(client: ClienteTablero, operativo: string, casilleros: CasilleroEditable[], operacion: OperacionMetadatos): Promise<void> {
    switch (operacion.tipo) {
        case 'crear': {
            var { nuevo } = operacion;
            var [creado] = await filas(client, `
                insert into casilleros (operativo, padre, tipoc, casillero, nombre, tipovar, orden, unidad_analisis, formulario_principal)
                    values ($1, $2, $3, $4, $5, $6, 0, $7, $8)
                    returning id_casillero`,
                [operativo, nuevo.padre, nuevo.tipoc, nuevo.casillero, nuevo.nombre, nuevo.tipovar, nuevo.unidad_analisis ?? null, nuevo.formulario_principal ?? null]);
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
        case 'reemplazar': {
            await aplicarOperacion(client, operativo, casilleros, { tipo: 'eliminar', id_casillero: operacion.raiz });
            await insertarCopia(client, operativo, operacion.casilleros);
            return;
        }
    }
}

// sin repetir: CAMPOS_EDITABLES ya incluye casillero y la base rechaza una columna repetida
export const CAMPOS_DE_LA_COPIA: string[] = Array.from(new Set(['padre', 'tipoc', 'casillero', 'orden', ...CAMPOS_EDITABLES]));

// inserta casilleros con todos sus campos, los padres antes que los hijos; el trigger tiene que dar los mismos ids
export async function insertarCopia(client: ClienteTablero, operativo: string, copia: CasilleroEditable[]): Promise<void> {
    var insertados = new Set<string>();
    var pendientes = [...copia];
    while (pendientes.length) {
        var listos = pendientes.filter(c => c.padre == null || insertados.has(c.padre) || !copia.some(otro => otro.id_casillero == c.padre));
        if (listos.length == 0) {
            throw new Error('la copia tiene casilleros que no cuelgan de ninguno');
        }
        for (var casillero of listos) {
            var [fila] = await filas(client, `
                insert into casilleros (operativo, ${CAMPOS_DE_LA_COPIA.join(', ')})
                    values ($1, ${CAMPOS_DE_LA_COPIA.map((campo, i) => `$${i + 2}${campo == 'especial' ? '::jsonb' : ''}`).join(', ')})
                    returning id_casillero`,
                [operativo, ...CAMPOS_DE_LA_COPIA.map(campo => valorSql(casillero[campo as keyof CasilleroEditable]))]);
            if (texto(fila, 'id_casillero') != casillero.id_casillero) {
                throw new Error(`al restaurar, ${casillero.id_casillero} quedó como ${texto(fila, 'id_casillero')}`);
            }
            insertados.add(casillero.id_casillero);
        }
        pendientes = pendientes.filter(c => !insertados.has(c.id_casillero));
    }
}

/* versiones: copias de un formulario (con todo lo que tiene adentro) que se pueden restaurar */

export type VersionFormulario = { version: number, cuando: string, usuario: string | null, descripcion: string | null, cantidad: number };

export async function guardarVersion(client: ClienteTablero, context: Context, operativo: string, idFormulario: string, descripcion: string | null): Promise<number> {
    var copia = subarbol(await leerCasilleros(client, operativo), idFormulario);
    if (copia.length == 0) {
        throw new Error(`no existe el formulario ${idFormulario}`);
    }
    var [fila] = await filas(client, `
        insert into casilleros_versiones (operativo, id_formulario, usuario, descripcion, casilleros)
            values ($1, $2, $3, $4, $5::jsonb)
            returning version`,
        [operativo, idFormulario, context.user?.usuario ?? null, descripcion, JSON.stringify(copia)]);
    return numero(fila, 'version');
}

export async function traerVersiones(client: ClienteTablero, operativo: string, idFormulario: string): Promise<VersionFormulario[]> {
    return (await filas(client, `
        select version, to_char(cuando, 'DD/MM/YYYY HH24:MI') as cuando, usuario, descripcion, jsonb_array_length(casilleros) as cantidad
            from casilleros_versiones
            where operativo = $1 and id_formulario = $2
            order by version desc`, [operativo, idFormulario])).map(f => ({
        version: numero(f, 'version'), cuando: texto(f, 'cuando') ?? '', usuario: texto(f, 'usuario'), descripcion: texto(f, 'descripcion'), cantidad: numero(f, 'cantidad'),
    }));
}

export async function copiaDeVersion(client: ClienteTablero, operativo: string, version: number): Promise<{ idFormulario: string, casilleros: CasilleroEditable[] }> {
    var [fila] = await filas(client, `select id_formulario, casilleros from casilleros_versiones where operativo = $1 and version = $2`, [operativo, version]);
    if (fila == null) {
        throw new Error(`no existe la versión ${version}`);
    }
    var casilleros = fila.casilleros;
    var lista: unknown[] = Array.isArray(casilleros) ? casilleros : typeof casilleros == 'string' ? JSON.parse(casilleros) : [];
    return {
        idFormulario: texto(fila, 'id_formulario') ?? '',
        casilleros: lista.filter((c): c is FilaSql => c != null && typeof c == 'object').map(casilleroDesdeFila),
    };
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
    // la estructura que recibe el renderizador (procedimiento operativo_estructura_completa)
    estructuraDelOperativo(context: ProcedureContext, operativo: string): Promise<unknown>
}

function exigirPermiso(context: Context, que: 'ver' | 'estructura'): void {
    if (!permisosEditor(context)[que]) {
        throw new Error(que == 'ver' ? 'no tiene permiso para editar metadatos' : 'no tiene permiso para cambiar la estructura de los formularios');
    }
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
        {
            // la estructura como quedaría con esas operaciones, sin guardarlas: se aplican en un savepoint que se descarta
            action: 'editor_metadatos_previsualizar',
            parameters: [{ name: 'operativo', typeName: 'text' }, { name: 'operaciones', typeName: 'jsonb' }],
            coreFunction: async (context: ProcedureContext, parametros: { operativo: string, operaciones: OperacionMetadatos[] }) => {
                exigirPermiso(context, 'ver');
                await context.client.query(`savepoint editor_previsualizar`, []).execute();
                try {
                    await aplicarOperaciones(context.client, context, parametros.operativo, parametros.operaciones);
                    return await app.estructuraDelOperativo(context, parametros.operativo);
                } finally {
                    await context.client.query(`rollback to savepoint editor_previsualizar`, []).execute();
                }
            }
        },
        {
            action: 'editor_metadatos_versiones_traer',
            parameters: [{ name: 'operativo', typeName: 'text' }, { name: 'id_formulario', typeName: 'text' }],
            coreFunction: async (context: ProcedureContext, parametros: { operativo: string, id_formulario: string }) => {
                exigirPermiso(context, 'ver');
                return traerVersiones(context.client, parametros.operativo, parametros.id_formulario);
            }
        },
        {
            action: 'editor_metadatos_version_guardar',
            parameters: [{ name: 'operativo', typeName: 'text' }, { name: 'id_formulario', typeName: 'text' }, { name: 'descripcion', typeName: 'text' }],
            coreFunction: async (context: ProcedureContext, parametros: { operativo: string, id_formulario: string, descripcion: string | null }) => {
                exigirPermiso(context, 'ver');
                return guardarVersion(context.client, context, parametros.operativo, parametros.id_formulario, parametros.descripcion);
            }
        },
        {
            // vuelve el formulario a una versión guardada; antes guarda cómo está, para poder volver
            action: 'editor_metadatos_version_restaurar',
            parameters: [{ name: 'operativo', typeName: 'text' }, { name: 'version', typeName: 'integer' }],
            coreFunction: async (context: ProcedureContext, parametros: { operativo: string, version: number }) => {
                exigirPermiso(context, 'estructura');
                var { idFormulario, casilleros } = await copiaDeVersion(context.client, parametros.operativo, parametros.version);
                var actuales = await leerCasilleros(context.client, parametros.operativo);
                if (actuales.some(c => c.id_casillero == idFormulario)) {
                    await guardarVersion(context.client, context, parametros.operativo, idFormulario, `antes de restaurar la versión ${parametros.version}`);
                }
                var resultado = await aplicarOperaciones(context.client, context, parametros.operativo, [{ tipo: 'reemplazar', raiz: idFormulario, casilleros }]);
                app.estructuraModificada();
                return resultado;
            }
        },
    ];
}
