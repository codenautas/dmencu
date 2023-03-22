"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";
import { FieldDefinition } from "rel-enc";

export function tareas_tem(context:TableContext):TableDefinition {
    var be=context.be;
    var db=be.db; 
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';       
    var fields:FieldDefinition[]=[
        {name:'operativo'                   , typeName:'text', isPk:2},
        {name:'enc'                         , typeName:'text', isPk:3},
        {name:'tarea'                       , typeName:'text', isPk:1},
        {name:'estado'                      , typeName:'text'        , editable:false   , nullable: false, defaultDbValue:"'0D'"},
        {name:'abrir'                       , typeName:'text'        , editable:false   , inTable:false, clientSide:'abrirRecepcion'},
        {name:"consistir"                   , typeName: 'text'       , editable:false   , inTable:false, clientSide:'consistir'},
        {name:'area'                        , typeName: 'integer'    , editable:false   , inTable:false },
        {name:'tarea_anterior'              , typeName:'text'        , editable:false},
      //  {name:'ok'                          , typeName: 'text'       , editable:false   , inTable:false },
        {name:'asignante'                   , typeName:'text'        , editable:false, inTable:false}, // va a la hoja de ruta
        {name:'recepcionista_tarea'         , typeName:'text'        , editable:true,  references:'recepcionistas' }, 
        {name:'asignado'                    , typeName:'text'}, // va a la hoja de ruta
        {name:'operacion'                   , typeName:'text'}, // cargar/descargar
        {name:'fecha_asignacion'            , typeName:'date'}, // cargar/descargar
        {name:"carga_observaciones"         , typeName: "text"       , editable: true},        
        {name:'cargado_dm'                  , typeName:'text'        , editable: false}, //cargar/descargar 
        {name:"cargado"                     , typeName: "boolean"    , editable: false},
        {name:'notas'                       , typeName:'text'}, // viene de la hoja de ruta
        {name:'rea'                         , typeName:'integer'     , editable: puedeEditar, label:'rea_dm'},
        {name:'norea'                       , typeName:'integer'     , editable: puedeEditar, label:'norea_dm'},
        //{name:'cod_no_rea'                , typeName:'text'        , editable: false   , inTable:false  },
        {name:'resumen_estado'              , typeName:'text'        , editable: false   , label: 'resumen_estado_dm'},
        {name:'ult_rea'                     , typeName:'integer'     , editable: false   ,  inTable:false},
        {name:'ult_norea'                   , typeName:'integer'     , editable: false   ,  inTable:false},
        {name:'ult_gru_no_rea'              , typeName:'text'        , editable: false   , inTable:false  },
        {name:'ult_resumen_estado'          , typeName:'text'        , editable: false   ,  inTable:false},
        //{name:'resultado'                 , typeName:'text'}, // fk tareas_resultados 
        //{name:'fecha_resultado'           , typeName:'date'}, // fk tareas_resultados 
        {name:'supervision_dirigida'        , typeName:'integer'     , editable: true},
        {name:'supervision_aleatoria'       , typeName:'integer'     , editable: false,  inTable:false},
        {name:'verificado'                  , typeName:'text'}, 
        {name:'a_recuperacion'              , typeName:'text'        , editable:false , inTable:false}, 
        {name:'obs_verificado'              , typeName:'text'},
        {name:'rea_sup'                     , typeName:'integer'     , editable: puedeEditar},
        {name:'norea_sup'                   , typeName:'integer'     , editable: puedeEditar},
        {name:'resumen_estado_sup'          , typeName:'text'        , editable: false},
        {name:'ult_rea_sup'                 , typeName:'integer'     , editable: false ,  inTable:false},
        {name:'ult_norea_sup'               , typeName:'integer'     , editable: false ,  inTable:false},
        {name:'ult_resumen_estado_sup'      , typeName:'text'        , editable: false ,  inTable:false},
        ];
        var ok_string=` coalesce(nullif(
            case when tareas_tem.asignado is null and tareas_tem.verificado is not null then 'Verificado-asignado vacio'
                --when tareas_tem.verificado is not null and tareas_tem.habilitada then 'Falta deshabilitar'
            else '' end 
            ||case when tareas_tem.asignado is null and tareas_tem.operacion is not null then 'Operacion sin asignado'
                when tareas_tem.verificado is not null and coalesce(tareas_tem.operacion,'descargar')='cargar' then 'Verificado-cargado'
                when tareas_tem.dominio=3 and tareas_tem.verificado is not null and tareas_tem.operacion is null then 'Verificado sin operacion '
            else '' end
            ||(select case
                    when tareas_tem.habilitada and tareas_tem.tarea='recu' and count(*) filter(where h.verificado is not null and h.tarea='encu') =0  then 'Tarea previa a recu sin verificar'
                    when tareas_tem.habilitada and tareas_tem.tarea='supe' and (count(*) filter (where h.verificado is not null and h.tarea <>'supe') )=0  then 'Tarea previa a supe sin verificar'
                    when tareas_tem.habilitada and tareas_tem.tarea='supe' 
                        and (count(*) filter (where not h.habilitada  and h.tarea ='recu' and no_rea.grupo0~*'^ausencia|rechazo' ))>0  then 'RECUPERAR antes de habil. Supervision'
                else '' end  
                from tareas_tem h join tem  using (operativo, enc) left join no_rea on tem.norea=(no_rea.no_rea)::integer
               where h.enc=tareas_tem.enc and h.operativo=tareas_tem.operativo
            )
            ||(select case 
                when count(cargado_dm)>1  then '+cargados'
                when count(*) filter (where habilitada is true and verificado is null)>1 then '+habilitadas sin verificar'
                when count(*) filter (where operacion='cargar')>1   then '+opeCargar'
                else '' end
        from tareas_tem h 
        where h.enc=tareas_tem.enc and h.operativo=tareas_tem.operativo
        )
        || (select case
            when count(i.consistencia)>0 then 'Revisar inconsist' 
            else '' end
            from inconsistencias i join consistencias c using(operativo, consistencia)
            where i.operativo=tareas_tem.operativo and i.vivienda=tareas_tem.enc and tareas_tem.tarea='encu' 
               and i.justificacion is null and c.valida and c.activa
        )
     ,''),'✔')
    `; // a determinar si es necesario mantenerla
    return {
        name:`tareas_tem`,
        tableName:`tareas_tem`,
        allow:{
            insert:false,
            delete:false,
        },
        editable:puedeEditar,
        fields,
        primaryKey:['tarea','operativo','enc'],
        hiddenColumns:['cargado_dm','notas'],
        foreignKeys:[
            {references:'tem' , fields:['operativo','enc'], displayFields:[], alias:'te'},
            {references:'tareas' , fields:['operativo','tarea']},
            {references:'tareas' , fields:[{source:'operativo', target:'operativo'}, {source: 'tarea_anterior', target:'tarea'}], alias:'tarant'},
            {references:'usuarios', fields:[{source:'asignado' , target:'idper'}], alias:'ad'},
            {references:'operaciones' , fields:['operacion']},
            {references:'estados' , fields:['operativo','estado']},
        ],
        softForeignKeys:[
            {references:'usuarios', fields:[{source:'asignante', target:'idper'}], alias:'at'},
            {references:'tem_recepcion' , fields:['operativo','enc'], displayAllFields:true, displayAfterFieldName:'resumen_estado_sup'},
            {references:'tokens', fields:[{source:'cargado_dm', target:'token'}], displayFields:['username'], displayAfterFieldName:'cargado'},
           // {references:'recepcionistas', fields:[{source:'recepcionista_tarea', target:'persona'}], alias:'rec'},
        ],
        "detailTables": [
            {table: "inconsistencias", abr: "I", fields: [{source:'operativo', target:'operativo'},{source:'enc', target:'vivienda'}], refreshParent:true, refreshFromParent:true}
        ],
        sql:{
            isTable: true,
            //insertIfNotUpdate:true,
            /*fields:{
                ok:{ 
                    expr:ok_string
                },
            },*/
            from:`(
                select *
                    from (
                select tareas.tarea, t.operativo, t.enc, t.area
                    ${fields.filter(x=>!(x.isPk || x.inTable===false||x.name=='area')).map(x=>`, tt.${db.quoteIdent(x.name)}`).join('')}
                    , y.grupo as ult_gru_no_rea
                    , case rol_asignante when 'automatico' then null
                        when 'recepcionista' then areas.recepcionista end as asignante
                    , case when tt.tarea='recu' and y.grupo0 in ('ausentes','rechazos') then 'recuperacion' else null end a_recuperacion   
                    , t.supervision_aleatoria
                    , t.rea ult_rea, t.norea as ult_norea, t.resumen_estado ult_resumen_estado
                    , t.rea_sup ult_rea_sup, t.norea_sup as ult_norea_sup, t.resumen_estado_sup ult_resumen_estado_sup
                    , dominio
                    , v.consistido
                    , e.visible_en_asignacion
                    , e.visible_en_recepcion
                    from tareas join  tem t using (operativo) 
                        left join areas using (operativo, area)
                        --left join lateral (select * from tareas_tem where tarea=tareas.tarea and operativo=t.operativo and enc=t.enc) tt on true
                        left join lateral (select * from tareas_tem where tarea=tareas.tarea and operativo=t.operativo and enc=t.enc) tt on 
                            (t.operativo = tt.operativo and t.tarea_actual = tt. tarea and t.estado_actual = tt.estado) --muestro segun tarea y estado actual en la tem
                        left join no_rea y on t.norea=y.no_rea::integer
                        left join viviendas v on v.operativo=t.operativo and v.vivienda=t.enc 
                        join estados e on t.operativo = e.operativo and tt.estado = e.estado
                    ) x
            )`,
        },
        //refrescable: true, //no está permitido aún
        //clientSide:'tareasTemRow' //desactivo para borrar los íconos de las celdas
    };
}

