"use strict";

import {personal} from "./table-personal"
import {TableDefinition, TableContext} from "./types-dmencu";

export function supervisores(context:TableContext):TableDefinition {
    return personal(context, {rol:'supervisor', name:'supervisores'})    
}
