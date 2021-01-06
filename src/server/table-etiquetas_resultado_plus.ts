"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";
import {etiquetas_resultado} from "./table-etiquetas_resultado"

export function etiquetas_resultado_plus(context:TableContext, opts:null|{all:boolean}):TableDefinition {
    return etiquetas_resultado(context,{all:true, name:'etiquetas_resultado_plus'});
}

