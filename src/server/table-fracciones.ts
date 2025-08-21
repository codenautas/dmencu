"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function fracciones(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar;
    return {
        name:'fracciones',
        elementName:'fraccion',
        editable:puedeEditar,
        fields:[
            {name:'comuna'                  , typeName:'text'},
            {name:'fraccion'                , typeName:'text'},
            {name:'nombre'                  , typeName:'text', isName:true},
            {name:'barrio'                  , typeName:'text'},
        ],
        primaryKey:['comuna', 'fraccion'],
        foreignKeys: [
            {references:'comunas', fields:['comuna']},
            {references:'barrios', fields:['comuna','barrio']}
        ],
        detailTables: [
            {table: "radios", fields: ["comuna","fraccion"], abr: "r", label:"radios"}
        ],
    };
}