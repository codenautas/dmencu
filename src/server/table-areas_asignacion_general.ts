"use strict";

import {TableDefinition, TableContext, FieldDefinition, OtherTableDefs} from "./types-dmencu";

import { areas } from "./table-areas";
import { IdTarea } from "../unlogged/tipos";

export function areas_asignacion_general(context:TableContext):TableDefinition {
    var tareas: IdTarea[] = ['encu','recu','supe'];
    var tareas_fields = [
        {name:'recepcionista', prefijo:'rec', editable:true},
        {name:'asignado', prefijo:'per', editable:true},
    ]
    var extraFields:FieldDefinition[] = [];
    var extraFrom = '';
    var extraSelect = '\n';
    var otherTableDefs:OtherTableDefs = {}

    tareas.forEach(t=>{
        tareas_fields.forEach(f=>{
            extraFields.push({name:`${f.prefijo}_${t}`, typeName:'text', table:`areas_${t}`, nameForUpsert:f.name, editable:f.editable});
            extraSelect += `, areas_${t}.${f.name} as ${f.prefijo}_${t}`;
        })
        extraFrom += ` 
            left join tareas_areas as areas_${t} on areas_${t}.operativo = a.operativo and areas_${t}.area = a.area and areas_${t}.tarea = '${t}'`; 
        otherTableDefs[`areas_${t}`] = {
            name: 'tareas_areas', 
            tableName:'tareas_areas', 
            prefilledField:{tarea:t}
        }
    });
   
    var tableDef = areas(context);
    tableDef.allow={
        insert:false,
        delete:false,
    };
    tableDef.name = `areas_asignacion_general`;
    tableDef.tableName = `areas`;
    tableDef.fields = tableDef.fields.filter((field)=>
        !['recepcionista','relevador','encuestador','recuperador','supervisor',].includes(field.name))
    tableDef.fields.splice(2,0, ...extraFields);
    //tableDef.refrescable = true;
    tableDef.sql!.isTable = false;
    tableDef.sql!.from =  `(select a.* ${extraSelect} from (${tableDef.sql!.from}) a ${extraFrom})`,
    tableDef.sql!.otherTableDefs = otherTableDefs;
    tableDef.detailTables = [
        {table:'tem_asignacion' , fields:['operativo','area'], abr:'A', refreshParent:true, refreshFromParent:true, label:'asignables'},
    ];
    return tableDef
}

