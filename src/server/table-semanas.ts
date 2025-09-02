"use_strict";
import {TableDefinition, TableContext} from "./types-dmencu";

export function semanas(context:TableContext):TableDefinition{
    return {
        name:'semanas',
        title:'Semanas',
        editable: context.user.rol==='admin' || context.user.rol==='coor_campo',
        fields:[
            {name:'operativo', typeName:'text', nullable:false},
            {name:'semana', typeName:'integer', nullable:false},
            {name:'semana_referencia_desde', typeName:'date'},
            {name:'semana_referencia_hasta', typeName:'date'},
            {name:'30dias_referencia_desde', typeName:'date'},
            {name:'30dias_referencia_hasta', typeName:'date'},
            {name:'mes_referencia', typeName:'date'},
            {name:'carga_enc_desde', typeName:'date'},
            {name:'carga_enc_hasta', typeName:'date'},
            {name:'carga_recu_desde', typeName:'date'},
            {name:'carga_recu_hasta', typeName:'date'},
        ],
        primaryKey:['operativo', 'semana'],
        foreignKeys:[
            {references: 'operativos' , fields:["operativo"]},
        ],
        constraints:[
            {consName:'El día de sem_mes_referencia debe ser 1', constraintType:'check', expr:'comun.es_dia_1(mes_referencia)'}
        ],
    };
}
