"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function radios(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar;
    return {
        name:'radios',
        elementName:'radio',
        editable:puedeEditar,
        fields:[
            {name:'comuna'                  , typeName:'integer'},
            {name:'fraccion'                , typeName:'integer'},
            {name:'radio'                   , typeName:'integer'},
            {name:'numero'                    , typeName:'text'},
        ],
        primaryKey:['comuna', 'fraccion', 'radio'],
        foreignKeys: [
            {references:'comunas', fields:['comuna']},
            {references:'fracciones', fields:['fraccion']}
        ],
        constraints: [
            {constraintType: 'unique', fields: ['comuna', 'fraccion', 'radio']},
        ],
    };
}