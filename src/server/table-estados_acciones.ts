'use strict';

import {TableDefinition, TableContext} from './types-dmencu';

export function estados_acciones(context:TableContext):TableDefinition {
    //var puedeEditar = context.forDump || context.puede?.campo?.administrar;
    var esEditable = context.user.rol==='admin';
    return {
        name:'estados_acciones',
        elementName:'estado_accion',
        editable: esEditable ,
        fields:[
            {name:'operativo'               , typeName:'text' ,  nullable: false},
            {name:'tarea'                   , typeName:'text' ,  nullable: false}, //a definir
            {name:'estado'                  , typeName:'text' ,  nullable: false},
            {name:'eaccion'                 , typeName:'text' ,  nullable: false},
            {name:'condicion'               , typeName:'text' ,  nullable: false},
            {name:'estado_destino'          , typeName:'text' ,  nullable: false},
            {name:'tarea_destino'           , typeName:'text' ,  nullable: false},
            {name:'eaccion_direccion'       , typeName:'text' ,  nullable: false},
            {name:'nombre_procedure'        , typeName:'text'},
        ],
        primaryKey:['operativo', 'tarea', 'estado','eaccion', 'estado_destino'],
        foreignKeys: [
            {references: 'tareas',fields: ['operativo','tarea']},
            {references: 'estados',fields: ['operativo','estado']},
            {references: 'acciones',fields: ['operativo','eaccion']},
            {references: 'estados',fields: ['operativo',{source:'estado_destino', target:'estado'}], alias:'estdest'},
            {references: 'tareas',fields: ['operativo',{source:'tarea_destino', target:'tarea'}], alias:'tardest'},
        ]
    };
}


