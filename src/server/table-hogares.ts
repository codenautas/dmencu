"use strict";
                
import {TableDefinition, TableContext} from "./types-dmencu";
export function hogares(context:TableContext):TableDefinition {
    var esEditable = context.user.rol==='admin';
    return {
    "name": "hogares",
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
            "name": "observaciones",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "prejue1",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "entrea",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "f_realiz_o",
            "typeName": "date",
            "nullable": true
        },
        {
            "name": "los_nombres",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "total_m",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "nombrer",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "sorteo",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "tp",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "cr_num_miembro",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "msnombre",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "cr_num_miembro_ing",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "fijo",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "movil",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "razon1",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_7",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_8",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_9",
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
        "hogar"
    ],
    "detailTables": [
        {
            "table": "personas",
            "fields": [
                "operativo",
                "vivienda",
                "hogar"
            ],
            "abr": "p"
        }
    ],
    "foreignKeys": [
        {
            "references": "viviendas",
            "fields": [
                "operativo",
                "vivienda"
            ]
        }
    ]
};
}