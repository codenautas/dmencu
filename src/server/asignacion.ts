"use strict";

// Pantallas de asignación (general por área y por tarea) y de recepción (ver docs/asignacion-recepcion.md).
// Escriben en las mismas tablas que las grillas (tareas_areas y tareas_tem): las reglas las siguen validando
// los triggers de la base (validar_tareas_tem_trg, sincro_tareas_areas_tareas_tem_trg, asignar_desasignar_tareas_tem_trg).

import type {
    AccionDisponible, AreaAsignacion, CambioDeArea, CambioDeEncuestas, ContextoAsignacion, EncuestaAsignacion,
    EncuestaRecepcion, EstadoDeTarea, PersonaAsignable, PersonaRecepcion, ResultadoDeCambio, TareaAsignable
} from "../unlogged/tipos-asignacion";
import type { PerfilTablero } from "../unlogged/tipos-tablero";
import type { ProcedureContext } from "backend-plus";
import type { Context, ProcedureDef } from "./types-dmencu";
import { tienePermiso } from "./ayuda";
import { ClienteTablero, FilaSql, numero, TEM_DEL_USUARIO, texto, ValorSql } from "./tablero";

/* permisos: los mismos que las grillas y el menú de asignación y recepción */

export type QuienAsigna = {
    puedeVer: boolean // campo.editar: ve asignación por tarea y recepción
    puedeEditar: boolean // campo.administrar o recepcionista: asigna y cambia recepcionista
    puedeAsignarGeneral: boolean // campo.administrar: asignación general por área
    soloComoRecepcionista: string | null // el recepcionista sólo ve y cambia las encuestas que tiene a cargo
    usuario: string
}

export function quienAsigna(context: Pick<Context, 'user' | 'puede' | 'superuser'>): QuienAsigna {
    var administra = !!context.superuser || tienePermiso(context.puede, 'campo.administrar');
    var esRecepcionista = context.user?.rol === 'recepcionista';
    return {
        puedeVer: administra || tienePermiso(context.puede, 'campo.editar'),
        puedeEditar: administra || esRecepcionista,
        puedeAsignarGeneral: administra,
        soloComoRecepcionista: esRecepcionista && !administra ? context.user?.idper ?? '' : null,
        usuario: context.user?.usuario ?? '',
    };
}

function exigir(condicion: boolean, mensaje: string): void {
    if (!condicion) {
        throw new Error(mensaje);
    }
}

/* lectura de filas */

function verdadero(fila: FilaSql, campo: string): boolean {
    var valor = fila[campo];
    return valor === true || valor === 'true' || valor === 't';
}

function numeroONull(fila: FilaSql, campo: string): number | null {
    return fila[campo] == null ? null : numero(fila, campo);
}

async function filas(client: ClienteTablero, sql: string, params: ValorSql[]): Promise<FilaSql[]> {
    return (await client.query(sql, params).fetchAll()).rows;
}

const NOMBRE_DE_PERSONA = `coalesce(nullif(trim(coalesce(u.nombre, '') || ' ' || coalesce(u.apellido, '')), ''), u.usuario)`;

const DIRECCION = `concat_ws(' ', t.nomcalle, t.nrocatastral,
        case when t.piso is not null then 'piso ' || t.piso end,
        case when t.departamento is not null then 'dto ' || t.departamento end)`;

export function personaDesdeFila(fila: FilaSql): PersonaAsignable {
    return {
        idper: texto(fila, 'idper') ?? '',
        nombre: texto(fila, 'nombre') ?? '',
        usuario: texto(fila, 'usuario') ?? '',
        rol: texto(fila, 'rol'),
        dispositivo: texto(fila, 'dispositivo'),
    };
}

/* contexto */

