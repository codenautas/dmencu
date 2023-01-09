"use strict";

import {TableDefinition, TableContext} from "./types-ggs";

export function acciones(context:TableContext):TableDefinition {
    //var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    var esEditable = context.user.rol==='admin';
    return {
        name:'acciones',
        elementName:'accion',
        editable:esEditable,
        fields:[
            {name:'operativo'                , typeName:'text',  nullable: false},
            {name:'eaccion'                  , typeName:'text',  nullable: false},
            {name:'abr_eaccion'              , typeName:'text'},
            {name:'desc_eaccion'             , typeName:'text'},
        ],
        primaryKey:['operativo', 'eaccion'],
        foreignKeys: [
            {
                "references": "operativos",
                "fields": [
                    "operativo",
                ]
            }
        ],
        "detailTables": [
            {
                "table": "estados_acciones",
                "fields": [
                    "operativo",
                    "eaccion"
                ],
                "abr": "ea"
            }
        ],
    };
}
