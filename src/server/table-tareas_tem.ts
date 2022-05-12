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
        {name:'tarea'              , typeName:'text', isPk:1},
        {name:'operativo'          , typeName:'text', isPk:2},
        {name:'enc'                , typeName:'text', isPk:3},
        {name:'abrir'              , typeName:'text'        , editable:false   , inTable:false, clientSide:'abrirRecepcion'},
        {name:'area'               , typeName: 'integer'    , editable:false   , inTable:false },
        {name:'ok'                 , typeName: 'text'       , editable:false   , inTable:false },
        {name:"habilitada"         , typeName: "boolean"    , editable:puedeEditar},
        {name:'asignante'          , typeName:'text'        , editable:false   , inTable:false}, // va a la hoja de ruta
        {name:'asignado'           , typeName:'text'}, // va a la hoja de ruta
        {name:'operacion'          , typeName:'text'}, // cargar/descargar
        {name:'fecha_asignacion'   , typeName:'date'}, // cargar/descargar
        {name:"carga_observaciones", typeName: "text"       , editable: true},        
        {name:'cargado_dm'         , typeName:'text'        , editable: false}, //cargar/descargar 
        {name:"cargado"            , typeName: "boolean"    , editable: false},
        {name:'notas'              , typeName:'text'}, // viene de la hoja de ruta
        {name:'rea'                , typeName:'integer'     , editable: puedeEditar},
        {name:'norea'              , typeName:'integer'     , editable: puedeEditar},
        //{name:'cod_no_rea'         , typeName:'text'        , editable: false   , inTable:false  },
        {name:'gru_no_rea'         , typeName:'text'        , editable: false   , inTable:false  },
        {name:'resumen_estado'     , typeName:'text'        , editable: false  },
        {name:'utl_rea'            , typeName:'integer'     , editable: false   ,  inTable:false},
        {name:'ult_norea'          , typeName:'integer'     , editable: false   ,  inTable:false},
        {name:'ult_resumen_estado' , typeName:'text'        , editable: false   ,  inTable:false},
        //{name:'resultado'          , typeName:'text'}, // fk tareas_resultados 
        //{name:'fecha_resultado'    , typeName:'date'}, // fk tareas_resultados 
        {name:'supervision_dirigida'  , typeName:'integer'     , editable: true},
        {name:'supervision_aleatoria' , typeName:'integer'     , editable: false,  inTable:false},
        {name:'verificado'            , typeName:'text'}, 
        {name:'proximo_paso'          , typeName:'text'        , editable:false , inTable:false}, 
        {name:'obs_verificado'        , typeName:'text'},
        {name:'rea_sup'               , typeName:'integer'     , editable: puedeEditar},
        {name:'norea_sup'             , typeName:'integer'     , editable: puedeEditar},
        {name:'resumen_estado_sup'    , typeName:'text'        , editable: false},
        {name:'utl_rea_sup'           , typeName:'integer'     , editable: false ,  inTable:false},
        {name:'ult_norea_sup'         , typeName:'integer'     , editable: false ,  inTable:false},
        {name:'ult_resumen_estado_sup', typeName:'text'        , editable: false ,  inTable:false},
        ]; 
    return {
        name:`${mis}tareas_tem`,
        tableName:`tareas_tem`,
        editable:puedeEditar,
        fields,
        primaryKey:['tarea','operativo','enc'],
        hiddenColumns:['cargado_dm','notas'],
        foreignKeys:[
            {references:'tem' , fields:['operativo','enc'], displayFields:[], alias:'te'},
            {references:'tareas' , fields:['operativo','tarea']},
            {references:'usuarios', fields:[{source:'asignado' , target:'idper'}], alias:'ad'},
            {references:'operaciones' , fields:['operacion']},
        ],
        softForeignKeys:[
            {references:'usuarios', fields:[{source:'asignante', target:'idper'}], alias:'at'},
            {references:'tem_recepcion' , fields:['operativo','enc'], displayAllFields:true, displayAfterFieldName:'resumen_estado_sup'},
            {references:'tokens', fields:[{source:'cargado_dm', target:'token'}], displayFields:['username'], displayAfterFieldName:'cargado'},
        ],
        sql:{
            isTable: !opt.mis,
            insertIfNotUpdate:true,
            fields:{
                ok:{ 
                    expr:` coalesce(nullif(
                                case when tareas_tem.asignado is null and tareas_tem.verificado is not null then 'Verificado-asignado vacio'
                                    when tareas_tem.verificado is not null and tareas_tem.habilitada then 'Falta deshabilitar'
                                else '' end 
                                ||case when tareas_tem.asignado is null and tareas_tem.operacion is not null then 'Operacion sin asignado'
                                    when tareas_tem.verificado is not null and coalesce(tareas_tem.operacion,'descargar')='cargar' then 'Verificado-cargado'
                                    when tareas_tem.verificado is not null and tareas_tem.operacion is null then 'Verificado sin operacion'
                                else '' end
                                ||(select case
                                        when tareas_tem.habilitada and tareas_tem.tarea='recu' and count(*) filter(where h.verificado is not null and h.tarea='encu') =0  then 'T.previa a recu sin verificar'
                                        when tareas_tem.habilitada and tareas_tem.tarea='supe' and (count(*) filter (where h.verificado is not null and h.tarea <>'supe') )=0  then 'T.previa a supe sin verificar' 
                                    else '' end  
                                    from tareas_tem h 
                                   where h.enc=tareas_tem.enc and h.operativo=tareas_tem.operativo
                                )
                                ||(select case 
                                    when count(cargado_dm)>1  then '+cargados'
                                    when count(*) filter (where habilitada is true)>1 then '+habilitadas'
                                    when count(*) filter (where operacion='cargar')>1   then '+opeCargar'
                                    else '' end
                            from tareas_tem h 
                            where h.enc=tareas_tem.enc and h.operativo=tareas_tem.operativo
                            ) 
                         ,''),'✔')
                    `
                },
            },
            from:`(
                select *
                    from (
                select tareas.tarea, t.operativo, t.enc, t.area
                    ${fields.filter(x=>!(x.isPk || x.inTable===false||x.name=='area')).map(x=>`, tt.${db.quoteIdent(x.name)}`).join('')}
                    , y.grupo as gru_no_rea
                    , case rol_asignante when 'automatico' then null
                        when 'recepcionista' then areas.recepcionista end as asignante
                    , case when tt.tarea='encu' and  y.grupo0 in ('ausentes','rechazos') then 'recuperacion' else null end proximo_paso   
                    , t.supervision_aleatoria
                    , t.rea utl_rea, t.norea as ult_norea, t.resumen_estado ult_resumen_estado
                    , t.rea_sup utl_rea_sup, t.norea_sup as ult_norea_sup, t.resumen_estado_sup ult_resumen_estado_sup
                    from tareas join  tem t using (operativo) 
                        left join areas using (operativo, area)
                        left join lateral (select * from tareas_tem where tarea=tareas.tarea and operativo=t.operativo and enc=t.enc) tt on true
                        left join no_rea y on tt.norea=y.no_rea::integer
                    ) x
                    
                    ${opt.mis?`where (asignante = ${db.quoteNullable(context.user.idper)} or asignado = ${db.quoteNullable(context.user.idper)})`:''}
            )`
        },
        clientSide:'tareasTemRow'
    };
}

