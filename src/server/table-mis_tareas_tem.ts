"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import {tareas_tem} from "./table-tareas_tem";

export function mis_tareas_tem(context:TableContext):TableDefinition {
    return tareas_tem(context, {mis:true});
}

