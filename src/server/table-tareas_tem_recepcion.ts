"use strict";

import {TableDefinition, TableContext, FieldDefinition, getDomicilioFields} from "./types-dmencu";

import {tareas_tem, OptsTareasTem, getReaFields} from "./table-tareas_tem";
import { table } from "console";

var getSqlFrom = (tableDef:TableDefinition, opts:{desde:'ingresa'|'recepciona'})=> `(select * from (${tableDef.sql!.from}) aux
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
    tableDef.sql!.isTable = false;
    tableDef.sql!.from=getSqlFrom(tableDef,{desde:"recepciona"});
    tableDef.sql!.where = `"tem".tarea_actual="tareas_tem".tarea`;
    return tableDef
}

export function tareas_tem_ingreso(context:TableContext):TableDefinition {
    let tableDef = tareas_tem_recepcion(context)
    tableDef.name = `tareas_tem_ingreso`;
    tableDef.filterColumns=[
        {column:'visible_en_ingreso', operator:'=', value:true}
    ];
    tableDef.fields = tableDef.fields.filter((field:FieldDefinition)=>!['abrir', 'consistir'].includes(field.name));
    var domicilioFieldNames = getDomicilioFields().map((field:FieldDefinition)=>field.name);
    tableDef.fields = tableDef.fields.filter((field)=>!domicilioFieldNames.includes(field.name));
    tableDef.fields.splice(4,0,
        {name:'telefono'         , typeName:'text'        , editable: false },
        ...getDomicilioFields().filter((field:FieldDefinition)=>!['codcalle'].includes(field.name)));
    var tableDefTT = tareas_tem(context);
    tableDef.sql!.from=getSqlFrom(tableDefTT,{desde:"ingresa"});
    return tableDef;
}

export function tareas_tem_recepcion_encu(context:TableContext):TableDefinition {
    return tareas_tem_recepcion(context, {rol:'encu', name:'encuestador'})
}

export function tareas_tem_recepcion_recu(context:TableContext):TableDefinition {
    return tareas_tem_recepcion(context, {rol:'recu', name:'recuperador'})
}

export function tareas_tem_recepcion_supe(context:TableContext):TableDefinition {
    return tareas_tem_recepcion(context, {rol:'supe', name:'supervisor'})
}
