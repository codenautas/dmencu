"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

import {tareas_tem} from "./table-tareas_tem";
import { setCommonDefinition } from "./table-tareas_tem_recepcion";

export function tareas_tem_asignables(context:TableContext):TableDefinition {
    //var tareas = ['encu','recu','supe'];
    //var extraFields:FieldDefinition[] = [];
    //var extraFrom = '';
    //var extraSelect = '';
    //var otherTables = {}

    //tareas.forEach(t=>{
    //    extraFields.push({name:`rec_${t}`, typeName:'text', table:`tem_${t}`});
    //    extraFields.push({name:`per_${t}`, typeName:'text', table:`tem_${t}`});
    //    extraFields.push({name:`est_${t}`, typeName:'text', table:`tem_${t}`});
    //    extraSelect += `, asignante as rec_${t}, tem_${t}.asignado as per_${t}, tem_${t}.estado as est_${t}`;
    //    extraFrom += ` left join tareas_tem as tem_${t} on tem_${t}.operativo = tt.operativo and tem_${t}.enc = tt.enc and tem_${t}.tarea = '${t}'`; 
    //    otherTables[`tem_${t}`] = {
    //        //name: 'tareas_tem', 
    //        //tableName:'tareas_tem', 
    //        prefilledField:{tarea:t}
    //    }
    //});
   
    var tableDef = tareas_tem(context);
    tableDef.name = `tareas_tem_asignables`;
    setCommonDefinition(tableDef);
    //tableDef.primaryKey = ['operativo','enc'];
    //tableDef.fields = tableDef.fields.filter((field)=>
    //    ['operativo','enc','tarea','estado', 'area', 'asignado', 'asignante', 'abrir','consistir','tarea_anterior','cargado', 'cargado_dm','operacion']
    //    .includes(field.name)
    //).concat(extraFields);
    //tableDef.softForeignKeys=[
    //    {references:'tokens', fields:[{source:'cargado_dm', target:'token'}], displayFields:['username'], displayAfterFieldName:'cargado'},
    //],
    tableDef.hiddenColumns=['cargado_dm','notas'];
    //tableDef.sql!.from =  `(select tt.* ${extraSelect} from (${tableDef.sql!.from}) tt  ${extraFrom})`,
    //tableDef.sql!.otherTableDefs = otherTables
    //tableDef.sql!.where = `(tarea_actual="tareas_tem".tarea or tarea_actual is null)`;
    return tableDef
}

