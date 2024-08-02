"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function dicvar(context:TableContext):TableDefinition {
    var permitidoeditar = context.forDump ||context.puede?.encuestas.procesar;
    return {
        name: 'dicvar',
        elementName: 'dicvar',
        editable: permitidoeditar,
        fields: [
            { name: "diccionario"    , typeName: "text"     , nullable:false, references: 'diccionario'  },
            { name: "variable"       , typeName: "text"     , nullable:false,           }
        ], 
        primaryKey: ['diccionario', 'variable'],
        foreignKeys:[
            {references:'diccionario' , fields: ['diccionario'],displayFields:[]},
        ]
        //TODO validar variable por trigger
    };
}