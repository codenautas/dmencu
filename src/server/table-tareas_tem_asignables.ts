"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

import {tareas_tem} from "./table-tareas_tem";
import { setCommonDefinition } from "./table-tareas_tem_recepcion";

export function tareas_tem_asignables(context:TableContext):TableDefinition {
    var tableDef = tareas_tem(context);
    tableDef.name = `tareas_tem_asignables`;
    setCommonDefinition(tableDef);
    tableDef.hiddenColumns=['cargado_dm','notas'];
    return tableDef
}

