"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function modos_dm(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='admin';
    return {
        name:'modos_dm',
        elementName:'modo_dm',
        editable:puedeEditar,
        fields:[
            {name:'modo_dm'          , typeName:'text'},
            {name:'descripcion'      , typeName:'text', isName:true},
        ],
        primaryKey:['modo_dm'],
    };
}