"use strict";

import {personal} from "./table-personal"

export function relevadores(context:TableContext):TableDefinition {
    return personal(context, {rol:'relevador', name:'relevadores'})    
}
