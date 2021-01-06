"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function operaciones(context:TableContext):TableDefinition {
    var esEditable = context.user.operacion==='admin';
    return {
        name:'operaciones',
        elementName:'operacion',
        editable:esEditable,
        fields:[
            {name:'operacion'       , typeName:'text'      , nullable:false  },
            {name:'nombre'          , typeName:'text'       },
        ],
        primaryKey:['operacion'],
        detailTables:[
            {table:'areas'     , fields:[{source:'operacion',target:'operacion_area'}], abr:'A', label:'Areas'},
        ],
    };
}