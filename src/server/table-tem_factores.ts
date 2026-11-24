"use strict";

import {TableDefinition, ContextForDump} from "./types-dmencu";

// Grilla para cargar los factores de expansión (tem.fexp) que entrega procesamiento, a mano o importando un Excel o
// un .tab con las columnas operativo, enc y fexp. Solo muestra las encuestas cerradas (tarea proc en estado V) con
// rea positiva: las no respuesta no llevan fexp. No permite agregar ni borrar filas: la importación solo actualiza
// encuestas que ya están en la grilla.
export function tem_factores(context:ContextForDump):TableDefinition {
    var puedeEditar = !!(context.forDump || context.puede?.encuestas?.procesar);
    return {
        name:'tem_factores',
        elementName:'encuesta',
        title:'factores de expansión',
        allow:{
            insert:false,
            delete:false,
            import:puedeEditar,
        },
        editable: puedeEditar,
        fields:[
            {name:'operativo'            , typeName:'text'    , editable: false  , nullable: false},
            {name:'enc'                  , typeName:'text'    , editable: false  , nullable: false},
            {name:'fexp'                 , typeName:'integer' , editable: puedeEditar, table:'tem'},
        ],
        primaryKey:['operativo','enc'],
        sql:{
            isTable:false,
            from:`
                (select t.operativo, t.enc, t.fexp
                    from tem t
                    where exists (select 1 from tareas_tem tt
                                    where tt.operativo = t.operativo and tt.enc = t.enc and tt.tarea = 'proc' and tt.estado = 'V')
                      and exists (select 1 from rea r
                                    where r.operativo = t.operativo and r.rea = t.rea and r.es_positiva)
                )
            `
        }
    };
}
