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
            {name:'unico_registro'       , typeName:'boolean' , nullable:false, defaultValue:true, editable: false},
            {name:'mail_aviso_texto'    , typeName:'text'    , editable: true},
            {name:'mail_aviso_asunto'   , typeName:'text'    , editable: true},
        ],
        primaryKey:['unico_registro'],
        constraints:[
            {consName:'unico registro', constraintType:'check', expr:'unico_registro is true'},
        ],
        layout:{
            vertical:true
        },
    };
}
