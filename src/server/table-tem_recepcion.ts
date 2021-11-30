"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import {tem} from "./table-tem";

export function tem_recepcion(context:TableContext):TableDefinition {
    return tem(context, {recepcion:true});
}