export async function traerContextoAsignacion(client: ClienteTablero, quien: QuienAsigna, perfil: PerfilTablero): Promise<ContextoAsignacion> {
    exigir(quien.puedeVer, 'no tiene permiso para ver la asignación');
    var [parametros] = await filas(client, `select operativo from parametros where unico_registro`, []);
    var operativo = texto(parametros, 'operativo') ?? '';
    var tareas: TareaAsignable[] = (await filas(client, `
        select ta.tarea, ta.nombre, ta.es_inicial, (select r.rol from roles r where r.rol = ta.nombre) as rol_sugerido
            from tareas ta
            where ta.operativo = $1
                -- sólo las tareas con formulario (encu, recu, supe...): son las que se asignan a una persona, como en las grillas;
                -- anac, finc y proc tienen filas en tareas_areas pero no se asignan por área
                and ta.main_form is not null
            order by ta.es_inicial is true desc, ta.tarea`, [operativo])).map(fila => ({
        tarea: texto(fila, 'tarea') ?? '',
        nombre: texto(fila, 'nombre') ?? texto(fila, 'tarea') ?? '',
        esInicial: verdadero(fila, 'es_inicial'),
        rolSugerido: texto(fila, 'rol_sugerido'),
    }));
    var estados: EstadoDeTarea[] = (await filas(client, `
        select estado, desc_estado, permite_asignar, orden_estado from estados where operativo = $1 order by orden_estado, estado`,
        [operativo])).map(fila => ({
        estado: texto(fila, 'estado') ?? '',
        descripcion: texto(fila, 'desc_estado') ?? texto(fila, 'estado') ?? '',
        permiteAsignar: verdadero(fila, 'permite_asignar'),
        orden: texto(fila, 'orden_estado'),
    }));
    var personas = (await filas(client, `
        select u.idper, u.usuario, u.rol, u.dispositivo, ${NOMBRE_DE_PERSONA} as nombre, (u.rol = 'recepcionista' or u.rol2 = 'recepcionista') as recepcionista
            from usuarios u
            where u.activo and u.idper is not null
            order by u.apellido, u.nombre, u.usuario`, []));
    return {
        operativo,
        perfil,
        puedeEditar: quien.puedeEditar,
        puedeAsignarGeneral: quien.puedeAsignarGeneral,
        soloComoRecepcionista: quien.soloComoRecepcionista,
        tareas,
        estados,
        personas: personas.map(personaDesdeFila),
        recepcionistas: personas.filter(fila => verdadero(fila, 'recepcionista')).map(personaDesdeFila),
    };
}

/* asignación general */

export function armarAreas(filasAreas: FilaSql[], filasTareasAreas: FilaSql[]): AreaAsignacion[] {
    var areas: AreaAsignacion[] = filasAreas.map(fila => ({
        area: numero(fila, 'area'),
        encuestas: numero(fila, 'encuestas'),
        comunas: texto(fila, 'comunas'),
        sinAsignar: numero(fila, 'sin_asignar'),
        porTarea: {},
    }));
    filasTareasAreas.forEach(fila => {
        var area = areas.find(a => a.area == numero(fila, 'area'));
        if (area != null) {
            area.porTarea[texto(fila, 'tarea') ?? ''] = {
                recepcionista: texto(fila, 'recepcionista'),
                asignado: texto(fila, 'asignado'),
                cargado: verdadero(fila, 'cargado'),
            };
        }
    });
    return areas;
}

export async function traerAreas(client: ClienteTablero, quien: QuienAsigna, operativo: string): Promise<AreaAsignacion[]> {
    exigir(quien.puedeAsignarGeneral, 'no tiene permiso para la asignación general');
    var filasAreas = await filas(client, `
        select a.area, count(t.enc) as encuestas,
                string_agg(distinct t.nrocomuna::text, '-' order by t.nrocomuna::text) as comunas,
                count(t.enc) filter (where tt.asignado is null) as sin_asignar
            from areas a
                left join ${TEM_DEL_USUARIO} on t.operativo = a.operativo and t.area = a.area
                left join tareas_tem tt on tt.operativo = t.operativo and tt.enc = t.enc
                    and tt.tarea = coalesce(t.tarea_actual, (select tarea from tareas where operativo = $1 and es_inicial))
            where a.operativo = $1
            group by a.area
            order by a.area`, [operativo, quien.usuario]);
    var filasTareasAreas = await filas(client, `
        select ta.area, ta.tarea, ta.recepcionista, ta.asignado,
                exists (select 1
                    from tareas_tem tt join tem t on t.operativo = tt.operativo and t.enc = tt.enc
                    where t.operativo = ta.operativo and t.area = ta.area and tt.tarea = ta.tarea and tt.cargado_dm is not null) as cargado
            from tareas_areas ta
            where ta.operativo = $1`, [operativo]);
    return armarAreas(filasAreas, filasTareasAreas);
}

