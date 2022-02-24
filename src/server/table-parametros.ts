"use strict";

import {TableDefinition, TableContext} from "./types-dmencu"

export function parametros(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name:'parametros',
        allow:{
            insert:false,
            delete:false,
            update:admin,
        },     
        fields:[
            {name:'unico_registro'       , typeName:'boolean' , nullable:false, editable: false, defaultValue:true },
            {name:'operativo'            , typeName:'text'    , nullable:false, editable: true                     },
        ],
        primaryKey:['unico_registro'],
        foreignKeys:[
            {references:'operativos', fields:['operativo']}
        ],
        constraints:[
            {consName:'unico registro', constraintType:'check', expr:'unico_registro is true'},
        ],
        layout:{
            vertical:true
        },
    };
}
