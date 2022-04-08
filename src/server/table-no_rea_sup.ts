"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function no_rea_sup(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    return {
        name:'no_rea_sup',
        elementName:'no_rea_sup',
        editable:puedeEditar,
        fields:[
            {name:'no_rea_sup'                      , typeName:'text'},
            {name:'desc_norea_sup'                  , typeName:'text'},
            {name:'grupo_sup'                       , typeName:'text'},
            {name:'variable_sup'                    , typeName:'text'},
            {name:'valor_sup'                       , typeName:'text'},
            {name:'grupo0_sup'                      , typeName:'text'},
        ],
        primaryKey:['no_rea_sup'],
    };
}

