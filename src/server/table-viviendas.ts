"use strict";
import {TableDefinition, TableContext} from "./types-dmencu";

export function viviendas(context:TableContext):TableDefinition {
    var esEditable = context.user.rol==='admin';

    return {
    "name": "viviendas",
    editable: esEditable,
    "fields": [
        {
            "name": "operativo",
            "typeName": "text",
            "visible": false,
            "nullable": false
        },
        {
            "name": "vivienda",
            "typeName": "text",
            "nullable": false
        },
        {
            "name": "vdominio",
            "typeName": "bigint",
            "nullable": true,
            "visible": false
        },
        {
            "name": "obs_re",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "total_vis",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "soporte",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "entreav",
            "typeName": "bigint",
            "visible": false,
            "nullable": true
        },
        {
            "name": "identif",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "resid_hog",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "contac",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "v1",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "total_h",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razonv",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_1",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_2",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_3",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_4",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_5",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_6",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon3",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "razon_9v",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "vdominio_sup",
            "typeName": "bigint",
            "visible": false,
            "nullable": true
        },
        {
            "name": "s1a1_obs_sup",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "datos_personal_sup",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "total_vis_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "soporte_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "modo_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "confir_tel_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "domicilio_sup",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "confir_dom_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "sp1_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "sp1a",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "sp1b",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "sp1c",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "sp3_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "total_h_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "sp2_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon_1_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon_2_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_3_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_4_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_5_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon2_6_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon3_sup",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "razon2_7v_sup",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "razon_9v_sup",
            "typeName": "bigint",
            "nullable": true
        }
    ],
    "sql": {
        "isReferable": true
    },
    "primaryKey": [
        "operativo",
        "vivienda"
    ],
    "detailTables": [
        {
            "table": "visitas_sup",
            "fields": [
                "operativo",
                "vivienda"
            ],
            "abr": "v"
        },
        {
            "table": "hogares_sup",
            "fields": [
                "operativo",
                "vivienda"
            ],
            "abr": "h"
        },
        {
            "table": "visitas",
            "fields": [
                "operativo",
                "vivienda"
            ],
            "abr": "v"
        },
        {
            "table": "hogares",
            "fields": [
                "operativo",
                "vivienda"
            ],
            "abr": "h"
        }
    ]
};
}