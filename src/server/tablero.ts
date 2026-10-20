"use strict";

// Tablero de inicio del modo GABINETE: un panorama del operativo que se arma según el rol de quien entra.
// Cada sección es una DefinicionSeccionTablero. Las apps finales agregan, reemplazan o quitan secciones
// sobreescribiendo getSeccionesTablero (ver docs/tablero.md).

import * as sqlTools from "sql-tools";
import type {
    AccesoTablero, AnchoSeccionTablero, ContenidoTablero, CorteDesglose, FilaBarras, FiltroTablero, IndicadorTablero, ParteAvance,
    RutaMenu, SeccionTablero, TableroParaUsuario
} from "../unlogged/tipos-tablero";
import type { MenuInfoBase, TableDefinition } from "./types-dmencu";
import { QuienConsultaAyuda, tienePermiso } from "./ayuda";
import { camposGruposNoRea } from "./table-control_campo";

export type ValorSql = string | number | boolean | null;
export type FilaSql = { [campo: string]: unknown };

// lo que el tablero usa del cliente de la base (el Client de pg-promise-strict lo cumple; en los tests se simula)
export type SentenciaTablero = {
    fetchAll(): Promise<{ rows: FilaSql[] }>
}
export type ClienteTablero = {
    query(sql: string, params?: ValorSql[]): SentenciaTablero
}

// el cliente que además escribe (lo usa el editor de metadatos; el tablero sólo consulta)
export type SentenciaEscribible = SentenciaTablero & { execute(): Promise<unknown> }
export type ClienteEscribible = {
    query(sql: string, params?: ValorSql[]): SentenciaEscribible
}

// quien consulta el tablero: lo mismo que para la ayuda más su usuario y su persona
export type QuienConsultaTablero = QuienConsultaAyuda & {
    usuario: string
    idper: string | null
}

export type ConsultaTablero = {
    client: ClienteTablero
    quien: QuienConsultaTablero
    operativo: string
    menu: MenuInfoBase[] // el menú del usuario (el que arma getMenu)
    tabla(nombre: string): TableDefinition // la definición de una tabla de la app, para reutilizar su sql (por ejemplo control_campo_zona)
}

export type DefinicionSeccionTablero = {
    id: string
    titulo: string
    descripcion?: string
    orden: number
    ancho?: AnchoSeccionTablero // predeterminado: completo
    // a quién se muestra: alcanza con tener alguno de los permisos ("permiso.accion") o de los roles; vacíos: a todos
    permisos?: string[]
    roles?: string[]
    // "ver más": se muestra sólo si el usuario tiene esa opción en su menú
    acceso?: AccesoTablero
    // devuelve null cuando no hay nada para mostrar (la sección no aparece)
    obtener(consulta: ConsultaTablero): Promise<ContenidoTablero | null>
}

/* menú */

export function etiquetaDelMenu(opcion: MenuInfoBase): string {
    return opcion.label ?? opcion.name.replace(/_/g, ' ');
}

function contenidoDelMenu(opcion: MenuInfoBase): MenuInfoBase[] {
    return opcion.menuType == 'menu' ? opcion.menuContent : [];
}

// la opción del menú que corresponde a la ruta, o null si el usuario no la tiene
export function buscarEnMenu(menu: MenuInfoBase[], ruta: RutaMenu): MenuInfoBase | null {
    var [nombre, ...resto] = ruta;
    var opcion = menu.find(o => o.name == nombre);
    if (opcion == null) {
        return null;
    }
    return resto.length ? buscarEnMenu(contenidoDelMenu(opcion), resto) : opcion;
}

// opciones de menú que no se ofrecen como accesos (el propio tablero y la ayuda, que ya está en el menú)
export const MENU_SIN_ACCESO = ['tablero', 'ayuda'];

// los accesos a las opciones del menú del usuario: las de primer nivel que no son submenú y las de segundo nivel
export function accesosDelMenu(menu: MenuInfoBase[]): AccesoTablero[] {
    var accesos: AccesoTablero[] = [];
    menu.filter(opcion => !MENU_SIN_ACCESO.includes(opcion.name)).forEach(opcion => {
        var contenido = contenidoDelMenu(opcion);
        if (contenido.length) {
            contenido.forEach(hija => accesos.push({ titulo: etiquetaDelMenu(hija), grupo: etiquetaDelMenu(opcion), ruta: [opcion.name, hija.name] }));
        } else if (opcion.menuType != 'menu') {
            accesos.push({ titulo: etiquetaDelMenu(opcion), ruta: [opcion.name] });
        }
    });
    return accesos;
}

/* visibilidad */

export function seccionVisible(seccion: DefinicionSeccionTablero, quien: QuienConsultaTablero): boolean {
    if (quien.superuser) {
        return true;
    }
    var permisos = seccion.permisos ?? [];
    var roles = seccion.roles ?? [];
    if (permisos.length == 0 && roles.length == 0) {
        return true;
    }
    return quien.rol != null && roles.includes(quien.rol)
        || permisos.some(permiso => tienePermiso(quien.puede, permiso));
}

export function seccionesVisibles(secciones: DefinicionSeccionTablero[], quien: QuienConsultaTablero): DefinicionSeccionTablero[] {
    return secciones.filter(seccion => seccionVisible(seccion, quien)).sort((a, b) => a.orden - b.orden);
}

