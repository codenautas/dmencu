"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function area_enc_proximas(_context:TableContext):TableDefinition {
    return {
        name:'area_enc_proximas',
        elementName:'area_enc_proxima',
        editable:false,
        fields:[
            {name:'operativo'     , typeName:'text'},
            {name:'area'          , typeName:'integer'},
            {name:'contador'      , typeName:'integer', defaultDbValue:'0'},
        ],
        primaryKey:['operativo', 'area'],
        foreignKeys: [
            {references:'areas', fields:['operativo','area']},
        ]
    };
}