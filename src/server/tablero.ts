"use strict";

// Tablero de inicio del modo GABINETE: un panorama del operativo que se arma según el perfil de quien entra.
// Cada sección es una DefinicionSeccionTablero. Las apps finales agregan, reemplazan o quitan secciones
// sobreescribiendo getSeccionesTablero, y cambian los perfiles con getPerfilesTablero y getPerfilTablero (ver docs/tablero.md).

import type {
    AccesoTablero, AnchoSeccionTablero, ContenidoTablero, FilaBarras, IndicadorTablero, ParteAvance,
    PerfilTablero, RutaMenu, SeccionTablero, TableroParaUsuario
} from "../unlogged/tipos-tablero";
import type { MenuInfoBase } from "./types-dmencu";
import { QuienConsultaAyuda, tienePermiso } from "./ayuda";

export type ValorSql = string | number | boolean | null;
export type FilaSql = { [campo: string]: unknown };

// lo que el tablero usa del cliente de la base (el Client de pg-promise-strict lo cumple; en los tests se simula)
export type SentenciaTablero = {
    fetchAll(): Promise<{ rows: FilaSql[] }>
    execute(): Promise<unknown>
}
export type ClienteTablero = {
    query(sql: string, params?: ValorSql[]): SentenciaTablero
}

// quien consulta el tablero: lo mismo que para la ayuda más su usuario, su persona y su perfil
export type QuienConsultaTablero = QuienConsultaAyuda & {
    usuario: string
    idper: string | null
    perfil: string
}

export type ConsultaTablero = {
    client: ClienteTablero
    quien: QuienConsultaTablero
    operativo: string
    menu: MenuInfoBase[] // el menú del usuario (el que arma getMenu)
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
    // si está, sólo para esos perfiles (el superuser ve todo igual)
    perfiles?: string[]
    // "ver más": se muestra sólo si el usuario tiene esa opción en su menú
    acceso?: AccesoTablero
    // devuelve null cuando no hay nada para mostrar (la sección no aparece)
    obtener(consulta: ConsultaTablero): Promise<ContenidoTablero | null>
}

/* perfiles */

export const PERFIL_GENERAL = 'general';

export const PERFILES_TABLERO: PerfilTablero[] = [
    { perfil: 'administracion', nombre: 'Administración', descripcion: 'Visión completa del operativo y de su configuración', colores: { primario: '#37474F', secundario: '#F4511E' } },
    { perfil: 'direccion', nombre: 'Dirección', descripcion: 'Avance general y resultados del operativo', colores: { primario: '#1A237E', secundario: '#00897B' } },
    { perfil: 'coordinacion', nombre: 'Coordinación', descripcion: 'Seguimiento del campo, la asignación y los dispositivos', colores: { primario: '#00695C', secundario: '#F9A825' } },
    { perfil: 'recepcion', nombre: 'Recepción', descripcion: 'Encuestas a asignar, recibir y verificar', colores: { primario: '#1565C0', secundario: '#7CB342' } },
    { perfil: 'procesamiento', nombre: 'Procesamiento', descripcion: 'Encuestas en procesamiento y su consistencia', colores: { primario: '#6A1B9A', secundario: '#00ACC1' } },
    { perfil: 'diseno', nombre: 'Diseño conceptual', descripcion: 'Formularios, variables y metadatos del operativo', colores: { primario: '#AD1457', secundario: '#5E35B1' } },
    { perfil: PERFIL_GENERAL, nombre: 'Gabinete', descripcion: 'Panorama del operativo', colores: { primario: '#3F51B5', secundario: '#009688' } },
];

// perfil de los roles que se instalan con dmencu (install/roles.tab)
export const PERFIL_POR_ROL: { [rol: string]: string } = {
    admin: 'administracion',
    direccion: 'direccion',
    coor_campo: 'coordinacion',
    subcoor_campo: 'coordinacion',
    coor_proc: 'coordinacion',
    recepcionista: 'recepcion',
    ingresador: 'recepcion',
    procesamiento: 'procesamiento',
    dis_conceptual: 'diseno',
};

