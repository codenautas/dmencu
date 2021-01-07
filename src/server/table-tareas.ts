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
            {name:'tarea' , typeName:'text'},
            {name:'nombre', typeName:'text'},
            {name:'rol_asignante', typeName:'text', visible:false},
        ],
        primaryKey:['tarea'],
        detailTables:[
            {table:`${mis}tareas_areas`     , fields:['tarea'], abr:'A'},
            {table:`${mis}tareas_tem`       , fields:['tarea'], abr:'E'},
            {table:`resultados_tarea`       , fields:['tarea'], abr:'R'},
        ],
        sql:{
            isTable:!opts.mis
        }
    };
}

