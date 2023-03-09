"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function acciones(context:TableContext):TableDefinition {
    //var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';
    var esEditable = context.user.rol==='admin';
    return {
        name:'acciones',
        elementName:'accion',
        editable:esEditable,
        fields:[
            {name:'operativo'                , typeName:'text',    nullable: false},
            {name:'eaccion'                  , typeName:'text',    nullable: false},
            {name:'abr_eaccion'              , typeName:'text'},
            {name:'desactiva_boton'          , typeName:'boolean', nullable: false, defaultDbValue: 'false'},
            {name:'path_icono_svg'           , typeName:'text'},
            {name:'icono'                    , typeName:'text'        , editable:false   , inTable:false, clientSide:'verIconoSvg'},
            {name:'desc_eaccion'             , typeName:'text'},
            {name:'confirma'                 , typeName:'boolean', nullable: false, defaultDbValue: 'false'},
            {name:'asigna'                   , typeName:'boolean', nullable: false, defaultDbValue: 'false'},
            {name:'recepciona'               , typeName:'boolean', nullable: false, defaultDbValue: 'false'},
        ],
        primaryKey:['operativo', 'eaccion'],
        foreignKeys: [
            {
                "references": "operativos",
                "fields": [
                    "operativo",
                ]
            }
        ],
        "detailTables": [
            {
                "table": "estados_acciones",
                "fields": [
                    "operativo",
                    "eaccion"
                ],
                "abr": "ea"
            }
        ],
    };
}

