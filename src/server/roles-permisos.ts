"use strict";

// Pantalla de roles y permisos: lee la matriz rol × permiso, la cambia (sólo admin) y muestra el menú que ve cada rol.
// Los permisos se vuelven a cargar en las caches al cambiarlos, así rigen sin reiniciar el servidor (ver docs/roles-y-permisos.md).

import type { ModoApp } from "../unlogged/tipos";
import type { PerfilTablero } from "../unlogged/tipos-tablero";
import type { MenuDelRol, PermisoAccion, PermisoDisponible, RolDisponible, RolesYPermisos } from "../unlogged/tipos-roles-permisos";
import type { Context, MenuInfoBase, ProcedureDef } from "./types-dmencu";
import { menuConAyuda, tienePermiso } from "./ayuda";
import { ClienteTablero, FilaSql, numero, texto } from "./tablero";
import type { ClienteDb } from "./app-dmencu";

// para qué se usa cada permiso (se muestra en la pantalla). Las apps finales pueden agregar los suyos.
export const DESCRIPCION_PERMISOS: { [permisoAccion: string]: string } = {
    'encuestas.relevar': 'Releva en dispositivos; habilita el menú del modo relevamiento',
    'campo.ver': 'Ver la información de campo',
    'campo.editar': 'Asignación, recepción, supervisión y varios; editar tablas de campo',
    'campo.administrar': 'Administrar el campo: fin de campo, análisis, control y operaciones de gestión',
    'encuestas.ingresar': 'Ingresar encuestas en gabinete',
    'encuestas.justificar': 'Justificar inconsistencias',
    'encuestas.procesar': 'Procesamiento: menú procesar, editar encuestas en procesamiento, intercambiar encuestas',
    'encuestas.borrar_ua': 'Borrar unidades de análisis',
    'consistencias.editar': 'Editar consistencias',
    'casilleros_texto.editar': 'Editar los textos de los casilleros (metadatos) y las tablas de REA / no REA',
    'configurar.ver': 'Ver el menú configurar',
    'configurar.editar': 'Editar en el menú configurar',
};

// quién entra a la pantalla (los mismos que ven configurar → usuarios) y quién cambia permisos
export function puedeVerRolesYPermisos(context: Pick<Context, 'superuser' | 'puede'>): boolean {
    return !!context.superuser || tienePermiso(context.puede, 'campo.administrar') || tienePermiso(context.puede, 'encuestas.procesar');
}
export function puedeEditarRolesYPermisos(context: Pick<Context, 'user'>): boolean {
    return context.user?.rol === 'admin';
}

export type FilasRolesYPermisos = {
    roles: FilaSql[]
    permisos: FilaSql[]
    rolesPermisos: FilaSql[]
    subordinados: FilaSql[]
    usuarios: FilaSql[] // rol, activo, cantidad
}

function verdadero(fila: FilaSql, campo: string): boolean {
    var valor = fila[campo];
    return valor === true || valor === 'true' || valor === 't';
}

