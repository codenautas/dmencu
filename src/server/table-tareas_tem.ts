"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";
import { FieldDefinition } from "rel-enc";

export type OptsTareasTem = {
    rol: 'encu'|'recu'|'supe'|null
    name: string
    abre?:boolean
    consiste?:boolean
}

export function tareas_tem(context:TableContext,opts?:OptsTareasTem):TableDefinition {
    if (opts == null) {
        opts = {
            rol: null,
            name: 'relevador'
        }
    }
    opts.abre ??= true;
    opts.consiste ??= true;
    var be=context.be;
    var db=be.db; 
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';       
    var fields:FieldDefinition[]=[
        {name:'operativo'                   , typeName:'text', isPk:2, editable:false},
        {name:'enc'                         , typeName:'text', isPk:3, editable:false},
        {name:'tarea'                       , typeName:'text', isPk:1, editable:false},
        {name:'estado'                      , typeName:'text'        , editable:false   , nullable: false, defaultDbValue:"'0D'"},
    ];
    if(opts.abre){
        fields.push({name:'abrir'                       , typeName:'text'        , editable:false   , inTable:false, clientSide:'abrirRecepcion'});
    }
    if(opts.consiste){
        fields.push({name:"consistir"                   , typeName: 'text'       , editable:false   , inTable:false, clientSide:'consistir'});
    }
    fields=fields.concat([
        {name:'area'                        , typeName: 'integer'    , editable:false   , inTable:false },
        {name:'tarea_asignar'               , typeName:'text'        , inTable:false    , editable:false, serverSide:true},
        {name:'tarea_anterior'              , typeName:'text'        , editable:false},
      //  {name:'ok'                          , typeName: 'text'       , editable:false   , inTable:false },
        {name:'recepcionista'               , typeName:'text'        , editable:true }, 
        {name:'asignado'                    , typeName:'text'        , editable:true, title: opts.name}, // va a la hoja de ruta
        {name:'operacion'                   , typeName:'text'        , editable:false,}, // cargar/descargar
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
        {name:'ult_gru_no_rea'              , typeName:'text'        , editable: false   ,  inTable:false},
        {name:'ult_resumen_estado'          , typeName:'text'        , editable: false   ,  inTable:false},
      //  {name:'result_sup'                  , typeName:'text'        , editable: puedeEditar  ,  inTable:false},
        //{name:'resultado'                 , typeName:'text'}, // fk tareas_resultados 
        //{name:'fecha_resultado'           , typeName:'date'}, // fk tareas_resultados 
        {name:'supervision_dirigida'        , typeName:'integer'     , editable: true},
        {name:'supervision_aleatoria'       , typeName:'integer'     , editable: false, inTable:false},
        {name:'verificado'                  , typeName:'text'        , editable:false,}, 
        {name:'a_recuperacion'              , typeName:'text'        , editable:false , inTable:false}, 
        {name:'obs_verificado'              , typeName:'text'},
        {name:'rea_sup'                     , typeName:'integer'     , editable: puedeEditar, label:'rea_sup_dm'},
        {name:'norea_sup'                   , typeName:'integer'     , editable: puedeEditar, label:'norea_sup_dm'},
        {name:'resumen_estado_sup'          , typeName:'text'        , editable: false,       label: 'resumen_estado_sup_dm'},
        {name:'ult_rea_sup'                 , typeName:'integer'     , editable: false ,  inTable:false},
        {name:'ult_norea_sup'               , typeName:'integer'     , editable: false ,  inTable:false},
        {name:'ult_resumen_estado_sup'      , typeName:'text'        , editable: false ,  inTable:false},
        ]);
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
                from tareas_tem h join tem t2 using (operativo, enc) left join no_rea on t2.norea=(no_rea.no_rea)::integer
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
        hiddenColumns:['cargado_dm','notas', 'estados__permite_editar_encuesta','tarea_anterior','tarea_asginar'],
        foreignKeys:[
            {references:'tem' , fields:['operativo','enc'], displayFields:[]},
            {references:'tareas' , fields:['operativo','tarea']},
            {references:'tareas' , fields:[{source:'operativo', target:'operativo'}, {source: 'tarea_anterior', target:'tarea'}], alias:'tarea_anterior'},
            {references:'usuarios', fields:[{source:'asignado' , target:'idper'}], alias:'asignado', displayFields:['nombre','apellido']},
            {references:'operaciones' , fields:['operacion']},
            {references:'estados' , fields:['operativo','estado']},
            {references:'usuarios', fields:[{source:'recepcionista' , target:'idper'}], alias:'recepcionista'},
        ],
        softForeignKeys:[
            {references:'usuarios', fields:[{source:'recepcionista', target:'idper'}], alias:'at'},
            {references:'tem_recepcion' , fields:['operativo','enc'], displayAllFields:true, displayAfterFieldName:'resumen_estado_sup', alias:"tem_rec"},
            {references:'tokens', fields:[{source:'cargado_dm', target:'token'}], displayFields:['username'], displayAfterFieldName:'cargado'},
            {references:'recepcionistas', fields:[{source:'recepcionista', target:'persona'}], alias:'rec'},
        ],
        detailTables: [
            {table: "inconsistencias", abr: "I", fields: [{source:'operativo', target:'operativo'},{source:'enc', target:'vivienda'}], refreshParent:true, refreshFromParent:true}
        ],
        sql:{
            isTable: true,
            from:`(
                select *
                    from (
                select tt.tarea, t.operativo, t.enc, t.area, 
                    case when tarea_proxima is not null then tarea_proxima when tt.estado='A' then tt.tarea else null end as tarea_asignar
                    ${fields.filter(x=>!(x.isPk || x.inTable===false||x.name=='area')).map(x=>`, tt.${db.quoteIdent(x.name)}`).join('')}
                    , y.grupo as ult_gru_no_rea
                    , case when tt.tarea='recu' and y.grupo0 in ('ausentes','rechazos') then 'recuperacion' else null end a_recuperacion   
                    , t.supervision_aleatoria
                    , t.rea ult_rea, t.norea as ult_norea, t.resumen_estado ult_resumen_estado
                    , t.rea_sup ult_rea_sup, t.norea_sup as ult_norea_sup, t.resumen_estado_sup ult_resumen_estado_sup
                    , dominio
                    , v.consistido
                    , e.visible_en_recepcion
                    , e.visible_en_ingreso
                    , t.result_sup
                    from 
                        tem t left join tareas_tem tt
                            on t.operativo = tt.operativo and t.enc = tt.enc
                        left join tareas ta on tt.operativo = ta.operativo and tt.tarea = ta.tarea
                        left join areas a on tt.operativo = a.operativo and t.area = a.area
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

export function tareas_tem_encu(context:TableContext){
    var tableDef = tareas_tem(context, {rol:'encu', name:'encuestador', abre:false, consiste:false}) 
    tableDef.sql!.isTable = false;
    return tableDef;
}

export function tareas_tem_recu(context:TableContext){
    var tableDef = tareas_tem(context, {rol:'recu', name:'recuperador', abre:true, consiste:false}) 
    tableDef.sql!.isTable = false;
    return tableDef;
}

export function tareas_tem_supe(context:TableContext){
    var tableDef = tareas_tem(context, {rol:'supe', name:'supervisor', abre:true, consiste:false}) 
    tableDef.sql!.isTable = false;
    return tableDef;
}
