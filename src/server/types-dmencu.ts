/// <reference types="express-session" />
"use strict";

import * as bePlus from "backend-plus";
import type { ModoApp, NoRea } from "../unlogged/tipos";

export * from 'procesamiento'; //expose Procesamiento types
export { emergeAppMetaEnc, emergeAppRelEnc } from 'meta-enc'; //expose types only in meta-enc stack
export * from './table-tem';

// corresponde a la tabla permisos (permiso -> acción), ver install/permisos.tab
export type Puede = {
    encuestas?: {
        relevar?: boolean,
        justificar?: boolean,
        procesar?: boolean,
        ingresar?: boolean,
        borrar_ua?: boolean
    },
    casilleros_texto?: {
        editar?: boolean
    }
    campo?: {
        ver?: boolean
        editar?: boolean
        administrar?: boolean
    }
    configurar?: {
        ver?: boolean
        editar?: boolean
    }
    consistencias?: {
        editar?: boolean
    }
}

// grupo de códigos de no_rea (be.caches.tableContent.no_rea_groups y no_rea_groups0, ver refreshCaches en app-dmencu.ts)
export type GrupoNoRea = { grupo: string, codigos: NoRea[] }

export type Permisos = {
    puede?: Puede
    superuser?: boolean
}
export type PermisosRol = Record<string, Permisos>

// ayuda en línea para usuarios (ver docs/ayuda-online.md)
// una carpeta con archivos .md de ayuda; las apps finales agregan las suyas en getAyudaFuentes
export type AyudaFuente = {
    origen: string // nombre de la app o paquete, para los mensajes de error
    carpeta: string
}
// un archivo de ayuda ya leído: encabezado + contenido convertido a html
export type AyudaTema = {
    id: string
    titulo: string
    orden: number
    permisos: string[] // "permiso.accion"; alcanza con tener alguno
    roles: string[] // alcanza con tener alguno
    modo: ModoApp | null // null: en ambos modos
    menu: string[] // rutas de las opciones del menú que explica, por ejemplo "asignacion/encuestador"
    ocultar: boolean // quita un tema de otra fuente con el mismo id
    origen: string
    archivo: string
    html: string
}

// campo por rol que se agrega para cada tarea en areas_asignacion_general
export type RolFieldTarea = {
    name: string
    prefijo: string
    editable: boolean
    references: string
    muestraDispositivo: boolean
}

export type TableDefinition = bePlus.TableDefinition & {
    muestraAbrirEnTodasLasTareas?: boolean;
    tareasFields?: RolFieldTarea[];
}

export type TableContext = bePlus.TableContext & {
    puede?: Puede
}

declare module "backend-plus" {
    export interface ProcedureDef {
        definedIn?: string
    }

    export interface FieldDefinition {
        isPk?: number;
        originalName?: string;
    }

    export interface Caches {
        tableContent: Record<string, any>
        metaEncIncluirCasillerosSaltoREL: boolean
        timestampEstructura: number
        permisosRol: PermisosRol
        permisosRolSoloTrue: PermisosRol
        permisosSuperuser: Puede
        permisosParaNadie: Puede
        ayuda: AyudaTema[]
    }

    export interface Context {
        puede?: Puede
        superuser?: true
    }

    // pantallas propias de dmencu que se usan como menuType (definidas en client.ts como myOwn.wScreens.*)
    export interface WScreens {
        abrir_encuesta: true
        sincronizar_dm: true
        cambiar_modo_dm: true
        ayuda: true
        tablero: true
        roles_permisos: true
    }

    // backend-plus usa config['client-setup'].skin pero no lo declara
    export interface AppConfigClientSetup {
        skin?: string
    }

    export interface OptsClientPage {
        offlineFile: boolean
    }

    export interface ClientSetup {
        idper: string | undefined
    }
}

declare module "express-session" {
    interface SessionData {
        install: string // identificador de la instalación del dispositivo (ver addSchrödingerServices)
    }
}

export type MenuInfoBase = bePlus.MenuInfoBase;

export type SufijosAmbiente = '_test' | '_capa' | ''
