"use strict";

// Tablero de inicio del modo GABINETE: lo que el servidor manda al cliente (ver docs/tablero.md).
// Sólo tipos: se importan con "import type" para que no haga falta incluir este archivo en el cliente.

import type { ModoApp } from "./tipos";

// valor que se puede mandar en json (lo que reciben los componentes de secciones personalizadas)
export type DatoJson = null | boolean | number | string | DatoJson[] | { [clave: string]: DatoJson };

// tono con el que se pinta un número o una parte del avance
export type TonoTablero = 'neutro' | 'bueno' | 'atencion' | 'alerta' | 'info';

// opción del menú a la que lleva un acceso: los nombres de cada nivel (por ejemplo ['asignacion', 'encuestador'])
export type RutaMenu = string[];

// campos fijos (ff) con que se abre la grilla, por ejemplo { tarea: 'encu', estado: 'A' }
// (null: el campo vacío)
export type FiltroTablero = { [campo: string]: string | null };

export type AccesoTablero = {
    titulo: string
    descripcion?: string
    grupo?: string // para agrupar accesos (por ejemplo el menú de primer nivel)
    ruta: RutaMenu
    filtro?: FiltroTablero
}

export type IndicadorTablero = {
    id: string
    titulo: string
    valor: number | null
    formato?: 'numero' | 'porcentaje'
    total?: number | null // si está, se muestra "valor de total" y una barra
    detalle?: string
    tono?: TonoTablero
    acceso?: AccesoTablero
}

export type ParteAvance = {
    id: string
    titulo: string
    valor: number
    tono: TonoTablero
}

export type FilaBarras = {
    etiqueta: string
    valor: number
    total?: number // si está, la barra muestra valor sobre total; si no, se compara con el máximo de las filas
    detalle?: string
    tono?: TonoTablero
    acceso?: AccesoTablero // la etiqueta lleva a esa opción del menú
}

// una fila del gráfico de barras apiladas: sus partes en el orden en que se dibujan
export type FilaDesglose = {
    etiqueta: string
    partes: ParteAvance[]
}

// un corte del desglose (por ejemplo por comuna); acceso: la grilla de control con el detalle
export type CorteDesglose = {
    id: string
    titulo: string
    filas: FilaDesglose[]
    acceso?: AccesoTablero
}

export type ColumnaTabla = {
    campo: string
    titulo: string
    numerica?: boolean
}

export type FilaTabla = { [campo: string]: string | number | null };

export type ContenidoTablero =
    | { tipo: 'indicadores', indicadores: IndicadorTablero[], total?: number } // total: si está, se muestra al pie ("Total: N encuestas")
    | { tipo: 'avance', partes: ParteAvance[] }
    | { tipo: 'desglose', cortes: CorteDesglose[] }
    | { tipo: 'barras', filas: FilaBarras[], formato?: 'numero' | 'porcentaje', total?: number }
    | { tipo: 'tabla', columnas: ColumnaTabla[], filas: FilaTabla[] }
    | { tipo: 'accesos', accesos: AccesoTablero[] }
    | { tipo: 'mensaje', texto: string, tono?: TonoTablero }
    // lo dibuja un componente que la app final registra en el cliente con registrarComponenteTablero
    | { tipo: 'personalizado', componente: string, datos: DatoJson };

export type AnchoSeccionTablero = 'completo' | 'mitad' | 'tercio';

export type SeccionTablero = {
    id: string
    titulo: string
    descripcion?: string
    ancho: AnchoSeccionTablero
    acceso?: AccesoTablero // "ver más": la opción del menú con el detalle
    contenido: ContenidoTablero
}

export type TableroParaUsuario = {
    operativo: string | null
    modo: ModoApp
    usuario: string
    nombre: string | null // nombre y apellido de la persona, si está en usuarios
    rol: string | null
    nombreRol: string | null
    generado: string // fecha y hora del servidor en formato ISO
    secciones: SeccionTablero[]
    errores: { seccion: string, mensaje: string }[] // secciones que no se pudieron armar (el resto se muestra igual)
}
