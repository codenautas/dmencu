"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function dictra(context:TableContext):TableDefinition {
    var permitidoeditar = context.forDump ||context.puede?.encuestas.procesar;;
    return {
        name: 'dictra',
        elementName: 'dictra',
        editable: permitidoeditar,
        fields: [
            { name: "diccionario"   , typeName: "text"     , nullable:false, references: 'diccionario'  },
            { name: "origen"        , typeName: "text"     , nullable:false  },
            { name: "destino"       , typeName: "integer"                    },
        ], 
        primaryKey: ['diccionario', 'origen'],
        foreignKeys:[
            {references:'diccionario'    , fields: ['diccionario'],displayFields:[]},
        ],
        /*
        constraints:[
            {   
                constraintType:'check', 
                consName:'texto de diccionario inválido', 
                expr:"(comun.cadena_valida(dictra_texto::text, 'castellano'::text)),"
            },
            {   
                constraintType:'check', 
                consName:'texto invalido en dictra_ori de tabla dictra', 
                expr:"(comun.cadena_valida(dictra_ori, 'castellano'::text)),"
            },
        ]
       */
    };
}