"use strict";

import {TableDefinition, FieldDefinition, TableContext} from "./types-dmencu";

export function tareas_areas(context:TableContext):TableDefinition {
    var be=context.be;
    var db=be.db;
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    var fields:FieldDefinition[] = [
        {name:'operativo'               , typeName:'text'   ,isPk:1},
        {name:'tarea'                   , typeName:'text'   ,isPk:2},
        {name:'area'                    , typeName:'integer',isPk:3},
        {name:'asignante'               , typeName:'text', references: 'personal'},
        {name:'asignado'                , typeName:'text', references: 'personal'},
        {name:'operacion'               , typeName:'text', references:'operaciones'},
        {name:'fecha_asignacion'        , typeName:'date'},
        {name:'obs_asignante'           , typeName:'text'},
        {name:'cargado'                 , typeName:'boolean', editable: false, inTable: false},
        {name:'verificado_recepcion'    , typeName:'text'                      },
        {name:'obs_recepcion'           , typeName:'text'                      },

    ];
    return {
        name:`tareas_areas`,
        tableName:`tareas_areas`,
        editable:puedeEditar,
        fields,
        primaryKey:['operativo','tarea','area'],
        foreignKeys:[
            {references:'tareas', fields:['operativo','tarea']},
            {references:'areas',  fields:['operativo','area'], displayAllFields:true, displayAfterFieldName:'cargado'},
            {references:'usuarios', fields:[{source:'asignante', target:'idper'}], alias:'at'},
            {references:'usuarios', fields:[{source:'asignado' , target:'idper'}], alias:'ad'},
            {references:'operaciones' , fields:['operacion']},
        ],
        detailTables:[
            {table:`tareas_tem_recepcion`   , fields:['operativo','tarea', 'area'], abr:'T', refreshParent:true, refreshFromParent:true},
        ],
        sql:{
            isTable: true,
            insertIfNotUpdate:true,
            from:`(
                select t.operativo,t.tarea, a.area
                    ${fields.filter(x=>!(x.isPk||x.inTable==false)).map(x=>`, ta.${db.quoteIdent(x.name)}`).join('')}
                    , cargado
                    from tareas t join areas a on t.operativo=a.operativo
                        left join lateral (select * from tareas_areas where area=a.area and tarea=t.tarea and operativo = t.operativo ) ta on true
                        left join lateral (select bool_or( tt.cargado_dm is not null ) as cargado 
                            from tareas_tem tt join tem t using (operativo, enc)  where tt.operativo=t.operativo and tt.enc=t.enc and tt.tarea=ta.tarea and t.area=ta.area and t.operativo = ta.operativo
                        ) tt on true
            )`
        }
    };
}