// el perfil de un rol: el de PERFIL_POR_ROL (o el que pase la app) y, si el rol no está, el que corresponde a sus permisos
export function perfilSegunRol(
    quien: Pick<QuienConsultaAyuda, 'rol' | 'superuser' | 'puede'>,
    perfilPorRol: { [rol: string]: string } = PERFIL_POR_ROL
): string {
    if (quien.rol != null && perfilPorRol[quien.rol] != null) {
        return perfilPorRol[quien.rol];
    }
    if (quien.superuser) {
        return 'administracion';
    }
    if (tienePermiso(quien.puede, 'campo.administrar')) {
        return 'coordinacion';
    }
    if (tienePermiso(quien.puede, 'encuestas.procesar')) {
        return 'procesamiento';
    }
    if (tienePermiso(quien.puede, 'campo.editar')) {
        return 'recepcion';
    }
    if (tienePermiso(quien.puede, 'casilleros_texto.editar')) {
        return 'diseno';
    }
    return PERFIL_GENERAL;
}

export function buscarPerfil(perfiles: PerfilTablero[], perfil: string): PerfilTablero {
    var encontrado = perfiles.find(p => p.perfil == perfil) ?? perfiles.find(p => p.perfil == PERFIL_GENERAL) ?? perfiles[0];
    if (encontrado == null) {
        throw new Error('tablero: no hay perfiles definidos');
    }
    return encontrado;
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
    var perfiles = seccion.perfiles ?? [];
    if (perfiles.length && !perfiles.includes(quien.perfil)) {
        return false;
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

// arma las secciones visibles; cada una corre en un savepoint para que el error de una no impida mostrar las demás
export async function armarSecciones(
    definiciones: DefinicionSeccionTablero[],
    consulta: ConsultaTablero
): Promise<{ secciones: SeccionTablero[], errores: TableroParaUsuario['errores'] }> {
    var secciones: SeccionTablero[] = [];
    var errores: TableroParaUsuario['errores'] = [];
    for (var definicion of seccionesVisibles(definiciones, consulta.quien)) {
        var savepoint = 'tablero_' + definicion.id.replace(/\W/g, '_');
        try {
            await consulta.client.query(`savepoint ${savepoint}`).execute();
            var contenido = await definicion.obtener(consulta);
            await consulta.client.query(`release savepoint ${savepoint}`).execute();
            if (contenido != null) {
                var acceso = definicion.acceso != null && buscarEnMenu(consulta.menu, definicion.acceso.ruta) != null ? definicion.acceso : undefined;
                secciones.push({
                    id: definicion.id,
                    titulo: definicion.titulo,
                    ...(definicion.descripcion != null ? { descripcion: definicion.descripcion } : {}),
                    ancho: definicion.ancho ?? 'completo',
                    ...(acceso != null ? { acceso } : {}),
                    contenido,
                });
            }
        } catch (err) {
            errores.push({ seccion: definicion.id, mensaje: mensajeDeError(err) });
            await consulta.client.query(`rollback to savepoint ${savepoint}`).execute();
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

/* secciones de dmencu */

// las encuestas del operativo que ve el usuario: las de producción o de capacitación según lo que tenga habilitado
// (igual que filtroTemSegunUsuario). Parámetros: $1 operativo, $2 usuario
export const TEM_DEL_USUARIO = `(
    select t.*
        from tem t join usuarios usu_con on usu_con.usuario = $2
        where t.operativo = $1 and (
            usu_con.muestra_encuestas_prod and t.enc_autogenerado_dm is not null
                or
            usu_con.muestra_encuestas_capa and t.enc_autogenerado_dm_capa is not null
                or
            t.enc_autogenerado_dm is null and t.enc_autogenerado_dm_capa is null
        )
    ) t`;

// en qué punto del campo está cada encuesta (ver resultado y resumen_estado en tem)
export const CATEGORIA_DE_CAMPO = `case
        when t.resumen_estado is null then 'sin_salir'
        when t.resultado = 'efectiva' then 'efectiva'
        when t.norea is not null then 'no_respuesta'
        else 'en_curso'
    end`;

// las no respuestas que cuentan para la tasa: las de quienes se podían encuestar (como tasa_efectividad en control_campo)
const NO_RESPUESTA_ENCUESTABLE = `categoria = 'no_respuesta' and coalesce(grupo0, '') not like 'no encuestable%'`;

const TEM_CON_CATEGORIA = `(
    select t.*, y.grupo, y.grupo0, ${CATEGORIA_DE_CAMPO} as categoria
        from ${TEM_DEL_USUARIO}
            left join no_rea y on y.operativo = t.operativo and y.no_rea = t.norea
    ) t`;

const PERMISOS_DE_CAMPO = ['campo.ver', 'campo.editar', 'campo.administrar', 'encuestas.procesar'];
const PERMISOS_DE_GESTION = ['campo.administrar', 'encuestas.procesar'];

function parametrosDelUsuario(consulta: ConsultaTablero): ValorSql[] {
    return [consulta.operativo, consulta.quien.usuario];
}

async function filas(consulta: ConsultaTablero, sql: string, params: ValorSql[]): Promise<FilaSql[]> {
    return (await consulta.client.query(sql, params).fetchAll()).rows;
}

export const seccionResumen: DefinicionSeccionTablero = {
    id: 'resumen',
    titulo: 'Panorama del operativo',
    orden: 10,
    permisos: PERMISOS_DE_CAMPO,
    acceso: { titulo: 'control de campo', ruta: ['control', 'resumen'] },
    async obtener(consulta) {
        var [fila] = await filas(consulta, `
            select count(*) as total,
                    count(*) filter (where habilitada) as habilitadas,
                    count(*) filter (where categoria <> 'sin_salir') as salieron,
                    count(*) filter (where categoria = 'efectiva') as efectivas,
                    count(*) filter (where categoria = 'en_curso') as en_curso,
                    count(*) filter (where ${NO_RESPUESTA_ENCUESTABLE}) as no_respuesta_encuestable
                from ${TEM_CON_CATEGORIA}`, parametrosDelUsuario(consulta));
        var total = numero(fila, 'total');
        if (total == 0) {
            return { tipo: 'mensaje', texto: 'Todavía no hay encuestas en la muestra del operativo.', tono: 'info' };
        }
        var salieron = numero(fila, 'salieron');
        var efectivas = numero(fila, 'efectivas');
        var indicadores: IndicadorTablero[] = [
            { id: 'muestra', titulo: 'Encuestas en la muestra', valor: total, detalle: `${numero(fila, 'habilitadas')} habilitadas`, tono: 'info' },
            { id: 'salieron', titulo: 'Salieron a campo', valor: salieron, total, tono: 'info' },
            { id: 'efectivas', titulo: 'Efectivas', valor: efectivas, total: salieron, tono: 'bueno' },
            { id: 'en_curso', titulo: 'En curso', valor: numero(fila, 'en_curso'), total: salieron, detalle: 'pendientes, incompletas o con problemas', tono: 'atencion' },
            {
                id: 'tasa_respuesta', titulo: 'Tasa de respuesta', formato: 'porcentaje',
                valor: porcentaje(efectivas, efectivas + numero(fila, 'no_respuesta_encuestable')),
                detalle: 'efectivas sobre efectivas y no respuestas encuestables', tono: 'bueno'
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
    permisos: PERMISOS_DE_CAMPO,
    async obtener(consulta) {
        var porCategoria = await filas(consulta, `
            select categoria, count(*) as cantidad
                from ${TEM_CON_CATEGORIA}
                group by categoria`, parametrosDelUsuario(consulta));
        var cantidad = (categoria: string) => numero(porCategoria.find(fila => fila.categoria == categoria), 'cantidad');
        var partes: ParteAvance[] = [
            { id: 'efectiva', titulo: 'Efectivas', valor: cantidad('efectiva'), tono: 'bueno' },
            { id: 'en_curso', titulo: 'En curso', valor: cantidad('en_curso'), tono: 'atencion' },
            { id: 'no_respuesta', titulo: 'No respuesta', valor: cantidad('no_respuesta'), tono: 'alerta' },
            { id: 'sin_salir', titulo: 'No salieron a campo', valor: cantidad('sin_salir'), tono: 'neutro' },
        ];
        return partes.some(parte => parte.valor > 0) ? { tipo: 'avance', partes } : null;
    }
};

export const seccionCircuito: DefinicionSeccionTablero = {
    id: 'circuito',
    titulo: 'Dónde están las encuestas',
    descripcion: 'Cantidad de encuestas según su tarea actual',
    orden: 30,
    ancho: 'mitad',
    permisos: PERMISOS_DE_CAMPO,
    async obtener(consulta) {
        var porTarea = await filas(consulta, `
            select coalesce(ta.nombre, t.tarea_actual, 'sin tarea') as tarea, count(*) as cantidad
                from ${TEM_DEL_USUARIO}
                    left join tareas ta on ta.operativo = t.operativo and ta.tarea = t.tarea_actual
                group by 1, ta.es_inicial, ta.es_final
                order by ta.es_inicial is true desc, ta.es_final is true, count(*) desc`, parametrosDelUsuario(consulta));
        var filasBarras: FilaBarras[] = porTarea.map(fila => ({ etiqueta: texto(fila, 'tarea') ?? '', valor: numero(fila, 'cantidad'), tono: 'info' }));
        return filasBarras.length ? { tipo: 'barras', filas: filasBarras } : null;
    }
};

export const seccionEstados: DefinicionSeccionTablero = {
    id: 'estados',
    titulo: 'Estado en la tarea actual',
    descripcion: 'Estado de cada encuesta en la tarea en la que está',
    orden: 40,
    ancho: 'mitad',
    permisos: PERMISOS_DE_CAMPO,
    async obtener(consulta) {
        var porEstado = await filas(consulta, `
            select coalesce(e.desc_estado, tt.estado) as estado, count(*) as cantidad
                from ${TEM_DEL_USUARIO}
                    join tareas_tem tt on tt.operativo = t.operativo and tt.enc = t.enc and tt.tarea = t.tarea_actual
                    left join estados e on e.operativo = tt.operativo and e.estado = tt.estado
                group by 1, e.orden_estado
                order by e.orden_estado, 1`, parametrosDelUsuario(consulta));
        var filasBarras: FilaBarras[] = porEstado.map(fila => ({ etiqueta: texto(fila, 'estado') ?? '', valor: numero(fila, 'cantidad') }));
        return filasBarras.length ? { tipo: 'barras', filas: filasBarras } : null;
    }
};

export const seccionMiTrabajo: DefinicionSeccionTablero = {
    id: 'mi_trabajo',
    titulo: 'Mi trabajo',
    descripcion: 'Encuestas asignadas a mí o de las que soy recepcionista, por tarea y estado',
    orden: 15,
    permisos: ['campo.editar', 'encuestas.ingresar'],
    async obtener(consulta) {
        if (consulta.quien.idper == null) {
            return null;
        }
        var mias = await filas(consulta, `
            select coalesce(ta.nombre, tt.tarea) as tarea,
                    coalesce(e.desc_estado, tt.estado) as estado,
                    count(*) filter (where tt.asignado = $3) as asignadas,
                    count(*) filter (where tt.recepcionista = $3) as recibe
                from ${TEM_DEL_USUARIO}
                    join tareas_tem tt on tt.operativo = t.operativo and tt.enc = t.enc and tt.tarea = t.tarea_actual
                    left join tareas ta on ta.operativo = tt.operativo and ta.tarea = tt.tarea
                    left join estados e on e.operativo = tt.operativo and e.estado = tt.estado
                where tt.asignado = $3 or tt.recepcionista = $3
                group by 1, 2, e.orden_estado
                order by 1, e.orden_estado`, [...parametrosDelUsuario(consulta), consulta.quien.idper]);
        if (mias.length == 0) {
            return null;
        }
        return {
            tipo: 'tabla',
            columnas: [
                { campo: 'tarea', titulo: 'tarea' },
                { campo: 'estado', titulo: 'estado' },
                { campo: 'asignadas', titulo: 'asignadas a mí', numerica: true },
                { campo: 'recibe', titulo: 'como recepcionista', numerica: true },
            ],
            filas: mias.map(fila => ({
                tarea: texto(fila, 'tarea'),
                estado: texto(fila, 'estado'),
                asignadas: numero(fila, 'asignadas'),
                recibe: numero(fila, 'recibe'),
            })),
        };
    }
};

export const seccionComunas: DefinicionSeccionTablero = {
    id: 'comunas',
    titulo: 'Efectivas por comuna',
    descripcion: 'Encuestas efectivas sobre el total de la muestra de cada comuna',
    orden: 50,
    ancho: 'mitad',
    permisos: PERMISOS_DE_GESTION,
    acceso: { titulo: 'control por comuna', ruta: ['control', 'comuna'] },
    async obtener(consulta) {
        var porComuna = await filas(consulta, `
            select t.nrocomuna as comuna, count(*) as total, count(*) filter (where categoria = 'efectiva') as efectivas
                from ${TEM_CON_CATEGORIA}
                where t.nrocomuna is not null
                group by t.nrocomuna
                order by case when t.nrocomuna ~ '^\\d+$' then t.nrocomuna::integer end, t.nrocomuna`, parametrosDelUsuario(consulta));
        var filasBarras: FilaBarras[] = porComuna.map(fila => ({
            etiqueta: `comuna ${texto(fila, 'comuna')}`,
            valor: numero(fila, 'efectivas'),
            total: numero(fila, 'total'),
            tono: 'bueno',
        }));
        return filasBarras.length ? { tipo: 'barras', filas: filasBarras, formato: 'porcentaje' } : null;
    }
};

export const seccionNoRespuesta: DefinicionSeccionTablero = {
    id: 'no_respuesta',
    titulo: 'Motivos de no respuesta',
    orden: 60,
    ancho: 'mitad',
    permisos: PERMISOS_DE_GESTION,
    async obtener(consulta) {
        var porGrupo = await filas(consulta, `
            select coalesce(grupo, 'sin grupo') as grupo, count(*) as cantidad
                from ${TEM_CON_CATEGORIA}
                where categoria = 'no_respuesta'
                group by 1
                order by count(*) desc, 1`, parametrosDelUsuario(consulta));
        var filasBarras: FilaBarras[] = porGrupo.map(fila => ({ etiqueta: texto(fila, 'grupo') ?? '', valor: numero(fila, 'cantidad'), tono: 'alerta' }));
        return filasBarras.length ? { tipo: 'barras', filas: filasBarras } : null;
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

export const seccionProcesamiento: DefinicionSeccionTablero = {
    id: 'procesamiento',
    titulo: 'Procesamiento',
    orden: 90,
    ancho: 'tercio',
    permisos: ['encuestas.procesar'],
    acceso: { titulo: 'encuestas en procesamiento', ruta: ['procesar', 'tareas_tem_procesamiento'] },
    async obtener(consulta) {
        var [fila] = await filas(consulta, `
            select (select count(*)
                        from ${TEM_DEL_USUARIO}
                            join tareas ta on ta.operativo = t.operativo and ta.tarea = t.tarea_actual
                        where ta.es_final) as en_procesamiento,
                    (select count(*)
                        from inconsistencias i join consistencias c using (operativo, consistencia)
                        where i.operativo = $1 and c.activa and c.valida and i.justificacion is null) as inconsistencias`,
            parametrosDelUsuario(consulta));
        return {
            tipo: 'indicadores',
            indicadores: [
                { id: 'en_procesamiento', titulo: 'En procesamiento', valor: numero(fila, 'en_procesamiento'), tono: 'info' },
                { id: 'inconsistencias', titulo: 'Inconsistencias sin justificar', valor: numero(fila, 'inconsistencias'), tono: numero(fila, 'inconsistencias') ? 'atencion' : 'bueno' },
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
    seccionMiTrabajo,
    seccionAvance,
    seccionCircuito,
    seccionEstados,
    seccionComunas,
    seccionNoRespuesta,
    seccionCalendario,
    seccionDispositivos,
    seccionProcesamiento,
    seccionAccesos,
];
