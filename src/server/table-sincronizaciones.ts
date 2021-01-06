"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function sincronizaciones(context:TableContext):TableDefinition {
    var admin = context.user.rol==='admin';
    return {
        name:'sincronizaciones',
        elementName:'sincronización',
        editable:context.forDump,
        fields:[
            {name:'sincro'          , typeName:'bigint', sequence:{prefix:null, firstValue:101, name:'sincronizacines_seq' }   },
            {name:'token'           , typeName:'text'},
            {name:'usuario'         , typeName:'text'},
            {name:'cuando'          , typeName:'timestamp', defaultDbValue:'current_timestamp'},
            {name:'datos'           , typeName:'jsonb'},
        ],
        primaryKey:['sincro']
    };
}

