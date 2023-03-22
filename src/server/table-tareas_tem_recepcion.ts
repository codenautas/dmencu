"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-dmencu";

import {tareas_tem} from "./table-tareas_tem";

export function addButtonsAndSetDefinition(tableDef:TableDefinition){
    tableDef.fields.splice(4,0,
        {name:"acciones"                    , typeName: 'jsonb'      , editable:false   , inTable:false},
        {name:"acciones_avance"             , typeName: 'text'       , editable:false   , inTable:false, clientSide:'accionesAvance'},
        {name:"acciones_retroceso"          , typeName: 'text'       , editable:false   , inTable:false, clientSide:'accionesRetroceso'},
        {name:"acciones_blanqueo"           , typeName: 'text'       , editable:false   , inTable:false, clientSide:'accionesBlanqueo'},
        {name:"visible_en_asignacion" , typeName: "boolean"    , editable:false   , inTable:false, visible:false},
        {name:"visible_en_recepcion"  , typeName: "boolean"    , editable:false   , inTable:false, visible:false},
    );
    tableDef.fields.forEach((field:FieldDefinition)=>field.table='tareas_tem');
    //tableDef.selfRefresh = true;
    tableDef.refrescable = true;
    tableDef.primaryKey = ['operativo','enc'];
    tableDef.sql.isTable = false;
    return tableDef
}

export function checkMyActions(tableDef:TableDefinition, myField:string){
    tableDef.sql!.from=`(select * from (${tableDef.sql!.from}) aux
        , lateral (
            select jsonb_agg(z.*) as acciones
                from (
                    select ea.*, ac.path_icono_svg, ac.desactiva_boton, ac.confirma
                        from estados_acciones ea join acciones ac using (operativo, eaccion)
                        where ea.operativo = aux.operativo and ea.estado = aux.estado and ac.${myField}
                        and accion_cumple_condicion(aux.operativo, ea.estado, aux.enc, ea.eaccion, ea.condicion)
                    order by ac.eaccion
                ) z
            ) y
        )`
}

export function tareas_tem_recepcion(context:TableContext):TableDefinition {
    var tableDef = tareas_tem(context);
    tableDef.name = `tareas_tem_recepcion`;
    addButtonsAndSetDefinition(tableDef);
    tableDef.filterColumns=[
        {column:'visible_en_recepcion', operator:'=', value:true}
    ];
    tableDef.hiddenColumns=['cargado_dm','notas', 'acciones','fecha_asignacion'];
    checkMyActions(tableDef,'recepciona');
    return tableDef
}

