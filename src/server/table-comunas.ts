"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function comunas(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    return {
        name:'comunas',
        elementName:'comuna',
        editable:puedeEditar,
        fields:[
            {name:'comuna'                  , typeName:'integer'},
            {name:'zona'                    , typeName:'text'},
        ],
        primaryKey:['comuna'],
    };
}