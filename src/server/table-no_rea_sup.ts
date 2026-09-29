"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function no_rea_sup(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    return {
        name:'no_rea_sup',
        elementName:'no_rea_sup',
        editable:puedeEditar,
        fields:[
            {name:'operativo'                       , typeName:'text', nullable:false},
            {name:'orden'                           , typeName:'integer', nullable: false, defaultDbValue: '0' },
            {name:'no_rea_sup'                      , typeName:'text'},
            {name:'desc_norea_sup'                  , typeName:'text'},
            {name:'grupo_sup'                       , typeName:'text'},
            {name:'variable_sup'                    , typeName:'text'},
            {name:'valor_sup'                       , typeName:'text'},
            {name:'grupo0_sup'                      , typeName:'text'},

        ],
        primaryKey:['operativo','no_rea_sup'],
        foreignKeys: [{ references: 'operativos', fields: ['operativo'] }],
        sortColumns: [{ column: "operativo", order: 1 }, { column: "orden", order: 1 }, { column: "no_rea_sup", order: 1 }],
    };
}

