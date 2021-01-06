"use strict";
                
import {TableDefinition, TableContext} from "./types-dmencu";
import {personas} from "./table-personas";

export function personas_extendida(context:TableContext):TableDefinition {
    return personas(context, {extendida:true});
}
