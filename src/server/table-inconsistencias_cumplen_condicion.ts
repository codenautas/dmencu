"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

export function inconsistencias_cumplen_condicion(context:TableContext):TableDefinition {
    const be = context.be;
    const inconsistencias = be.getTableDefinition['inconsistencias'];
    let tableDef = inconsistencias(context);
    tableDef.name = `inconsistencias_cumplen_condicion`;
    tableDef.sql!.isTable=false;
    tableDef.sql!.where = `momento_consistencia_cumple_condicion(
        "inconsistencias_cumplen_condicion".operativo,
        "inconsistencias_cumplen_condicion".vivienda::text,
        '${context?.username}', 
        (select condicion from momentos_consistencia where operativo = "inconsistencias_cumplen_condicion".operativo and momento = "inconsistencias_cumplen_condicion".momento)
    )`;
    tableDef.fields.forEach((field:FieldDefinition)=>{
        if(!field.table){
            field.table='inconsistencias'
        }
    });
    return tableDef;
}