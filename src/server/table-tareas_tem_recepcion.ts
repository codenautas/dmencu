"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import {tareas_tem} from "./table-tareas_tem";
import { addButtonsAndSetDefinition, checkMyActions } from "./table-tareas_tem_asignables";

export function tareas_tem_recepcion(context:TableContext):TableDefinition {
    var tableDef = tareas_tem(context);
    tableDef.name = `tareas_tem_recepcion`;
    addButtonsAndSetDefinition(tableDef);
    tableDef.filterColumns=[
        {column:'visible_en_recepcion', operator:'=', value:true}
    ];
    tableDef.hiddenColumns=['cargado_dm','notas', 'acciones','fecha_asignacion'];
    checkMyActions(tableDef,'recepciona');
    return tableDef
}

