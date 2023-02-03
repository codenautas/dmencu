"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import {tareas_tem} from "./table-tareas_tem";
import { addButtons } from "./table-tareas_tem_asignables";

export function tareas_tem_recepcion(context:TableContext):TableDefinition {
    var tableDef = tareas_tem(context);
    tableDef.name = `tareas_tem_recepcion`;
    addButtons(tableDef);
    tableDef.filterColumns=[
        {column:'visible_en_recepcion', operator:'=', value:true}
    ];
    tableDef.hiddenColumns=['cargado_dm','notas', 'acciones'];
    tableDef.sql!.from=`(select * from (${tableDef.sql!.from}) aux
        , lateral (
            select jsonb_agg(z.*) as acciones
                from (
                    select ea.*, ac.path_icono_svg, ac.desactiva_boton
                        from estados_acciones ea join acciones ac using (operativo, eaccion)
                        where ea.operativo = aux.operativo and ea.tarea = aux.tarea and ea.estado = aux.estado and ac.recepciona
                        and accion_cumple_condicion(aux.operativo, ea.estado, aux.enc, aux.tarea, ea.eaccion,ea.condicion)
                ) z
            ) y
        )`
    return tableDef
}

