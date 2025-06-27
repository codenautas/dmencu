"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function fracciones(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar;
    return {
        name:'fracciones',
        elementName:'fraccion',
        editable:puedeEditar,
        fields:[
            {name:'comuna'                  , typeName:'integer'},
            {name:'fraccion'                , typeName:'integer'},
            {name:'barrio'                  , typeName:'integer'},
            {name:'numero'                  , typeName:'text'},
        ],
        primaryKey:['comuna', 'fraccion'],
        foreignKeys: [
            {references:'comunas', fields:['comuna']},
            {references:'barrios', fields:['barrio']}
        ],
        constraints: [
            {constraintType: 'unique', fields: ['comuna', 'fraccion']},
        ],
    };
}