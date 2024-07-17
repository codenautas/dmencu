"use strict";

import {TableDefinition, ContextForDump, FieldDefinition} from "./types-dmencu";
import {OperativoGenerator } from "procesamiento";


export var getDomicilioFields = ():FieldDefinition[] => [
    {name:'codcalle'             , typeName:'integer' , editable: false  },
    {name:'nomcalle'             , typeName:'text'    , editable: false  },
    {name:'nrocatastral'         , typeName:'integer' , editable: false  },
    {name:'piso'                 , typeName:'text'    , editable: false  },
    {name:'departamento'         , typeName:'text'    , editable: false  },
    {name:'habitacion'           , typeName:'text'    , editable: false  },
    {name:'sector'               , typeName:'text'    , editable: false  },
    {name:'edificio'             , typeName:'text'    , editable: false  },
    {name:'entrada'              , typeName:'text'    , editable: false  },
    {name:'barrio'               , typeName:'text'    , editable: false  },
]

export function tem(context:ContextForDump, opts?:any):TableDefinition {
    var opts=opts||{};
    var recepcion=opts.recepcion?'_recepcion':'';
    var be=context.be;
    var puedeEditarCampo = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    var puedeEditarProc = context.forDump || context.puede?.encuestas?.procesar;

    var columnasAreasParaLaTem=['obs_recepcionista','verificado_rec','recepcionista'];

    var columnasNoRea=[
        {name:'gru_no_rea', expr: 'grupo' }
    ];
    var columnasSoloTem=[
          'enc_original'   , 'json_encuesta'      , 'json_backup', 'fecha_modif_encuesta', 'fecha_backup'
        , 'h4'             , 'x'       , 'y'      , 'fexp'
    ];
    var def: TableDefinition= {
        name:`tem${recepcion}`,
        tableName:'tem',
        muestraAbrirEnTodasLasTareas:true,
        allow:{
            insert:false,
            delete:false,
        },
        editable: puedeEditarCampo||puedeEditarProc,
        hiddenColumns:[
            'seleccionado_ant','cita','notas', 'cluster',
            'codviviendaparticular', 'casa', 'obsdatosdomicilio', 'obsconjunto', 'reserva', 'rotacion_etoi', 'rotacion_eah'
            , 'trimestre'   , 'procedencia', 'sel_etoi_villa'   , 'marco'      , 'semana' , 'periodicidad' 
            , 'cargado_dm', 'estados__permite_editar_encuesta'
        ],
        "fields": [
            {name:'operativo'            , typeName:'text'    , editable: false  , nullable: false, defaultValue: 'etoi211'},
            {name:'enc'                  , typeName:'text'    , editable: false  , nullable: false                       },
            {name: "abrir"               , typeName:'text'    , editable: false  , inTable:false, clientSide:'abrir'},
            {name:"consistir"            , typeName: 'text'   , editable: false  , inTable:false, clientSide:'consistir'},
            {name: "cluster"             , typeName:'integer' , editable: false, isName:true},
            {name:'enc_ant'              , typeName:'text'    , editable: false  },
            {name:'area_ant'             , typeName:'integer' , editable: false  },
            {name:'seleccionado_ant'     , typeName:'text'    , editable: false  },
            {name:'cita'                 , typeName:'text'    , editable: true   },
            {name:'tarea_actual'         , typeName:'text'    , editable: false  },
            {name:"habilitar"            , typeName: "text"   , editable:false   , inTable:false, clientSide:'habilitar'},
            {name:"habilitada"           , typeName: 'boolean', editable:puedeEditarCampo, nullable: false},
            {name:'area'                 , typeName:'integer' , editable: false  },
            {name:'zona'                 , typeName:'text'    , editable: false  },
            {name:'rea'                  , typeName:'integer' , editable: false  },
            {name:'norea'                , typeName:'integer' , editable: false  },
            {name:'cant_h'               , typeName:'integer' , editable: false  },
            {name:'cant_p'               , typeName:'integer' , editable: false  },
            {name:'seleccionado'         , typeName:'text'    , editable: false  },
//            {name:'sexo_sel'             , typeName:'integer' , editable: false  },
//            {name:'edad_sel'             , typeName:'integer' , editable: false  },
            {name:'resultado'            , typeName:'text'    , editable: false  },
            {name:'gru_no_rea'           , typeName:'text'    , editable: false , inTable:false  },
            {name:'resumen_estado'       , typeName:'text'    , editable: false  },
            {name:'cargado'              , typeName:'boolean' , editable: false , inTable: false  },
            //{name:'encu_habilitada'      , typeName:'boolean' , editable: false , inTable: false  },
            //{name:'encu_cargado'         , typeName:'boolean' , editable: false , inTable: false  },
            {name:'encuestador'          , typeName:'text'    , editable: false , inTable: false  },
            {name:'nombre_enc'           , typeName:'text'    , inTable: false  },
            {name:'apellido_enc'         , typeName:'text'    , inTable: false  },
            //{name:'recu_habilitada'      , typeName:'boolean' , editable: false , inTable: false  },
            //{name:'recu_cargado'         , typeName:'boolean' , editable: false , inTable: false  },
            {name:'recuperador'          , typeName:'text'    , editable: false , inTable: false  },
            {name:'nombre_rec'           , typeName:'text'    , inTable: false  },
            {name:'apellido_rec'         , typeName:'text'    , inTable: false  },
            //{name:'supe_habilitada'      , typeName:'boolean' , editable: false , inTable: false  },
            //{name:'supe_cargado'         , typeName:'boolean' , editable: false , inTable: false  },
            {name:'supervisor'           , typeName:'text'    , editable: false , inTable: false  },
            {name:'nombre_sup'           , typeName:'text'    , inTable: false  },
            {name:'apellido_sup'         , typeName:'text'    , inTable: false  },
            {name:'rea_sup'              , typeName:'integer'     , editable: false},
            {name:'norea_sup'            , typeName:'integer'     , editable: false},
            {name:'resumen_estado_sup'   , typeName:'text'        , editable: false},
            {name:'pre_sorteo'           , typeName:'integer'     , editable: false, visible: false},
            {name:'supervision_aleatoria', typeName:'integer'     , editable: false},
            {name:'supervision_dirigida' , typeName:'integer'     , editable: false},
            {name:'supervision'          , typeName:'integer'     , editable: false},
            {name:'result_sup'           , typeName:'integer'     , editable: puedeEditarCampo},
            {name:'fin_campo'            , typeName:'text'    , editable: puedeEditarCampo  },
            {name:'proie'                , typeName:'text'    , editable: puedeEditarCampo||puedeEditarProc  },
            {name:'pase_tabla'           , typeName:'text'    , editable: false  },
            ...getDomicilioFields(),
            //{name: "verificar"       , typeName:'boolean', editable:true, inTable:false, clientSide:'verificarCaso'},
            //{name: "finalizar_campo" , typeName:'boolean', editable:true, inTable:false, clientSide:'finalizarCampo'}, //fin_de_campo
            //{name: "procesamiento"   , typeName:'boolean', editable:true, inTable:false, clientSide:'pasarAProcesamiento', label: 'pasar a procesamiento'}, //procesamiento
            {name:'fexp'                 , typeName:'integer' , editable: false  },
            {name:'areaup'               , typeName:'text'    , editable: false  },
            {name:'codpos'               , typeName:'integer' , editable: false  },
            {name:'dominio'              , typeName:'integer' , editable: false  },
            {name:'estrato_ing'          , typeName:'integer' , editable: false  },
            {name:'id_marco'             , typeName:'bigint'  , editable: false  },
            {name:'obs'                  , typeName:'text'    , editable: false  },
            {name:'nrocomuna'            , typeName:'integer' , editable: false  },
            {name:'nrofraccion'          , typeName:'integer' , editable: false  },
            {name:'nroradio'             , typeName:'integer' , editable: false  },
            {name:'nromanzana'           , typeName:'integer' , editable: false  },
            {name:'nrolado'              , typeName:'integer' , editable: false  },
            {name:'usodomicilio'         , typeName:'integer' , editable: false  },
            {name:'orden_relevamiento'   , typeName:'integer' , editable: false  },
            {name:'mapa'                 , typeName:'integer' , editable: false  },
            {name: "consistido"          , typeName: 'timestamp', editable: false , inTable:false  },
            {name:'cargado_dm'           , typeName:'text'    , editable: false , inTable: false  },
            {name:'participacion'        , typeName:'integer' , editable: false  ,visible: true  },
            {name:'rotacion'             , typeName:'integer' , editable: false  ,visible: true  },
            {name:'clase'                , typeName:'text'    , editable: false  ,visible: true  },
            {name:'panel'                , typeName:'integer' , editable: false  ,visible: true  },
            //vacios o poco interesantes
            {name:'codviviendaparticular', typeName:'text'    , editable: false  },
            {name:'casa'                 , typeName:'text'    , editable: false  },
            {name:'obsdatosdomicilio'    , typeName:'text'    , editable: false  },
            {name:'obsconjunto'          , typeName:'text'    , editable: false  },
            {name:'reserva'              , typeName:'integer' , editable: false  },
            {name:'rotacion_etoi'        , typeName:'integer' , editable: false  ,visible: false  },
            {name:'rotacion_eah'         , typeName:'integer' , editable: false  ,visible: false  },
            {name:'trimestre'            , typeName:'integer' , editable: false  ,visible: false  },
            {name:'procedencia'          , typeName:'text'    , editable: false  ,visible: false  },
            {name:'sel_etoi_villa'       , typeName:'integer' , editable: false  ,visible: false  },
            {name:'marco'                , typeName:'integer' , editable: false  ,visible: false  },
            {name:'semana'               , typeName:'integer' , editable: false  ,visible: false  },
            {name:'periodicidad'         , typeName:'text'    , editable: false  ,visible: false  },
            //solo tem 
            {name: 'fecha_modif_encuesta', typeName: "timestamp", editable:false  },
            {name:'json_encuesta'        , typeName:'jsonb'     , editable:false  },
            {name: 'fecha_backup'        , typeName: "timestamp", editable:false},
            {name:"json_backup"          , typeName:'jsonb'   , editable: false, visible:false},
            {name:"h4"                   , typeName:'text'    , editable: false  },
            {name:"x"                    , typeName:'decimal' , editable: false  },
            {name:"y"                    , typeName:'decimal' , editable: false  },
            {name:'notas'                , typeName:'text'    , editable: false, inTable:false},
            {name:"modificado"           , typeName: 'timestamp', editable: false},
            {name: "libre" , typeName: "boolean", defaultDbValue:"true"  , visible:false, editable:false},
            {name: "fecha_bloqueo", typeName: "timestamp", visible:false, editable:false}
            //{name:'obs_sup'        , typeName:'text' , editable: isSupervisor     },
            //{name:'obs_coor'       , typeName:'text' , editable: isCoordinador || isSubCoordinador },  
        ],
        "primaryKey": [ "operativo", "enc" ],
        foreignKeys:[
            {references:'areas'   , fields:['operativo', 'area']},
            {
                references:'tareas' , 
                fields:[
                    {source:'operativo', target:'operativo'},
                    {source:'tarea_actual', target:'tarea'}
                ],
                alias:'taract'
            },
        //    {references:'usuarios', fields:[{source:'carga_persona', target:'idper'}], displayFields:['apellido','nombre']},
        ],        
        softForeignKeys:[
            {references:'tokens', fields:[{source:'cargado_dm', target:'token'}], displayFields:['username'], displayAfterFieldName:'cargado'}
        ],
        "detailTables": [
            {table: "inconsistencias", abr: "I", fields: [{source:'operativo', target:'operativo'},{source:'enc', target:'vivienda'}]},
            {table: "historial_tem", abr: "H", fields: ['operativo','enc']}
        ],
        constraints:[
            {constraintType:'check', consName:"vresult_sup_ck", expr:"(result_sup between 1 and 9 or result_sup in (11,12,21,22 ) or result_sup between 60 and 68)"}
        ]
    };
    if (opts.recepcion) {
        def.fields=def.fields.filter(f=>!columnasSoloTem.includes(f.name) )
        def.hiddenColumns=[...def.hiddenColumns, ...columnasAreasParaLaTem.map(x=>`areas__${x}`)]
        def.foreignKeys=def.foreignKeys?.map(function (f) {if (f.references=='areas'){f.displayFields=columnasAreasParaLaTem}; return f}) 
    } else {
        def.detailTables?.unshift({table: "tareas_tem", abr: "T", fields: ['operativo', 'enc'], label:'tareas'})
        def.fields=def.fields.filter(f=>!columnasNoRea.map(fn=>fn.name).includes(f.name) )
    };
    const q=context.be.db.quoteIdent;
    def.sql= {
            isTable:!opts.recepcion, //TODO: resolver como sacarlo del dump
            isReferable:true,
            from:`
                (select
                    ${def.fields.filter(f=>f.inTable==undefined && !f.clientSide).map(f=>'t.'+q(f.name)).join(',')}
                    , tt.cargado, tt.cargado_dm
                    , tt.etareas->'encu'->>'asignado' as encuestador
                    , tt.etareas->'recu'->>'asignado' as recuperador
                    , tt.etareas->'supe'->>'asignado' as supervisor
                    , null notas
                    , aux.consistido
                    , usu_enc.nombre as nombre_enc
                    , usu_enc.apellido as apellido_enc
                    , usu_rec.nombre as nombre_rec
                    , usu_rec.apellido as apellido_rec
                    , usu_sup.nombre as nombre_sup
                    , usu_sup.apellido as apellido_sup
                    ${opts.recepcion? columnasNoRea.map(v=>'\n     , '+ v.expr +' as '+ v.name).join('') :''}
                    from tem t left join (
                        select tt.operativo, tt.enc, bool_or(cargado) cargado, string_agg(cargado_dm,',') cargado_dm,jsonb_object_agg(tarea,jsonb_build_object('asignado',asignado,'cargado',cargado,'cargado_dm',cargado_dm))etareas 
                            from tareas_tem tt group by tt.operativo, tt.enc  )tt on t.operativo=tt.operativo and t.enc=tt.enc
                            left join no_rea y on y.no_rea::integer=t.norea
                            left join ${OperativoGenerator.mainTD} aux on aux.operativo=t.operativo and aux.${OperativoGenerator.mainTDPK}=t.enc 
                            left join usuarios usu_enc on usu_enc.idper = tt.etareas->'encu'->>'asignado'
                            left join usuarios usu_rec on usu_rec.idper = tt.etareas->'recu'->>'asignado'
                            left join usuarios usu_sup on usu_sup.idper = tt.etareas->'supe'->>'asignado'
                )
            `     
        };
        return def;
    }
    