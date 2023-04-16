"use strict";

import {TableDefinition, TableContext, FieldDefinition, OtherTableDefs} from "./types-dmencu";

import { tem } from "./table-tem";
import { setCommonDefinition } from "./table-tareas_tem_recepcion";

export function tareas_tem_asignables(context:TableContext):TableDefinition {
    var tareas = ['encu','recu','supe'];
    var tareas_fields = [
        {name:'recepcionista_tarea', prefijo:'rec'},
        {name:'asignado', prefijo:'per'},
        {name:'estado', prefijo:'est'}
    ]
    var extraFields:FieldDefinition[] = [];
    var extraFrom = '';
    var extraSelect = '\n';
    var otherTableDefs:OtherTableDefs = {}

    tareas.forEach(t=>{
        tareas_fields.forEach(f=>{
            extraFields.push({name:`${f.prefijo}_${t}`, typeName:'text', table:`tem_${t}`, nameForUpsert:f.name});
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
    tableDef.name = `tareas_tem_asignables`;
    // setCommonDefinition(tableDef);
    tableDef.primaryKey = ['operativo','enc'];
    tableDef.fields = tableDef.fields.filter((field)=>
        ['operativo','enc','tarea_actual', 'estado_actual', 'habilitada', 'area', 'tarea_proxima', 'cargado_dm']
        .includes(field.name)
    ).concat(extraFields);
    /*
    tableDef.softForeignKeys=[
        {references:'tokens', fields:[{source:'cargado_dm', target:'token'}], displayFields:['username'], displayAfterFieldName:'cargado'},
    ],
    tableDef.hiddenColumns=['cargado_dm','notas'];
    */
    tableDef.sql!.from =  `(select t.* ${extraSelect} from (${tableDef.sql!.from}) t ${extraFrom})`,
    tableDef.sql!.otherTableDefs = otherTableDefs
    // tableDef.sql!.where = `(tarea_actual="tareas_tem".tarea or tarea_actual is null)`;
    return tableDef
}

