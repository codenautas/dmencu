"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function resultados_tarea(context:TableContext):TableDefinition {
    var be=context.be;
    var puedeEditar = context.forDump || context.user.rol==='admin';
    return {
        name:'resultados_tarea',
        editable:puedeEditar,
        fields:[
            {name:'tarea'        , typeName:'text'},
            {name:'resultado'    , typeName:'text'},
            {name:'descripcion'  , typeName:'text'},
        ],
        primaryKey:['tarea', 'resultado']
    };
}

