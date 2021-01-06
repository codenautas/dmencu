"use strict";

import {personal} from "./table-personal"

export function recepcionistas(context:TableContext):TableDefinition {
    return personal(context, {rol:'recepcionista', name:'recepcionistas'})    
}
