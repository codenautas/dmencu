"use strict";

import {TableDefinition, TableContext, FieldDefinition, getDomicilioFields} from "./types-dmencu";

import {tareas_tem } from "./table-tareas_tem";
import { getSqlFrom, tareas_tem_recepcion } from "./table-tareas_tem_recepcion";

export function tareas_tem_ingreso(context:TableContext):TableDefinition {
    let tableDef = tareas_tem_recepcion(context)
    tableDef.name = `tareas_tem_ingreso`;
    tableDef.filterColumns=[
        {column:'visible_en_ingreso', operator:'=', value:true}
    ];
    tableDef.fields = tableDef.fields.filter((field:FieldDefinition)=>!['abrir', 'consistir'].includes(field.name));
    var domicilioFieldNames = getDomicilioFields().map((field:FieldDefinition)=>field.name);
    tableDef.fields = tableDef.fields.filter((field)=>!domicilioFieldNames.includes(field.name));
    tableDef.fields.splice(4,0,
        {name:'telefono'         , typeName:'text'        , editable: false },
        ...getDomicilioFields().filter((field:FieldDefinition)=>!['codcalle'].includes(field.name)));
    var tableDefTT = tareas_tem(context);
    tableDef.sql!.from=getSqlFrom(tableDefTT,{desde:"ingresa"});
    return tableDef;
}