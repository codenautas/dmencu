"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

import {tareas_tem} from "./table-tareas_tem";
import { addButtonsAndSetDefinition, checkMyActions } from "./table-tareas_tem_recepcion";

export function tareas_tem_asignables(context:TableContext):TableDefinition {
    var tableDef = tareas_tem(context);
    tableDef.name = `tareas_tem_asignables`;
    //tableDef.filterColumns=[
    //    {column:'visible_en_asignacion', operator:'=', value:true}
    //];
    addButtonsAndSetDefinition(tableDef);
    tableDef.hiddenColumns=['cargado_dm','notas', 'acciones','fecha_asignacion', 'acciones', 'acciones_avance','acciones_retroceso','acciones_blanqueo'];
    checkMyActions(tableDef,'asigna');
    return tableDef
}

