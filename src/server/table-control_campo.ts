"use strict";

import { stringify } from "querystring";
import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

export type controlCamposOpts={
    nombre:string, 
    agrupador?:string, 
    agrupado?:boolean,
    camposCorte?:FieldDefinition[],
    filtroWhere?:string
    title?:string
    gabinete?:boolean
    sinhogfin?:boolean
}


export function control_campo(context:TableContext,opts?:controlCamposOpts):TableDefinition {
    opts = opts || {nombre:'control_campo'}
    opts.agrupador = opts.agrupador || 'no_rea_groups'
    opts.agrupado = opts.agrupado ?? false
    var be=context.be;
    var db=be.db;
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    var camposCorte:FieldDefinition[]=[{name:'cluster'       , typeName:'integer'},...(
        opts.camposCorte ||[]
    )];
    var tieneSeleccionado=context.be.caches.tableContent.conReaHogar.config_sorteo;
    var camposCalculados:(FieldDefinition & {condicion:string, tasa_efectividad:boolean})[]=[
        {name:'no_salieron'  , typeName:'bigint', aggregate:'sum', title:'no salieron a campo', condicion:`resumen_estado is null`},
        {name:'salieron'     , typeName:'bigint', aggregate:'sum', title:'salieron a campo'},
        {name:'sin_novedad'  , typeName:'bigint', aggregate:'sum', visible:opts.agrupado},
        {name:'sin_resultado', typeName:'bigint', aggregate:'sum', visible:!opts.agrupado, condicion:`resumen_estado in ('vacio')`},
       // {name:'cita_pactada' , typeName:'bigint', aggregate:'sum', visible:!opts.agrupado, condicion:`resumen_estado in ('cita pactada')`},
        {name:'rea'          , typeName:'bigint', aggregate:'sum', condicion:`resultado='efectiva'`},
        {name:'pendiente'    , typeName:'bigint', aggregate:'sum', condicion:`resultado='pendiente'`},
        {name:'mixta'        , typeName:'bigint', aggregate:'sum', condicion:`resultado='mixta'`},
        /*
        {name:'asuente_viv'  , typeName:'bigint', title:'ausente de vivienda', condicion:`cod_no_rea=7`},
        {name:'asuente_mie'  , typeName:'bigint', title:'ausente de miembro seleccionado', condicion:`cod_no_rea=75`},
        */
        ...(be.caches.tableContent[opts.agrupador]||[]).map(g=>({
            name:g.grupo.replace(/ /g,'_'),
            typeName:'bigint',
            inTable:false,
            title:g.grupo,
            condicion:`cod_no_rea in (${g.codigos.map(c=>db.quoteLiteral(c.no_rea)).join(',')})`,
            aggregate:'sum',
            tasa_efectividad:!g.codigos[0].grupo0.startsWith('no encuestable')
        }))
    ];
    return {
        name:opts.nombre,
        editable:false,
        title:opts.title||opts.nombre.replace(/_/g,' '),
        fields:[
            ...camposCorte,
            {name:'total'        , typeName:'bigint', aggregate:'sum'},
            ...camposCalculados.map(f=>{var {condicion, ...fieldDef}=f; return fieldDef}),
            {name:'otros'                    , typeName:'bigint', aggregate:'sum'},
            {name:'tasa_efectividad'         , typeName:'decimal'},
            {name:'incompleto'               , typeName:'bigint', aggregate:'sum', visible:!opts.agrupado, condicion:`resumen_estado in ('incompleto','con problemas')`},
            {name:'verif_encu_pendiente'     , typeName:'bigint', aggregate:'sum', visible:!opts.agrupado, condicion:`resumen_estado in ('incompleto','con problemas')`},
            {name:'en_curso'                 , typeName:'bigint', aggregate:'sum', visible:!!opts.gabinete, title:'En_curso'     },
            {name:'otras_causas_gabinete'    , typeName:'bigint', aggregate:'sum', visible:!!opts.gabinete, title: 'Otras_causas'},
        ],
        primaryKey:camposCorte.map(f=>f.name),
        sql:{
            isTable:false,
            from:` 
            ( 
                select t.*, coalesce(incompleto,0)+coalesce(sin_resultado,0) as sin_novedad,
                        --TODO REVISAR
                        round(rea*100.0/nullif( ${(
                            ['rea', ...(camposCalculados.filter(f=>f.tasa_efectividad).map(f=>f.name))].join('+')
                        )},0),1) as tasa_efectividad,
                        total-coalesce(no_salieron,0) as salieron,
                        coalesce(otros,0) + ${opts.gabinete?` coalesce(otras_causas,0) `:opts.sinhogfin?` coalesce(otras_causas_seleccionado,0)+coalesce(otras_causas_vivienda,0)`: !tieneSeleccionado?` coalesce(otras_causas_hogar,0) +coalesce(otras_causas_vivienda,0)`:` coalesce(otras_causas_hogar,0) +coalesce(otras_causas_vivienda,0)+ coalesce(otras_causas_seleccionado,0)`}  as otras_causas_gabinete,
                        coalesce(pendiente,0)+coalesce(mixta,0) +coalesce(sin_resultado,0) +coalesce(incompleto,0) +${ opts.gabinete && tieneSeleccionado && !opts.sinhogfin ? ` coalesce(no_finalizada,0) `: !opts.gabinete && !opts.sinhogfin && tieneSeleccionado? `coalesce(sin_finalizar_dm,0)+ coalesce(sin_finalizar_incompleto,0) + coalesce(sin_finalizar_otra_causa,0)` :`0`} as en_curso
                     /*   coalesce(otros,0)+${opts.gabinete?`coalesce(otras_causas,0) `:`coalesce(otras_causas_hogar,0) + coalesce(otras_causas_seleccionado,0) + coalesce(otras_causas_vivienda,0)`}  as otras_causas_gabinete, */
                     /*   coalesce(pendiente,0)+coalesce(mixta,0)+ coalesce(incompleto,0)+coalesce(sin_resultado,0)+${opts.gabinete?`coalesce(no_finalizada,0)`:`coalesce(sin_finalizar_dm,0)+coalesce(sin_finalizar_incompleto,0)+ coalesce(sin_finalizar_otra_causa,0)`}  as en_curso */

                    from (   
                        select ${[
                            ...camposCorte.map(f=>f.name),
                            `count(*) as total`,
                            ...camposCalculados.filter(f=>f.condicion).map(f=>`
                            count(*) filter (where klase=${db.quoteLiteral(f.name)}) as ${f.name}`),
                            'count(*) filter (where klase is null) as otros'
                        ].join(',')}
                            , count(*) filter (where resumen_estado in ('incompleto','con problemas')) as incompleto
                            , count(*) filter (where resumen_estado in ('no rea','ok') and verificado is null) as verif_encu_pendiente
                        from (
                            select t.*,a.participacion_a, a.clase_a, 
                                case ${camposCalculados.filter(f=>f.condicion).map(f=>
                                    `when ${f.condicion} then ${db.quoteLiteral(f.name)} 
                                    `
                                    ).join('')} else null end as klase
                                from (
                                    select t.*, tt.verificado, t.norea as cod_no_rea
                                        from tem t left join comunas c on t.nrocomuna=c.comuna
                                            left join tareas_tem tt on t.operativo=tt.operativo and t.enc=tt.enc and tt.tarea='encu'

                                    where ${opts.filtroWhere || 'true'}    
                                ) t left join (select area, string_agg(distinct participacion::text, ', ' order by participacion::text desc ) as participacion_a
                                    , string_agg(distinct clase, ', ' order by clase desc ) as clase_a
                                    from tem
                                    group by 1                            
                                ) a  using  (area )
                        ) t
                        ${camposCorte.length?`group by ${camposCorte.map(f=>f.name)}`:''}
                    ) t
            )`
        }
    };
}
