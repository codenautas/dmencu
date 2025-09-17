"use strict";

import {TableDefinition, TableContext, FieldDefinition, OtherTableDefs} from "./types-dmencu";

import { areas } from "./table-areas";
import { IdTarea } from "../unlogged/tipos";

export function areas_asignacion_general(context:TableContext):TableDefinition {
    var tareas: {
        tarea: IdTarea
        muestraDispositivo: boolean
    }[] = [
        { tarea: 'encu', muestraDispositivo: true },
        { tarea: 'ingr', muestraDispositivo: false},
        { tarea: 'recu', muestraDispositivo: true },
        { tarea: 'supe', muestraDispositivo: true },
    ]
    var tareasFields = [
        { name: 'recepcionista', prefijo: 'r', editable: true, references: 'recepcionistas', muestraDispositivo:false },
        { name: 'asignado'     , prefijo: ''     , editable: true, references: 'personal'      , muestraDispositivo:true },
    ];
    var extraFields:FieldDefinition[] = [];
    var extraFrom = '';
    var extraSelect = '\n';
    var otherTableDefs:OtherTableDefs = {}

    tareas.forEach(t=>{
        tareasFields.forEach(f=>{
            const name = `${f.prefijo}_${t.tarea}`;
            extraFields.push({ name, typeName: 'text', table: `areas_${t.tarea}`, nameForUpsert: f.name, editable: f.editable, references: f.references });
            extraSelect += `, areas_${t.tarea}.${f.name} as ${f.prefijo}_${t.tarea}`;
            //datos de los asignados
            extraFields.push({ name: `${name}_nombre`   , typeName: 'text', table: `areas_${t.tarea}`, nameForUpsert: f.name, editable: false, title:'nombre'  });
            extraFields.push({ name: `${name}_apellido` , typeName: 'text', table: `areas_${t.tarea}`, nameForUpsert: f.name, editable: false, title:'apellido'});
            extraSelect += `, (select nombre as ${name}_nombre      from usuarios u join tareas_areas ta on (ta.${context.be.db.quoteIdent(f.name)} = u.idper and ta.tarea = ${context.be.db.quoteLiteral(t.tarea)} and ta.area = a.area))`;
            extraSelect += `, (select apellido as ${name}_apellido  from usuarios u join tareas_areas ta on (ta.${context.be.db.quoteIdent(f.name)} = u.idper and ta.tarea = ${context.be.db.quoteLiteral(t.tarea)} and ta.area = a.area))`;
            if(f.muestraDispositivo && t.muestraDispositivo ){
                extraFields.push({ name: `${name}_dispositivo`, typeName: 'text', table: `areas_${t.tarea}`, nameForUpsert: f.name, editable: false, title:'dm' });
                extraSelect += `, (select dispositivo as ${name}_dispositivo from usuarios u join tareas_areas ta on (ta.${context.be.db.quoteIdent(f.name)} = u.idper and ta.tarea = ${context.be.db.quoteLiteral(t.tarea)} and ta.area = a.area))`;
            }
        })
        extraFrom += ` 
            left join tareas_areas as areas_${t.tarea} on areas_${t.tarea}.operativo = a.operativo and areas_${t.tarea}.area = a.area and areas_${t.tarea}.tarea = '${t.tarea}'`; 
        otherTableDefs[`areas_${t.tarea}`] = {
            name: 'tareas_areas', 
            tableName:'tareas_areas', 
            prefilledField:{tarea:t.tarea}
        }
    });
   
    var tableDef = areas(context);
    tableDef.allow={
        insert:false,
        delete:false,
    };
    tableDef.name = `areas_asignacion_general`;
    tableDef.tableName = `areas`;
    tableDef.fields.forEach((field)=> {
        if(['recepcionista','relevador','encuestador','recuperador','supervisor',].includes(field.name)){
            field.visible = false
        }
    })
    tableDef.foreignKeys?.forEach((fkDef)=> {
        if(fkDef.alias && ['recepcionista','encuestador'].includes(fkDef.alias)){
            fkDef.displayFields=[]
        }
    })
    tableDef.fields.splice(2,0, ...extraFields);
    //tableDef.refrescable = true;
    tableDef.sql!.isTable = false;
    tableDef.sql!.from =  `(select a.* ${extraSelect} from (${tableDef.sql!.from}) a ${extraFrom})`,
    tableDef.sql!.otherTableDefs = otherTableDefs;
    tableDef.detailTables = [
        {table:'tem_asignacion' , fields:['operativo','area'], abr:'A', refreshParent:true, refreshFromParent:true, label:'asignables'},
    ];
    tableDef = {...tableDef, tareasFields};
    return tableDef
}

