"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function areas(context:TableContext):TableDefinition {
    var be=context.be;
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    return {
        name:'areas',
        elementName:'area',
        editable:puedeEditar,
        hiddenColumns:['clusters', 'clases','cargadas_bkp', 'reas_bkp', 'no_reas_bkp'  
            , 'incompletas_bkp', 'vacias_bkp', 'inhabilitadas_bkp'
        ],
        fields:[
            {
                name: "operativo",
                editable: false,
                typeName: "text",
                nullable: false
            },
            { 
                name: 'area',
                typeName: 'integer',
                nullable: false,
                editable: false
            },
            {name:'clusters'                , typeName:'text'     },
            {name:'recepcionista'           , typeName:'text', references:'recepcionistas'},
            {name:'encuestador'             , typeName:'text'                    },
            //{name:'recuperador'             , typeName:'text'                    },
            //{name:'supervisor'              , typeName:'text'                    },
            {name:'observaciones_hdr'       , typeName:'text'                      },
            {name:'clases'                  , typeName:'text'    , editable:false  , inTable:false},
            {name:'cargado'                 , typeName:'boolean' , editable:false  , inTable:false},
            {name:'reas'                    , typeName:'integer' , editable:false  , aggregate:'sum', inTable:false },
            {name:'no_reas'                 , typeName:'integer' , editable:false  , aggregate:'sum', inTable:false },
            {name:'incompletas'             , typeName:'integer' , editable:false  , aggregate:'sum', inTable:false },
            {name:'vacias'                  , typeName:'integer' , editable:false  , aggregate:'sum', inTable:false },
            {name:'inhabilitadas'           , typeName:'integer' , editable:false  , aggregate:'sum', inTable:false },
            {name:'verificado_rec'          , typeName:'text'                      , aggregate:'count' },
            //{name:'confirmadas'             , typeName:'integer' , editable:false, aggregate:'sum'},
            //{name:'pend_conf'               , typeName:'integer' , editable:false, aggregate:'sum', description:'pendientes de confirmación'},
            {name:'obs_recepcionista'       , typeName:'text'                      },
            {name:'comuna'                  , typeName:'bigint'  , title:'comuna'  , inTable:false},
            {name:'cargadas_bkp'            , typeName:'integer' , editable:false  },
            {name:'reas_bkp'                , typeName:'integer' , editable:false  },
            {name:'no_reas_bkp'             , typeName:'integer' , editable:false  },
            {name:'incompletas_bkp'         , typeName:'integer' , editable:false  },
            {name:'vacias_bkp'              , typeName:'integer' , editable:false  },
            {name:'inhabilitadas_bkp'       , typeName:'integer' , editable:false  },
            ...be.caches.tableContent.no_rea_groups.map(x=>(
                {name:x.grupo.replace(/ /g,'_'), typeName:'integer', editable:false}
            ))
        ],
        primaryKey:["operativo",'area'],
        foreignKeys:[
            {references:'operativos', fields:['operativo']},
            //{references:'operaciones', fields:[{source:'operacion_area', target:'operacion'}]},
            //{references:'usuarios', fields:[{source:'encuestador'    , target:'idper'}], alias:'per_enc', displayFields:[]},
            {references:'usuarios', fields:[{source:'recepcionista', target:'idper'}], alias:'per_recep', displayFields:[]},
        ],
        softForeignKeys:[
            //{references:'operativos', fields:['operativo']},
            {references:'encuestadores', fields:[{source:'encuestador', target:'persona'}], alias:'per_encu'},
            //{references:'recuperadores', fields:[{source:'recuperador', target:'persona'}], alias:'per_recu'},
            //{references:'supervisores', fields:[{source:'supervisor', target:'persona'}], alias:'per_supe'},
        ],
        detailTables:[
            {table:'tareas_areas'     , fields:['operativo','area'], abr:'T', refreshParent:true, label:'tareas'},
            {table:'tem'              , fields:['operativo','area'], abr:'E', refreshParent:true, label:'TEM'},
        ],
        sql:{
            isTable:true,
            from:` 
            (select a.operativo, a.area, a.recepcionista, ta.asignado encuestador
                ,  a.observaciones_hdr, a.verificado_rec, a.obs_recepcionista
                  --a.operacion_area, a.fecha,
                , a.cargadas_bkp, a.reas_bkp, a.no_reas_bkp, a.incompletas_bkp, a.vacias_bkp, a.inhabilitadas_bkp
                , t.*
                from areas a left join tareas_areas ta on ta.tarea='encu' and ta.area=a.area and ta.operativo=a.operativo, lateral(
                    select 
                        bool_or( ttcargado_dm is not null )       as cargado , 
                        --count( cargado_dm )                     as cargadas,
                        sum ( case when tem.rea= 1 then 1 else null end )                              as reas,
                        count(*) filter ( where tem.resumen_estado='no rea')       as no_reas,
                        count(*) filter ( where tem.resumen_estado in ('incompleto', 'con problemas') ) as incompletas, 
                        count(*) filter ( where tem.resumen_estado in ('vacio' ) ) as vacias,
                        count(*) filter ( where tthabilitada is not true )    as inhabilitadas,
                        --sum(case when cluster <>4 then null when confirmada is true then 1 else 0 end) as confirmadas,
                        --sum(case when cluster <>4 then null when confirmada is null then 1 else 0 end) as pend_conf,
                        string_agg(distinct clase,', ' order by clase desc) as clases,
                        string_agg(distinct nrocomuna::text,'0' order by nrocomuna::text)::bigint as comuna
                        , string_agg(distinct cluster::text,', ' order by cluster::text desc) as clusters
                        ${be.caches.tableContent.no_rea_groups.map(x=>
                        	`, sum(CASE WHEN gru_no_rea=${be.db.quoteLiteral(x.grupo)} THEN 1 ELSE NULL END) as ${be.db.quoteIdent(x.grupo.replace(/ /g,'_'))}`
                        ).join('')}
                        from ( select operativo, enc, cluster, nrocomuna, clase, 
                                    json_encuesta, t.resumen_estado,  
                                    encuestador, t.rea, t.norea, area, dominio, zona,
                                    json_backup, grupo as gru_no_rea
                                    , bool_or(tt.habilitada) tthabilitada, string_agg(tt.cargado_dm,'-') ttcargado_dm                             
                                from tem t left join tareas_tem tt using(operativo,enc) 
                                    left join no_rea y on y.no_rea::integer=t.norea
                                where t.area=a.area /*and tt.tarea='encu'*/    
                                group by  1,2,3,4,5,6,7,8,9,10,11,12,13,14,15  
                        ) tem
                                
                ) t
            )`
        }

    };
}

