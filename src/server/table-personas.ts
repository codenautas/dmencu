"use strict";
                
import {TableDefinition, TableContext} from "./types-dmencu";
export function personas(context:TableContext):TableDefinition {
    var esEditable = context.user.rol==='admin';
    return {
    "name": "personas",
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
            "name": "nombre",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "sexo",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "edad",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "p4",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "lp",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "l0",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "p5",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "p5b",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "p6a",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "p6b",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "entreaind",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju1_1",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju1_2",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju1_3",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju1_4",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju1_5",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju1_6",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju1_7",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju1_8",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju1_8_esp",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "preju2_1",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju2_2",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju2_3",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju2_4",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju2_5",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju2_6",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju2_7",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju2_8",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju3",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju4",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju5",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju6",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju7",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju8",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju9",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju10",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju11",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju12",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju13",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju14",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju15",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju16",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju17",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju18",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju19",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju20",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju21",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju22",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju23",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju23_otro",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "preju24",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju25",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju26",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju27",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju28_1",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju28_2",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju28_3",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju28_4",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju28_5",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju28_6",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju28_7",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju28_8",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "preju28_8_esp",
            "typeName": "text",
            "nullable": true
        },
        {
            "name": "preju29",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "e12j",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "e13j",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "e14j",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "t1",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "t2",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "t9",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "t29j",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "t44",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "t46",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "it1",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "it2",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "noreaind",
            "typeName": "bigint",
            "nullable": true
        },
        {
            "name": "noreaind_esp",
            "typeName": "text",
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
            "references": "hogares",
            "fields": [
                "operativo",
                "vivienda",
                "hogar"
            ]
        }
    ]
};
}