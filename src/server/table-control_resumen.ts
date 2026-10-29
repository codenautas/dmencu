"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

import {control_campo} from './table-control_campo';
import {condicionTemSegunUsuario, sqlTareaVigente} from './table-tem';

function controlResumen(context:TableContext, opts:{nombre:string, title?:string, filtroWhere?:string, camposCorte?:FieldDefinition[], selectExtra?:string}):TableDefinition {
    return control_campo(context, {...opts, agrupador:'no_rea_groups0', agrupado:true ,gabinete:true});
}

export function control_resumen(context:TableContext):TableDefinition {
    return controlResumen(context, {nombre:'control_resumen'});
}

// recepcionista de la tarea vigente de la encuesta (tem t)
const sqlRecepcionistaVigente = `(select tr.recepcionista from tareas_tem tr where tr.operativo = t.operativo and tr.enc = t.enc and tr.tarea = ${sqlTareaVigente})`;

// las encuestas de producción o de capacitación que ve el usuario, igual que en las demás secciones de recepción
function sqlEncuestasDelUsuario(context:TableContext):string {
    return `exists (select 1 from usuarios usu_con where usu_con.usuario = ${context.be.db.quoteLiteral(context.user.usuario)} and (${condicionTemSegunUsuario}))`;
}

// el mismo resumen sobre las encuestas de las que el usuario es recepcionista (para el tablero de inicio): el recepcionista es el de la
// tarea vigente de la encuesta y se cuentan las de producción o de capacitación que ve el usuario, igual que en las demás secciones de recepción
export function control_resumen_recepcion(context:TableContext):TableDefinition {
    var idper=context.user?.idper ?? null;
    return controlResumen(context, {nombre:'control_resumen_recepcion', title:'control resumen de mis encuestas',
        filtroWhere:`${sqlRecepcionistaVigente} = ${context.be.db.quoteNullable(idper)} and ${sqlEncuestasDelUsuario(context)}`});
}

// el mismo resumen por recepcionista (para el tablero de inicio); las que no tienen recepcionista quedan con recepcionista_vigente nulo
export function control_resumen_recepcionistas(context:TableContext):TableDefinition {
    return controlResumen(context, {nombre:'control_resumen_recepcionistas', title:'control resumen por recepcionista',
        camposCorte:[{name:'recepcionista_vigente', typeName:'text'}], selectExtra:`${sqlRecepcionistaVigente} as recepcionista_vigente`,
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
