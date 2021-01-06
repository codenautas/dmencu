"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

export function etiquetas_duplicadas(context:TableContext):TableDefinition {
    var be=context.be;
    var db=be.db;
    var puedeEditar = false ;  //context.forDump || context.user_rol=='admin';
    return {
        name: 'etiquetas_duplicadas',
        elementName:'etiquetas_duplicada',
        fields:[
            { name:'etiqueta'             , typeName:'text'         },
            { name:'enc'                  , typeName:'text'         },
            { name:'cargado'              , typeName: 'boolean'     },            
            { name:'area'                 , typeName:'integer'      },
            { name:'relevador'            , typeName:'text'         },
            { name:'recepcionista'        , typeName:'text'         },
            { name:'tipo_domicilio'       , typeName:'integer'      },
            { name:'c6'                   , typeName:'text'         },
            { name:'apellido'             , typeName:'text'         },
            { name:'nombre'               , typeName:'text'         },
            { name:'domicilio'            , typeName:'text'         }
        ],
        primaryKey:['etiqueta','enc'], 
        sql:{
            from:`(
                select t.etiqueta, t.enc, t.area, tt.asignado as relevador, tt.cargado, a.recepcionista,
                (json_encuesta->>'c6')::text as c6,
                t.cluster, t.tipo_domicilio,
                (json_encuesta->>'e1')::text as apellido,
                (json_encuesta->>'e2')::text as nombre,
                coalesce(nomcalle||' ','')||coalesce(nrocatastral||' ','')||coalesce(piso||' ','')||coalesce(departamento,'')  domicilio
              from  tem t join areas a using (area) left join tareas_tem tt on tt.enc=t.enc and tt.operativo=t.operativo and tt.tarea='rel' 
                join ( select etiqueta, count(*)
                  from tem
                  where etiqueta is not null
                  group by 1
                  having count(*)>1 
                ) dup  using (etiqueta)
              where t.etiqueta = dup.etiqueta                
          )`,
            isTable: false,
        }
    };
}                