// arma lo que recibe la pantalla a partir de las filas de las tablas (sin acceso a la base, para poder probarlo)
export function armarRolesYPermisos(filas: FilasRolesYPermisos, descripciones: { [permisoAccion: string]: string }):
    Pick<RolesYPermisos, 'roles' | 'permisos' | 'habilitados' | 'subordinados'> {
    var usuariosDelRol = (rol: string, activo: boolean) => filas.usuarios
        .filter(fila => texto(fila, 'rol') == rol && verdadero(fila, 'activo') == activo)
        .reduce((suma, fila) => suma + numero(fila, 'cantidad'), 0);
    var roles: RolDisponible[] = filas.roles.map(fila => {
        var rol = texto(fila, 'rol') ?? '';
        return {
            rol,
            nombre: texto(fila, 'nombre') ?? rol,
            superuser: verdadero(fila, 'superuser'),
            usuariosActivos: usuariosDelRol(rol, true),
            usuariosInactivos: usuariosDelRol(rol, false),
        };
    });
    var permisos: PermisoDisponible[] = filas.permisos.map(fila => {
        var permiso = texto(fila, 'permiso') ?? '';
        var accion = texto(fila, 'accion') ?? '';
        var permisoAccion = `${permiso}.${accion}`;
        return { permisoAccion, permiso, accion, descripcion: descripciones[permisoAccion] ?? null };
    });
    var habilitados: { [rol: string]: PermisoAccion[] } = {};
    var subordinados: { [rol: string]: string[] } = {};
    roles.forEach(rol => {
        habilitados[rol.rol] = [];
        subordinados[rol.rol] = [];
    });
    filas.rolesPermisos.filter(fila => verdadero(fila, 'habilitado')).forEach(fila => {
        var rol = texto(fila, 'rol') ?? '';
        habilitados[rol]?.push(`${texto(fila, 'permiso')}.${texto(fila, 'accion')}`);
    });
    filas.subordinados.forEach(fila => {
        subordinados[texto(fila, 'rol') ?? '']?.push(texto(fila, 'rol_subordinado') ?? '');
    });
    return { roles, permisos, habilitados, subordinados };
}

export async function leerRolesYPermisos(client: ClienteTablero): Promise<FilasRolesYPermisos> {
    var filas = async (sql: string) => (await client.query(sql, []).fetchAll()).rows;
    return {
        roles: await filas(`select rol, nombre, superuser from roles order by superuser desc, nombre, rol`),
        permisos: await filas(`select permiso, accion from permisos order by permiso, accion`),
        rolesPermisos: await filas(`select rol, permiso, accion, habilitado from roles_permisos`),
        subordinados: await filas(`select rol, rol_subordinado from roles_subordinados order by rol, rol_subordinado`),
        usuarios: await filas(`select rol, activo, count(*) as cantidad from usuarios where rol is not null group by rol, activo`),
    };
}

export type CambioDePermiso = { rol: string, permiso: string, accion: string, habilitado: boolean };
export type CambioDeSubordinado = { rol: string, rol_subordinado: string, incluido: boolean };

// controla que el rol y el permiso existan (los nombres llegan del cliente)
export function validarCambioDePermiso(filas: Pick<FilasRolesYPermisos, 'roles' | 'permisos'>, cambio: CambioDePermiso): void {
    if (!filas.roles.some(fila => texto(fila, 'rol') == cambio.rol)) {
        throw new Error(`no existe el rol ${cambio.rol}`);
    }
    if (!filas.permisos.some(fila => texto(fila, 'permiso') == cambio.permiso && texto(fila, 'accion') == cambio.accion)) {
        throw new Error(`no existe el permiso ${cambio.permiso}.${cambio.accion}`);
    }
    if (typeof cambio.habilitado != 'boolean') {
        throw new Error('habilitado debe ser true o false');
    }
}

export function validarCambioDeSubordinado(filas: Pick<FilasRolesYPermisos, 'roles'>, cambio: CambioDeSubordinado): void {
    [cambio.rol, cambio.rol_subordinado].forEach(rol => {
        if (!filas.roles.some(fila => texto(fila, 'rol') == rol)) {
            throw new Error(`no existe el rol ${rol}`);
        }
    });
    if (typeof cambio.incluido != 'boolean') {
        throw new Error('incluido debe ser true o false');
    }
}

// lo que la pantalla necesita de la app (AppDmEncu lo cumple; las apps finales lo heredan)
export type AppRolesYPermisos = {
    refrescarPermisos(client: ClienteDb): Promise<void>
    menuDelRol(rol: string): MenuInfoBase[]
    modo(): ModoApp
    perfilDelUsuario(context: Context): PerfilTablero
}

// tablas cuya modificación (también desde sus grillas) cambia los permisos de las caches
export const TABLAS_PERMISOS = ['roles', 'permisos', 'roles_permisos'];

