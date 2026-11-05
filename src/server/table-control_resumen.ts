"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

import {control_campo} from './table-control_campo';
import {condicionTemSegunUsuario, sqlRecepcionistaACargo, sqlTareasDeRelevamientoAlcanzadas} from './table-tem';

function controlResumen(context:TableContext, opts:{nombre:string, title?:string, filtroWhere?:string, camposCorte?:FieldDefinition[], selectExtra?:string, fromExtra?:string}):TableDefinition {
    return control_campo(context, {...opts, agrupador:'no_rea_groups0', agrupado:true ,gabinete:true});
}

export function control_resumen(context:TableContext):TableDefinition {
    return controlResumen(context, {nombre:'control_resumen'});
}

// las encuestas de producción o de capacitación que ve el usuario, igual que en las demás secciones de recepción
function sqlEncuestasDelUsuario(context:TableContext):string {
    return `exists (select 1 from usuarios usu_con where usu_con.usuario = ${context.be.db.quoteLiteral(context.user.usuario)} and (${condicionTemSegunUsuario}))`;
}

// el mismo resumen sobre las encuestas de las que el usuario es recepcionista (para el tablero de inicio): el recepcionista es el que está
// a cargo de la encuesta (ver sqlRecepcionistaACargo) y se cuentan las de producción o de capacitación que ve el usuario, igual que en las demás secciones de recepción
export function control_resumen_recepcion(context:TableContext):TableDefinition {
    var idper=context.user?.idper ?? null;
    return controlResumen(context, {nombre:'control_resumen_recepcion', title:'control resumen de mis encuestas',
        filtroWhere:`${sqlRecepcionistaACargo} = ${context.be.db.quoteNullable(idper)} and ${sqlEncuestasDelUsuario(context)}`});
}

// el mismo resumen por recepcionista (para el tablero de inicio); las que no tienen recepcionista quedan con recepcionista_a_cargo nulo
export function control_resumen_recepcionistas(context:TableContext):TableDefinition {
    return controlResumen(context, {nombre:'control_resumen_recepcionistas', title:'control resumen por recepcionista',
        camposCorte:[{name:'recepcionista_a_cargo', typeName:'text'}], selectExtra:`${sqlRecepcionistaACargo} as recepcionista_a_cargo`,
        filtroWhere:sqlEncuestasDelUsuario(context)});
}

// el mismo resumen por tarea de relevamiento y recepcionista de esa tarea (para el tablero de inicio). Cada encuesta se cuenta en cada tarea de relevamiento
// por la que pasó o en la que está (ver sqlTareasDeRelevamientoAlcanzadas), con el recepcionista que tiene en esa tarea (nulo si todavía no tiene):
// en la tarea inicial el total es el de la muestra y en las demás es menor. Las tareas no se suman entre sí.
export function control_resumen_recepcionistas_tarea(context:TableContext):TableDefinition {
    return controlResumen(context, {nombre:'control_resumen_recepcionistas_tarea', title:'control resumen por tarea de relevamiento y recepcionista',
        camposCorte:[{name:'tarea_relevamiento', typeName:'text'}, {name:'recepcionista_de_tarea', typeName:'text'}],
        fromExtra:`cross join lateral ${sqlTareasDeRelevamientoAlcanzadas} rt`,
        selectExtra:`rt.tarea as tarea_relevamiento, rt.recepcionista as recepcionista_de_tarea`,
        filtroWhere:sqlEncuestasDelUsuario(context)});
}

// el mismo resumen cortado por una columna de la tem, sobre las encuestas que ve el usuario y sin los filtros de los controles del menú
// (por ejemplo dominio=3): el total de cada corte es el de la tem. Lo usa el desglose del tablero de inicio.
function controlResumenCorte(context:TableContext, nombre:string, campoCorte:FieldDefinition):TableDefinition {
    return controlResumen(context, {nombre, title:`control resumen por ${campoCorte.name}`, camposCorte:[campoCorte], filtroWhere:sqlEncuestasDelUsuario(context)});
}

export function control_resumen_area(context:TableContext):TableDefinition {
    return controlResumenCorte(context, 'control_resumen_area', {name:'area', typeName:'integer'});
}

export function control_resumen_dominio(context:TableContext):TableDefinition {
    return controlResumenCorte(context, 'control_resumen_dominio', {name:'dominio', typeName:'integer'});
}

export function control_resumen_zona(context:TableContext):TableDefinition {
    return controlResumenCorte(context, 'control_resumen_zona', {name:'zona', typeName:'text'});
}

export function control_resumen_comuna(context:TableContext):TableDefinition {
    return controlResumenCorte(context, 'control_resumen_comuna', {name:'nrocomuna', typeName:'text'});
}
