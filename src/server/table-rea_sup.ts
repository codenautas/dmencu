"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function rea_sup(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    return {
        name:'rea_sup',
        elementName:'rea_sup',
        editable:puedeEditar,
        fields:[
            {name:'operativo'                       , typeName:'text', nullable:false},
            {name:'orden'                           , typeName:'integer', nullable: false, defaultDbValue: '0' },
            {name:'rea_sup'                         , typeName:'text'},
            {name:'descripcion'                     , typeName:'text'},
            {name:'variable_sup'                    , typeName:'text'},
            {name:'valor_sup'                       , typeName:'text'},
            {name:'es_positiva'                     , typeName:'boolean', nullable:false, defaultDbValue:'true'},
            {name:'tarea'                           , typeName:'text'},
        ],
        primaryKey:['operativo','rea_sup'],
        foreignKeys: [
            { references: 'operativos', fields: ['operativo'] },
            { references: 'tareas', fields: ['operativo', 'tarea'] }
        ],
        sortColumns: [{ column: "operativo", order: 1 }, { column: "orden", order: 1 }, { column: "rea_sup", order: 1 }],
    };
}

