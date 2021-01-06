"use strict";
                
import {TableDefinition, TableContext} from "./types-dmencu";
import {viviendas} from "./table-viviendas";

export function viviendas_extendida(context:TableContext):TableDefinition {
    return viviendas(context, {extendida:true});
}

