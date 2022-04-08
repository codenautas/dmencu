"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function tareas(context:TableContext, opts:any):TableDefinition {
    var opts=opts||{};
    var mis=opts.mis?'mis_':'';
    var be=context.be;
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    return {
        name:`${mis}tareas`,
        tableName:`tareas`,
        elementName:'tarea',
        editable:puedeEditar,
        fields:[
            {name:'operativo' , typeName:'text'},
            {name:'tarea' , typeName:'text'},
            {name:'nombre', typeName:'text'},
            {name:'rol_asignante', typeName:'text', visible:false},
            {name:'main_form', typeName:'text'},
            {name:'registra_estado_en_tem', typeName:'boolean'}
        ],
        primaryKey:['operativo','tarea'],
        foreignKeys:[
            {references:'operativos' , fields:['operativo']},
        ],        
        detailTables:[
            {table:`${mis}tareas_areas`     , fields:['operativo','tarea'], abr:'A'},
            {table:`${mis}tareas_tem`       , fields:['operativo','tarea'], abr:'E'},
        ],
        sql:{
            isTable:!opts.mis
        }
    };
}

