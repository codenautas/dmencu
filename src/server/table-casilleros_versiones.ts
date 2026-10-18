"use strict";

import { TableDefinition, TableContext } from "./types-dmencu";

// copias de un formulario (con todo lo que tiene adentro) que guarda y restaura el editor visual de metadatos (ver docs/editor-metadatos.md)
export function casilleros_versiones(context: TableContext): TableDefinition {
    return {
        name: 'casilleros_versiones',
        elementName: 'versión de formulario',
        editable: context.forDump,
        fields: [
            { name: 'version'      , typeName: 'bigint', sequence: { firstValue: 1, name: 'casilleros_versiones_seq' } },
            { name: 'operativo'    , typeName: 'text', nullable: false },
            { name: 'id_formulario', typeName: 'text', nullable: false },
            { name: 'cuando'       , typeName: 'timestamp', defaultDbValue: 'current_timestamp' },
            { name: 'usuario'      , typeName: 'text' },
            { name: 'descripcion'  , typeName: 'text' },
            { name: 'casilleros'   , typeName: 'jsonb', nullable: false },
        ],
        primaryKey: ['version'],
        foreignKeys: [
            { references: 'operativos', fields: ['operativo'] },
        ],
        sortColumns: [{ column: 'version', order: -1 }],
    };
}
