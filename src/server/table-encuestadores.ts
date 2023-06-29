"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

import { cuentasSql, cuentasFields } from "./table-areas";  

export type OptsAsignados = {
    rol: 'encu'|'recu'|'supe'|null
    name: string
    verComoRecepcionista: boolean
}

export function asignados(context:TableContext, opts?:OptsAsignados){
    if (opts == null) {
        opts = {
            name: 'relevador',
            rol: null,
            verComoRecepcionista: false
        }
    }
    var { be } = context;
    var q = context.be.db.quoteLiteral;
    //si no chequeo !dump rompe el dump
    var esRecepcionista = context.user.rol == 'recepcionista' || (context.user.usuario!='!dump'?opts.verComoRecepcionista:false);
    var tableDef: TableDefinition = {
        name: opts.name,
        elementName: opts.name,
        editable: false,
        fields: [
            {name:'tarea'                , typeName:'text'     ,},
            {name:'asignado'             , typeName:'text'     , title: opts.name},
            {name:'apellido'             , typeName:'text'     ,},
            {name:'nombre'               , typeName:'text'     ,},
            ...cuentasFields(be)
        ],
        primaryKey: ['asignado'],
        detailTables:[
            {table:'tareas_tem_recepcion', fields:['tarea', 'asignado'], abr:'T'}
        ],
        sql:{
            from:`(select ta.tarea, u.idper as asignado, u.apellido, u.nombre, t.*
                from usuarios u, tareas ta, lateral (
                    ${cuentasSql(be, `tt.asignado = u.idper and tt.tarea = ta.tarea ${esRecepcionista ? `and 'tt.recepcionista' = ${q(context.user.idper)}` : `` } `)}
                ) t
                where totales > 0  
                    ${opts.rol ? `and ta.tarea = ${q(opts.rol)}` : `` }
            )`
        },
        hiddenColumns: opts.rol ? ['tarea'] : []
    }
    return tableDef;
}

export function encuestadores_asignados(context:TableContext):TableDefinition {
    return asignados(context, {rol:'encu', name:'encuestador', verComoRecepcionista:false})    
}

export function recuperadores_asignados(context:TableContext):TableDefinition {
    return asignados(context, {rol:'recu', name:'recuperador', verComoRecepcionista:false})
}

export function supervisores_asignados(context:TableContext):TableDefinition {
    return asignados(context, {rol:'supe', name:'supervisor', verComoRecepcionista:false})    
}

export function mis_supervisores_asignados(context:TableContext):TableDefinition {
    return asignados(context, {rol:'supe', name:'supervisor', verComoRecepcionista:true})    
}