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
            {name:'estado_al_asignar'            , typeName:'text'   },
            {name:'visible_en_asignacion'        , typeName:'boolean', nullable:false, defaultDbValue:'false'},
            {name:'visible_en_recepcion'         , typeName:'boolean', nullable:false, defaultDbValue:'true'},
            
        ],
        primaryKey:['operativo', 'estado'],
        foreignKeys: [
            {
                "references": "operativos",
                "fields": [
                    "operativo",
                ]
            },
            {
                references: "estados", "fields": [
                    {source: "operativo", target:"operativo"},
                    {source: "estado_al_asignar", target:"estado"}
                ]
                , alias: 'estdest'
            }
        ],
        "detailTables": [
            {
                "table": "estados_acciones",
                "fields": [
                    "operativo",
                    "estado"
                ],
                "abr": "ea"
            }
        ],
    };
}