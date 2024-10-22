"use strict";

import {TableDefinition, TableContext, FieldDefinition, getDomicilioFields} from "./types-dmencu";

import {tareas_tem } from "./table-tareas_tem";
import { getSqlFrom, tareas_tem_recepcion } from "./table-tareas_tem_recepcion";

export var definicionComunFincAnacProc = (tableDef:TableDefinition)=>{
    tableDef.muestraAbrirEnTodasLasTareas=true;
    tableDef.fields
        .filter((field:FieldDefinition)=>['recepcionista','asignado'].includes(field.name))
        .forEach((field:FieldDefinition)=>field.visible=false)
    tableDef.hiddenColumns=tableDef.hiddenColumns?.concat(['asignado__nombre','asignado__apellido',
             'rec__nombre','rec__apellido']);
    tableDef.selfRefresh = true;
    tableDef.refrescable = true;
}

export function tareas_tem_fin_campo(context:TableContext):TableDefinition {
    let tableDef = tareas_tem_recepcion(context, {rol: null, name: 'relevador', consiste: false});
    tableDef.name = `tareas_tem_fin_campo`;
    tableDef.filterColumns=[
        {column:'visible_en_fin_campo', operator:'=', value:true}
    ];
    definicionComunFincAnacProc(tableDef);
    tableDef.fields
        .filter((field)=>['adelantar','dias_a_pasar','proie'].includes(field.name))
        .forEach((field)=>field.visible=true);
    var tableDefTT = tareas_tem(context);
    tableDef.sql!.from=getSqlFrom(tableDefTT,{desde:"fin_campo"});
    tableDef.refrescable = false;
    tableDef.selfRefresh = false;
    tableDef.sql!.where = `"tareas_tem".tarea = 'finc' and "tem".tarea_actual = 'finc'`;
    return tableDef;
}