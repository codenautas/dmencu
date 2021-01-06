"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

import {control_campo} from './table-control_campo';

export function control_resumen(context:TableContext):TableDefinition {
    return control_campo(context, {nombre:'control_resumen', agrupador:'no_rea_groups0', agrupado:true });
}

