"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function areas(context:TableContext):TableDefinition {
    var be=context.be;
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    return {
        name:'areas',
        elementName:'area',
        editable:puedeEditar,
        fields:[
            /*
            {
                "name": "operativo",
                "editable": false,
                "typeName": "text",
                "nullable": false,
                "defaultValue": 'etoi211'
            },
            */    
            { 
                name: 'area',
                typeName: 'integer',
                nullable: false,
                editable: true
            },
            {name:'clusters'                , typeName:'text' },
            {name:'recepcionista'           , typeName:'text', references:'recepcionistas'},
            {name:'relevador'               , typeName:'text', editable:false},
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
        primaryKey:['area'],
        foreignKeys:[
            //{references:'operativos', fields:['operativo']},
            //{references:'operaciones', fields:[{source:'operacion_area', target:'operacion'}]},
            //{references:'usuarios', fields:[{source:'relevador'    , target:'idper'}], alias:'per_enc', displayFields:[]},
            {references:'usuarios', fields:[{source:'recepcionista', target:'idper'}], alias:'per_recep', displayFields:[]},
        ],
        softForeignKeys:[
            //{references:'operativos', fields:['operativo']},
            {references:'relevadores', fields:[{source:'relevador', target:'persona'}]},
        ],
        detailTables:[
            {table:'tareas_areas'     , fields:['area'], abr:'T', refreshParent:true, label:'tareas'},
            {table:'tem'              , fields:['area'], abr:'E', refreshParent:true, label:'TEM'},
        ],
        sql:{
            isTable:true,
            from:` 
            (select a.area, a.recepcionista, ta.asignado relevador
                ,  a.observaciones_hdr, a.verificado_rec, a.obs_recepcionista
                  --a.operacion_area, a.fecha,
                , a.cargadas_bkp, a.reas_bkp, a.no_reas_bkp, a.incompletas_bkp, a.vacias_bkp, a.inhabilitadas_bkp
                , t.*
                from areas a left join tareas_areas ta on ta.tarea='rel' and ta.area=a.area, lateral(
                    select 
                        bool_or( cargado_dm is not null )       as cargado , 
                        --count( cargado_dm )                     as cargadas,
                        sum ( rea_m )                              as reas,
                        count(*) filter ( where etiqueta is null and resumen_estado='no rea')       as no_reas,
                        count(*) filter ( where resumen_estado in ('incompleto', 'con problemas') ) as incompletas, 
                        count(*) filter ( where etiqueta is null and resumen_estado in ('vacio' ) ) as vacias,
                        count(*) filter ( where habilitada is not true )    as inhabilitadas,
                        --sum(case when cluster <>4 then null when confirmada is true then 1 else 0 end) as confirmadas,
                        --sum(case when cluster <>4 then null when confirmada is null then 1 else 0 end) as pend_conf,
                        string_agg(distinct clase,', ' order by clase desc) as clases,
                        string_agg(distinct nrocomuna::text,'0' order by nrocomuna::text)::bigint as comuna,
                        string_agg(distinct cluster::text,', ' order by cluster::text desc) as clusters
                        ${be.caches.tableContent.no_rea_groups.map(x=>
                        	`, sum(CASE WHEN gru_no_rea=${be.db.quoteLiteral(x.grupo)} THEN 1 ELSE NULL END) as ${be.db.quoteIdent(x.grupo.replace(/ /g,'_'))}`
                        ).join('')}
                        from ( select operativo, enc, cluster, nrocomuna, clase, 
                                json_encuesta, resumen_estado, etiqueta, --habilitada, 
                                relevador, rea_m, rea, norea, cant_p, seleccionado, sexo_sel, edad_sel, fecha_rel, tipo_domicilio, area, dominio, zona
                                json_backup, hospital
                            , tt.habilitada, tt.cargado_dm
                            , ${be.sqlNoreaCase('grupo')} as gru_no_rea from tem t left join tareas_tem tt using(operativo,enc) where t.area=a.area and tt.tarea='rel') tem
                ) t
            )`
        }

    };
}

