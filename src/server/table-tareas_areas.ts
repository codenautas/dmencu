"use strict";

import { OptsAsignados } from "./table-encuestadores";
import {TableDefinition, FieldDefinition, TableContext} from "./types-dmencu";

export function tareas_areas(context:TableContext, opts?:OptsAsignados):TableDefinition {
    if (opts == null) {
        opts = {
            name: 'relevador',
            rol: null
        }
    }
    var be=context.be;
    var db=be.db;
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    var fields:FieldDefinition[] = [
        {name:'operativo'               , typeName:'text'   ,isPk:1},
        {name:'tarea'                   , typeName:'text'   ,isPk:2},
        {name:'area'                    , typeName:'integer',isPk:3},
        {name:'recepcionista'           , typeName:'text', references: 'personal'},
        {name:'asignado'                , typeName:'text', references: 'personal', title:opts.name},
        {name:'cargado'                 , typeName:'boolean', editable: false, inTable: false},
        {name:'verificado_recepcion'    , typeName:'text'                      },
        {name:'obs_recepcion'           , typeName:'text'                      },

    ];
    return {
        name:`tareas_areas`,
        tableName:`tareas_areas`,
        allow:{
            insert:false,
            delete:false,
        },
        editable:puedeEditar,
        fields,
        primaryKey:['operativo','tarea','area'],
        foreignKeys:[
            {references:'tareas', fields:['operativo','tarea']},
            {references:'areas',  fields:['operativo','area'], displayAllFields:true, displayAfterFieldName:'cargado'},
            {references:'usuarios', fields:[{source:'recepcionista', target:'idper'}], alias:'recepcionista'},
            {references:'usuarios', fields:[{source:'asignado'     , target:'idper'}], alias:'asignado', displayFields:['nombre','apellido']},
        ],
        detailTables:[
            {table:`tareas_tem`, fields:['operativo', 'tarea', 'area'], abr:'T', refreshParent:true, refreshFromParent:true},
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
        },
        hiddenColumns:[]
    };
}

export function t_encu_areas(context:TableContext){
    var tableDef = tareas_areas(context, {rol:'encu', name:'encuestador'}) 
    tableDef.hiddenColumns?.push('areas__encuestador');
    tableDef.sql!.isTable = false;
    tableDef.detailTables=[
        {table:`tareas_tem_encu`, fields:['operativo', 'tarea', 'area'], abr:'T', refreshParent:true, refreshFromParent:true}
    ];
    return tableDef;
}

export function t_recu_areas(context:TableContext){
    var tableDef = tareas_areas(context, {rol:'recu', name:'recuperador'}) 
    tableDef.hiddenColumns?.push('areas__encuestador');
    tableDef.sql!.isTable = false;
    tableDef.detailTables=[
        {table:`tareas_tem_recu`, fields:['operativo', 'tarea', 'area'], abr:'T', refreshParent:true, refreshFromParent:true}
    ];
    return tableDef;
}

export function t_supe_areas(context:TableContext){
    var tableDef = tareas_areas(context, {rol:'supe', name:'supervisor'}) 
    tableDef.hiddenColumns?.push('areas__encuestador');
    tableDef.sql!.isTable = false;
    tableDef.detailTables=[
        {table:`tareas_tem_supe`, fields:['operativo', 'tarea', 'area'], abr:'T', refreshParent:true, refreshFromParent:true}
    ];
    return tableDef;
}