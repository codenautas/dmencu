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
            {name:'unico_registro'             , typeName:'boolean' , nullable:false, editable: false, defaultValue:true },
            {name:'operativo'                  , typeName:'text'    , nullable:false, editable: true, defaultValue: 'Operativo'   },
            {name:'muestra_abierta'            , typeName:'boolean' , nullable:false, editable: true, defaultValue:false },
            {name:'maximo_creacion_encuestas'  , typeName:'bigint'  , nullable:false, editable: true, defaultValue: 50},

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
