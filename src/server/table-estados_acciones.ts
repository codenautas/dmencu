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
            {name:'estado'                  , typeName:'text' ,  nullable: false},
            {name:'eaccion'                 , typeName:'text' ,  nullable: false},
            {name:'condicion'               , typeName:'text' ,  nullable: false},
            {name:'estado_destino'          , typeName:'text' ,  nullable: false},
            {name:'eaccion_direccion'       , typeName:'text' ,  nullable: false},
            {name:'nombre_procedure'        , typeName:'text'},
            {name:'nombre_wscreen'          , typeName:'text'},
        ],
        primaryKey:['operativo', 'estado','eaccion', 'estado_destino'],
        foreignKeys: [
            {references: 'estados',fields: ['operativo','estado']},
            {references: 'acciones',fields: ['operativo','eaccion']},
            {references: 'estados',fields: ['operativo',{source:'estado_destino', target:'estado'}], alias:'estdest'},
        ]
    };
}


