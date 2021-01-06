"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function roles(context:TableContext):TableDefinition {
    var esEditable = context.user.rol==='admin';
    return {
        name:'roles',
        elementName:'role',
        editable:esEditable,
        fields:[
            {name:'rol'             , typeName:'text'      , nullable:false                       },
            {name:'superuser'       , typeName:'boolean'   , nullable:false  , defaultValue: false},
            {name:'nombre'          , typeName:'text'      , nullable:false                       },
        ],
        primaryKey:['rol'],
        detailTables:[
            {table:'roles_permisos'     , fields:['rol'], abr:'P', label:'Permisos para el rol'},
            {table:'usuarios'           , fields:['rol'], abr:'U'},
        ],
    };
}

