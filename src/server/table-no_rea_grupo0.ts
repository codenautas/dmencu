"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

// los grupos de segundo nivel de la no respuesta (no_rea.grupo0): cada operativo declara cuáles tiene y qué significan
// para los controles de campo (control_campo), en lugar de que el código conozca sus nombres
export function no_rea_grupo0(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    return {
        name:'no_rea_grupo0',
        elementName:'grupo0 de no_rea',
        editable:puedeEditar,
        fields:[
            {name:'operativo'               , typeName:'text', nullable:false},
            {name:'grupo0'                  , typeName:'text'},
            {name:'orden'                   , typeName:'integer', nullable:false, defaultDbValue:'0'},
            {name:'es_otras_causas'         , typeName:'boolean', nullable:false, defaultDbValue:'false', description:'sus casos suman en «otras causas» de los controles'},
            {name:'es_no_encuestable'       , typeName:'boolean', nullable:false, defaultDbValue:'false', description:'sus casos no entran en el denominador de la tasa de efectividad'},
            {name:'es_en_curso'             , typeName:'boolean', nullable:false, defaultDbValue:'false', description:'sus casos se cuentan como encuestas en curso (sin finalizar)'},
        ],
        primaryKey:['operativo', 'grupo0'],
        foreignKeys:[{references:'operativos', fields:['operativo']}],
        detailTables:[{table:'no_rea', fields:['operativo', 'grupo0'], abr:'n', label:'no rea'}],
        sortColumns: [{ column: "operativo", order: 1 }, { column: "orden", order: 1 }, {column:"grupo0", order:1}],
    };
}