// envuelve table_record_save/table_record_delete para que al modificar esas tablas se recarguen los permisos
// (con el mismo cliente, dentro de la misma transacción); igual que refrescarEstructuraAlModificarTabla
export function refrescarPermisosAlModificarTabla<C extends { client: ClienteDb }, P extends { table: string }, R, Resto extends (object | undefined)[]>(
    app: Pick<AppRolesYPermisos, 'refrescarPermisos'>,
    coreFunction: (context: C, parameters: P, ...resto: Resto) => Promise<R>
): (context: C, parameters: P, ...resto: Resto) => Promise<R> {
    return async function (context: C, parameters: P, ...resto: Resto) {
        var result = await coreFunction(context, parameters, ...resto);
        if (TABLAS_PERMISOS.includes(parameters.table)) {
            await app.refrescarPermisos(context.client);
        }
        return result;
    }
}

type ContextoDeProcedimiento =Context & { client: ClienteTablero & ClienteDb };

function controlarQuePuedeVer(context: Context): void {
    if (!puedeVerRolesYPermisos(context)) {
        throw new Error('no tiene permiso para ver roles y permisos');
    }
}

export function proceduresRolesYPermisos(app: AppRolesYPermisos): ProcedureDef[] {
    return [
        {
            action: 'roles_permisos_traer',
            parameters: [],
            coreFunction: async function (context: ContextoDeProcedimiento): Promise<RolesYPermisos> {
                controlarQuePuedeVer(context);
                return {
                    modo: app.modo(),
                    perfil: app.perfilDelUsuario(context),
                    puedeEditar: puedeEditarRolesYPermisos(context),
                    ...armarRolesYPermisos(await leerRolesYPermisos(context.client), DESCRIPCION_PERMISOS),
                };
            }
        },
        {
            action: 'rol_permiso_cambiar',
            parameters: [
                { name: 'rol', typeName: 'text' },
                { name: 'permiso', typeName: 'text' },
                { name: 'accion', typeName: 'text' },
                { name: 'habilitado', typeName: 'boolean' },
            ],
            roles: ['admin'],
            coreFunction: async function (context: ContextoDeProcedimiento, cambio: CambioDePermiso): Promise<PermisoAccion[]> {
                validarCambioDePermiso(await leerRolesYPermisos(context.client), cambio);
                await context.client.query(`
                    insert into roles_permisos (rol, permiso, accion, habilitado) values ($1, $2, $3, $4)
                        on conflict (rol, permiso, accion) do update set habilitado = excluded.habilitado`,
                    [cambio.rol, cambio.permiso, cambio.accion, cambio.habilitado]).execute();
                await app.refrescarPermisos(context.client);
                var { habilitados } = armarRolesYPermisos(await leerRolesYPermisos(context.client), {});
                return habilitados[cambio.rol] ?? [];
            }
        },
        {
            action: 'rol_subordinado_cambiar',
            parameters: [
                { name: 'rol', typeName: 'text' },
                { name: 'rol_subordinado', typeName: 'text' },
                { name: 'incluido', typeName: 'boolean' },
            ],
            roles: ['admin'],
            coreFunction: async function (context: ContextoDeProcedimiento, cambio: CambioDeSubordinado): Promise<string[]> {
                validarCambioDeSubordinado(await leerRolesYPermisos(context.client), cambio);
                await context.client.query(cambio.incluido
                    ? `insert into roles_subordinados (rol, rol_subordinado) values ($1, $2) on conflict do nothing`
                    : `delete from roles_subordinados where rol = $1 and rol_subordinado = $2`,
                    [cambio.rol, cambio.rol_subordinado]).execute();
                var { subordinados } = armarRolesYPermisos(await leerRolesYPermisos(context.client), {});
                return subordinados[cambio.rol] ?? [];
            }
        },
        {
            action: 'rol_menu_previsualizar',
            parameters: [
                { name: 'rol', typeName: 'text' },
            ],
            coreFunction: async function (context: ContextoDeProcedimiento, parametros: { rol: string }): Promise<MenuDelRol> {
                controlarQuePuedeVer(context);
                return { rol: parametros.rol, modo: app.modo(), menu: menuConAyuda(app.menuDelRol(parametros.rol), []) };
            }
        },
    ];
}
