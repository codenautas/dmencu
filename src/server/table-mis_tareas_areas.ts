"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import {tareas_areas} from "./table-tareas_areas";

export function mis_tareas_areas(context:TableContext):TableDefinition {
    return tareas_areas(context, {mis:true});
}

