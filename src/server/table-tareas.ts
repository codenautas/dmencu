"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function tareas(context:TableContext, opts?:any):TableDefinition {
    var opts=opts||{};
    var mis=opts.mis?'mis_':'';
    var be=context.be;
    var puedeEditar = context.superuser;
    return {
        name:`${mis}tareas`,
        tableName:`tareas`,
        elementName:'tarea',
        editable:puedeEditar,
        fields:[
            {name:'operativo'               , typeName:'text'},
            {name:'tarea'                   , typeName:'text'},
            {name:'nombre'                  , typeName:'text'},
            {name:'rol_recepcionista'       , typeName:'text', visible:false},
            {name:'main_form'               , typeName:'text'},
            {name:'registra_estado_en_tem'  , typeName:'boolean'},
            {name:'es_inicial'              , typeName:'boolean'},
            {name:'es_final'                , typeName:'boolean'},
        ],
        primaryKey:['operativo','tarea'],
        foreignKeys:[
            {references:'operativos' , fields:['operativo']},
        ],        
        detailTables:[
            {table:`${mis}tareas_areas`     , fields:['operativo','tarea'], abr:'A'},
            {table:`${mis}tareas_tem`       , fields:['operativo','tarea'], abr:'E'},
        ],
        constraints:[
            {constraintType:'check', consName:"es_inicial o es_final", expr:"not (es_inicial and es_final)"},
            {constraintType:'check', consName:"es_inicial puede ser -si- o -vacio-", expr:"es_inicial IS NULL OR es_inicial = TRUE"},
            {constraintType:'check', consName:"es_final puede ser -si- o -vacio-", expr:"es_final IS NULL OR es_final = TRUE"},
            {constraintType:'unique', consName:"es_inicial es unico por operativo", fields:['operativo', 'es_inicial']},
            {constraintType:'unique', consName:"es_final es unico por operativo", fields:['operativo', 'es_final']},
        ],
        sql:{
            isTable:!opts.mis
        }
    };
}

