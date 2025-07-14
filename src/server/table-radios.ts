"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function radios(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar;
    return {
        name:'radios',
        elementName:'radio',
        editable:puedeEditar,
        fields:[
            {name:'comuna'                  , typeName:'text'},
            {name:'fraccion'                , typeName:'text'},
            {name:'radio'                   , typeName:'text'},
            {name:'numero'                  , typeName:'text'},
        ],
        primaryKey:['comuna', 'fraccion', 'radio'],
        foreignKeys: [
            {references:'comunas', fields:['comuna']},
            {references:'fracciones', fields:['comuna', 'fraccion']}
        ],
        detailTables: [
            {table: "manzanas", fields: ["comuna","fraccion","radio"], abr: "m", label:"manzanas"}
        ],
    };
}