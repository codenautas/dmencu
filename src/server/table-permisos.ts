"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function permisos(context:TableContext):TableDefinition {
    var admin = context.user.rol==='admin';
    return {
        name:'permisos',
        elementName:'permiso',
        editable:false,
        fields:[
            {name:'permiso'          , typeName:'text'      , nullable:false  },
            {name:'accion'           , typeName:'text'      , nullable:false  },
            {name:'predeterminado'   , typeName:'boolean'   , nullable:false , defaultValue: 'false'},
        ],
        primaryKey:['permiso','accion'],
        detailTables:[
            {table:'roles_permisos'     , fields:['permiso'], abr:'P', label:'Permisos para el rol'},
        ],
    };
}

