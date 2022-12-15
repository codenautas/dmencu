"use strict";

import {TableDefinition, TableContext} from "./types-ggs";

export function estados(context:TableContext):TableDefinition {
    //var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    var esEditable = context.user.rol==='admin';
    return {
        name:'estados',
        elementName:'estado',
        editable:esEditable,
        fields:[
            {name:'operativo'               , typeName:'text',  nullable: false},
            {name:'estado'                  , typeName:'text',  nullable: false},
            {name:'desc_estado'             , typeName:'text'},
            {name:'orden_estado'            , typeName:'text'},
        ],
        primaryKey:['operativo', 'estado'],
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
                    "estado"
                ],
                "abr": "ea"
            }
        ],
    };
}