// "set" de un cambio: sólo los campos que vienen (undefined no se toca). Los parámetros siguen a los que ya hay
export function setDelCambio(cambio: { recepcionista?: string | null, asignado?: string | null }, primerParametro: number): { set: string, params: ValorSql[] } {
    var partes: string[] = [];
    var params: ValorSql[] = [];
    if (cambio.recepcionista !== undefined) {
        params.push(cambio.recepcionista);
        partes.push(`recepcionista = $${primerParametro + params.length - 1}`);
    }
    if (cambio.asignado !== undefined) {
        params.push(cambio.asignado);
        partes.push(`asignado = $${primerParametro + params.length - 1}`);
    }
    if (partes.length == 0) {
        throw new Error('no se indicó qué cambiar (recepcionista o asignado)');
    }
    return { set: partes.join(', '), params };
}

function mensajeDeError(err: unknown): string {
    var mensaje = err instanceof Error ? err.message : String(err);
    return mensaje.replace(/^Error:\s*/, '');
}

// aplica un cambio por clave, cada uno en su savepoint: el error de uno (por ejemplo de un trigger) no deshace los demás
export async function aplicarConSavepoints(client: ClienteTablero, claves: string[], aplicar: (clave: string) => Promise<void>): Promise<ResultadoDeCambio[]> {
    var resultados: ResultadoDeCambio[] = [];
    for (var clave of claves) {
        try {
            await client.query(`savepoint asignacion_cambio`).execute();
            await aplicar(clave);
            await client.query(`release savepoint asignacion_cambio`).execute();
            resultados.push({ clave, ok: true, mensaje: null });
        } catch (err) {
            await client.query(`rollback to savepoint asignacion_cambio`).execute();
            resultados.push({ clave, ok: false, mensaje: mensajeDeError(err) });
        }
    }
    return resultados;
}

export async function cambiarAreas(client: ClienteTablero, quien: QuienAsigna, operativo: string, cambios: CambioDeArea[]): Promise<ResultadoDeCambio[]> {
    exigir(quien.puedeAsignarGeneral, 'no tiene permiso para la asignación general');
    exigir(Array.isArray(cambios), 'cambios debe ser una lista');
    var porClave: Map<string, CambioDeArea> = new Map(cambios.map(cambio => [`${cambio.area}/${cambio.tarea}`, cambio]));
    return aplicarConSavepoints(client, Array.from(porClave.keys()), async clave => {
        var cambio = porClave.get(clave)!;
        var { set, params } = setDelCambio(cambio, 4);
        await client.query(`
            insert into tareas_areas (operativo, tarea, area) values ($1, $2, $3) on conflict do nothing`,
            [operativo, cambio.tarea, cambio.area]).execute();
        await client.query(`update tareas_areas set ${set} where operativo = $1 and tarea = $2 and area = $3`,
            [operativo, cambio.tarea, cambio.area, ...params]).execute();
    });
}

/* asignación por tarea */

// las encuestas que se pueden asignar en una tarea: las que la tienen como tarea actual y, si es la tarea inicial,
// también las que todavía no tienen tarea (como valida validar_tareas_tem_trg). $1 operativo, $2 usuario, $3 tarea
const ENCUESTAS_DE_LA_TAREA = `
    from ${TEM_DEL_USUARIO}
        join tareas_tem tt on tt.operativo = t.operativo and tt.enc = t.enc and tt.tarea = $3
    where (t.tarea_actual = $3
        or t.tarea_actual is null and $3 = (select tarea from tareas where operativo = $1 and es_inicial))`;

function filtroDeRecepcionista(quien: QuienAsigna, numeroDeParametro: number): string {
    return quien.soloComoRecepcionista != null ? ` and tt.recepcionista = $${numeroDeParametro}` : '';
}
function parametroDeRecepcionista(quien: QuienAsigna): ValorSql[] {
    return quien.soloComoRecepcionista != null ? [quien.soloComoRecepcionista] : [];
}

