"use strict";

import {TableDefinition, TableContext, FieldDefinition, getDomicilioFields} from "./types-dmencu";

import {tareas_tem } from "./table-tareas_tem";
import { getSqlFrom, tareas_tem_recepcion } from "./table-tareas_tem_recepcion";
import { definicionComunFincAnacProc } from "./table-tareas_tem_fin_campo";

export function tareas_tem_procesamiento(context:TableContext):TableDefinition {
    let tableDef = tareas_tem_recepcion(context);
    tableDef.editable=context.puede?.encuestas.procesar;
    tableDef.name = `tareas_tem_procesamiento`;
    tableDef.filterColumns=[
        {column:'visible_en_procesamiento', operator:'=', value:true}
    ];
    definicionComunFincAnacProc(tableDef);
    tableDef.fields
        .filter((field)=>['proie'].includes(field.name))
        .forEach((field)=>field.visible=true);    
    var tableDefTT = tareas_tem(context);
    tableDef.sql!.from=getSqlFrom(tableDefTT,{desde:"procesa"});
    tableDef.sql!.where = `"tareas_tem".tarea = 'proc' and 
                            ("tem".tarea_actual = 'proc' or
                             "tem".tarea_actual is null and "tem".tarea_proxima = 'proc')`;
    return tableDef;
}