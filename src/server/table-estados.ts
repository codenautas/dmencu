"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function estados(context:TableContext):TableDefinition {
    //var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    var esEditable = context.user.rol==='admin';
    return {
        name:'estados',
        elementName:'estado',
        editable:esEditable,
        fields:[
            {name:'operativo'                    , typeName:'text',  nullable: false},
            {name:'estado'                       , typeName:'text',  nullable: false},
            {name:'desc_estado'                  , typeName:'text'},
            {name:'orden_estado'                 , typeName:'text'},
            {name:'permite_asignar'              , typeName:'boolean', nullable:false, defaultDbValue:'false'},
            {name:'permite_editar_encuesta'      , typeName:'boolean', nullable:false, defaultDbValue:'true', isName:true},
            {name:'estado_al_asignar'            , typeName:'text'   },
            {name:'visible_en_recepcion'         , typeName:'boolean', nullable:false, defaultDbValue:'true'},
            {name:'visible_en_ingreso'           , typeName:'boolean', nullable:false, defaultDbValue:'false'},
        ],
        primaryKey:['operativo', 'estado'],
        foreignKeys: [
            {references: "operativos",fields: ["operativo"]},
            {references: "estados", fields: ["operativo", {source: "estado_al_asignar", target:"estado"}], alias: 'estado_al_asignar'}
        ],
        detailTables: [
            {table: "estados_acciones", fields: ["operativo","estado"], abr: "a", label:"acciones"}
        ],
    };
}