"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function manzanas(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar;
    return {
        name:'manzanas',
        elementName:'manzana',
        editable:puedeEditar,
        fields:[
            {name:'comuna'                  , typeName:'integer'},
            {name:'fraccion'                , typeName:'integer'},
            {name:'radio'                   , typeName:'integer'},
            {name:'manzana'                 , typeName:'integer'},
            {name:'numero'                  , typeName:'text'},
        ],
        primaryKey:['comuna', 'fraccion', 'radio', 'manzana'],
        foreignKeys: [
            {references:'comunas', fields:['comuna']},
            {references:'fracciones', fields:['fraccion']},
            {references:'radios', fields:['radio']},
        ],
        constraints: [
            {constraintType: 'unique', fields: ['comuna', 'fraccion', 'radio', 'manzana']},
        ],
    };
}