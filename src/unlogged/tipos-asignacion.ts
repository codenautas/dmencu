"use strict";

// Pantallas de asignación (general y por tarea) y de recepción del modo GABINETE (ver docs/asignacion-recepcion.md).
// Sólo tipos: se importan con "import type".

import type { EstadoAccion } from "./tipos";

export type PersonaAsignable = {
    idper: string
    nombre: string // nombre y apellido (o el usuario si no tiene)
    usuario: string
    rol: string | null
    dispositivo: string | null
}

export type TareaAsignable = {
    tarea: string
    nombre: string
    esInicial: boolean
    rolSugerido: string | null // el rol con el mismo nombre que la tarea (encuestador, recuperador, ...), si existe
}

export type EstadoDeTarea = {
    estado: string
    descripcion: string
    permiteAsignar: boolean
    orden: string | null
}

// lo que las tres pantallas necesitan para empezar
export type ContextoAsignacion = {
    operativo: string
    puedeEditar: boolean // campo.administrar o recepcionista (como las grillas de asignación y recepción)
    puedeAsignarGeneral: boolean // campo.administrar (como asignación → general)
    soloComoRecepcionista: string | null // idper del recepcionista si el usuario sólo ve lo suyo
    tareas: TareaAsignable[]
    estados: EstadoDeTarea[]
    personas: PersonaAsignable[]
    recepcionistas: PersonaAsignable[]
}

/* asignación general: una fila por área, una columna por tarea */

export type AsignacionDeArea = {
    recepcionista: string | null
    asignado: string | null
    cargado: boolean // alguna encuesta del área en esa tarea está en un dispositivo
}

export type AreaAsignacion = {
    area: number
    encuestas: number
    comunas: string | null
    sinAsignar: number // encuestas de la tarea actual (o sin tarea) sin persona asignada
    porTarea: { [tarea: string]: AsignacionDeArea }
}

export type CambioDeArea = {
    area: number
    tarea: string
    recepcionista?: string | null // undefined: no se cambia
    asignado?: string | null
}

/* asignación por tarea: una fila por encuesta */

export type EncuestaAsignacion = {
    enc: string
    area: number | null
    direccion: string
    estado: string
    habilitada: boolean
    tareaActual: string | null
    recepcionista: string | null
    asignado: string | null
    cargado: boolean
}

export type CambioDeEncuestas = {
    tarea: string
    encs: string[]
    recepcionista?: string | null // undefined: no se cambia
    asignado?: string | null
}

// resultado de un cambio masivo: los triggers de la base validan cada encuesta o área por separado
export type ResultadoDeCambio = {
    clave: string // enc o área
    ok: boolean
    mensaje: string | null
}

/* recepción */

export type ConteoDeEstado = { estado: string, cantidad: number };

export type PersonaRecepcion = {
    idper: string
    nombre: string
    dispositivo: string | null
    total: number
    cargadas: number // en un dispositivo
    porEstado: ConteoDeEstado[]
}

export type AccionDisponible = EstadoAccion & {
    desc_eaccion: string | null
}

export type EncuestaRecepcion = {
    enc: string
    area: number | null
    direccion: string
    estado: string
    resumenEstado: string | null
    rea: number | null
    norea: number | null
    cargado: boolean
    verificado: string | null
    habilitada: boolean
    acciones: AccionDisponible[]
}
