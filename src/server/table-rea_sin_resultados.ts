"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

export function rea_sin_resultados(context:TableContext):TableDefinition {
    var be=context.be;
    var db=be.db;
    var puedeEditar = false ;  //context.forDump || context.user_rol=='admin';
    return {
        name: 'rea_sin_resultados',
        elementName:'rea_sin_resultados',
        fields:[
            { name:'enc'                   , typeName:'text'      , nullable:false },
            { name:'etiqueta'              , typeName:'text'                       },
            { name:'relevador'             , typeName:'text'                       },
            { name:'recepcionista'         , typeName:'text'                       },
            { name: 'c6'                   , typeName:'text'                       },
            { name: 'nombre_sel'           , typeName:'text'                       },
            { name: 'area'                 , typeName:'integer'                    },
            { name: 'nrocomuna'            , typeName:'integer'                    },
            { name: 'calle'                , typeName:'text'                       },
            { name: 'nrocat'               , typeName:'integer'                    },
            { name: 'piso'                 , typeName:'text'                       },
            { name: 'dto'                  , typeName:'text'                       },
            { name: 'apellido'             , typeName:'text'                       },
            { name: 'nombre'               , typeName:'text'                       },
            { name: 'sexo'                 , typeName:'text'                       },
            { name: 'edad'                 , typeName:'integer'                    },
            { name: 'tipo_documento'       , typeName:'text'                       },
            { name: 'pais_documento'       , typeName:'text'                       },
            { name: 'numero_documento'     , typeName:'text'                       },
            { name: 'celular'              , typeName:'text'                       },
            { name: 'email'                , typeName:'text'                       },
            { name: 'numero_linea_vivienda', typeName:'text'                       },
            { name: 'tel_alternativo'      , typeName:'text'                       },
        ],
        primaryKey:['enc'],
        sql:{
            from:`(
                select t.enc, e.etiqueta,
                t.area, t.nrocomuna, t.nomcalle as calle, t.nrocatastral as nrocat, t.piso, t.departamento dto,
                tt.asignado as relevador, a.recepcionista,
                t.cluster, t.tipo_domicilio as tipo_informe,
                t.rea_m,
                json_encuesta->>'p12' nombre_sel,
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
                (json_encuesta->>'c6')::text as c6
                from  tem t join areas a using (area) left join etiquetas e using(etiqueta)
                  left join tareas_tem tt on t.operativo=tt.operativo and t.enc=tt.enc and tt.tarea='rel'   
                where t.rea_m= 1 and e.resultado is null 
            )`,
            isTable: false,
        }
    };
}