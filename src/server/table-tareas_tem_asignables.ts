"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import {tareas_tem} from "./table-tareas_tem";

export function tareas_tem_asignables(context:TableContext):TableDefinition {
    return tareas_tem(context, {asigna:true});
}

