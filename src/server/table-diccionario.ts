"use strict";

import { TableDefinition, TableContext } from "./types-dmencu";

export function diccionario(context: TableContext): TableDefinition {
    var permitidoeditar = context.forDump || (context.puede?.encuestas?.procesar || false);
    return {
        name: 'diccionario',
        elementName: 'diccionario',
        editable: permitidoeditar,
        fields: [
            { name: "diccionario", typeName: "text", nullable: false },
            { name: "completo", typeName: "boolean" },
        ],
        primaryKey: ['diccionario'],
        detailTables: [
            { table: 'dicvar', fields: ['diccionario'], abr: 'V' },
            { table: 'dictra', fields: ['diccionario'], abr: 'T' }
        ]
    };
}