export async function traerEncuestasDeTarea(client: ClienteTablero, quien: QuienAsigna, operativo: string, tarea: string): Promise<EncuestaAsignacion[]> {
    exigir(quien.puedeVer, 'no tiene permiso para ver la asignación');
    return (await filas(client, `
        select t.enc, t.area, ${DIRECCION} as direccion, tt.estado, t.habilitada, t.tarea_actual,
                tt.recepcionista, tt.asignado, tt.cargado_dm is not null as cargado
            ${ENCUESTAS_DE_LA_TAREA}${filtroDeRecepcionista(quien, 4)}
            order by t.area, t.enc`, [operativo, quien.usuario, tarea, ...parametroDeRecepcionista(quien)])
    ).map(fila => ({
        enc: texto(fila, 'enc') ?? '',
        area: numeroONull(fila, 'area'),
        direccion: texto(fila, 'direccion') ?? '',
        estado: texto(fila, 'estado') ?? '',
        habilitada: verdadero(fila, 'habilitada'),
        tareaActual: texto(fila, 'tarea_actual'),
        recepcionista: texto(fila, 'recepcionista'),
        asignado: texto(fila, 'asignado'),
        cargado: verdadero(fila, 'cargado'),
    }));
}

export async function cambiarEncuestas(client: ClienteTablero, quien: QuienAsigna, operativo: string, cambio: CambioDeEncuestas): Promise<ResultadoDeCambio[]> {
    exigir(quien.puedeEditar, 'no tiene permiso para asignar');
    exigir(Array.isArray(cambio.encs), 'encs debe ser una lista');
    var { set, params } = setDelCambio(cambio, 4);
    var condicionRecepcionista = filtroDeRecepcionista(quien, 4 + params.length).replace('tt.', '');
    return aplicarConSavepoints(client, Array.from(new Set(cambio.encs)), async enc => {
        var actualizadas = await filas(client, `
            update tareas_tem set ${set}
                where operativo = $1 and tarea = $2 and enc = $3${condicionRecepcionista}
                returning enc`, [operativo, cambio.tarea, enc, ...params, ...parametroDeRecepcionista(quien)]);
        if (actualizadas.length == 0) {
            throw new Error(quien.soloComoRecepcionista != null ? 'no existe o no está a su cargo' : 'no existe la encuesta en esa tarea');
        }
    });
}

/* recepción */

// las encuestas de la tarea que se ven en recepción (como la grilla tareas_tem_recepcion). $1 operativo, $2 usuario, $3 tarea
function encuestasEnRecepcion(joinsExtra: string): string {
    return `
    from ${TEM_DEL_USUARIO}
        join tareas_tem tt on tt.operativo = t.operativo and tt.enc = t.enc and tt.tarea = $3 and t.tarea_actual = $3
        join estados e on e.operativo = tt.operativo and e.estado = tt.estado
        ${joinsExtra}
    where e.visible_en_recepcion`;
}

// las acciones de recepción que hoy se pueden hacer en cada encuesta (como getSqlFrom de tareas_tem_recepcion)
const ACCIONES_DISPONIBLES = `
        , lateral (
            select jsonb_agg(z.* order by z.eaccion_direccion, z.eaccion) as acciones
                from (
                    select ea.*, ac.path_icono_svg, ac.desactiva_boton, ac.confirma, ac.desc_eaccion
                        from estados_acciones ea join acciones ac using (operativo, eaccion)
                        where ea.operativo = tt.operativo and ea.estado = tt.estado and ac.recepciona
                            and accion_cumple_condicion(tt.operativo, ea.estado, tt.enc, ea.eaccion, ea.condicion)
                ) z
            ) y`;

