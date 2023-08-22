"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function no_rea(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    return {
        name:'no_rea',
        elementName:'no_rea',
        editable:puedeEditar,
        fields:[
            {name:'no_rea'                  , typeName:'text'},
            {name:'descripcion'             , typeName:'text'},
            {name:'grupo'                   , typeName:'text'},
            {name:'variable'                , typeName:'text'},
            {name:'valor'                   , typeName:'text'},
            {name:'grupo0'                  , typeName:'text'},
            {name:'pasa_a_recuperacion'     , typeName:'boolean', nullable:false, defaultDbValue:'false'},
            {name:'pasa_a_supervision'      , typeName:'boolean', nullable:false, defaultDbValue:'false'},
        ],
        primaryKey:['no_rea'],
    };
}

