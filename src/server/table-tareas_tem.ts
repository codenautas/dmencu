"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";
import { FieldDefinition } from "rel-enc";

export function tareas_tem(context:TableContext, opt:any):TableDefinition {
    var opt=opt||{}
    var mis=opt.mis?'mis_':'';
    var be=context.be;
    var db=be.db;
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    var fields:FieldDefinition[]=[
        {name:'tarea'    , typeName:'text', isPk:1},
        {name:'operativo', typeName:'text', isPk:2},
        {name:'enc'      , typeName:'text', isPk:3},
        {name:'abrir'    , typeName:'text'    , editable:false, inTable:false, clientSide:'abrirRecepcion'},
        {name:'area'     , typeName: 'integer', editable: false, inTable:false },
        {name:"habilitada"      , typeName: "boolean", editable: puedeEditar},
        {name:'asignante' , typeName:'text', inTable:false, editable:false}, // va a la hoja de ruta
        {name:'asignado' , typeName:'text'}, // va a la hoja de ruta
        {name:'operacion' , typeName:'text'}, // cargar/descargar
        {name:'fecha_asignacion', typeName:'date'}, // cargar/descargar
        {name:"carga_observaciones", typeName: "text", editable: true},        
        {name:'cargado_dm'      , typeName:'text', editable: false}, //cargar/descargar 
        {name:"cargado"         , typeName: "boolean", editable: false},
        {name:'notas'           , typeName:'text'}, // viene de la hoja de ruta
        {name:'resultado'       , typeName:'text'}, // fk tareas_resultados 
        {name:'fecha_resultado' , typeName:'date'}, // fk tareas_resultados 
        {name:'verificado'      , typeName:'text'}, 
        {name:'obs_verificado'  , typeName:'text'}, 
        {name:'visitas'         , typeName:"jsonb", editable:false}
    ];
    return {
        name:`${mis}tareas_tem`,
        tableName:`tareas_tem`,
        editable:puedeEditar,
        fields,
        primaryKey:['tarea','operativo','enc'],
        hiddenColumns:['cargado_dm'],
        foreignKeys:[
            {references:'tem' , fields:['operativo','enc'], displayFields:[], alias:'te'},
            {references:'tareas' , fields:['tarea']},
            {references:'usuarios', fields:[{source:'asignado' , target:'idper'}], alias:'ad'},
            {references:'operaciones' , fields:['operacion']},
        ],
        softForeignKeys:[
            {references:'resultados_tarea', fields:['resultado']},
            {references:'usuarios', fields:[{source:'asignante', target:'idper'}], alias:'at'},
            {references:'tem_recepcion' , fields:['operativo','enc'], displayAllFields:true, displayAfterFieldName:'obs_verificado'},
            {references:'tokens', fields:[{source:'cargado_dm', target:'token'}], displayFields:['username'], displayAfterFieldName:'cargado'},
        ],
        sql:{
            isTable: !opt.mis,
            insertIfNotUpdate:true,
            from:`(
                select *
                    from (
                select tareas.tarea, t.operativo, t.enc, t.area
                    ${fields.filter(x=>!(x.isPk || x.inTable===false||x.name=='area')).map(x=>`, tt.${db.quoteIdent(x.name)}`).join('')}
                    , ${be.sqlNoreaCase('no_rea')} as cod_no_rea
                    , ${be.sqlNoreaCase('grupo')} as gru_no_rea
                    , case rol_asignante when 'automatico' then null
                        when 'recepcionista' then areas.recepcionista end as asignante
                    from tareas, tem t left join areas using (area)
                        left join lateral (select * from tareas_tem where tarea=tareas.tarea and operativo=t.operativo and enc=t.enc) tt on true
                    ) x
                    ${opt.mis?`where (asignante = ${db.quoteNullable(context.user.idper)} or asignado = ${db.quoteNullable(context.user.idper)})`:''}
            )`
        },
        clientSide:'tareasTemRow'
    };
}

