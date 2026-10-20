"use strict";

// Pantalla de roles y permisos del modo GABINETE (ver docs/roles-y-permisos.md).
// Sólo tipos: se importan con "import type".

import type { AyudaOpcionMenu, ModoApp } from "./tipos";

// "permiso.accion", por ejemplo "campo.editar"
export type PermisoAccion = string;

export type PermisoDisponible = {
    permisoAccion: PermisoAccion
    permiso: string
    accion: string
    descripcion: string | null
}

export type RolDisponible = {
    rol: string
    nombre: string
    superuser: boolean
    usuariosActivos: number
    usuariosInactivos: number
}

export type RolesYPermisos = {
    modo: ModoApp
    puedeEditar: boolean // sólo el admin cambia permisos y subordinados
    roles: RolDisponible[]
    permisos: PermisoDisponible[]
    habilitados: { [rol: string]: PermisoAccion[] }
    subordinados: { [rol: string]: string[] }
}

// el menú que vería un rol (en el modo de esta instancia), con las mismas etiquetas que la ayuda
export type MenuDelRol = {
    rol: string
    modo: ModoApp
    menu: AyudaOpcionMenu[]
}
