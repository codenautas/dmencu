"use strict";

import {TableDefinition, TableContext, FieldDefinition, getDomicilioFields} from "./types-dmencu";

import {tareas_tem } from "./table-tareas_tem";
import { getSqlFrom, tareas_tem_recepcion } from "./table-tareas_tem_recepcion";
import { definicionComunFincAnacProc } from "./table-tareas_tem_fin_campo";

export function tareas_tem_analisis_campo(context:TableContext):TableDefinition {
    let tableDef = tareas_tem_recepcion(context)
    tableDef.name = `tareas_tem_analisis_campo`;
    tableDef.filterColumns=[
        {column:'visible_en_analisis_campo', operator:'=', value:true}
    ];
    definicionComunFincAnacProc(tableDef);
    var tableDefTT = tareas_tem(context);
    tableDef.sql!.from=getSqlFrom(tableDefTT,{desde:"analisis_campo"});
    tableDef.refrescable = false;
    tableDef.selfRefresh = false;
    tableDef.sql!.where = `"tareas_tem".tarea = 'anac' and "tem".tarea_actual = 'anac'`;
    return tableDef;
}