export function armarPersonasRecepcion(filasPorEstado: FilaSql[]): PersonaRecepcion[] {
    var personas: PersonaRecepcion[] = [];
    filasPorEstado.forEach(fila => {
        var idper = texto(fila, 'idper') ?? '';
        var persona = personas.find(p => p.idper == idper);
        if (persona == null) {
            persona = { idper, nombre: texto(fila, 'nombre') ?? idper, dispositivo: texto(fila, 'dispositivo'), total: 0, cargadas: 0, porEstado: [] };
            personas.push(persona);
        }
        var cantidad = numero(fila, 'cantidad');
        persona.total += cantidad;
        persona.cargadas += numero(fila, 'cargadas');
        persona.porEstado.push({ estado: texto(fila, 'estado') ?? '', cantidad });
    });
    return personas.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function traerPersonasRecepcion(client: ClienteTablero, quien: QuienAsigna, operativo: string, tarea: string): Promise<PersonaRecepcion[]> {
    exigir(quien.puedeVer, 'no tiene permiso para ver la recepción');
    return armarPersonasRecepcion(await filas(client, `
        select tt.asignado as idper, ${NOMBRE_DE_PERSONA} as nombre, u.dispositivo, tt.estado,
                count(*) as cantidad, count(*) filter (where tt.cargado_dm is not null) as cargadas
            ${encuestasEnRecepcion('left join usuarios u on u.idper = tt.asignado')} and tt.asignado is not null${filtroDeRecepcionista(quien, 4)}
            group by tt.asignado, u.nombre, u.apellido, u.usuario, u.dispositivo, tt.estado, e.orden_estado
            order by tt.asignado, e.orden_estado`,
        [operativo, quien.usuario, tarea, ...parametroDeRecepcionista(quien)]));
}

export function accionDesdeJson(valor: unknown): AccionDisponible[] {
    if (!Array.isArray(valor)) {
        return [];
    }
    var elementos: unknown[] = valor;
    return elementos.filter((elemento): elemento is AccionDisponible =>
        elemento != null && typeof elemento == 'object' && typeof Reflect.get(elemento, 'eaccion') == 'string'
    );
}

// encuestas de una persona (o de una lista de encuestas) en recepción, con las acciones que hoy se pueden hacer en cada una
export async function traerEncuestasRecepcion(
    client: ClienteTablero, quien: QuienAsigna, operativo: string, tarea: string, filtro: { asignado: string } | { encs: string[] }
): Promise<EncuestaRecepcion[]> {
    exigir(quien.puedeVer, 'no tiene permiso para ver la recepción');
    var porAsignado = 'asignado' in filtro;
    return (await filas(client, `
        select t.enc, t.area, ${DIRECCION} as direccion, tt.estado, t.resumen_estado, t.rea, t.norea,
                tt.cargado_dm is not null as cargado, tt.verificado, t.habilitada, y.acciones
            ${encuestasEnRecepcion(ACCIONES_DISPONIBLES)}
                and ${porAsignado ? 'tt.asignado = $4' : 'tt.enc in (select jsonb_array_elements_text($4::jsonb))'}${filtroDeRecepcionista(quien, 5)}
            order by t.area, t.enc`,
        [operativo, quien.usuario, tarea, 'asignado' in filtro ? filtro.asignado : JSON.stringify(filtro.encs), ...parametroDeRecepcionista(quien)])
    ).map(fila => ({
        enc: texto(fila, 'enc') ?? '',
        area: numeroONull(fila, 'area'),
        direccion: texto(fila, 'direccion') ?? '',
        estado: texto(fila, 'estado') ?? '',
        resumenEstado: texto(fila, 'resumen_estado'),
        rea: numeroONull(fila, 'rea'),
        norea: numeroONull(fila, 'norea'),
        cargado: verdadero(fila, 'cargado'),
        verificado: texto(fila, 'verificado'),
        habilitada: verdadero(fila, 'habilitada'),
        acciones: accionDesdeJson(fila.acciones),
    }));
}

/* procedimientos */

export type ParametrosAccion = { operativo: string, tarea: string, enc: string, condicion: string, accion: AccionDisponible };

// lo que estos procedimientos necesitan de la app (AppDmEncu lo cumple)
export type AppAsignacion = {
    perfilDelUsuario(context: ProcedureContext): PerfilTablero
    // ejecuta una acción como el botón de la grilla (procedimiento accion_tareas_tem_ejecutar)
    ejecutarAccion(context: ProcedureContext, parametros: ParametrosAccion): Promise<unknown>
}

async function operativoActual(client: ClienteTablero): Promise<string> {
    var [fila] = await filas(client, `select operativo from parametros where unico_registro`, []);
    var operativo = texto(fila, 'operativo');
    exigir(operativo != null, 'no se configuró un operativo en la tabla parámetros');
    return operativo ?? '';
}

export function proceduresAsignacion(app: AppAsignacion): ProcedureDef[] {
    return [
        {
            action: 'asignacion_contexto_traer',
            parameters: [],
            coreFunction: async (context: ProcedureContext) => traerContextoAsignacion(context.client, quienAsigna(context), app.perfilDelUsuario(context))
        },
        {
            action: 'asignacion_areas_traer',
            parameters: [],
            coreFunction: async (context: ProcedureContext) => traerAreas(context.client, quienAsigna(context), await operativoActual(context.client))
        },
        {
            action: 'asignacion_areas_cambiar',
            parameters: [{ name: 'cambios', typeName: 'jsonb' }],
            coreFunction: async (context: ProcedureContext, parametros: { cambios: CambioDeArea[] }) =>
                cambiarAreas(context.client, quienAsigna(context), await operativoActual(context.client), parametros.cambios)
        },
        {
            action: 'asignacion_encuestas_traer',
            parameters: [{ name: 'tarea', typeName: 'text' }],
            coreFunction: async (context: ProcedureContext, parametros: { tarea: string }) =>
                traerEncuestasDeTarea(context.client, quienAsigna(context), await operativoActual(context.client), parametros.tarea)
        },
        {
            action: 'asignacion_encuestas_cambiar',
            parameters: [{ name: 'cambio', typeName: 'jsonb' }],
            coreFunction: async (context: ProcedureContext, parametros: { cambio: CambioDeEncuestas }) =>
                cambiarEncuestas(context.client, quienAsigna(context), await operativoActual(context.client), parametros.cambio)
        },
        {
            action: 'recepcion_personas_traer',
            parameters: [{ name: 'tarea', typeName: 'text' }],
            coreFunction: async (context: ProcedureContext, parametros: { tarea: string }) =>
                traerPersonasRecepcion(context.client, quienAsigna(context), await operativoActual(context.client), parametros.tarea)
        },
        {
            action: 'recepcion_encuestas_traer',
            parameters: [{ name: 'tarea', typeName: 'text' }, { name: 'asignado', typeName: 'text' }],
            coreFunction: async (context: ProcedureContext, parametros: { tarea: string, asignado: string }) =>
                traerEncuestasRecepcion(context.client, quienAsigna(context), await operativoActual(context.client), parametros.tarea, { asignado: parametros.asignado })
        },
        {
            // ejecuta la misma acción en varias encuestas: cada una en su savepoint y sólo si la acción está disponible en su estado actual
            action: 'recepcion_acciones_ejecutar',
            parameters: [{ name: 'tarea', typeName: 'text' }, { name: 'encs', typeName: 'jsonb' }, { name: 'eaccion', typeName: 'text' }],
            coreFunction: async (context: ProcedureContext, parametros: { tarea: string, encs: string[], eaccion: string }) => {
                var quien = quienAsigna(context);
                var operativo = await operativoActual(context.client);
                exigir(Array.isArray(parametros.encs), 'encs debe ser una lista');
                var encuestas = await traerEncuestasRecepcion(context.client, quien, operativo, parametros.tarea, { encs: parametros.encs });
                return aplicarConSavepoints(context.client, Array.from(new Set(parametros.encs)), async enc => {
                    var encuesta = encuestas.find(e => e.enc == enc);
                    exigir(encuesta != null, 'no está en recepción en esta tarea');
                    var accion = encuesta?.acciones.find(a => a.eaccion == parametros.eaccion);
                    exigir(accion != null, `la acción ${parametros.eaccion} no está disponible en el estado ${encuesta?.estado}`);
                    await app.ejecutarAccion(context, { operativo, tarea: parametros.tarea, enc, condicion: accion!.condicion, accion: accion! });
                });
            }
        },
    ];
}
