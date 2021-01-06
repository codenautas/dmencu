"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import {tareas} from "./table-tareas";

export function mis_tareas(context:TableContext):TableDefinition {
    return tareas(context, {mis:true});
}

