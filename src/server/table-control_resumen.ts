"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

import {control_campo} from './table-control_campo';

function controlResumen(context:TableContext, opts:{nombre:string, title?:string, filtroWhere?:string}):TableDefinition {
    var vcon_rea_hogar=context.be.caches.tableContent.conReaHogar.con_rea_hogar;
    return control_campo(context, {...opts, agrupador:'no_rea_groups0', agrupado:true ,gabinete:true,sinhogfin:!vcon_rea_hogar});
}

export function control_resumen(context:TableContext):TableDefinition {
    return controlResumen(context, {nombre:'control_resumen'});
}

// el mismo resumen sobre las encuestas de las que el usuario es recepcionista (para el tablero de inicio)
export function control_resumen_recepcion(context:TableContext):TableDefinition {
    var idper=context.user?.idper ?? null;
    return controlResumen(context, {nombre:'control_resumen_recepcion', title:'control resumen de mis encuestas', filtroWhere:`tt.recepcionista = ${context.be.db.quoteNullable(idper)}`});
}

