"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import {tareas_tem} from "./table-tareas_tem";

export function tareas_tem_asignables(context:TableContext):TableDefinition {
    var tableDef = tareas_tem(context);
    tableDef.name = `tareas_tem_asignables`;
    tableDef.sql!.where = `tareas_tem.permite_asignar_encuestador`;
    return tableDef
}

