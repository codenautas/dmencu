"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";
import { FieldDefinition } from "rel-enc";

export function etiquetas_resultado(context:TableContext, opts:null|{all:boolean, name:string}):TableDefinition {
    var be=context.be;
    var admin = context.user.rol==='admin';
    var puedeAvisar = context.forDump || context.puede?.lab_resultado?.avisar && !admin;
    return {
        name:opts && opts.name || 'etiquetas_resultado',
        elementName:'etiqueta',
        tableName:'etiquetas',
        allow:{
            insert:false,
            delete:false,
            update:puedeAvisar,
        },     
        fields:[
            {name:'operativo'               , typeName:'text'      ,editable:false , nullable:false, defaultValue:'etoi211'  },
            {name:'etiqueta'                , typeName:'text'      ,editable:false , nullable:false  },
            {name: 'cluster'                , typeName:'integer'   ,editable:false },
            {name:'resultado'               , typeName:'text'      ,editable:false },
            {name:'fecha'                   , typeName:'date'      ,editable:false },
            {name:'hora'                    , typeName:'interval'  ,editable:false },
            {name:'laboratorista'           , typeName:'text'      ,editable:false },
            {name:'observaciones'           , typeName:'text'      ,editable:false },
            {name:'rectificacion'           , typeName:'integer'   ,editable:false, defaultDbValue: 0},
            {name:'avisar_email'            , typeName:'text'      ,editable:false, inTable:false, clientSide:'avisar_email'},
            {name:'mail_aviso_texto'        , typeName:'text'    , editable:false, inTable:false, visible: false},
            {name:'mail_aviso_asunto'       , typeName:'text'    , editable:false, inTable:false, visible: false},
            {name:'avisar'                  , typeName:'text'      ,editable:false, inTable:false, clientSide:'avisar'},
            {name:'avisado_fecha'           , typeName:'date'      ,editable:puedeAvisar },
            {name:'avisado_quien'           , typeName:'text'      ,editable:puedeAvisar },
            {name:'avisado_observaciones'   , typeName:'text'      ,editable:puedeAvisar },
            {name:'apellido'                , typeName:'text'      ,editable:false, inTable: false },
            {name:'nombre'                  , typeName:'text'      ,editable:false, inTable: false },
            {name:'sexo'                    , typeName:'text'      ,editable:false, inTable: false },
            {name:'edad'                    , typeName:'integer'   ,editable:false, inTable: false },
            {name:'tipo_documento'          , typeName:'text'      ,editable:false, inTable: false },
            {name:'pais_documento'          , typeName:'text'      ,editable:false, inTable: false },
            {name:'numero_documento'        , typeName:'text'      ,editable:false, inTable: false },
            {name:'celular'                 , typeName:'text'      ,editable:false, inTable: false },
            {name:'email'                   , typeName:'text'      ,editable:false, inTable: false },
            {name:'numero_linea_vivienda'   , typeName:'text'      ,editable:false, inTable: false },
            {name:'tipo_informe'            , typeName:'bigint'    ,editable:false, inTable: false },
            {name:'tel_alternativo'         , typeName:'text'      ,editable:false, inTable: false },
            ...(opts && opts.all ? [
                {name:'rea', typeName:'integer', editable:false},
                {name:'cod_no_rea', typeName:'text', editable:false},
                {name:'area', typeName:'integer', editable:false},
            ] as FieldDefinition[] : [])
        ],
        primaryKey:['etiqueta'],
        foreignKeys:[
            {references:'usuarios'     , fields:[{source:'laboratorista', target:'usuario'}]},
        ],
        sql:{
            from:`(
                select e.*, t.cluster, 
                (json_encuesta->>'e1')::text as apellido,
                (json_encuesta->>'e2')::text as nombre,
                case when ((json_encuesta->>'e3')) = '1' then 'DNI'
                    when ((json_encuesta->>'e3')) = '2' then 'Documento extranjero'
                    when ((json_encuesta->>'e3')) = '3' then 'No tiene documento'
                    when ((json_encuesta->>'e3')) = '4' then (json_encuesta->>'e4')
                    else (json_encuesta->>'e4') end as tipo_documento,
                (json_encuesta->>'e4')::text as tipo_documento_esp,
                case when ((json_encuesta->>'e3')) = '1' then 'Argentina'
                    when ((json_encuesta->>'e5')) = '1' then 'Uruguay'
                    when ((json_encuesta->>'e5')) = '2' then 'Paraguay'
                    when ((json_encuesta->>'e5')) = '3' then 'Brasil'
                    when ((json_encuesta->>'e5')) = '4' then 'Bolivia'
                    when ((json_encuesta->>'e5')) = '5' then 'Chile'
                    when ((json_encuesta->>'e5')) = '6' then 'Perú'
                    when ((json_encuesta->>'e5')) = '7' then 'Venezuela'
                    when ((json_encuesta->>'e5')) = '8' then (json_encuesta->>'e6')
                    else (json_encuesta->>'e6') end as pais_documento,
                (json_encuesta->>'e7')::text as numero_documento,
                (json_encuesta->>'c1')::text as celular,
                (json_encuesta->>'c2')::text as email,
                (json_encuesta->>'c3')::text as numero_linea_vivienda,
                (json_encuesta->>'c4')::text as tel_alternativo,
                (json_encuesta->>'c5')::text as etiqueta_c5,
                case json_encuesta->'personas'->((json_encuesta->>'p11')::integer - 1)->>'p2'::text when '1' then 'Varón' when '2' then 'Mujer' else json_encuesta->'personas'->(json_encuesta->>'p11')->>'p2'::text end as sexo,
                (json_encuesta->'personas'->((json_encuesta->>'p11')::integer - 1)->>'p3')::integer as edad,
                    t.area,
                    t.rea,
                   ${be.sqlNoreaCase('no_rea')} as cod_no_rea,
                rt.email_texto as mail_aviso_texto, 
                rt.email_asunto as mail_aviso_asunto
                from  etiquetas e left join resultados_test rt using (resultado)
                left join tem t using(etiqueta)
                where (ingreso_lab is not null or resultado is not null or observaciones is not null)
                -- full outer join tem t using(etiqueta)
                -- where etiqueta is not null
            )`,
            isTable: false,
        },
        hiddenColumns:['tipo_informe']
    };
}

