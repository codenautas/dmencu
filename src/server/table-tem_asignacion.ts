"use strict";

import {TableDefinition, TableContext, FieldDefinition, OtherTableDefs} from "./types-dmencu";

import { tem } from "./table-tem";
import { IdTarea } from "../unlogged/tipos";

export function tem_asignacion(context:TableContext):TableDefinition {
    var tareas: IdTarea[] = ['encu','recu','supe'];
    var tareas_fields = [
        {name:'recepcionista', prefijo:'rec', editable:true},
        {name:'asignado', prefijo:'per', editable:true},
        {name:'estado', prefijo:'est', editable:false}
    ]
    var extraFields:FieldDefinition[] = [];
    var extraFrom = '';
    var extraSelect = '\n';
    var otherTableDefs:OtherTableDefs = {}

    tareas.forEach(t=>{
        tareas_fields.forEach(f=>{
            extraFields.push({name:`${f.prefijo}_${t}`, typeName:'text', table:`tem_${t}`, nameForUpsert:f.name, editable:f.editable});
            extraSelect += `, tem_${t}.${f.name} as ${f.prefijo}_${t}`;
        })
        extraFrom += ` 
            left join tareas_tem as tem_${t} on tem_${t}.operativo = t.operativo and tem_${t}.enc = t.enc and tem_${t}.tarea = '${t}'`; 
        otherTableDefs[`tem_${t}`] = {
            name: 'tareas_tem', 
            tableName:'tareas_tem', 
            prefilledField:{tarea:t}
        }
    });
   
    var tableDef = tem(context, {});
    tableDef.name = `tem_asignacion`;
    tableDef.fields = tableDef.fields.filter((field)=>
        ['operativo','enc','tarea_actual', /*'abrir'*/,'habilitar','habilitada', 'area', 'tarea_proxima', 'cargado','cargado_dm']
        .includes(field.name)
    ).concat(extraFields);
    tableDef.refrescable = true;
    tableDef.sql!.isTable = false;
    tableDef.sql!.from =  `(select t.* ${extraSelect} from (${tableDef.sql!.from}) t ${extraFrom})`,
    tableDef.sql!.otherTableDefs = otherTableDefs;
    tableDef.detailTables = tableDef.detailTables.filter((detailTable)=>['tareas_tem'].includes(detailTable.table));
    return tableDef
}

