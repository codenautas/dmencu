"use strict";

import {personal} from "./table-personal"
import {TableDefinition, TableContext} from "./types-dmencu";

export function recuperadores(context:TableContext):TableDefinition {
    return personal(context, {rol:'recuperador', name:'recuperadores'})    
}
