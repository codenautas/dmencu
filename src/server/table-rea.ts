"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function rea(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    return {
        name:'rea',
        elementName:'rea',
        editable:puedeEditar,
        fields:[
            {name:'operativo'               , typeName:'text', nullable:false},
            {name:'orden'                   , typeName:'integer', nullable:false, defaultDbValue:'0'},
            {name:'rea'                     , typeName:'integer'},
            {name:'descripcion'             , typeName:'text'},
            {name:'condicion'                , typeName:'text', nullable:false},
            {name:'es_positiva'             , typeName:'boolean', nullable:false, defaultDbValue:'true'},
            {name:'tarea'                   , typeName:'text'},
        ],
        primaryKey:['operativo', 'rea'],
        foreignKeys:[
            {references:'operativos', fields:['operativo']},
            {references:'tareas', fields:['operativo', 'tarea']}
        ],
        sortColumns: [{ column: "operativo", order: 1 }, { column: "orden", order: 1 }, {column:"rea", order:1}],
    };
}

