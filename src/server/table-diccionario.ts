"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function diccionario(context:TableContext):TableDefinition {
    var permitidoeditar = context.forDump||context.puede?.encuestas.procesar;
    return {
        name: 'diccionario',
        elementName: 'diccionario',
        editable: permitidoeditar,
        fields: [
            { name: "diccionario"     , typeName: "text"    , nullable:false  },
            { name: "completo"        , typeName: "boolean"                   },
        ],
        primaryKey: ['diccionario'],
        detailTables:[
            {table:'dicvar', fields:['diccionario'], abr:'V', title:'Dicc. Variables' },
            {table:'dictra', fields:['diccionario'], abr:'T', title:'Dicc. Traducción'}
        ]
    };
}