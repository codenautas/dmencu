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

// una fila del detalle de un indicador (por ejemplo un estado dentro de una tarea)
export type FilaDetalleIndicador = {
    etiqueta: string
    valor: number
    acceso?: AccesoTablero // la etiqueta lleva a esa opción del menú
}

// cómo se reparte el valor de un indicador; se muestra en una ventana que abre el botón "ver más" de la tarjeta
export type DetalleIndicador = {
    boton: string // texto del botón que lo abre
    filas: FilaDetalleIndicador[]
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
    desagregado?: DetalleIndicador
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
    acceso?: AccesoTablero // la etiqueta lleva a esa opción del menú
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
    formato?: 'numero' | 'porcentaje' // de las numéricas: el valor ya viene como porcentaje (0 a 100)
}

export type FilaTabla = { [campo: string]: string | number | null };

export type ContenidoTablero =
    | { tipo: 'indicadores', indicadores: IndicadorTablero[], total?: number } // total: si está, se muestra al pie ("Total: N encuestas")
    | { tipo: 'avance', partes: ParteAvance[], indicadores?: IndicadorTablero[] } // indicadores: cifras que van arriba de la barra
    | { tipo: 'desglose', cortes: CorteDesglose[] }
    | { tipo: 'barras', filas: FilaBarras[], formato?: 'numero' | 'porcentaje', total?: number }
    | { tipo: 'tabla', columnas: ColumnaTabla[], filas: FilaTabla[], ultimaFilaTotal?: boolean } // ultimaFilaTotal: la última fila es el total y va en negrita
    | { tipo: 'accesos', accesos: AccesoTablero[] }
    | { tipo: 'mensaje', texto: string, tono?: TonoTablero }
    | { tipo: 'titulo' } // sólo el título de la sección, sin tarjeta: separa grupos de secciones
    // lo dibuja un componente que la app final registra en el cliente con registrarComponenteTablero
    | { tipo: 'personalizado', componente: string, datos: DatoJson };

// tresCuartos y cuarto van juntos en una fila (una tabla ancha con una sección chica a la derecha)
export type AnchoSeccionTablero = 'completo' | 'mitad' | 'tercio' | 'tresCuartos' | 'cuarto';

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
