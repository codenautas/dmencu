"use strict";

import {personal} from "./table-personal"
import {TableDefinition, TableContext} from "./types-dmencu";

export function encuestadores(context:TableContext):TableDefinition {
    return personal(context, {rol:'encuestador', name:'encuestadores'})    
}
