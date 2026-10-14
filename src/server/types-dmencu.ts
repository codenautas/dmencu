/// <reference types="express-session" />
"use strict";

import * as bePlus from "backend-plus";
import type { NoRea } from "../unlogged/tipos";

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
