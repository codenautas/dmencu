"use strict";

import {TableDefinition, ContextForDump} from "./types-dmencu";

import { tem } from "./table-tem";

// Grilla para cargar los factores de expansión (tem.fexp) que entrega procesamiento, a mano o importando un Excel o
// un .tab con las columnas operativo, enc y fexp. Es la tem con solo esos campos, y muestra solo las encuestas cerradas
// (tarea proc en estado V) con rea positiva. No permite agregar ni borrar filas.
// La importación de backend-plus no respeta los allow ni el filtro de la grilla (actualiza por clave):
//  - que una no respuesta no lleve fexp lo controla la base (controlar_fexp_tem_trg), para cualquier camino;
//  - una encuesta que no existe hace fallar la importación (sql.errorIfNotExistsAtImport): no se crean encuestas.
export function tem_factores(context:ContextForDump):TableDefinition {
    var puedeEditar = !!(context.forDump || context.puede?.encuestas?.procesar);
    var campos = ['operativo', 'enc', 'fexp'];
    var tableDef = tem(context, {});
    tableDef.name = 'tem_factores';
    tableDef.elementName = 'encuesta';
    tableDef.title = 'factores de expansión';
    tableDef.allow = {
        insert:false,
        delete:false,
        import:puedeEditar,
    };
    tableDef.editable = puedeEditar;
    tableDef.fields = tableDef.fields
        .filter(field => campos.includes(field.name))
        .map(field => ({...field, editable: field.name == 'fexp' && puedeEditar}));
    tableDef.hiddenColumns = [];
    tableDef.foreignKeys = [];
    tableDef.softForeignKeys = [];
    tableDef.detailTables = [];
    tableDef.constraints = [];
    tableDef.sql!.isTable = false;
    tableDef.sql!.errorIfNotExistsAtImport = true;
    // el from es el heredado de tem, que backend-plus expone con el alias tem
    tableDef.sql!.where = `
        exists (select 1 from tareas_tem tt
                    where tt.operativo = tem.operativo and tt.enc = tem.enc and tt.tarea = 'proc' and tt.estado = 'V')
        and exists (select 1 from rea r
                    where r.operativo = tem.operativo and r.rea = tem.rea and r.es_positiva)
    `;
    return tableDef;
}
