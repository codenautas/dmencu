"use strict";

import {TableDefinition, Context} from "./types-dmencu";

export function tem(context:Context, opts:any):TableDefinition {
    var opts=opts||{};
    var recepcion=opts.recepcion?'_recepcion':'';
    var be=context.be;
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';

    var columnasAreasParaLaTem=['obs_recepcionista','verificado_rec','recepcionista'];

    var columnasNoRea=[
        {name:'gru_no_rea', expr: 'grupo' }
    ];
    var columnasSoloTem=[
          'enc_original'   , 'json_encuesta'      , 'json_backup'
        , 'h4'             , 'x'       , 'y'      , 'fexp'
    ];
    var def: TableDefinition= {
        name:`tem${recepcion}`,
        tableName:'tem',
        allow:{
            insert:false,
            delete:false,
        },
        editable: puedeEditar,
        hiddenColumns:[
            'cita','notas', 'cluster',
            'codviviendaparticular', 'casa', 'obsdatosdomicilio', 'obsconjunto', 'reserva', 'rotacion_etoi', 'rotacion_eah'
            , 'trimestre'   , 'procedencia', 'sel_etoi_villa'   , 'marco'      , 'semana' , 'periodicidad' 
            , 'cargado_dm'
        ],
        "fields": [
            {name:'operativo'            , typeName:'text'    , editable: false  , nullable: false, defaultValue: 'etoi211'},
            {name:'enc'                  , typeName:'text'    , editable: false  , nullable: false                       },
            {name: "abrir"               , typeName:'text'    , editable: false  , inTable:false, clientSide:'abrir'},
            {name:"consistir"            , typeName: 'text'   , editable: false  , inTable:false, clientSide:'consistir'},
            {name: "cluster"             , typeName:'integer' , editable: false, isName:true},
            {name:'tarea_actual'         , typeName:'text'    , editable: false  },
            {name:'estado_actual'        , typeName:'text'    , editable: false   , nullable: false, defaultDbValue:"'0D'"},
            {name:"habilitar"            , typeName: "text"   , editable:false   , inTable:false, clientSide:'habilitar'},
            {name:"habilitada"           , typeName: 'boolean', editable:puedeEditar, nullable: false},
            {name:'tarea_proxima'        , typeName:'text'    , editable: false  },
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
            //{name:'recu_habilitada'      , typeName:'boolean' , editable: false , inTable: false  },
            //{name:'recu_cargado'         , typeName:'boolean' , editable: false , inTable: false  },
            {name:'recuperador'          , typeName:'text'    , editable: false , inTable: false  },
            //{name:'supe_habilitada'      , typeName:'boolean' , editable: false , inTable: false  },
            //{name:'supe_cargado'         , typeName:'boolean' , editable: false , inTable: false  },
            {name:'supervisor'           , typeName:'text'    , editable: false , inTable: false  },
            {name:'rea_sup'              , typeName:'integer'     , editable: false},
            {name:'norea_sup'            , typeName:'integer'     , editable: false},
            {name:'resumen_estado_sup'   , typeName:'text'        , editable: false},
            {name:'pre_sorteo'           , typeName:'integer'     , editable: false, visible: false},
            {name:'supervision_aleatoria', typeName:'integer'     , editable: false},
            {name:'supervision'          , typeName:'integer'     , editable: false},
            {name:'fin_campo'            , typeName:'text'    , editable: puedeEditar  },
            {name:'proie'                , typeName:'text'    , editable: puedeEditar  },
            {name:'pase_tabla'           , typeName:'text'    , editable: false  },
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
            {name:'json_encuesta'        , typeName:'jsonb'   , editable: false  },
            {name:"json_backup"          , typeName:'jsonb'   , editable: false, visible:false},
            {name:"h4"                   , typeName:'text'    , editable: false  },
            {name:"x"                    , typeName:'decimal' , editable: false  },
            {name:"y"                    , typeName:'decimal' , editable: false  },
            {name:'notas'                , typeName:'text'    , editable: false, inTable:false},
            {name:'cita'                 , typeName:'text'    , editable: false  },
            {name:"modificado"           , typeName: 'timestamp', editable: false},
            {name: "libre" , typeName: "boolean", defaultDbValue:"true"  , visible:false, editable:false},
            {name: "fecha_bloqueo", typeName: "timestamp", visible:false, editable:false}
            //{name:'obs_sup'        , typeName:'text' , editable: isSupervisor     },
            //{name:'obs_coor'       , typeName:'text' , editable: isCoordinador || isSubCoordinador },  
        ],
        "primaryKey": [ "operativo", "enc" ],
        foreignKeys:[
            {references:'areas'   , fields:['operativo', 'area']},
            {references:'tareas' , fields:[
                {source:'operativo', target:'operativo'},
                {source:'tarea_actual', target:'tarea'}
            ],
                alias:'taract'
            },
            {references:'tareas' , fields:[
                {source:'operativo', target:'operativo'},
                {source:'tarea_proxima', target:'tarea'}
            ], 
                alias:'tarprox'
            },
            {references:'estados' , fields:[{source:'operativo', target:'operativo'},{source:'estado_actual', target:'estado'}]},
        //    {references:'usuarios', fields:[{source:'carga_persona', target:'idper'}], displayFields:['apellido','nombre']},
        ],        
        softForeignKeys:[
            {references:'tokens', fields:[{source:'cargado_dm', target:'token'}], displayFields:['username'], displayAfterFieldName:'cargado'}
        ],
        "detailTables": [
            {table: "inconsistencias", abr: "I", fields: [{source:'operativo', target:'operativo'},{source:'enc', target:'vivienda'}]}
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
                    --, (tt.etareas->'encu'->>'cargado')::boolean encu_cargado, tt.etareas->'encu'->>'cargado_dm' enc_cargado_dm, (tt.etareas->'encu'->>'habilitada')::boolean encu_habilitada
                    , tt.etareas->'encu'->>'asignado' as encuestador
                    --, (tt.etareas->'recu'->>'cargado')::boolean recu_cargado, tt.etareas->'recu'->>'cargado_dm' recu_cargado_dm, (tt.etareas->'recu'->>'habilitada')::boolean recu_habilitada
                    , tt.etareas->'recu'->>'asignado' as recuperador
                    --, (tt.etareas->'supe'->>'cargado')::boolean supe_cargado, tt.etareas->'supe'->>'cargado_dm' supe_cargado_dm, (tt.etareas->'supe'->>'habilitada')::boolean supe_habilitada
                    , tt.etareas->'supe'->>'asignado' as supervisor
                    , null notas
                    , v.consistido
                    ${opts.recepcion? columnasNoRea.map(v=>'\n     , '+ v.expr +' as '+ v.name).join('') :''}
                    from tem t left join (
                        select tt.operativo, tt.enc, bool_or(cargado) cargado, string_agg(cargado_dm,',') cargado_dm,jsonb_object_agg(tarea,jsonb_build_object('asignado',asignado,'cargado',cargado,'cargado_dm',cargado_dm))etareas 
                            from tareas_tem tt group by tt.operativo, tt.enc  )tt on t.operativo=tt.operativo and t.enc=tt.enc
                            left join no_rea y on y.no_rea::integer=t.norea
                            left join viviendas v on v.vivienda=t.enc 
                )
            `     
        };
        return def;
    }
    