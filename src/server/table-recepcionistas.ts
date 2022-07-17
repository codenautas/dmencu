"use strict";

import {personal} from "./table-personal"
import { TableContext, TableDefinition } from "./types-dmencu";

export function recepcionistas(context:TableContext):TableDefinition {
    return personal(context, {rol:'recepcionista', name:'recepcionistas'})    
}
