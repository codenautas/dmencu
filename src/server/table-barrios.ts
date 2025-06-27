"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function barrios(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar;
    return {
        name:'barrios',
        elementName:'barrio',
        editable:puedeEditar,
        fields:[
            {name:'barrio'                  , typeName:'integer'},
            {name:'nombre_barrio'           , typeName:'text'},
        ],
        primaryKey:['barrio'],
    };
}