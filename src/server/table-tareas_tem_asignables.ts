"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import {tareas_tem} from "./table-tareas_tem";

export function addButtons(tableDef:TableDefinition){
    tableDef.fields.splice(4,0,
        {name:"acciones"                    , typeName: 'jsonb'      , editable:false   , inTable:false},
        {name:"acciones_avance"             , typeName: 'text'       , editable:false   , inTable:false, clientSide:'accionesAvance'},
        {name:"acciones_retroceso"          , typeName: 'text'       , editable:false   , inTable:false, clientSide:'accionesRetroceso'},
        {name:"acciones_blanqueo"           , typeName: 'text'       , editable:false   , inTable:false, clientSide:'accionesBlanqueo'},
        {name:"visible_en_asignacion" , typeName: "boolean"    , editable:false   , inTable:false, visible:false, defaultDbValue:'false' },
        {name:"visible_en_recepcion"  , typeName: "boolean"    , editable:false   , inTable:false, visible:false, defaultDbValue:'true' },
    );
    return tableDef
}

export function checkMyActions(tableDef:TableDefinition, myField:string){
    tableDef.sql!.from=`(select * from (${tableDef.sql!.from}) aux
        , lateral (
            select jsonb_agg(z.*) as acciones
                from (
                    select ea.*, ac.path_icono_svg, ac.desactiva_boton
                        from estados_acciones ea join acciones ac using (operativo, eaccion)
                        where ea.operativo = aux.operativo and ea.tarea = aux.tarea and ea.estado = aux.estado and ac.${myField}
                        and accion_cumple_condicion(aux.operativo, ea.estado, aux.enc, aux.tarea, ea.eaccion,ea.condicion)
                ) z
            ) y
        )`
}

export function tareas_tem_asignables(context:TableContext):TableDefinition {
    var tableDef = tareas_tem(context);
    tableDef.name = `tareas_tem_asignables`;
    tableDef.filterColumns=[
        {column:'visible_en_asignacion', operator:'=', value:true}
    ];
    addButtons(tableDef);
    tableDef.fields.splice(14,0,
        {name:"habilitar"                   , typeName: "boolean"    , editable:false   , inTable:false, clientSide:'habilitar'},
    );
    tableDef.hiddenColumns=['cargado_dm','notas', 'acciones'];
    checkMyActions(tableDef,'asigna');
    return tableDef
}