// combina listas de secciones: una con el mismo id reemplaza a la anterior (así una app cambia una sección de dmencu)
export function combinarSecciones(...listas: DefinicionSeccionTablero[][]): DefinicionSeccionTablero[] {
    var secciones: Map<string, DefinicionSeccionTablero> = new Map();
    listas.forEach(lista => lista.forEach(seccion => secciones.set(seccion.id, seccion)));
    return Array.from(secciones.values());
}

/* armado */

function mensajeDeError(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

type ConAcceso = { acceso?: AccesoTablero };

// deja el acceso sólo si el usuario tiene esa opción en su menú (así no se ofrece una grilla a la que no puede entrar)
export function conAccesoVisible<T extends ConAcceso>(item: T, menu: MenuInfoBase[]): Omit<T, 'acceso'> & ConAcceso {
    var { acceso, ...resto } = item;
    return acceso != null && buscarEnMenu(menu, acceso.ruta) != null ? { ...resto, acceso } : resto;
}

export function contenidoConAccesosVisibles(contenido: ContenidoTablero, menu: MenuInfoBase[]): ContenidoTablero {
    switch (contenido.tipo) {
        case 'indicadores': return { ...contenido, indicadores: contenido.indicadores.map(indicador => conAccesoVisible(indicador, menu)) };
        case 'barras': return { ...contenido, filas: contenido.filas.map(fila => conAccesoVisible(fila, menu)) };
        case 'desglose': return { ...contenido, cortes: contenido.cortes.map(corte => conAccesoVisible(corte, menu)) };
        default: return contenido;
    }
}

// arma las secciones visibles. Son sólo consultas: si una falla se informa y las demás se muestran igual
export async function armarSecciones(
    definiciones: DefinicionSeccionTablero[],
    consulta: ConsultaTablero
): Promise<{ secciones: SeccionTablero[], errores: TableroParaUsuario['errores'] }> {
    var secciones: SeccionTablero[] = [];
    var errores: TableroParaUsuario['errores'] = [];
    for (var definicion of seccionesVisibles(definiciones, consulta.quien)) {
        try {
            var contenido = await definicion.obtener(consulta);
            if (contenido != null) {
                var acceso = definicion.acceso != null ? conAccesoVisible({ acceso: definicion.acceso }, consulta.menu).acceso : undefined;
                secciones.push({
                    id: definicion.id,
                    titulo: definicion.titulo,
                    ...(definicion.descripcion != null ? { descripcion: definicion.descripcion } : {}),
                    ancho: definicion.ancho ?? 'completo',
                    ...(acceso != null ? { acceso } : {}),
                    contenido: contenidoConAccesosVisibles(contenido, consulta.menu),
                });
            }
        } catch (err) {
            errores.push({ seccion: definicion.id, mensaje: mensajeDeError(err) });
        }
    }
    return { secciones, errores };
}

/* lectura de filas */

export function numero(fila: FilaSql | undefined, campo: string): number {
    var valor = fila?.[campo];
    if (valor == null) {
        return 0;
    }
    var resultado = Number(valor);
    return isNaN(resultado) ? 0 : resultado;
}

export function texto(fila: FilaSql | undefined, campo: string): string | null {
    var valor = fila?.[campo];
    return valor == null ? null : String(valor);
}

export function porcentaje(parte: number, total: number): number | null {
    return total ? Math.round(parte * 1000 / total) / 10 : null;
}

async function filas(consulta: ConsultaTablero, sql: string, params: ValorSql[]): Promise<FilaSql[]> {
    return (await consulta.client.query(sql, params).fetchAll()).rows;
}

/* secciones de dmencu */

// las encuestas del operativo que ve el usuario: las de producción o de capacitación según lo que tenga habilitado
// (igual que filtroTemSegunUsuario). Parámetros: $1 operativo, $2 usuario.
// tarea_vigente es la tarea en que está la encuesta como lo entienden los triggers (asignar_desasignar_tareas_tem_trg y
// validar_tareas_tem_trg): sin tarea_actual (todavía sin asignar, estado disponible) está en la tarea inicial
export const TEM_DEL_USUARIO = `(
    select t.*, coalesce(t.tarea_actual, (select ti.tarea from tareas ti where ti.operativo = t.operativo and ti.es_inicial)) as tarea_vigente
        from tem t join usuarios usu_con on usu_con.usuario = $2
        where t.operativo = $1 and (
            usu_con.muestra_encuestas_prod and t.enc_autogenerado_dm is not null
                or
            usu_con.muestra_encuestas_capa and t.enc_autogenerado_dm_capa is not null
                or
            t.enc_autogenerado_dm is null and t.enc_autogenerado_dm_capa is null
        )
    ) t`;

const PERMISOS_DE_CAMPO = ['campo.ver', 'campo.editar', 'campo.administrar', 'encuestas.procesar'];
const PERMISOS_DE_GESTION = ['campo.administrar', 'encuestas.procesar'];
// el panorama del operativo es de coordinación para arriba (install/roles.tab); el superuser lo ve igual
export const ROLES_DE_COORDINACION = ['admin', 'direccion', 'coor_campo', 'subcoor_campo', 'coor_proc', 'procesamiento'];
// quien recibe encuestas (recepcionista, ingresador y la coordinación)
const PERMISOS_DE_RECEPCION = ['campo.editar'];

function parametrosDelUsuario(consulta: ConsultaTablero): ValorSql[] {
    return [consulta.operativo, consulta.quien.usuario];
}

// la grilla del menú con las encuestas de cada tarea (si el usuario no la tiene en su menú, no se ofrece el link).
// En los estados por tarea, las de relevamiento (encu, recu, supe, ...) van a tareas_tem, que sólo tiene el menú de coordinación para arriba
export const RUTA_TAREAS_TEM: RutaMenu = ['configurar', 'muestra', 'tareas_tem'];
export const RUTA_TEM: RutaMenu = ['configurar', 'muestra', 'tem'];
export const RUTA_POR_TAREA: { [tarea: string]: RutaMenu } = {
    finc: ['tareas_tem_fin_campo'],
    anac: ['tareas_tem_analisis_campo'],
    proc: ['procesar', 'tareas_tem_procesamiento'],
};

// la grilla de recepción de cada tarea de relevamiento, para quien recibe encuestas
export const RUTA_RECEPCION_POR_TAREA: { [tarea: string]: RutaMenu } = {
    encu: ['recepcion', 'encuestador'],
    recu: ['recepcion', 'recuperador'],
    ingr: ['recepcion', 'ingresador'],
    supe: ['recepcion', 'supervisor'],
};

// la grilla de asignación de cada tarea de relevamiento (la de supervisor es sólo para quien administra campo)
export const RUTA_ASIGNACION_POR_TAREA: { [tarea: string]: RutaMenu } = {
    encu: ['asignacion', 'encuestador'],
    recu: ['asignacion', 'recuperador'],
    ingr: ['asignacion', 'ingresador'],
    supe: ['asignacion', 'supervisor'],
};

function accesoALaRuta(ruta: RutaMenu | undefined, filtro?: FiltroTablero): ConAcceso {
    return ruta == null ? {} : { acceso: { titulo: 'ver encuestas', ruta, ...(filtro != null && Object.keys(filtro).length ? { filtro } : {}) } };
}

// estados por tarea: las de relevamiento van a tareas_tem filtrada por tarea y estado (ff del link, como en el menú);
// las grillas de fin de campo, análisis de campo y procesamiento ya son de una sola tarea, así que sólo se filtra por estado
// y las que no tienen tarea (todavía sin asignar) a la tem con tarea_actual = null
function accesoDeEstado(tarea: string | null, estado: string | null): ConAcceso {
    if (tarea == null) {
        return accesoALaRuta(RUTA_TEM, { tarea_actual: null });
    }
    var propia = RUTA_POR_TAREA[tarea];
    return accesoALaRuta(propia ?? RUTA_TAREAS_TEM, {
        ...(propia == null ? { tarea } : {}),
        ...(estado != null ? { estado } : {}),
    });
}

// dónde están las encuestas: las de relevamiento van a la grilla de recepción
function accesoDeCircuito(tarea: string): ConAcceso {
    return accesoALaRuta(RUTA_POR_TAREA[tarea] ?? RUTA_RECEPCION_POR_TAREA[tarea]);
}

/* control de campo: se usa el sql de las tablas control_* (el mismo de las grillas del menú control) */

function sqlDe(definicion: TableDefinition): string {
    var from = definicion.sql?.from;
    if (from == null) {
        throw new Error(`tablero: la tabla ${definicion.name} no define sql.from`);
    }
    return from;
}

// las columnas de control_campo que se suman al agrupar. El sql.from de la definición ya trae su alias (backend-plus se lo agrega),
// por eso las columnas van sin prefijo
const SUMAS_DE_CONTROL = ['total', 'salieron', 'no_salieron', 'rea', 'en_curso']
    .map(campo => `coalesce(sum(${campo}), 0) as ${campo}`).join(', ');

export type CifrasControl = {
    total: number
    salieron: number
    no_salieron: number
    rea: number
    en_curso: number
}

export function cifrasDeControl(fila: FilaSql | undefined): CifrasControl {
    return {
        total: numero(fila, 'total'),
        salieron: numero(fila, 'salieron'),
        no_salieron: numero(fila, 'no_salieron'),
        rea: numero(fila, 'rea'),
        en_curso: numero(fila, 'en_curso'),
    };
}

// en qué punto está cada encuesta; lo que no es efectiva ni en curso de las que salieron es no respuesta
export function partesDeControl(cifras: CifrasControl): ParteAvance[] {
    return [
        { id: 'efectiva', titulo: 'Efectivas', valor: cifras.rea, tono: 'bueno' },
        { id: 'en_curso', titulo: 'En curso', valor: cifras.en_curso, tono: 'atencion' },
        { id: 'no_respuesta', titulo: 'No respuesta', valor: Math.max(cifras.salieron - cifras.rea - cifras.en_curso, 0), tono: 'alerta' },
        { id: 'sin_salir', titulo: 'No salieron a campo', valor: cifras.no_salieron, tono: 'neutro' },
    ];
}

export type MotivoNoRespuesta = { titulo: string, cantidad: number, encuestable: boolean }

export type ResumenControl = CifrasControl & {
    motivos: MotivoNoRespuesta[] // una por grupo de no respuesta de control_resumen
}

// tabla: control_resumen (todo el operativo) o control_resumen_recepcion (las encuestas del usuario como recepcionista)
export async function resumenDeControl(consulta: ConsultaTablero, tabla: string = 'control_resumen'): Promise<ResumenControl> {
    var definicion = consulta.tabla(tabla);
    var grupos = camposGruposNoRea(definicion);
    var [fila] = await filas(consulta, `
        select ${SUMAS_DE_CONTROL}${grupos.map((grupo, i) => `, coalesce(sum(${sqlTools.quoteIdent(grupo.name)}), 0) as grupo_${i}`).join('')}
            from ${sqlDe(definicion)}`, []);
    return {
        ...cifrasDeControl(fila),
        motivos: grupos.map((grupo, i) => ({
            titulo: grupo.title ?? grupo.name,
            cantidad: numero(fila, `grupo_${i}`),
            encuestable: grupo.tasa_efectividad === true,
        })),
    };
}

export const seccionResumen: DefinicionSeccionTablero = {
    id: 'resumen',
    titulo: 'Panorama del operativo',
    orden: 10,
    roles: ROLES_DE_COORDINACION,
    acceso: { titulo: 'control de campo', ruta: ['control', 'resumen'] },
    async obtener(consulta) {
        var resumen = await resumenDeControl(consulta);
        if (resumen.total == 0) {
            return null;
        }
        var noRespuestaEncuestable = resumen.motivos.filter(motivo => motivo.encuestable).reduce((suma, motivo) => suma + motivo.cantidad, 0);
        var indicadores: IndicadorTablero[] = [
            { id: 'muestra', titulo: 'Encuestas en la muestra', valor: resumen.total, tono: 'info' },
            { id: 'salieron', titulo: 'Salieron a campo', valor: resumen.salieron, total: resumen.total, tono: 'info' },
            { id: 'efectivas', titulo: 'Efectivas', valor: resumen.rea, total: resumen.salieron, tono: 'bueno' },
            { id: 'en_curso', titulo: 'En curso', valor: resumen.en_curso, total: resumen.salieron, detalle: 'pendientes, incompletas o con problemas', tono: 'atencion' },
            {
                id: 'tasa_respuesta', titulo: 'Tasa de respuesta', formato: 'porcentaje',
                valor: porcentaje(resumen.rea, resumen.rea + noRespuestaEncuestable),
                detalle: 'efectivas sobre efectivas y no respuestas encuestables (tasa de efectividad de control de campo)', tono: 'bueno'
            },
        ];
        return { tipo: 'indicadores', indicadores };
    }
};

export const seccionAvance: DefinicionSeccionTablero = {
    id: 'avance',
    titulo: 'Avance del campo',
    descripcion: 'En qué punto está cada encuesta de la muestra',
    orden: 20,
    roles: ROLES_DE_COORDINACION,
    async obtener(consulta) {
        var partes = partesDeControl(await resumenDeControl(consulta));
        return partes.some(parte => parte.valor > 0) ? { tipo: 'avance', partes } : null;
    }
};

export const seccionNoRespuesta: DefinicionSeccionTablero = {
    id: 'no_respuesta',
    titulo: 'Motivos de no respuesta',
    orden: 25,
    ancho: 'mitad',
    roles: ROLES_DE_COORDINACION,
    acceso: { titulo: 'control de campo', ruta: ['control', 'resumen'] },
    async obtener(consulta) {
        var motivos = (await resumenDeControl(consulta)).motivos.filter(motivo => motivo.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad);
        var filasBarras: FilaBarras[] = motivos.map(motivo => ({ etiqueta: motivo.titulo, valor: motivo.cantidad, tono: 'alerta' }));
        return filasBarras.length ? { tipo: 'barras', filas: filasBarras } : null;
    }
};

type DefinicionCorte = {
    id: string
    titulo: string
    tabla: string // la tabla de control_campo con ese corte
    campo: string // la columna por la que se agrupa
    etiqueta(valor: string): string
    ruta: RutaMenu // la grilla del menú de control con el detalle
};

export const CORTES_DESGLOSE: DefinicionCorte[] = [
    { id: 'dominio', titulo: 'dominio', tabla: 'control_campo_dominio', campo: 'dominio', etiqueta: valor => `dominio ${valor}`, ruta: ['control', 'dominio'] },
    { id: 'zona', titulo: 'zona', tabla: 'control_campo_zona', campo: 'zona', etiqueta: valor => `zona ${valor}`, ruta: ['control', 'zona'] },
    { id: 'comuna', titulo: 'comuna', tabla: 'control_campo_comuna', campo: 'nrocomuna', etiqueta: valor => `comuna ${valor}`, ruta: ['control', 'comuna'] },
    { id: 'area', titulo: 'área', tabla: 'control_campo_area', campo: 'area', etiqueta: valor => `área ${valor}`, ruta: ['control', 'área'] },
];

const MAXIMO_FILAS_POR_CORTE = 200;

export async function corteDeControl(consulta: ConsultaTablero, corte: DefinicionCorte): Promise<CorteDesglose> {
    var campo = sqlTools.quoteIdent(corte.campo);
    var porValor = await filas(consulta, `
        select ${campo} as etiqueta, ${SUMAS_DE_CONTROL}
            from ${sqlDe(consulta.tabla(corte.tabla))}
            group by ${campo}
            order by case when ${campo}::text ~ '^\\d+$' then ${campo}::text::integer end, ${campo}
            limit ${MAXIMO_FILAS_POR_CORTE}`, []);
    return {
        id: corte.id,
        titulo: corte.titulo,
        acceso: { titulo: 'control por ' + corte.titulo, ruta: corte.ruta },
        filas: porValor.filter(fila => numero(fila, 'total') > 0).map(fila => ({
            etiqueta: corte.etiqueta(texto(fila, 'etiqueta') ?? 'sin dato'),
            partes: partesDeControl(cifrasDeControl(fila)),
        })),
    };
}

export const seccionDesglose: DefinicionSeccionTablero = {
    id: 'desglose',
    titulo: 'Avance por dominio, zona, comuna y área',
    descripcion: 'Cada barra es el total de la muestra del corte, abierto por el punto del campo en que está',
    orden: 30,
    roles: ROLES_DE_COORDINACION,
    async obtener(consulta) {
        var cortes: CorteDesglose[] = [];
        for (var corte of CORTES_DESGLOSE) {
            var resultado = await corteDeControl(consulta, corte);
            if (resultado.filas.length) {
                cortes.push(resultado);
            }
        }
        return cortes.length ? { tipo: 'desglose', cortes } : null;
    }
};

/* orden de las tareas: sale de los pases de tareas_proximas */

export type TareaParaOrdenar = { tarea: string, es_inicial: boolean, es_final: boolean };

// El orden del circuito: primero las que están en la cadena de pases de tareas_proximas, por la mayor cantidad de pases que hay hasta ellas
// (los pases hacia atrás, que vuelven a una tarea ya recorrida, se ignoran); después las que no tienen ningún pase y por último la final.
// A igual lugar, la inicial primero y luego por código.
export function ordenarTareas(tareas: TareaParaOrdenar[], pases: { origen: string, destino: string }[]): string[] {
    var salen: Map<string, string[]> = new Map();
    var conPases: Set<string> = new Set();
    pases.filter(pase => pase.origen != pase.destino).forEach(pase => {
        salen.set(pase.origen, [...(salen.get(pase.origen) ?? []), pase.destino]);
        conPases.add(pase.origen).add(pase.destino);
    });
    // se recorre desde las iniciales; un pase hacia una tarea que se está recorriendo vuelve hacia atrás
    var haciaAtras: Set<string> = new Set();
    var recorridas: Set<string> = new Set();
    var enCurso: Set<string> = new Set();
    function recorrer(tarea: string): void {
        recorridas.add(tarea);
        enCurso.add(tarea);
        (salen.get(tarea) ?? []).forEach(destino => {
            if (enCurso.has(destino)) {
                haciaAtras.add(tarea + '>' + destino);
            } else if (!recorridas.has(destino)) {
                recorrer(destino);
            }
        });
        enCurso.delete(tarea);
    }
    var porCodigo = (a: TareaParaOrdenar, b: TareaParaOrdenar) => a.tarea < b.tarea ? -1 : a.tarea > b.tarea ? 1 : 0;
    [...tareas].sort((a, b) => (a.es_inicial ? 0 : 1) - (b.es_inicial ? 0 : 1) || porCodigo(a, b)).forEach(t => {
        if (!recorridas.has(t.tarea)) {
            recorrer(t.tarea);
        }
    });
    var entran: Map<string, string[]> = new Map();
    pases.filter(pase => pase.origen != pase.destino && !haciaAtras.has(pase.origen + '>' + pase.destino)).forEach(pase => {
        entran.set(pase.destino, [...(entran.get(pase.destino) ?? []), pase.origen]);
    });
    var memo: Map<string, number> = new Map();
    function pasesHasta(tarea: string): number {
        var conocido = memo.get(tarea);
        if (conocido != null) {
            return conocido;
        }
        var resultado = Math.max(0, ...(entran.get(tarea) ?? []).map(origen => pasesHasta(origen) + 1));
        memo.set(tarea, resultado);
        return resultado;
    }
    var clave = (t: TareaParaOrdenar) => [t.es_final ? 1 : 0, conPases.has(t.tarea) ? 0 : 1, pasesHasta(t.tarea), t.es_inicial ? 0 : 1];
    return tareas.map(t => ({ t, clave: clave(t) })).sort((a, b) => {
        for (var i = 0; i < a.clave.length; i++) {
            if (a.clave[i] != b.clave[i]) {
                return a.clave[i] - b.clave[i];
            }
        }
        return porCodigo(a.t, b.t);
    }).map(({ t }) => t.tarea);
}

// los códigos de las tareas del operativo en el orden del circuito
export async function ordenDeTareas(consulta: ConsultaTablero): Promise<string[]> {
    var tareas = await filas(consulta, `select tarea, es_inicial, es_final from tareas where operativo = $1`, [consulta.operativo]);
    var pases = await filas(consulta, `select distinct tarea, tarea_destino from tareas_proximas where operativo = $1`, [consulta.operativo]);
    return ordenarTareas(
        tareas.map(fila => ({ tarea: texto(fila, 'tarea') ?? '', es_inicial: fila.es_inicial === true, es_final: fila.es_final === true })),
        pases.map(fila => ({ origen: texto(fila, 'tarea') ?? '', destino: texto(fila, 'tarea_destino') ?? '' }))
    );
}

function posicionEn(orden: string[], tarea: string | null): number {
    var posicion = orden.indexOf(tarea ?? '');
    return posicion < 0 ? orden.length : posicion;
}

/* dónde están las encuestas */

export const seccionCircuito: DefinicionSeccionTablero = {
    id: 'circuito',
    titulo: 'Dónde están las encuestas',
    descripcion: 'Cantidad de encuestas según su tarea actual, con acceso a la grilla de cada tarea',
    orden: 40,
    roles: ROLES_DE_COORDINACION,
    async obtener(consulta) {
        // las que no tienen tarea_actual (todavía sin asignar) vienen en una fila aparte con tarea nula
        var filasPorTarea = await filas(consulta, `
            select ta.tarea, ta.nombre, count(t.enc) as cantidad
                from tareas ta
                    left join ${TEM_DEL_USUARIO} on t.operativo = ta.operativo and t.tarea_actual = ta.tarea
                where ta.operativo = $1
                group by ta.tarea, ta.nombre
            union all
            select null, null, count(*)
                from ${TEM_DEL_USUARIO}
                where t.tarea_actual is null`, parametrosDelUsuario(consulta));
        var sinAsignar = filasPorTarea.find(fila => fila.tarea == null);
        var porTarea = filasPorTarea.filter(fila => fila.tarea != null);
        if (porTarea.length == 0) {
            return null;
        }
        var orden = await ordenDeTareas(consulta);
        porTarea.sort((a, b) => posicionEn(orden, texto(a, 'tarea')) - posicionEn(orden, texto(b, 'tarea')));
        var total = filasPorTarea.reduce((suma, fila) => suma + numero(fila, 'cantidad'), 0);
        var indicadores: IndicadorTablero[] = [
            {
                id: 'sin_asignar', titulo: 'Sin asignar', valor: numero(sinAsignar, 'cantidad'), total,
                tono: numero(sinAsignar, 'cantidad') ? 'info' : 'neutro', ...accesoDeEstado(null, null),
            },
            ...porTarea.map((fila): IndicadorTablero => ({
                id: texto(fila, 'tarea') ?? '',
                titulo: texto(fila, 'nombre') ?? texto(fila, 'tarea') ?? '',
                valor: numero(fila, 'cantidad'),
                total,
                tono: numero(fila, 'cantidad') ? 'info' : 'neutro',
                ...accesoDeCircuito(texto(fila, 'tarea') ?? ''),
            })),
        ];
        return { tipo: 'indicadores', indicadores, total };
    }
};

export const seccionEstados: DefinicionSeccionTablero = {
    id: 'estados',
    titulo: 'Estados por tarea',
    descripcion: 'Tarea en la que está cada encuesta y su estado (código y descripción)',
    orden: 50,
    roles: ROLES_DE_COORDINACION,
    async obtener(consulta) {
        var porEstado = await filas(consulta, `
            select t.tarea_actual as tarea, coalesce(ta.nombre, t.tarea_actual, 'sin tarea') as nombre_tarea,
                    tt.estado, e.desc_estado, count(*) as cantidad
                from ${TEM_DEL_USUARIO}
                    left join tareas ta on ta.operativo = t.operativo and ta.tarea = t.tarea_actual
                    left join tareas_tem tt on tt.operativo = t.operativo and tt.enc = t.enc and tt.tarea = t.tarea_actual
                    left join estados e on e.operativo = tt.operativo and e.estado = tt.estado
                group by t.tarea_actual, ta.nombre, tt.estado, e.desc_estado, e.orden_estado
                order by e.orden_estado nulls last, tt.estado nulls last`, parametrosDelUsuario(consulta));
        var orden = await ordenDeTareas(consulta);
        porEstado.sort((a, b) => posicionEn(orden, texto(a, 'tarea')) - posicionEn(orden, texto(b, 'tarea')));
        var total = porEstado.reduce((suma, fila) => suma + numero(fila, 'cantidad'), 0);
        var filasBarras: FilaBarras[] = porEstado.map(fila => {
            var estado = texto(fila, 'estado');
            var descripcion = texto(fila, 'desc_estado');
            return {
                etiqueta: `Tarea: ${texto(fila, 'nombre_tarea')} Estado: ${estado == null ? 'sin estado' : estado + (descripcion != null ? ` (${descripcion})` : '')}`,
                valor: numero(fila, 'cantidad'),
                ...accesoDeEstado(texto(fila, 'tarea'), estado),
            };
        });
        return filasBarras.length ? { tipo: 'barras', filas: filasBarras, total } : null;
    }
};

/* recepción: lo del usuario como recepcionista */

// avance de campo de las encuestas del usuario (mismo sql que control_resumen, filtrado por su recepción)
export const seccionMiAvance: DefinicionSeccionTablero = {
    id: 'mi_avance',
    titulo: 'Avance de mis encuestas',
    descripcion: 'En qué punto están las encuestas de las que soy recepcionista',
    orden: 16,
    permisos: PERMISOS_DE_RECEPCION,
    async obtener(consulta) {
        if (consulta.quien.idper == null) {
            return null;
        }
        var partes = partesDeControl(await resumenDeControl(consulta, 'control_resumen_recepcion'));
        return partes.some(parte => parte.valor > 0) ? { tipo: 'avance', partes } : null;
    }
};

// las encuestas del usuario como recepcionista, por tarea y estado, con lo que dicen sus estados (ver tabla estados).
// Las que todavía no se asignaron (estado disponible) están en la tarea inicial (ver tarea_vigente en TEM_DEL_USUARIO)
type EncuestasDeRecepcion = {
    tarea: string, nombre: string, estado: string, cantidad: number, permiteAsignar: boolean, visibleEnRecepcion: boolean,
    recepcionista: string | null, personaRecepcionista: string | null
};

// de: 'usuario' las del usuario como recepcionista; 'todos' las de todos los recepcionistas (y las que no tienen)
export async function encuestasDeRecepcion(consulta: ConsultaTablero, de: 'usuario' | 'todos' = 'usuario'): Promise<EncuestasDeRecepcion[]> {
    if (de == 'usuario' && consulta.quien.idper == null) {
        return [];
    }
    var mias = await filas(consulta, `
        select tt.tarea, coalesce(ta.nombre, tt.tarea) as nombre, coalesce(e.desc_estado, tt.estado, 'sin estado') as estado,
                coalesce(e.permite_asignar, false) as permite_asignar, coalesce(e.visible_en_recepcion, false) as visible_en_recepcion,
                tt.recepcionista, nullif(trim(coalesce(u.nombre, '') || ' ' || coalesce(u.apellido, '')), '') as persona_recepcionista,
                count(*) as cantidad
            from ${TEM_DEL_USUARIO}
                join tareas_tem tt on tt.operativo = t.operativo and tt.enc = t.enc and tt.tarea = t.tarea_vigente
                left join tareas ta on ta.operativo = tt.operativo and ta.tarea = tt.tarea
                left join estados e on e.operativo = tt.operativo and e.estado = tt.estado
                left join usuarios u on u.idper = tt.recepcionista
            where ($3::text is null or tt.recepcionista = $3)
            group by tt.tarea, ta.nombre, 3, e.permite_asignar, e.visible_en_recepcion, e.orden_estado, tt.recepcionista, u.nombre, u.apellido
            order by e.orden_estado nulls last, 3`,
        [...parametrosDelUsuario(consulta), de == 'usuario' ? consulta.quien.idper : null]);
    var orden = await ordenDeTareas(consulta);
    mias.sort((a, b) => posicionEn(orden, texto(a, 'tarea')) - posicionEn(orden, texto(b, 'tarea')));
    return mias.map(fila => ({
        tarea: texto(fila, 'tarea') ?? '',
        nombre: texto(fila, 'nombre') ?? '',
        estado: texto(fila, 'estado') ?? 'sin estado',
        cantidad: numero(fila, 'cantidad'),
        permiteAsignar: fila.permite_asignar === true,
        visibleEnRecepcion: fila.visible_en_recepcion === true,
        recepcionista: texto(fila, 'recepcionista'),
        personaRecepcionista: texto(fila, 'persona_recepcionista'),
    }));
}

const SOLO_PARA_ASIGNAR = (e: EncuestasDeRecepcion) => e.permiteAsignar && !e.visibleEnRecepcion;
const PARA_RECIBIR = (e: EncuestasDeRecepcion) => e.visibleEnRecepcion;

// una tarjeta por tarea con la cantidad y el detalle por estado, que lleva a la grilla de esa tarea
function indicadoresPorTarea(encuestas: EncuestasDeRecepcion[], rutas: { [tarea: string]: RutaMenu }): IndicadorTablero[] {
    var tareas: { tarea: string, nombre: string, estados: EncuestasDeRecepcion[] }[] = [];
    encuestas.forEach(encuesta => {
        var existente = tareas.find(t => t.tarea == encuesta.tarea);
        if (existente == null) {
            existente = { tarea: encuesta.tarea, nombre: encuesta.nombre, estados: [] };
            tareas.push(existente);
        }
        existente.estados.push(encuesta);
    });
    return tareas.map(t => ({
        id: t.tarea,
        titulo: t.nombre,
        valor: t.estados.reduce((suma, e) => suma + e.cantidad, 0),
        detalle: t.estados.map(e => `${e.estado}: ${e.cantidad}`).join(' · '),
        tono: 'info',
        ...accesoALaRuta(rutas[t.tarea]),
    }));
}

// la asignación y la recepción se reparten las encuestas según el estado: las que se pueden asignar y todavía no se ven en recepción
// (por ejemplo las disponibles) se asignan; las demás que se ven en recepción se reciben
export const seccionParaAsignar: DefinicionSeccionTablero = {
    id: 'para_asignar',
    titulo: 'Para asignar',
    descripcion: 'Mis encuestas que todavía no están asignadas: se ven en la asignación, no en la recepción',
    orden: 12,
    ancho: 'mitad',
    permisos: PERMISOS_DE_RECEPCION,
    async obtener(consulta) {
        var indicadores = indicadoresPorTarea((await encuestasDeRecepcion(consulta)).filter(SOLO_PARA_ASIGNAR), RUTA_ASIGNACION_POR_TAREA);
        return indicadores.length ? { tipo: 'indicadores', indicadores } : null;
    }
};

// para la coordinación: lo mismo de cada recepcionista, y las encuestas que todavía no tienen recepcionista
export const seccionRecepcionistas: DefinicionSeccionTablero = {
    id: 'recepcionistas',
    titulo: 'Asignación y recepción por recepcionista',
    descripcion: 'Encuestas de cada recepcionista que faltan asignar y que están en recepción',
    orden: 18,
    roles: ROLES_DE_COORDINACION,
    acceso: { titulo: 'asignación', ruta: ['asignacion', 'general'] },
    async obtener(consulta) {
        var porRecepcionista: Map<string, { recepcionista: string, paraAsignar: number, enRecepcion: number }> = new Map();
        (await encuestasDeRecepcion(consulta, 'todos')).forEach(encuesta => {
            var clave = encuesta.recepcionista ?? '';
            var fila = porRecepcionista.get(clave) ?? { recepcionista: encuesta.personaRecepcionista ?? encuesta.recepcionista ?? 'sin recepcionista', paraAsignar: 0, enRecepcion: 0 };
            fila.paraAsignar += SOLO_PARA_ASIGNAR(encuesta) ? encuesta.cantidad : 0;
            fila.enRecepcion += PARA_RECIBIR(encuesta) ? encuesta.cantidad : 0;
            porRecepcionista.set(clave, fila);
        });
        // los que tienen recepcionista por nombre y al final las que no tienen
        var recepcionistas = Array.from(porRecepcionista.entries()).sort(([a, x], [b, y]) =>
            (a == '' ? 1 : 0) - (b == '' ? 1 : 0) || x.recepcionista.localeCompare(y.recepcionista));
        var filasTabla = recepcionistas.map(([_clave, fila]) => ({ recepcionista: fila.recepcionista, para_asignar: fila.paraAsignar, en_recepcion: fila.enRecepcion }));
        if (filasTabla.length == 0) {
            return null;
        }
        return {
            tipo: 'tabla',
            columnas: [
                { campo: 'recepcionista', titulo: 'recepcionista' },
                { campo: 'para_asignar', titulo: 'para asignar', numerica: true },
                { campo: 'en_recepcion', titulo: 'en recepción', numerica: true },
            ],
            filas: [
                ...filasTabla,
                { recepcionista: 'Total', para_asignar: filasTabla.reduce((suma, fila) => suma + fila.para_asignar, 0), en_recepcion: filasTabla.reduce((suma, fila) => suma + fila.en_recepcion, 0) },
            ],
        };
    }
};

export const seccionParaRecibir: DefinicionSeccionTablero = {
    id: 'para_recibir',
    titulo: 'En recepción',
    descripcion: 'Mis encuestas que ya salieron a campo o se están recibiendo, por tarea y estado',
    orden: 14,
    ancho: 'mitad',
    permisos: PERMISOS_DE_RECEPCION,
    async obtener(consulta) {
        var indicadores = indicadoresPorTarea((await encuestasDeRecepcion(consulta)).filter(PARA_RECIBIR), RUTA_RECEPCION_POR_TAREA);
        return indicadores.length ? { tipo: 'indicadores', indicadores } : null;
    }
};

export const seccionCalendario: DefinicionSeccionTablero = {
    id: 'calendario',
    titulo: 'Calendario',
    orden: 70,
    ancho: 'tercio',
    permisos: PERMISOS_DE_CAMPO,
    async obtener(consulta) {
        var [fila] = await filas(consulta, `
            select (select count(*) from semanas where operativo = $1) as semanas,
                    s.semana, to_char(s.carga_enc_desde, 'DD/MM') as desde, to_char(s.carga_enc_hasta, 'DD/MM') as hasta,
                    s.carga_enc_hasta - current_date as dias_restantes
                from (select 1) x
                    left join semanas s on s.operativo = $1 and current_date between s.carga_enc_desde and s.carga_enc_hasta
                order by s.semana
                limit 1`, [consulta.operativo]);
        var semanas = numero(fila, 'semanas');
        if (semanas == 0) {
            return null;
        }
        if (texto(fila, 'semana') == null) {
            return { tipo: 'mensaje', texto: `Hoy no corresponde a ninguna de las ${semanas} semanas de carga del operativo.`, tono: 'info' };
        }
        return {
            tipo: 'indicadores',
            indicadores: [
                { id: 'semana', titulo: 'Semana de carga', valor: numero(fila, 'semana'), total: semanas, detalle: `del ${texto(fila, 'desde')} al ${texto(fila, 'hasta')}`, tono: 'info' },
                { id: 'dias_restantes', titulo: 'Días que le quedan', valor: numero(fila, 'dias_restantes'), tono: numero(fila, 'dias_restantes') <= 1 ? 'atencion' : 'neutro' },
            ]
        };
    }
};

export const seccionDispositivos: DefinicionSeccionTablero = {
    id: 'dispositivos',
    titulo: 'Dispositivos',
    descripcion: 'Sincronizaciones de los dispositivos móviles',
    orden: 80,
    ancho: 'tercio',
    permisos: ['campo.administrar'],
    async obtener(consulta) {
        var [fila] = await filas(consulta, `
            select count(*) filter (where cuando >= current_date) as hoy,
                    count(distinct usuario) filter (where cuando >= current_date) as usuarios_hoy,
                    count(*) filter (where cuando >= current_timestamp - interval '7 days') as semana,
                    to_char(max(cuando), 'DD/MM HH24:MI') as ultima
                from sincronizaciones`, []);
        var ultima = texto(fila, 'ultima');
        if (ultima == null) {
            return null;
        }
        return {
            tipo: 'indicadores',
            indicadores: [
                { id: 'sincronizaciones_hoy', titulo: 'Sincronizaciones hoy', valor: numero(fila, 'hoy'), detalle: `${numero(fila, 'usuarios_hoy')} personas · última ${ultima}`, tono: 'info' },
                { id: 'sincronizaciones_semana', titulo: 'En los últimos 7 días', valor: numero(fila, 'semana'), tono: 'neutro' },
            ]
        };
    }
};

export const seccionAccesos: DefinicionSeccionTablero = {
    id: 'accesos',
    titulo: 'Qué puedo hacer',
    descripcion: 'Accesos directos a las opciones del menú que tengo habilitadas',
    orden: 900,
    async obtener(consulta) {
        var accesos = accesosDelMenu(consulta.menu);
        return accesos.length ? { tipo: 'accesos', accesos } : null;
    }
};

export const SECCIONES_TABLERO: DefinicionSeccionTablero[] = [
    seccionResumen,
    seccionParaAsignar,
    seccionParaRecibir,
    seccionRecepcionistas,
    seccionMiAvance,
    seccionAvance,
    seccionNoRespuesta,
    seccionDesglose,
    seccionCircuito,
    seccionEstados,
    seccionCalendario,
    seccionDispositivos,
    seccionAccesos,
];
