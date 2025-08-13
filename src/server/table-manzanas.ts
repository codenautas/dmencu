"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function manzanas(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar;
    return {
        name:'manzanas',
        elementName:'manzana',
        editable:puedeEditar,
        fields:[
            {name:'comuna'            , typeName:'text'},
            {name:'fraccion'          , typeName:'text'},
            {name:'radio'             , typeName:'text'},
            {name:'manzana'           , typeName:'text'},
            {name:'nombre'            , typeName:'text'},
        ],
        primaryKey:['comuna', 'fraccion', 'radio', 'manzana'],
        foreignKeys: [
            {references:'comunas', fields:['comuna']},
            {references:'fracciones', fields:['comuna', 'fraccion']},
            {references:'radios', fields:['comuna', 'fraccion', 'radio']},
        ]
    };
}