"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";
import { FieldDefinition } from "rel-enc";

export function historial_tem(context:TableContext):TableDefinition {
    var be=context.be;
    var db=be.db; 
    var fields:FieldDefinition[]=[
        {name:'operativo'           , typeName:'text'     },
        {name:'enc'                 , typeName:'text'     },
        {name:'orden'               , typeName:'integer'  },
        {name:'ts_salida'           , typeName:'timestamp'},
        {name:'tarea'               , typeName:'text'     },
        {name:'estado'              , typeName:'text'     },
        {name:'verificado'          , typeName:'text'     },
        {name:'recepcionista'       , typeName:'text'     },
        {name:'asignado'            , typeName:'text'     },
        {name:'json_encuesta'       , typeName:'jsonb'    },
        {name:'resumen_estado'      , typeName:'text'     },
        {name:'rea'                 , typeName:'integer'  },
        {name:'norea'               , typeName:'integer'  },
        {name:'rea_sup'             , typeName:'integer'  },
        {name:'norea_sup'           , typeName:'integer'  },
        {name:'resumen_estado_sup'  , typeName:'text'     },
    ];
        //{name:'abrir'                       , typeName:'text'        , editable:false   , inTable:false, clientSide:'abrirRecepcion'};
        //{name:'fecha_asignacion'            , typeName:'date'},

    return {
        name:`historial_tem`,
        tableName:`historial_tem`,
        allow:{
            insert:false,
            delete:false,
        },
        editable:context.forDump,
        fields,
        primaryKey:['operativo','enc','orden'],
        softForeignKeys:[
            {references:'tem' , fields:['operativo','enc'], displayFields:[]},
            {references:'tareas' , fields:['operativo','tarea']},
            {references:'usuarios', fields:[{source:'asignado' , target:'idper'}], alias:'asignado', displayFields:['nombre','apellido']},
            {references:'usuarios', fields:[{source:'recepcionista' , target:'idper'}], alias:'recepcionista', displayFields:['nombre','apellido']},
            {references:'estados' , fields:['operativo','estado']},
        ],
        sortColumns:[{column:'orden', order:-1}]
    };
}