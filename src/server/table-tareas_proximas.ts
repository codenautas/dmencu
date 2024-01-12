"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function tareas_proximas(context:TableContext):TableDefinition {
    var be=context.be;
    var puedeEditar = context.user.rol==='admin';
    return {
        name:'tareas_proximas',
        elementName:'tarea',
        editable:puedeEditar,
        fields:[
            {name:'operativo'                  , typeName:'text'    ,  nullable: false},
            {name:'tarea'                      , typeName:'text'    ,  nullable: false},
            {name:'estado'                     , typeName:'text'    ,  nullable: false},
            {name:'tarea_destino'              , typeName:'text'    ,  nullable: false},
            {name:'estado_destino'             , typeName:'text'    ,  nullable: false},
            {name:'orden'                      , typeName:'integer' ,  nullable: false},
            {name:'condicion'                  , typeName:'text'    ,  nullable: false},
            {name:'desasigna_en_tarea_destino' , typeName:'boolean'                   },
            {name:'nombre_procedure'           , typeName:'text'                      },
        ],
        hiddenColumns:['estados__permite_editar_encuesta','estado_dest__permite_editar_encuesta'],
        primaryKey:['operativo','tarea', 'estado', 'tarea_destino'],
        sortColumns:[
            {column:'operativo'},
            {column:'tarea'},
            {column:'estado'},
            {column:'orden'},
        ],
        foreignKeys: [
            {references: 'tareas'  , fields: ['operativo','tarea']},
            {references: 'estados' , fields: ['operativo','estado']},
            {references: 'tareas'  , fields: ['operativo', {source:'tarea_destino' , target:'tarea' }], alias:'tarea_dest' },
            {references: 'estados' , fields: ['operativo', {source:'estado_destino', target:'estado'}], alias:'estado_dest'}
        ],
    };
}

