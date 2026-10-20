"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

// roles que ven la grilla y pueden ejecutar la desverificación excepcional
export var ROLES_DESVERIFICAN: string[] = ['subcoor_campo', 'coor_campo', 'coor_proc', 'procesamiento', 'admin'];

// estado al que vuelve una tarea desverificada: sale de las transiciones de estados_acciones que ejecutan encuesta_no_verificar.
// Si hay más de una se toma la inmediatamente anterior al estado verificado según estados.orden_estado.
const sqlEstadoDestinoDesverificacion = `
    select distinct on (operativo, estado) operativo, estado, estado_destino
        from (
            select ea.operativo, ea.estado, ea.estado_destino, ed.orden_estado,
                    ed.orden_estado < eo.orden_estado as anterior,
                    count(*) over (partition by ea.operativo, ea.estado) as cantidad
                from estados_acciones ea
                    join estados eo on eo.operativo = ea.operativo and eo.estado = ea.estado
                    join estados ed on ed.operativo = ea.operativo and ed.estado = ea.estado_destino
                where ea.nombre_procedure = 'encuesta_no_verificar'
        ) c
        where cantidad = 1 or anterior
        order by operativo, estado, orden_estado desc`;

// encuestas cuya última tarea (la del último registro de historial_tem) quedó verificada y cuya tarea actual no está verificada.
// Lo usan la grilla `desverificables` y el procedimiento `encuesta_desverificar_excepcional`, para que ambos coincidan.
export var sqlDesverificables = `
    select tt.operativo, tt.enc, tt.tarea, tt.estado, t.tarea_actual, ta.estado as estado_actual, y.estado_destino,
            t.rea, t.norea, t.resumen_estado, t.rea_sup, t.norea_sup, t.resumen_estado_sup
        from tem t
            join lateral (
                select ht.tarea
                    from historial_tem ht
                    where ht.operativo = t.operativo and ht.enc = t.enc
                    order by ht.orden desc
                    limit 1
            ) h on true
            join tareas_tem tt on tt.operativo = t.operativo and tt.enc = t.enc and tt.tarea = h.tarea
            join tareas_tem ta on ta.operativo = t.operativo and ta.enc = t.enc and ta.tarea = t.tarea_actual
            left join (${sqlEstadoDestinoDesverificacion}) y on y.operativo = tt.operativo and y.estado = tt.estado
        where tt.verificado is not null and ta.verificado is null and tt.tarea <> t.tarea_actual`;

export function desverificables(_context:TableContext):TableDefinition {
    return {
        name:`desverificables`,
        elementName:'desverificable',
        editable:false,
        allow:{
            insert:false,
            delete:false,
            update:false
        },
        fields:[
            {name:'operativo'         , typeName:'text', isPk:2, editable:false},
            {name:'enc'               , typeName:'text', isPk:3, editable:false},
            {name:'tarea'             , typeName:'text', isPk:1, editable:false, title:'tarea verificada'},
            {name:'estado'            , typeName:'text', editable:false},
            {name:'tarea_actual'      , typeName:'text', editable:false},
            {name:'estado_actual'     , typeName:'text', editable:false},
            {name:'estado_destino'    , typeName:'text', editable:false},
            {name:'rea'               , typeName:'integer', editable:false},
            {name:'norea'             , typeName:'integer', editable:false},
            {name:'resumen_estado'    , typeName:'text'   , editable:false},
            {name:'rea_sup'           , typeName:'integer', editable:false},
            {name:'norea_sup'         , typeName:'integer', editable:false},
            {name:'resumen_estado_sup', typeName:'text'   , editable:false},
            {name:'desverificar'      , typeName:'text', editable:false, inTable:false, clientSide:'desverificar'},
        ],
        primaryKey:['tarea','operativo','enc'],
        foreignKeys:[
            {references:'tem' , fields:['operativo','enc'], displayFields:[]},
        ],
        softForeignKeys:[
            {references:'estados', fields:['operativo','estado'], alias:'origen', displayFields:['desc_estado']},
            {references:'estados', fields:['operativo',{source:'estado_destino', target:'estado'}], alias:'destino', displayFields:['desc_estado']},
        ],
        sql:{
            isTable:false,
            from:`(${sqlDesverificables})`,
        },
    };
}
