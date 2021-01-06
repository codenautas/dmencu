"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function roles_permisos(context:TableContext):TableDefinition {
    var admin = context.user.rol==='admin';
    return {
        name:'roles_permisos',
        elementName:'permiso para rol',
        allow:{
            update:admin,
        },
        fields:[
            {name:'rol'         , typeName:'text'     , nullable:false  },
            {name:'permiso'     , typeName:'text'     , nullable:false  },
            {name:'accion'      , typeName:'text'     , nullable:false  },
            {name:'habilitado'  , typeName:'boolean'  , nullable:false  , defaultValue: false},
        ],
        primaryKey:['rol','permiso','accion'],
        foreignKeys:[
            {references:'permisos' , fields:['permiso','accion'] , onDelete: 'cascade'},
            {references:'roles'    , fields:['rol']              , onDelete: 'cascade'},
        ],
    };
}

