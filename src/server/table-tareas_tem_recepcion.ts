"use strict";

import {TableDefinition, TableContext, FieldDefinition, getDomicilioFields} from "./types-dmencu";

import {tareas_tem, OptsTareasTem, getReaFields} from "./table-tareas_tem";

export var getSqlFrom = (tableDef:TableDefinition, opts:{desde:'ingresa'|'recepciona'|'fin_campo'|'analisis_campo'|'procesa'})=> `(select * from (${tableDef.sql!.from}) aux
, lateral (
    select jsonb_agg(z.*) as acciones
        from (
            select ea.*, ac.path_icono_svg, ac.desactiva_boton, ac.confirma
                from estados_acciones ea join acciones ac using (operativo, eaccion)
                where ea.operativo = aux.operativo and ea.estado = aux.estado and ac.${opts.desde}
                and accion_cumple_condicion(aux.operativo, ea.estado, aux.enc, ea.eaccion, ea.condicion)
            order by ac.eaccion
        ) z
    ) y
)`

export function tareas_tem_recepcion(context:TableContext, opts?:OptsTareasTem):TableDefinition {
    var tableDef = tareas_tem(context, opts);
    tableDef.name = `tareas_tem_recepcion`;
    var puedeEditar = context.forDump || context.puede?.campo?.administrar||context.user.rol==='recepcionista';       
    var reaFieldNames = getReaFields(puedeEditar).map((field:FieldDefinition)=>field.name);
    tableDef.fields = tableDef.fields.filter((field)=>!reaFieldNames.includes(field.name));
    tableDef.fields.splice(4,0,
        {name:"acciones"                    , typeName: 'jsonb'      , editable:false   , inTable:false},
        {name:"acciones_avance"             , typeName: 'text'       , editable:false   , inTable:false, clientSide:'accionesAvance'},
        {name:"acciones_retroceso"          , typeName: 'text'       , editable:false   , inTable:false, clientSide:'accionesRetroceso'},
        //{name:"acciones_blanqueo"           , typeName: 'text'       , editable:false   , inTable:false, clientSide:'accionesBlanqueo'},
        {name:"visible_en_recepcion"        , typeName: "boolean"    , editable:false   , inTable:false, visible:false},
        {name:"visible_en_ingreso"          , typeName: "boolean"    , editable:false   , inTable:false, visible:false},
        {name:"visible_en_fin_campo"        , typeName: "boolean"    , editable:false   , inTable:false, visible:false},
        {name:"visible_en_analisis_campo"   , typeName: "boolean"    , editable:false   , inTable:false, visible:false},
        {name:"visible_en_procesamiento"    , typeName: "boolean"    , editable:false   , inTable:false, visible:false},
        ...getReaFields(puedeEditar)
    );
    tableDef.fields.forEach((field:FieldDefinition)=>{
        if(!field.table){
            field.table='tareas_tem'
        }
    });
    tableDef.primaryKey = ['operativo','enc','tarea'];
    tableDef.filterColumns=[
        {column:'visible_en_recepcion', operator:'=', value:true}
    ];
    tableDef.hiddenColumns=['tarea','cargado_dm','notas', 'acciones','fecha_asignacion', 'estados__permite_editar_encuesta'];
    tableDef.refrescable = true;
    tableDef.selfRefresh = true;
    tableDef.sql!.isTable = false;
    tableDef.sql!.from=getSqlFrom(tableDef,{desde:"recepciona"});
    tableDef.sql!.where = `"tem".tarea_actual="tareas_tem".tarea`;
    return tableDef
}
