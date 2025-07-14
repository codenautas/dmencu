"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function barrios(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar;
    return {
        name:'barrios',
        elementName:'barrio',
        editable:puedeEditar,
        fields:[
            {name:'comuna'                  , typeName:'text'},
            {name:'barrio'                  , typeName:'text'},
            {name:'nombre_barrio'           , typeName:'text'},
        ],
        primaryKey:['comuna', 'barrio'],
        foreignKeys: [
            {references:'comunas', fields:['comuna']},
        ],
        detailTables: [
            {table: "fracciones", fields: ["comuna", "barrio"], abr: "f", label:"fracciones"}
        ],
    };
}