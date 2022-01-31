"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function mis_relevadores(context:TableContext):TableDefinition {
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    return {
        name:'mis_relevadores',
        elementName:'relevador',
        editable:false,
        fields:[
            { name: "relevador"     , typeName: "text"    },
            { name: "nombre"        , typeName: "text"    ,isName:true},
            { name: "apellido"      , typeName: "text"    ,isName:true},
            { name: "cuit"          , typeName: "text"    },
            { name: "usuario"       , typeName: "text"    },
            { name: "activo"        , typeName: "boolean" },
            { name: "recepcionista" , typeName: "text" },
            {name:'telefono'         , typeName:'text'    , title:'teléfono'},
            {name:'interno'          , typeName:'text'                      },
            {name:'mail'             , typeName:'text'                      },
            {name:'mail_alternativo' , typeName:'text'                      },
            {name:'ultima_sincro'           , typeName:'timestamp', editable:false },
            {name:'carga_hoy'               , typeName:'integer' , editable:false  , aggregate:'sum'},
            {name:'carga_1'                 , typeName:'integer' , editable:false  , aggregate:'sum'},
            {name:'carga_2'                 , typeName:'integer' , editable:false  , aggregate:'sum'},
            {name:'carga_3'                 , typeName:'integer' , editable:false  , aggregate:'sum'},
            {name:'reas'                    , typeName:'integer' , editable:false  , aggregate:'sum'},
            {name:'no_reas'                 , typeName:'integer' , editable:false  , aggregate:'sum'},
            {name:'incompletas'             , typeName:'integer' , editable:false  , aggregate:'sum'},
            {name:'vacias'                  , typeName:'integer' , editable:false  , aggregate:'sum'},
            {name:'reas_dia'                , typeName:'decimal' , editable:false  , title:'reas/día' , aggregate:'avg'},
            {name:'tarea'                   , typeName:'text'    , editable:false  },
        ],
        primaryKey:['relevador'],
        detailTables:[
            {table:'tareas_areas'    , fields:[{source:'relevador', target:'asignado'},'tarea'], abr:'TA'},
            {table:'tareas_tem'      , fields:[{source:'relevador', target:'asignado'},'tarea'], abr:'E'},
        ],
        sql:{
            isTable:false,
            from:`(
                select u.idper as relevador, u.*, t.*, s.*, 'encu' as tarea
                    from usuarios u, lateral (
                        select sum(case when tt.fecha_asignacion = current_date then 1 else null end) as carga_hoy,
                                sum(case when tt.fecha_asignacion = current_date + interval '1 day' then 1 else null end) as carga_1,
                                sum(case when tt.fecha_asignacion = current_date + interval '2 day' then 1 else null end) as carga_2,
                                sum(case when tt.fecha_asignacion = current_date + interval '3 day' then 1 else null end) as carga_3,
                                sum(case when t.rea = 1 then 1 else null end) as reas,
                                sum(case when t.resumen_estado = 'no rea' then 1 else null end) as no_reas,
                                sum(case when t.resumen_estado in ('incompleta', 'con problemas') then 1 else null end) as incompletas,
                                sum(case when t.resumen_estado in ('vacia') then 1 else null end) as vacias,
                                sum(case when tt.fecha_asignacion is not null and t.rea = 1 then 1 else null end)*1.0 / nullif(count(distinct tt.fecha_asignacion),0) as reas_dia
                            from tem t inner join areas a using (area) inner join tareas_tem tt on (t.operativo=tt.operativo and  t.enc=tt.enc and 'rel'=tt.tarea)
                            where tt.asignado = u.idper
                    ) t left join lateral (
                        select max(cuando) as ultima_sincro
                            from sincronizaciones s
                            where s.usuario = u.usuario
                    ) s on true
                    where rol='relevador' and u.idper is not null
                    ${context.user.rol=='recepcionista'?` and recepcionista = ${context.be.db.quoteLiteral(context.user.idper)}`:''}
            )`
        }
    };
}

