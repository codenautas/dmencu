"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

import {control_campo} from './table-control_campo';

export function control_resumen(context:TableContext):TableDefinition {
    var vcon_rea_hogar=context.be.caches.tableContent.conReaHogar.con_rea_hogar;
    return control_campo(context, {nombre:'control_resumen', agrupador:'no_rea_groups0', agrupado:true ,gabinete:true,sinhogfin:!vcon_rea_hogar});
}

