"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import {tareas_casos} from "./table-tareas_casos";

export function mis_tareas_tem(context:TableContext):TableDefinition {
    return tareas_casos(context, {mis:true});
}

