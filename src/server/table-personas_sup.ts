"use strict";
                
import {TableDefinition, TableContext} from "./types-dmencu";
export function personas_sup(context:TableContext):TableDefinition {
    var esEditable = context.user.rol==='admin';
    return {
    "name": "personas_sup",
    editable: esEditable,
    "fields": [
        {
            "name": "operativo",
            "typeName": "text",
            "nullable": false
        },
        {
            "name": "vivienda",
            "typeName": "text",
            "nullable": false
        },
        {
            "name": "hogar",
            "typeName": "bigint",
            "nullable": false
        },
        {
            "name": "persona",
            "typeName": "bigint",
            "nullable": false
        },
        {
            "name": "nombre_sup",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "sexo_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "edad_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "sp4_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "spl0_sup",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "spp5",
            "typeName": "bigint",
            "nullable": true
        }
    ],
    "sql": {
        "isReferable": true
    },
    "primaryKey": [
        "operativo",
        "vivienda",
        "hogar",
        "persona"
    ],
    "detailTables": [],
    "foreignKeys": [
        {
            "references": "hogares_sup",
            "fields": [
                "operativo",
                "vivienda",
                "hogar"
            ]
        }
    ]
};
}