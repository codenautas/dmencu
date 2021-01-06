"use strict";
                
import {TableDefinition, TableContext} from "./types-dmencu";
import {personas} from "./table-personas";

export function personas_extendida_onda_anterior(context:TableContext):TableDefinition {
    return personas(context, {extendida:true, onda_anterior:true});
}
