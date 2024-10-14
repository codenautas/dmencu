"use strict";

import { ProcedureDef, TableDefinition, Client, TableDefinitions } from "./types-dmencu";
import { ProcedureContext, CoreFunctionParameters, ForeignKey } from "meta-enc";
import * as likeAr from "like-ar";
export * from "./types-dmencu";
import { IdUnidadAnalisis, UnidadAnalisis, EstadoAccion, IdEnc, IdTarea, RespuestasRaiz, IdOperativo, IdCarga } from "../unlogged/tipos";

import {OperativoGenerator } from "procesamiento";

import {json, jsono} from "pg-promise-strict";

import {changing, date, coalesce } from 'best-globals';
import {promises as  fs} from "fs";

import * as ExpresionParser from 'expre-parser';
import { tareas } from "./table-tareas";
import { prependListener } from "process";
import { getDiasAPasarQuery } from "./table-tareas_tem";
import { error } from "console";
import { Context } from "vm";

var path = require('path');
var sqlTools = require('sql-tools');

var discrepances = require('discrepances');

const formPrincipal = 'F:F1';

const ESTADO_POSTERIOR_CARGA = 'C';
const ESTADO_POSTERIOR_DESCARGA = 'D';
const OPERACION_PREPARAR_CARGA = 'cargar';
const OPERACION_PREPARAR_DESCARGA = 'descargar';
const DEFAULT_DOMINIO = 3;

export type generarIdEncFun = (area:number,index:number)=>string

var generarIdEncFun: generarIdEncFun;  

var maxAGenerar = 50

var maxAEncPorArea = 100

export const setGenerarIdEncFun = (fun:generarIdEncFun)=>
    generarIdEncFun = fun;

export const setMaxAgenerar = (max:number)=>
    maxAEncPorArea = max;

export const setMaxEncPorArea = (max:number)=>
    maxAGenerar = max;

setGenerarIdEncFun((area:number,index:number)=>area.toString() + (index+10).toString());

setMaxAgenerar(100);

export const getOperativoActual = async (context:ProcedureContext)=>{
    var be = context.be;
    var operativo = (await context.client.query(
        `select operativo
            from parametros
            where unico_registro`
        ,[]
    ).fetchUniqueValue()).value
    if(operativo){
        return operativo
    }else{
        throw Error ('no se configuró un operativo en la tabla parámetros');
    }
}

async function getDefaultTarea(context: ProcedureContext) {
    return (await context.client.query(`
        select * 
            from tareas 
            where es_inicial
    `).fetchUniqueRow()).row;
}

async function persistirEncuestaAutogeneradaEnDM(context: ProcedureContext, OPERATIVO: IdOperativo, area: number, encAutogeneradoDm: string, token: string, respuestasRaiz: RespuestasRaiz, recepcionista: string, asignado: string):Promise<IdEnc>{
    let idEnc = null;
    var permite_generar_muestra = (await context.client.query(`
        select permite_generar_muestra 
            from operativos 
            where operativo = $1
    `, [OPERATIVO]).fetchUniqueValue()).value;
    if (permite_generar_muestra) {
        let i = (await context.client.query(
            `select count(*) as total
                from tem
                where operativo= $1 and area = $2`,
            [OPERATIVO, area]
        ).fetchUniqueValue()).value;
        console.log(i);
        const defaultTarea = await getDefaultTarea(context);
        let enc = generarIdEncFun(area, i);
        const resultInsertTem = await context.client.query(`
            INSERT into tem (
                operativo,
                enc,
                area,
                dominio,
                habilitada,
                enc_autogenerado_dm,
                token_autogenerado_dm,
                tarea_actual,
                json_backup,
                json_encuesta, 
                fecha_backup
            ) 
                values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, current_timestamp)
                on conflict (enc_autogenerado_dm, token_autogenerado_dm) do nothing
                returning *
        `,[
            OPERATIVO,
            enc,
            area,
            DEFAULT_DOMINIO,
            true,
            encAutogeneradoDm,
            token,
            defaultTarea.tarea,
            respuestasRaiz,
            respuestasRaiz,
        ]).fetchOneRowIfExists();
        if(resultInsertTem.rowCount == 0){
            idEnc = (await context.client.query(`
                UPDATE tem 
                    set (json_backup, json_encuesta, fecha_backup) = 
                        ($4, $5, current_timestamp)
                    where (operativo = $1 and enc_autogenerado_dm = $2 and token_autogenerado_dm = $3)
                    returning *
            `,[OPERATIVO, encAutogeneradoDm, token, respuestasRaiz, respuestasRaiz]).fetchUniqueRow()).row.enc;
        }
        await generarTareasTemFaltantes(context, OPERATIVO);
        if (resultInsertTem.rowCount == 1) {
            idEnc = resultInsertTem.row.enc;
            await context.client.query(`
                update tareas_tem
                    set recepcionista = $4, asignado = $5
                    where operativo= $1 and enc = $2 and tarea = $3
                returning *
            `,[OPERATIVO, resultInsertTem.row.enc, defaultTarea.tarea, recepcionista, asignado]).fetchUniqueRow();
            await context.client.query(`
                update tareas_tem
                    set cargado_dm = $4, estado = $5, operacion = $6
                    where operativo= $1 and enc = $2 and tarea = $3
                returning *
            `,[OPERATIVO, resultInsertTem.row.enc, defaultTarea.tarea, token, ESTADO_POSTERIOR_CARGA, OPERACION_PREPARAR_CARGA]
            ).fetchUniqueRow();
        }
    }
    return idEnc
}

/*definición de estructura completa, cuando exista ing-enc hay que ponerlo ahí*/ 
type EstructuraTabla={tableName:string, pkFields:{fieldName:string}[], childTables:EstructuraTabla[]};
function createStructure(context:ProcedureContext, tableName:string){
    var be = context.be;
    var mainTableDef:TableDefinition = be.tableStructures[tableName](context);
    var getPkFromTableDef = function getPkFromTableDef(tableDef:TableDefinition){
        return tableDef.primaryKey.map(function(pk){
            return {fieldName:pk};
        })
    };
    var getFkFromTableDef = function getFkFromTableDef(tableDef:TableDefinition, parentTableName: string){
        // return tableDef.foreignKeys? tableDef.foreignKeys.map(fk=>fk.fields): [];
        let parentFk = (<ForeignKey[]> tableDef.foreignKeys).find(fk=>fk.references == parentTableName);
        return parentFk? parentFk.fields: [];
    }
    var struct:EstructuraTabla={
        tableName:mainTableDef.name,
        pkFields:getPkFromTableDef(mainTableDef),
        childTables:[]
    };
    if(mainTableDef.detailTables && mainTableDef.detailTables.length){
        mainTableDef.detailTables.forEach(function(detailTable){
            struct.childTables.push(
                changing(
                    createStructure(context, detailTable.table),
                    {fkFields: getFkFromTableDef(be.tableStructures[detailTable.table](context), tableName)}
                )
            );
        })
    }
    return struct;
}
/* fin definicion estructura completa */

type AnyObject = {[k:string]:any}

var getSettersAndParametersForReaNoReaResumenEstado = (funParams:{tarea:IdTarea, respuestasUAPrincipal:RespuestasRaiz, setters:string[], params:any[]})=>{
    let {tarea,respuestasUAPrincipal,setters,params} = funParams;
    let {resumenEstadoSup, codNoReaSup, codReaSup, resumenEstado, codNoRea, codRea} = respuestasUAPrincipal;
    setters = setters.concat([
        `resumen_estado${tarea=='supe'?'_sup':''}=$${params.length+1}`,
        `norea${tarea=='supe'?'_sup':''}=$${params.length+2}`,
        `rea${tarea=='supe'?'_sup':''}=$${params.length+3}`
    ])
    params = params.concat([
        tarea=='supe'?resumenEstadoSup:resumenEstado,
        tarea=='supe'?codNoReaSup:codNoRea,
        tarea=='supe'?codReaSup:codRea
    ]);
    return {setters,params}
}

var guardarEncuestaEnTem = async (context:ProcedureContext, operativo:IdOperativo, idEnc:IdEnc, respuestasUAPrincipal:RespuestasRaiz, tarea:IdTarea)=>{
    var {params,setters} = getSettersAndParametersForReaNoReaResumenEstado({
        tarea,
        respuestasUAPrincipal,
        setters: [`json_encuesta = $3`, `fecha_modif_encuesta = current_timestamp`],
        params: [operativo, idEnc, respuestasUAPrincipal]
    })
    return await context.client.query(
        `update tem
            set ${setters.join(',')}
            where operativo= $1 and enc = $2
            returning 'ok'`
        ,
        params
    ).fetchUniqueRow();
}

var simularGuardadoDeEncuestaDesdeAppEscritorio = async (context: ProcedureContext ,operativo: string, enc: IdEnc, tarea: IdTarea, json_encuesta:any )=>{
    var be = context.be;
    const UA_PRINCIPAL = (await getUAPrincipal(context.client, operativo)).unidad_analisis;
    return await be.procedure.dm_forpkraiz_descargar.coreFunction(
        context, 
        {
            operativo:operativo, 
            persistentes:{
                respuestas:{
                    [UA_PRINCIPAL]: {
                        [enc]: json_encuesta
                    }
                },
                informacionHdr:{
                    [enc]: {
                        tarea: {
                            tarea
                        }
                    }
                }
            }
        }
    )
}

var getHdrQuery =  function getHdrQuery(quotedCondViv:string, context:ProcedureContext, unidadAnalisisPrincipal:IdUnidadAnalisis, permiteGenerarMuestra:boolean){
    return `
    with ${context.be.db.quoteIdent(unidadAnalisisPrincipal)} as 
        (select t.enc, t.json_encuesta as respuestas, t.resumen_estado as "resumenEstado", 
            jsonb_build_object(
                'dominio'       , dominio       ,
                'nomcalle'      , nomcalle      ,
                'sector'        , sector        ,
                'edificio'      , edificio      ,
                'entrada'       , entrada       ,
                'nrocatastral'  , nrocatastral  ,
                'piso'          , piso          ,
                'departamento'  , departamento  ,
                'habitacion'    , habitacion    ,
                'casa'          , casa          ,
                'prioridad'     , reserva+1     ,
                'observaciones' , tt.carga_observaciones ,
                'cita'          , cita ,
                'carga'         , t.area         
            ) as tem, t.area,
            --TODO: GENERALIZAR
            jsonb_build_object(
                'tarea', tt.tarea,
                'fecha_asignacion', fecha_asignacion,
                'asignado', asignado,
                'main_form', main_form
            ) as tarea,
            min(fecha_asignacion) as fecha_asignacion
            from tem t left join tareas_tem tt on (t.operativo = tt.operativo and t.enc = tt.enc and t.tarea_actual = tt.tarea)
                       left join tareas ta on t.tarea_actual = ta.tarea
            where t.habilitada and ${quotedCondViv}
            group by t.enc, t.json_encuesta, t.resumen_estado, dominio, nomcalle,sector,edificio, entrada, nrocatastral, piso,departamento,habitacion,casa,reserva,tt.carga_observaciones, cita, t.area, tt.tarea, fecha_asignacion, asignado, main_form
        )
        select jsonb_build_object(
                ${context.be.db.quoteLiteral(unidadAnalisisPrincipal)}, ${jsono(
                    `select enc, respuestas, jsonb_build_object('resumenEstado',"resumenEstado") as otras from ${context.be.db.quoteIdent(unidadAnalisisPrincipal)}`,
                    'enc',
                    `otras || coalesce(respuestas,'{}'::jsonb)`
                )}
            ) as respuestas,
            ${json(`
                select a.area as carga, observaciones_hdr as observaciones, min(fecha_asignacion) as fecha, ta.recepcionista
                    from ${context.be.db.quoteIdent(unidadAnalisisPrincipal)} aux inner join areas a using (area) inner join tareas_areas ta on (a.area = ta.area and aux.tarea->>'tarea' = ta.tarea)
                    group by a.area, observaciones_hdr, ta.recepcionista 
                ${permiteGenerarMuestra?`
                    union -- este union permite visualizar areas asignadas sin encuestas generadas
                    select area as carga, null as observaciones, null as fecha, recepcionista
                        from tareas_areas where asignado = ${context.be.db.quoteLiteral(context.user.idper)} and tarea = 'encu'`:''}
                `,'fecha')} as cargas,
            ${jsono(
                `select enc, jsonb_build_object('tem', tem, 'tarea', tarea) as otras from ${context.be.db.quoteIdent(unidadAnalisisPrincipal)}`,
                 'enc',
                 `otras ||'{}'::jsonb`
                )}
            as "informacionHdr"
`
}

export var setHdrQuery = (myFun:(quotedCondViv:string, context:ProcedureContext, unidadAnalisisPrincipal:IdUnidadAnalisis, permiteGenerarMuestra:boolean)=>string)=> getHdrQuery=myFun

const getUAPrincipal = async (client:Client, operativo:string)=>
    (await client.query(
        `select *
            from unidad_analisis
            where operativo= $1 and principal
        `
        ,
        [operativo]
    ).fetchUniqueRow()).row

var funcionesConocidas:{[k in string]:boolean} = {}

var compiler = new ExpresionParser.Compiler({
    language:'js',
    varWrapper:(var_name:string)=>`helpers.null2zero(valores.${var_name})`,
    funWrapper:(functionName:string)=>{
        if(!funcionesConocidas[functionName]){
            console.log(functionName)
            funcionesConocidas[functionName] = true;
        }
        return `helpers.funs.${functionName}`
    }
})

type CasilleroDeAca={
    childs: CasilleroDeAca[],
    data:{
        expresion_habilitar: string
        expresion_habilitar_js: string
        especial: any
        expresion_autoingresar_js: string
    }
}

function compilarExpresion(expresion:string){
    return compiler.toCode(ExpresionParser.parse(
        expresion
            .replace(/\bis distinct from\b/gi,' <> ')
            .replace(/!!/gi,' ')
    )).replace(/helpers\.funs\.blanco\(helpers.null2zero\(/g,'helpers.funs.blanco((')
    .replace(/helpers\.funs\.informado\(helpers.null2zero\(/g,'helpers.funs.informado((');
}

function compilarExpresiones(casillero:CasilleroDeAca){
    if(!casillero){ return }
    if(casillero.data.expresion_habilitar){
        casillero.data.expresion_habilitar_js = compilarExpresion(casillero.data.expresion_habilitar);
    }
    if(casillero.data.especial?.autoing){
        var partes = casillero.data.especial?.autoing.split('=>');
        if(partes.length>1){
            var precondicion = partes[0];
            var valor = partes.slice(1).join('=>');
            casillero.data.expresion_autoingresar_js = `(${compilarExpresion(precondicion)})?(${compilarExpresion(valor)}):null`;
        }else{
            casillero.data.expresion_autoingresar_js = compilarExpresion(partes[0]);
        }
    }
    for(var casilleroInterno of casillero.childs) compilarExpresiones(casilleroInterno);
}

const generarEncuestaTem = async (context: ProcedureContext, operativo: IdOperativo, i: number, area: number, dominio: number, tarea_actual:IdTarea) => {
    let enc = generarIdEncFun(area, i);
    await context.client.query(`
        INSERT into tem (operativo, enc, area, dominio, habilitada, tarea_actual) values ($1, $2, $3, $4, $5, $6)
            on conflict (operativo, enc) do nothing`,
    [operativo, enc, area, dominio, true, tarea_actual]).execute();
}

const generarTareasTemFaltantes = async (context: ProcedureContext, operativo: IdOperativo) => {
    await context.client.query(`
        insert into tareas_tem (operativo, enc, tarea)
            select ta.operativo, ta.enc, ta.tarea
            from (select ta.*, t.enc,t.area from tareas ta, tem t where ta.operativo=t.operativo) ta 
            where ta.operativo = $1 
                and not (ta.operativo, ta.enc, ta.tarea) in (select operativo, enc, tarea from tareas_tem)
            order by 1,3,2;
    `,[operativo]).execute();
}

export const ACCION_PASAR_PROIE = 'encuestas_procesamiento_pasar';
export const ProceduresDmEncu : ProcedureDef[] = [
    {
        action:'operativo_estructura_completa',
        parameters:[
            {name:'operativo'            ,typeName:'text', references:'operativos'},
        ],
        resultOk:'desplegarFormulario',
        coreFunction:async function(context:ProcedureContext, parameters:CoreFunctionParameters){
            var be = context.be;
            var result = await context.client.query(
                `select casilleros_jerarquizados($1) as formularios, 
                    ${jsono(`select unidad_analisis, padre, pk_agregada, '{}'::jsonb as hijas from unidad_analisis where operativo = $2`, 'unidad_analisis')} as unidades_analisis
                `,
                [parameters.operativo, parameters.operativo]
            ).fetchUniqueRow();
            likeAr(result.row.formularios).forEach(f=>compilarExpresiones(f));
            // Hermanos son los formularios que están implantados en otro formulario de la misma UA. Por ejemplo el A1 en el S1
            var resultHermanos = await context.client.query(`
select o.id_casillero as id_formulario, o.unidad_analisis, 'BF_'||o.casillero boton, bf.casillero, bf.padre, fp.casillero, fp.unidad_analisis
  from casilleros o left join casilleros bf
    on bf.tipoc='BF'
	and bf.casillero = 'BF_'||o.casillero
	and bf.operativo = o.operativo
	left join casilleros fp
	  on fp.id_casillero = bf.padre
	  and fp.operativo = bf.operativo
  where o.tipoc = 'F'
    and o.unidad_analisis = fp.unidad_analisis
	and o.operativo = $1`,
                [parameters.operativo]
            ).fetchAll();
            resultHermanos.rows.forEach(row=>{
                result.row.formularios[row.id_formulario].data.hermano = true;
            })
            function completarUA(ua:UnidadAnalisis, idUa:IdUnidadAnalisis, uAs:{[k in IdUnidadAnalisis]: UnidadAnalisis}){
                if(ua.padre){
                    uAs[ua.padre].hijas[idUa] = ua;
                }else{
                    ua.principal=true;
                }
            }
            likeAr(result.row.unidades_analisis).forEach((ua, idUa)=>
                completarUA(ua, idUa as IdUnidadAnalisis, result.row.unidades_analisis)
            )
            var {
                con_rea_hogar: conReaHogar, 
                config_sorteo: configSorteo, 
                habilitacion_boton_formulario:habilitacionBotonFormulario,
                permite_generar_muestra: permiteGenerarMuestra
            } = (await context.client.query(`
                select config_sorteo, con_rea_hogar, habilitacion_boton_formulario, permite_generar_muestra 
                    from operativos 
                    where operativo = $1
            `,[parameters.operativo]).fetchUniqueRow()).row;
            let compilarExpresionesDominios = (expresionesDominio:any)=> 
                likeAr(expresionesDominio)
                    .map((expr,dominio)=>({dominio, expr:compilarExpresion(expr.expr)}))
                    .plain();
            if(configSorteo){
                likeAr(configSorteo).forEach((configSorteoFormulario)=>{
                    configSorteoFormulario.expr_incompletitud_js=compilarExpresionesDominios(configSorteoFormulario.expr_incompletitud)
                    configSorteoFormulario.filtro_js=compilarExpresionesDominios(configSorteoFormulario.filtro)
                })
            }
            if(habilitacionBotonFormulario){
                likeAr(habilitacionBotonFormulario).forEach((form)=>{
                    form.expr_habilitar_boton_js=compilarExpresion(form.expr_habilitar_boton)
                })
            }
            var defaultTarea = await getDefaultTarea(context);
            var defaultInformacionHdr = (await context.client.query(
                `select  
                    jsonb_build_object(
                    'dominio'       , ${context.be.db.quoteLiteral(DEFAULT_DOMINIO)},
                    'nomcalle'      , null          ,
                    'sector'        , null          ,
                    'edificio'      , null          ,
                    'entrada'       , null          ,
                    'nrocatastral'  , null          ,
                    'piso'          , null          ,
                    'departamento'  , null          ,
                    'habitacion'    , null          ,
                    'casa'          , null          ,
                    'prioridad'     , null          ,
                    'observaciones' , null          ,
                    'cita'          , null          ,
                    'carga'         , null         
                ) as tem,
                jsonb_build_object(
                    'tarea', ${context.be.db.quoteLiteral(defaultTarea.tarea)},
                    'fecha_asignacion', null,
                    'asignado', ${context.be.db.quoteLiteral(context.user.idper)},
                    'main_form', ${context.be.db.quoteLiteral(defaultTarea.main_form)}
                ) as tarea
                `,
                []
            ).fetchUniqueRow()).row;
            var {unidad_analisis, pk_agregada} = (await getUAPrincipal(context.client, parameters.operativo));
            return {
                timestamp: be.caches.timestampEstructura, 
                ...result.row, 
                operativo:parameters.operativo, 
                conReaHogar, 
                configSorteo, 
                habilitacionBotonFormulario, 
                permiteGenerarMuestra, 
                noReas:be.caches.tableContent.no_rea, 
                noReasSup:be.caches.tableContent.no_rea_sup, 
                defaultInformacionHdr,
                uaPpal: unidad_analisis,
                pkAgregadaUaPpal: pk_agregada
            };
        }
    },
    {
        action:'generar_formularios',
        parameters:[
            {name:'annio', typeName:'integer', references:'annio'},
            {name:'mes'  , typeName:'integer', references:'mes'  },
            {name:'lote' , typeName:'integer', references:'lotes'},
        ],
        coreFunction:async function(context:ProcedureContext, parameters:CoreFunctionParameters){
            var be=context.be;
            const OPERATIVO = await getOperativoActual(context);
            let resultUA = await context.client.query(
                `select *
                   from unidad_analisis
                   where principal = true and operativo = $1
                `,
                [OPERATIVO]
            ).fetchOneRowIfExists();
            if (resultUA.rowCount === 0){
                throw new Error('No se configuró una unidad de analisis como principal');
            }
            let row = resultUA.row;
            let resultPreguntas = await be.procedure.preguntas_ua_traer.coreFunction(context, row)
            var contenedorVacio:{[key:string]:any} = {};
            resultPreguntas.forEach(function(defPregunta){
                contenedorVacio[defPregunta.var_name] = defPregunta.unidad_analisis?[]:null;
            });
            contenedorVacio.annio= parameters.annio;
            contenedorVacio.mes  = parameters.mes  ;
            contenedorVacio.lote = parameters.lote ;
            
            var result = await context.client.query(
                `select debe_haber.id_caso, s as id
                    from (select lote, armar_id(annio, mes, lote, s) as id_caso, s
                        from (select annio,mes,lote, cant_cues from lotes where (annio,mes,lote)=($2,$3,$4)) r, lateral generate_series(1,cant_cues) s
                    ) debe_haber left join defgen hay on hay.id_caso = debe_haber.id_caso and hay.operativo=$1
                    where hay.id_caso is null`,
                [ OPERATIVO, parameters.annio, parameters.mes, parameters.lote]
            ).fetchAll();
            var params = {operativo: OPERATIVO};
            for(var i=0; i < result.rowCount; i++){
                await be.procedure.caso_guardar.coreFunction(
                    context, 
                    changing(params,{id_caso:result.rows[i].id_caso, datos_caso:changing(contenedorVacio,{id:result.rows[i].id})})
                )
            }
            return {agregadas:result.rowCount}
        }
    },
    {
        action:'upload_file',
        progress: true,
        parameters:[
            {name: 'id_adjunto', typeName: 'integer'},
            {name: 'nombre', typeName: 'text'},
        ],
        files:{count:1},
        coreFunction:function(context:ProcedureContext, parameters:CoreFunctionParameters, files){
            let be=context.be;
            let client=context.client;
            context.informProgress({message:be.messages.fileUploaded});
            let file = files[0]
            let ext = path.extname(file.path).substr(1);
            let originalFilename = file.originalFilename.slice(0,-(ext.length+1));
            let filename= parameters.nombre || originalFilename;
            let newPath = 'local-attachments/file-';
            var createResponse = function createResponse(adjuntoRow){
                let resultado = {
                    message: 'La subida se realizó correctamente (update)',
                    nombre: adjuntoRow.nombre,
                    nombre_original: adjuntoRow.nombre_original,
                    ext: adjuntoRow.ext,
                    fecha: adjuntoRow.fecha,
                    hora: adjuntoRow.hora,
                    id_adjunto: adjuntoRow.id_adjunto
                }
                return resultado
            }
            var moveFile = function moveFile(file, id_adjunto, extension){
                fs.move(file.path, newPath + id_adjunto + '.' + extension, { overwrite: true });
            }
            return Promise.resolve().then(function(){
                if(parameters.id_adjunto){
                    return context.client.query(`update adjuntos set nombre= $1,nombre_original = $2, ext = $3, ruta = concat('local-attachments/file-',$4::text,'.',$3::text), fecha = now(), hora = date_trunc('seconds',current_timestamp-current_date)
                        where id_adjunto = $4 returning *`,
                        [filename, originalFilename, ext, parameters.id_adjunto]
                    ).fetchUniqueRow().then(function(result){
                        return createResponse(result.row)
                    }).then(function(resultado){
                        moveFile(file,resultado.id_adjunto,resultado.ext);
                        return resultado
                    });
                }else{
                    return context.client.query(`insert into adjuntos (nombre, nombre_original, ext, fecha, hora) values ($1,$2,$3,now(), date_trunc('seconds',current_timestamp-current_date)) returning *`,
                        [filename, originalFilename, ext]
                    ).fetchUniqueRow().then(function(result){
                        return context.client.query(`update adjuntos set ruta = concat('local-attachments/file-',id_adjunto::text,'.',ext)
                            where id_adjunto = $1 returning *`,
                            [result.row.id_adjunto]
                        ).fetchUniqueRow().then(function(result){
                            return createResponse(result.row)
                        }).then(function(resultado){
                            moveFile(file,resultado.id_adjunto,resultado.ext);
                            return resultado
                        });
                    });
                }
            }).catch(function(err){
                throw err;
            });
        }
    },
    {
        action:'caso_guardar',
        parameters:[
            {name:'operativo'   , typeName:'text', references:'operativos'},
            {name:'id_caso'     , typeName:'text'      },
            {name:'datos_caso'  , typeName:'jsonb'     },
        ],
        definedIn: 'dmencu',
        //@ts-ignore especifico el tipo de los parámetros
        coreFunction:async function(context:ProcedureContext, parameters:{
            operativo:string, 
            id_caso:string,
            datos_caso:AnyObject
        },newClient:Client){
            var {unidad_analisis, pk_agregada} = (await getUAPrincipal(context.client, parameters.operativo));
            var client=newClient || context.client;
            var datos_json=parameters.datos_caso;
            var be = context.be;
            var tableStructures_app:TableDefinitions = be.tableStructures;
        
            var struct_dmencu = createStructure(context, unidad_analisis);
            datos_json['operativo'] = parameters.operativo;
            
            datos_json[pk_agregada] = parameters.id_caso;
            function completar_ult_pk_en_arr( ult_pk, ua_arr){
                var con_pk_completa=ua_arr; 
                if (ua_arr && ua_arr.length>=1){
                    con_pk_completa= con_pk_completa.map((una_ua,i)=>{
                        una_ua[ult_pk]=i+1   
                        return una_ua;
                    })
                };
                return con_pk_completa
            }
            function recorrer_datos_agregando_pks(datosj) {
                for (var keyName in datosj) {
                    var datoK = datosj[keyName];
                    if (datoK instanceof Array && datoK.length >= 1) {
                        var pk = tableStructures_app[keyName](context).primaryKey;
                        var ult_pk = pk[pk.length - 1];
                        datoK = completar_ult_pk_en_arr(ult_pk, datoK);
                        datoK.forEach((elemI) => {
                            elemI=recorrer_datos_agregando_pks(elemI)
                        });
                    };                            
                    if (keyName.startsWith('$')||keyName.startsWith('_')) {
                        delete datosj[keyName];
                    }
                }
                return datosj;
            }            
            datos_json = recorrer_datos_agregando_pks(datos_json);
            delete datos_json.codRea;
            delete datos_json.codNoRea;
            delete datos_json.resumenEstado;
            delete datos_json.codReaSup;
            delete datos_json.codNoReaSup;
            delete datos_json.resumenEstadoSup;

            if( Object.keys(datos_json).length >2){
                var queries = sqlTools.structuredData.sqlWrite(datos_json, struct_dmencu);
                return await queries.reduce(function(promise, query){
                    return promise.then(function() {
                        return client.query(query).execute().then(function(result){
                            return 'ok';
                        });
                    });
                },Promise.resolve()).then(function(){
                    return "ok";
                }).catch(function(err:Error){
                    console.log("caso_guardar ENTRA EN EL CATCH: ",err)
                    throw err
                })
            }else{
                return 'vacio';
            }    
        }
    },
    {
        action: 'caso_traer',
        parameters: [
            //{name:'formulario'    ,                          typeName:'text'},
            {name:'operativo'     ,references:'operativos',  typeName:'text'},
            {name:'id_caso'       ,typeName:'text'},
        ],
        resultOk: 'goToEnc',
        definedIn: 'dmencu',
        coreFunction:async function(context:ProcedureContext, parameters:CoreFunctionParameters){
            var {unidad_analisis, pk_agregada} = (await getUAPrincipal(context.client, parameters.operativo));
            var client=context.client;
             var struct_dmencu = createStructure(context, unidad_analisis);
            var sql = sqlTools.structuredData.sqlRead({operativo: parameters.operativo, [pk_agregada]:parameters.id_caso}, struct_dmencu);
            var result = await client.query(sql).fetchUniqueValue();
            var response = {
                operativo: parameters.operativo,
                id_caso: parameters.id_caso,
                datos_caso: result.value,
                //formulario: formPrincipal,
            };
            return response;
        }
    },
    {
        action: 'caso_traer_o_crear',
        parameters: [
            {name:'operativo'     ,references:'operativos',  typeName:'text'},
            {name:'id_caso'       ,typeName:'text'},
        ],
        resultOk: 'goToEnc',
        // bitacora:{always:true},
        coreFunction:async function(context:ProcedureContext, parameters:CoreFunctionParameters){
            var be = context.be;
            try{
                var result = await be.procedure['caso_traer'].coreFunction(context, parameters);
                return result
            }catch(err){
                var json = await be.procedure['caso_preparar'].coreFunction(context, parameters);
                await be.procedure['caso_guardar'].coreFunction(context, changing(parameters, {datos_caso:json}));
                return await be.procedure['caso_traer'].coreFunction(context, parameters);
            }
        }
    },
    {
        action:'pasar_json2ua',
        parameters:[
        ],
        coreFunction:async function(context:ProcedureContext, _parameters:CoreFunctionParameters){
            /* GENERALIZAR: */
            var be=context.be;
            /* FIN-GENERALIZAR: */
            const OPERATIVO = await getOperativoActual(context);
            var {unidad_analisis, pk_agregada} = (await getUAPrincipal(context.client, OPERATIVO));
            let resultMain = await context.client.query(`SELECT * from ${be.db.quoteIdent(unidad_analisis)} LIMIT 1`).fetchAll();
            if(resultMain.rowCount>0){
                console.log('HAY DATOS',resultMain.rows)
                throw new Error('HAY DATOS. NO SE PUEDE INICIAR EL PASAJE');
            }
            let resultJson = await context.client.query(
                `SELECT operativo, enc id_caso, json_encuesta datos_caso from tem 
                    WHERE operativo=$1 and resumen_estado is distinct from 'vacio' and json_encuesta is not null 
                    order by enc `,
                [OPERATIVO]
            ).fetchAll();
            var procedureGuardar = be.procedure.caso_guardar;
            if(procedureGuardar.definedIn!='dmencu'){
                throw new Error('hay que sobreescribir caso_guardar');
            }
            return Promise.all(resultJson.rows.map(async function(row){
                let resultado = `id caso ${row.id_caso}: `;
                try{
                    await be.inTransaction(null, async function(client){
                        resultado+= await procedureGuardar.coreFunction(context, row, client);    
                    })
                }catch(err){
                    let errMessage = resultado + "json2ua error. "+ err ;
                    resultado = errMessage
                    console.log(errMessage)
                }     
                if(resultado.includes('ok')){ 
                    var {datos_caso, id_caso, operativo} = await be.procedure.caso_traer.coreFunction(context, {operativo:row.operativo, id_caso:row.id_caso})
                    var verQueGrabo = {datos_caso, id_caso, operativo}
                    try{
                        discrepances.showAndThrow(verQueGrabo,row)
                    }catch(err){
                        console.log(verQueGrabo,row)
                    }
                }
                return resultado;
            })).catch(function(err){
                throw err;
            }).then(function(result){
                return result;
            })
        }
    },
    {
        action:'dm_forpkraiz_cargar',
        parameters:[
            {name:'operativo'         , typeName:'text'},
            {name:'pk_raiz_value'           , typeName:'text'},
            {name:'tarea'             , typeName:'text', references:"tareas"},
        ],
        coreFunction:async function(context: ProcedureContext, parameters: CoreFunctionParameters){
            var be=context.be;
            var {operativo,pk_raiz_value, tarea} = parameters;
            var main_form = (await context.client.query(
                `select main_form
                    from tareas
                    where operativo= $1 and tarea=$2`
                ,
                [operativo, tarea]
            ).fetchUniqueValue()).value;
            var {unidad_analisis} = (await getUAPrincipal(context.client, parameters.operativo));
            var condviv= ` t.operativo= $1 and t.enc =$2`;
            var soloLectura = !!(await context.client.query(`select *
                    from tareas_tem join estados using (operativo, estado) --pk estado verificada
                    where operativo= $1 and enc = $2 and (
                        cargado_dm is not null or 
                        not permite_editar_encuesta and asignado <> ${context.be.db.quoteLiteral(context.user.idper)}
                    )`, [operativo, pk_raiz_value]).fetchOneRowIfExists()).rowCount;
            var permiteGenerarMuestra = (await context.client.query(`
                select permite_generar_muestra 
                    from operativos 
                    where operativo = $1
            `,[operativo]).fetchUniqueValue()).value;
            var {row} = await context.client.query(getHdrQuery(condviv, context, unidad_analisis, permiteGenerarMuestra),[operativo,pk_raiz_value]).fetchUniqueRow();
            row.informacionHdr[pk_raiz_value].tarea={
                tarea,
                main_form
            } ;
            return {
                ...row,
                operativo,
                soloLectura,
                idper:context.user.idper,
                cargas:likeAr.createIndex(row.cargas.map(carga=>({...carga, fecha:carga.fecha?date.iso(carga.fecha).toDmy():null})), 'carga'),
                timestampEstructura:be.caches.timestampEstructura
            };
        }
    },
    {
        action:'dm_forpkraiz_descargar',
        parameters:[
            {name:'operativo'         , typeName:'text'},
            {name:'persistentes'      , typeName:'jsonb'},
        ],
        coreFunction:async function(context: ProcedureContext, parameters: CoreFunctionParameters){
            var be=context.be;
            var {operativo, persistentes} = parameters;
            const UA_PRINCIPAL = (await getUAPrincipal(context.client, operativo)).unidad_analisis;
            await Promise.all(likeAr(persistentes.respuestas[UA_PRINCIPAL]).map(async (respuestasUAPrincipal,idEnc)=>{
                if(respuestasUAPrincipal.s1a1_obs == '!prueba de error al grabar!'){
                    throw new Error('DIO PRUEBA DE ERROR AL GRABAR');
                }
                await guardarEncuestaEnTem(context, operativo, idEnc, respuestasUAPrincipal, persistentes.informacionHdr[idEnc].tarea.tarea);
                //guardar paralelamente en tablas ua
                var procedureGuardar = be.procedure.caso_guardar;
                let resultado = `id enc ${idEnc}: `;
                let param_guardar={operativo: operativo,id_caso:idEnc, datos_caso:respuestasUAPrincipal}
                let errMessage: string|null;
                try{
                    await be.inTransaction(null, async function(client){
                        resultado+= await procedureGuardar.coreFunction(context, param_guardar, client);    
                    })
                }catch(err){
                    errMessage = resultado + "dm_forpkraiz_descargar. "+ err ;
                    resultado = errMessage
                    console.log(errMessage)
                }                
                await context.client.query(
                    `update tem
                        set pase_tabla= $3
                        where operativo= $1 and enc = $2
                        returning 'ok'`
                    ,
                    [operativo, idEnc, resultado]
                ).fetchUniqueRow();                

            }).array());
            return 'ok'
        }
    },
    {
        action:'dm_sincronizar',
        parameters:[
            {name:'persistentes'       , typeName:'jsonb'},
        ],
        coreFunction:async function(context: ProcedureContext, parameters: CoreFunctionParameters){
            const OPERATIVO = await getOperativoActual(context);
            var be=context.be;
            var {persistentes} = parameters;
            var num_sincro:number=0;
            var token:string=persistentes?.token || (await be.procedure.token_get.coreFunction(context, {
                useragent: context.session.req.useragent, 
                username: context.username
            })).token;
            var {value} = await context.client.query(`
                INSERT INTO sincronizaciones (token, usuario, datos)
                    VALUES ($1,$2,$3) 
                    RETURNING sincro
                `, [token, context.username, persistentes]
            ).fetchUniqueValue();
            num_sincro=value;
            var condviv= `
                        tt.operativo= $1 
                        and asignado = $2
                        and tt.operacion='cargar' 
                        and (tt.cargado_dm is null or tt.cargado_dm = ${context.be.db.quoteLiteral(token)})
            `;
            const {unidad_analisis:UA_PRINCIPAL, pk_agregada} = (await getUAPrincipal(context.client, OPERATIVO));
            if (persistentes) {
                for (let idEnc in persistentes.respuestas[UA_PRINCIPAL]) {
                    let respuestasUAPrincipal = persistentes.respuestas[UA_PRINCIPAL][idEnc];
                    let carga = persistentes.cargas[persistentes.informacionHdr[idEnc].tem.carga];
                    var tarea = persistentes.informacionHdr[idEnc].tarea.tarea;
                    if(Number(idEnc)<0){
                        idEnc = await persistirEncuestaAutogeneradaEnDM(context, OPERATIVO, carga.carga, idEnc, token, respuestasUAPrincipal, carga.recepcionista, context.user.idper);
                    }
                    var puedoGuardarEnTEM=true;
                    var {params,setters} = getSettersAndParametersForReaNoReaResumenEstado({
                        tarea,
                        respuestasUAPrincipal,
                        setters: [
                            `estado = ${context.be.db.quoteLiteral(ESTADO_POSTERIOR_DESCARGA)}`, 
                            `cargado_dm=null`
                        ],
                        params: [OPERATIVO, idEnc, tarea, token]
                    })
                    var queryTareasTem = await context.client.query(
                        `update tareas_tem
                            set ${setters.join(',')}
                            where operativo= $1 and enc = $2 and tarea = $3 and cargado_dm = $4
                            returning 'ok'`
                        ,
                        params
                    ).fetchOneRowIfExists();
                    puedoGuardarEnTEM=queryTareasTem.rowCount==1;
                    if(puedoGuardarEnTEM){
                        await guardarEncuestaEnTem(context, OPERATIVO, idEnc, respuestasUAPrincipal, tarea);
                        //guardar paralelamente en tablas ua
                        var procedureGuardar = be.procedure.caso_guardar;
                        let resultado = `id enc ${idEnc}: `;
                        let param_guardar={operativo: OPERATIVO,id_caso:idEnc, datos_caso:respuestasUAPrincipal}
                        let errMessage: string|null;
                        try{
                            await be.inTransaction(null, async function(client){
                                resultado+= await procedureGuardar.coreFunction(context, param_guardar, client);    
                            })
                        }catch(err){
                            errMessage = resultado + "dm_forpkraiz_descargar. "+ err ;
                            resultado = errMessage
                            console.log(errMessage)
                        }                
                        await context.client.query(
                            `update tem
                                set pase_tabla= $3
                                where operativo= $1 and enc = $2
                                returning 'ok'`
                            ,
                            [OPERATIVO, idEnc, resultado]
                        ).fetchUniqueRow();
                    }else{
                        await fs.appendFile('local-recibido-sin-token.txt', JSON.stringify({now:new Date(),user:context.username,idCaso: idEnc,[pk_agregada]: respuestasUAPrincipal})+'\n\n', 'utf8');
                    }
                }
  
            }
            var permiteGenerarMuestra = (await context.client.query(`
                select permite_generar_muestra 
                    from operativos 
                    where operativo = $1
            `,[OPERATIVO]).fetchUniqueValue()).value;
            var {row} = await context.client.query(getHdrQuery(condviv, context, UA_PRINCIPAL, permiteGenerarMuestra),[OPERATIVO,context.user.idper]).fetchUniqueRow();
            await context.client.query(
                `update tareas_tem tt
                    set  estado = $4, cargado_dm=$3::text
                    where ${condviv} 
                    returning enc`
                ,
                [OPERATIVO, parameters.enc?parameters.enc:context.user.idper, token, ESTADO_POSTERIOR_CARGA]
            ).fetchAll();
            return {
                ...row,
                operativo: OPERATIVO, 
                soloLectura:false,
                token,
                num_sincro,
                idper:context.user.idper,
                cargas:likeAr.createIndex(row.cargas.map(carga=>({...carga, fecha:carga.fecha?date.iso(carga.fecha).toDmy():null, estado_carga:'relevamiento'})), 'carga')
            };
            
        }
    },
    {
        action:'dm_backup',
        parameters:[
            {name:'token'       , typeName:'text'},
            {name:'tem'         , typeName:'jsonb'}
        ],
        unlogged:true,
        coreFunction:async function(context: ProcedureContext, parameters: CoreFunctionParameters){
            var {be, client} =context;
            const OPERATIVO = await getOperativoActual(context);
            var num_sincro:number=0;
            var token:string|null=parameters.token;
            if(token == null){
                return {ok:'ok:N/T'};
            }else{
                var {rowCount} = await client.query(`select 1 from tokens where token = $1`,[token]).fetchOneRowIfExists();
                if(!rowCount){
                    return {ok:'ok:N/T'};
                }
            }
            var {unidad_analisis, pk_agregada} = (await getUAPrincipal(context.client, OPERATIVO));
            if(parameters.tem){
                for(let backup of likeAr(parameters.tem).array()){
                    let area = backup.carga.carga;
                    let respuestasRaiz = backup.respuestasRaiz;
                    let idEncDM = backup.forPkRaiz[pk_agregada].toString();
                    let recepcionista = backup.carga.recepcionista;
                    let asignado = backup.idper;
                    if(Number(idEncDM)<0){
                        await persistirEncuestaAutogeneradaEnDM(context, OPERATIVO, area, idEncDM, token, respuestasRaiz, recepcionista, asignado);
                    }else{
                        let result = await context.client.query(
                            `update tem
                                set json_backup = $3, fecha_backup = current_timestamp
                                where operativo= $1 and enc = $2 and json_backup is distinct from $4
                                returning 'ok'`
                            ,
                            [OPERATIVO, idEncDM, respuestasRaiz, respuestasRaiz]
                        ).fetchOneRowIfExists();
                        
                    }
                }
            }
            return {
                ok:'ok'
            };
        }
    },
    {
        action: 'consistir_vivienda',
        parameters: [
            {name:'operativo'     ,references:'operativos',  typeName:'text'},
            {name:'caso'       ,typeName:'text'},
        ],
        coreFunction:async function(context: ProcedureContext, parameters: CoreFunctionParameters){
            var {be, client} =context;
            let param_proc={
                operativo: parameters.operativo,
                id_caso: parameters.caso
            } 
            let errMessage: string|null;
            let resultado: string|null;
            try{
                resultado= await be.procedure.consistir_encuesta.coreFunction(context, 
                        param_proc, client
                );    
            }catch(err){
                errMessage = " consistir_caso. "+ err ;
                console.log(errMessage)
            } 
            console.log('****** consistir_caso resultado:',resultado)               
            return {
                ok:'ok'
            };
        }

    },
    {
        action: 'dm_rescatar',
        parameters:[
            {name:'localStorageItem'       , typeName:'jsonb'},
            {name:'localStorageItemKey'    , typeName:'text'},
        ],
        unlogged:true,
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var {localStorageItemKey, localStorageItem} = params;
            try{
                console.log(localStorageItem);
                await fs.appendFile('local-rescate.txt', JSON.stringify({now:new Date(),user:context.username, itemKey: localStorageItemKey, itemData: localStorageItem})+'\n\n', 'utf8');
                return 'ok';
            }catch(err){
                console.log('ERROR',err);
                throw err;
            }
        }
    },
    {
        action: 'operativo_get',
        parameters:[],
        unlogged:true,
        coreFunction:async function(context:ProcedureContext, _parameters:CoreFunctionParameters){
            return getOperativoActual(context)
        }
    },
    {
        action: 'get_random_free_case',
        parameters:[{name:'operativo'    , typeName:'text'}],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            const minsToExpire = 30;
            const minsSinceBloqued = `date_part('min', age(current_timestamp, fecha_bloqueo))`;
            const enc = await context.client.query(`select enc from tem where operativo=$1 and (libre or ${minsSinceBloqued} > ${minsToExpire}) limit 1;`,[params.operativo]).fetchUniqueValue();
            await context.client.query(`UPDATE tem set libre = false, fecha_bloqueo=current_timestamp where operativo=$1 and enc=$2`,[params.operativo, enc.value]).execute();
            return enc.value;
        }
    },
    {
        action: 'muestra_generar',
        parameters:[
            {name:'operativo'          , typeName:'text',    references: "operativos"},
            {name:'area'               , typeName:'integer', references: "areas"},
            {name:'dominio'            , typeName:'integer', defaultValue: 3},
            {name:'cant_encuestas'     , typeName:'integer'},
            {name:'tarea_actual'       , typeName:'integer', references:'tareas'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            const be =  context.be;
            var permiteGenerarMuestra = (await context.client.query(`
                select permite_generar_muestra 
                    from operativos 
                    where operativo = $1
            `,[params.operativo]).fetchUniqueValue()).value;
            if(permiteGenerarMuestra){
                for(let i = 0; i < Math.min(params.cant_encuestas,maxAGenerar); i++){
                    await generarEncuestaTem(context, params.operativo, i, params.area, params.dominio, params.tarea_actual);
                }
                await generarTareasTemFaltantes(context, params.operativo);
                return 'ok';
            }else{
                throw Error("el operativo no permite generar muestra");
            }
        }
    },
    {
        action: 'muestra_agregar',
        parameters:[
            {name:'operativo'          , typeName:'text',    references: "operativos"},
            {name:'area'               , typeName:'integer', references: "areas"},
            {name:'dominio'            , typeName:'integer', defaultValue: 3},
            {name:'cant_encuestas'     , typeName:'integer'},
            {name:'tarea_actual'       , typeName:'integer', references:'tareas'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            const be =  context.be;
            var permiteGenerarMuestra = (await context.client.query(`
                select permite_generar_muestra 
                    from operativos 
                    where operativo = $1
            `,[params.operativo]).fetchUniqueValue()).value;
            if(permiteGenerarMuestra){
                let total = (await context.client.query(
                    `select count(*) as total
                        from tem
                        where operativo= $1 and area = $2`,
                    [params.operativo, params.area]
                ).fetchUniqueValue()).value;
                for(let i = total; i < Math.min(total + params.cant_encuestas,maxAEncPorArea); i++){
                    await generarEncuestaTem(context, params.operativo, i, params.area, params.dominio, params.tarea_actual);
                }
                await generarTareasTemFaltantes(context, params.operativo);
                return 'ok';
            }else{
                throw Error("el operativo no permite generar muestra");
            }
        }
    },
    {     
        action: 'encuesta_blanquear_previsualizar',
        parameters:[
            {name:'operativo'       , typeName:'text', references:"operativos"},
            {name:'enc'     , typeName:'text'},
        ],
        roles:['coor_proc','coor_campo','admin'],
        resultOk:'mostrar_encuesta_a_blanquear_contenido',
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            try{
                var result = await context.client.query(`
                    select *
                        from tem
                        where operativo = $1 and enc = $2 --pk verificada
                `,[params.operativo, params.enc]).fetchUniqueRow();
            }catch(err){
                throw Error (`No se encontró la encuesta ${params.enc} para el operativo ${params.operativo}. ${err.message}` )
            }
            return {casoTem: result.row};
        }
    },
    {
        action: 'encuesta_blanquear',
        parameters:[
            {name:'operativo'       , typeName:'text', references:"operativos"},
            {name:'enc'             , typeName:'text'},
        ],
        roles:['coor_proc','coor_campo','admin'],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var be = context.be;
            var {unidad_analisis, pk_agregada} = (await getUAPrincipal(context.client, parameters.operativo));
            await context.client.query(
                `delete 
                    from ${be.db.quoteIdent(unidad_analisis)} 
                    where operativo=$1 and ${be.db.quoteIdent(pk_agregada)} = $2
            `, [params.operativo, params.enc]).execute();
            //paso a encu para guardar en historial
            await context.client.query(`
                update tem
                    set 
                        tarea_actual = 'encu'
                    where operativo = $1 and enc = $2 --pk verificada
                    returning *
            `,[params.operativo, params.enc]).fetchUniqueRow();
            await context.client.query(`
                delete 
                    from tareas_tem 
                    where operativo = $1 and enc = $2
            `,[params.operativo, params.enc]).execute();
            await generarTareasTemFaltantes(context, params.operativo);         
            //reseteo tem (no se guarda historial porque tarea_actual es null)
            //guardo backup por las dudas
            await context.client.query(`
                update tem
                    set 
                        json_backup = json_encuesta, json_encuesta = null, tarea_actual = null,
                        fecha_modif_encuesta = null, fecha_backup = current_timestamp, modificado = null,
                        resumen_estado = null, resumen_estado_sup = null, supervision_dirigida = null,
                        pase_tabla = null, rea = null, norea = null, rea_sup = null, norea_sup = null
                    where operativo = $1 and enc = $2 --pk verificada
                    returning *
            `,[params.operativo, params.enc]).fetchUniqueRow();
            await context.client.query(`
                delete 
                    from inconsistencias
                    where operativo = $1 and ${be.db.quoteIdent(pk_agregada)} = $2
            `,[params.operativo, params.enc]).execute();
            await context.client.query(`
                delete 
                    from in_con_var
                    where operativo = $1 and pk_integrada->>${be.db.quoteLiteral(pk_agregada)} = $2
            `,[params.operativo, params.enc]).execute();
            await context.client.query(`
                delete 
                    from inconsistencias_ultimas
                    where operativo = $1 and pk_integrada->>${be.db.quoteLiteral(pk_agregada)} = $2
            `,[params.operativo, params.enc]).execute();
            return `la encuesta ${params.enc} se blanqueó correctamente`;
        }
    },
    {
        action: 'accion_tareas_tem_ejecutar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'condicion'       , typeName:'text'},
            {name:'accion'          , typeName:'jsonb'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var be =  context.be;
            var accion = params.accion as EstadoAccion;
            var cumple:boolean = (await context.client.query(
                `select accion_cumple_condicion($5, $6, $7, $8, (
                    select condicion 
                      from estados_acciones 
                      where operativo = $1 and estado = $2 and eaccion = $3 and estado_destino = $4
                )
            )`, [
                params.operativo, 
                accion.estado, 
                accion.eaccion, 
                accion.estado_destino,
                params.operativo, 
                accion.estado, 
                params.enc, 
                accion.eaccion,
            ]).fetchUniqueValue()).value;
            if(!cumple){
                throw Error(`No se pudo ejecutar la acción, no se cumple la condición "${params.condicion}" o bien el estado está desactualizado, refresque la grilla.`)
            }
            
            var result = await context.client.query(`
                UPDATE tareas_tem 
                    set estado = $4
                    where operativo=$1 
                        and enc=$2 
                        and tarea = $3
                    returning *`,
                [
                    params.operativo, 
                    params.enc, 
                    params.tarea, 
                    accion.estado_destino
                ]
            ).fetchUniqueRow();
            if(accion.nombre_procedure){
                if(be.procedure[accion.nombre_procedure]){
                    await be.procedure[accion.nombre_procedure].coreFunction(context, params)
                }else{
                    throw Error(`No existe el procedure "${accion.nombre_procedure}" definido en la tabla "estados_acciones" para el
                    operativo: ${accion.operativo}, estado: ${accion.estado}, eaccion: ${accion.eaccion}.`)
                }
            }
            // BUSCO PASE DE TAREA
            var tareaSiguiente = (await context.client.query(
                `select *
                    from tareas_proximas
                    where 
                        operativo = $1 and 
                        tarea = $2 and estado = $3 and 
                        tarea_cumple_condicion($4, $5, $6, $7, condicion)
                    order by orden
                    limit 1`
            ,[
                params.operativo, 
                params.tarea,
                accion.estado_destino,
                params.operativo, 
                params.tarea,
                accion.estado_destino,
                params.enc
            ]).fetchOneRowIfExists()).row;
            if(tareaSiguiente){
                await context.client.query(`
                    update tem
                        set tarea_actual = $3
                        where operativo = $1 and enc = $2
                        returning *`
                    ,[params.operativo, params.enc, tareaSiguiente.tarea_destino]
                ).fetchUniqueRow();
                let autoAsignado = tareaSiguiente.registra_recepcionista?context.user.idper:null;
                let q = context.be.db.quoteLiteral;
                await context.client.query(`
                    update tareas_tem
                        set ts_entrada = current_timestamp, adelantar = null, estado = $4
                            ${autoAsignado?
                                ", recepcionista="+q(autoAsignado)
                            :""}
                        where operativo = $1 and enc = $2 and tarea = $3
                        returning *`
                    ,[params.operativo, params.enc, tareaSiguiente.tarea_destino, tareaSiguiente.estado_destino]
                ).fetchUniqueRow();
                if(tareaSiguiente.nombre_procedure){
                    await be.procedure[tareaSiguiente.nombre_procedure].coreFunction(context, params);
                }
            }
            // FIN PASE DE TAREA
            return "ok";
        }
    },
    {
        action: 'encuesta_carga_preparar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
            {name:'enc'             , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tareas_tem
                    set operacion = $4
                    where operativo=$1 and tarea= $2 and enc=$3
                    returning *`,
                [params.operativo, params.tarea, params.enc, OPERACION_PREPARAR_CARGA])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_disponibilizar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
            {name:'enc'             , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tareas_tem
                    set asignado = null
                    where operativo=$1 and tarea= $2 and enc=$3
                    returning *`,
                [params.operativo, params.tarea, params.enc])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_no_cargar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
            {name:'enc'             , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tareas_tem
                    set operacion = null
                    where operativo=$1 and tarea= $2 and enc=$3
                    returning *`,
                [params.operativo, params.tarea, params.enc])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_descarga_preparar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
            {name:'enc'             , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tareas_tem
                    set operacion = $4
                    where operativo=$1 and tarea= $2 and enc=$3
                    returning *`,
                [params.operativo, params.tarea, params.enc, OPERACION_PREPARAR_DESCARGA])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_no_descargar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
            {name:'enc'             , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tareas_tem
                    set operacion = 'cargar'
                    where operativo=$1 and tarea= $2 and enc=$3
                    returning *`,
                [params.operativo, params.tarea, params.enc])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_analizar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
            {name:'enc'             , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var be = context.be;
            await be.procedure.consistir_encuesta.coreFunction(context, {operativo:params.operativo, id_caso:params.enc})
            return 'ok';
        }
    },
    {
        action: 'encuesta_verificar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
            {name:'enc'             , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tareas_tem
                    set verificado = '1'
                    where operativo=$1 and tarea= $2 and enc=$3
                    returning *`,
                [params.operativo, params.tarea, params.enc])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_no_verificar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
            {name:'enc'             , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tareas_tem
                    set verificado = null
                    where operativo=$1 and tarea= $2 and enc=$3
                    returning *`,
                [params.operativo, params.tarea, params.enc])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_cerrar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
            {name:'enc'             , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tareas_tem
                    set verificado = '1', asignado = $4
                    where operativo=$1 and tarea= $2 and enc=$3
                    returning *`,
                [params.operativo, params.tarea, params.enc, context.user.idper])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_no_cerrar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
            {name:'enc'             , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tareas_tem
                    set verificado = null
                    where operativo=$1 and tarea= $2 and enc=$3
                    returning *`,
                [params.operativo, params.tarea, params.enc])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_supervisar_presencial',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tem
                    set tarea_actual = $3, supervision_dirigida = $4
                    where operativo=$1 and enc=$2
                    returning *`,
                [params.operativo, params.enc, 'supe', 1])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_supervisar_telefonica',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tem
                    set tarea_actual = $3, supervision_dirigida = $4
                    where operativo=$1 and enc=$2
                    returning *`,
                [params.operativo, params.enc, 'supe', 2])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_no_supervisar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tem
                    set tarea_actual = $3, supervision_dirigida = null
                    where operativo=$1 and enc=$2
                    returning *`,
                [params.operativo, params.enc, 'finc'])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_pasar_a_anac',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tareas_tem
                    set estado = 'CC'
                    where operativo=$1 and enc=$2 and tarea in ($3,$4) --quiero pasar las 2 tareas a CC
                `,
                [params.operativo, params.enc, 'anac', 'proc'])
            .execute();
            await context.client.query(`
                UPDATE tem
                    set tarea_actual = $3
                    where operativo=$1 and enc=$2
                    returning *`,
                [params.operativo, params.enc, 'anac'])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_no_pasar_a_anac',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tareas_tem
                    set estado = 'A'
                    where operativo=$1 and enc=$2 and tarea= $3
                    returning *`,
                [params.operativo, params.enc, 'proc'])
            .fetchUniqueRow();
            await context.client.query(`
                UPDATE tareas_tem
                    set estado = '0D'
                    where operativo=$1 and enc=$2 and tarea= $3
                    returning *`,
                [params.operativo, params.enc, 'anac'])
            .fetchUniqueRow();
            await context.client.query(`
                UPDATE tem
                    set tarea_actual = $3
                    where operativo=$1 and enc=$2
                    returning *`,
                [params.operativo, params.enc, 'proc'])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_devolver_proc_desde_anac',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var be = context.be;
            await be.procedure.encuesta_verificar.coreFunction(context,params);
            await context.client.query(`
                UPDATE tareas_tem
                    set estado = 'A'
                    where operativo=$1 and enc=$2 and tarea= $3
                    returning *`,
                [params.operativo, params.enc, 'proc'])
            .fetchUniqueRow();
            await context.client.query(`
                UPDATE tem
                    set tarea_actual = $3
                    where operativo=$1 and enc=$2
                    returning *`,
                [params.operativo, params.enc, 'proc'])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_no_devolver_proc_desde_anac',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var be = context.be;
            await context.client.query(`
                UPDATE tareas_tem
                    set estado = 'CC'
                    where operativo=$1 and enc=$2 and tarea in ($3,$4) --quiero pasar las 2 tareas a CC
                `,
                [params.operativo, params.enc, 'anac', 'proc'])
            .execute();
            await be.procedure.encuesta_no_verificar.coreFunction(context,params);
            return 'ok';
        }
    },
    {
        action: 'encuesta_recuperar_desde_anac',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var be = context.be;
            var {operativo, enc, tarea} = params;
            await be.procedure.encuesta_verificar.coreFunction(context,params);
            await context.client.query(`
                update tem 
                    set tarea_actual = $3
                    where operativo = $1 and enc = $2
                    returning *`,
                [operativo, enc, 'recu'])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_no_recuperar_desde_anac',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var be = context.be;
            var {operativo, enc, tarea} = params;
            await context.client.query(`
                update tem 
                    set tarea_actual = $4
                    where operativo = $1 and enc = $2 and tarea_actual = $3
                    returning *`,
                [operativo, enc, 'recu', 'anac'])
            .fetchUniqueRow();
            await be.procedure.encuesta_no_verificar.coreFunction(context,params);
            return 'ok';
        }
    },
    {
        action: 'encuesta_forzar_tarea',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'tarea_actual'    , typeName:'text'},
            {name:'tarea_nueva'     , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var {operativo, enc, tarea_actual, tarea_nueva} = params;
            await context.client.query(`
                update tem 
                    set tarea_actual = $4
                    where operativo = $1 and enc = $2 and tarea_actual = $3
                    returning *`,
                [operativo, enc, tarea_actual, tarea_nueva])
            .fetchUniqueRow();
            await context.client.query(`
                update tareas_tem 
                    set estado = 'V' 
                    where operativo = $1 and enc = $2 and tarea = $3
                    returning *`,
                [operativo, enc, tarea_actual])
            .fetchUniqueRow();
            await context.client.query(`
                update tareas_tem 
                    set estado = '0D'
                    where operativo = $1 and enc = $2 and tarea = $3
                    returning *`,
                [operativo, enc, tarea_nueva])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: 'encuesta_habilitar_deshabilitar',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tem
                    set habilitada = not habilitada
                    where operativo=$1 and enc=$2
                    returning *`,
                [params.operativo, params.enc])
            .fetchUniqueRow();
            return 'ok';
        }
    },
    {
        action: ACCION_PASAR_PROIE,
        parameters:[],
        coreFunction:async function(context:ProcedureContext, _params:CoreFunctionParameters){
            let parametros = (await context.client.query(`
                select * from parametros where unico_registro`,
            []).fetchUniqueRow()).row;
            var select = `select t.operativo, t.enc, t.tarea_actual, tt.ts_entrada
                            from tareas_tem tt join tem t using (operativo,enc)
                            where tt.operativo=$1 and tt.tarea= $2 and (${getDiasAPasarQuery('tt')} <= 0 or coalesce(tt.adelantar,false)) and tt.tarea = t.tarea_actual
                        `;
            await context.client.query(`
                    UPDATE tareas_tem tt
                        set estado = 'V'
                        from (${select}) aux
                        where tt.operativo = aux.operativo and tt.enc = aux.enc and tt.tarea = $3
                        returning *`,
                [parametros.operativo, 'finc', 'finc'])
            .fetchAll();
            //TODO asignar en procesamiento
            await context.client.query(`
                    UPDATE tareas_tem tt
                        set estado = 'A'
                        from (${select}) aux
                        where tt.operativo = aux.operativo and tt.enc = aux.enc and tt.tarea = $3
                        returning *`,
                [parametros.operativo, 'finc', 'proc'])
            .fetchAll();
            await context.client.query(`
                update tem t
                    set tarea_actual = 'proc'
                    from (${select}) aux
                    where t.operativo = aux.operativo and t.enc = aux.enc
                    returning *` ,
            [parametros.operativo, 'finc']).fetchAll();
        return 'ok';
        }
    },
    {
        action:'intercambiar_encuestas',
        parameters:[
            {name:'enc1'            ,references:'tem' , typeName:'text'    },
            {name:'cantHog1'                          , typeName:'integer' },
            {name:'enc2'                              , typeName:'text'    },
            {name:'cantHog2'                          , typeName:'integer' },
            {name:'paso'                              , typeName:'integer' },
            {name:'confirma'                 , typeName:'boolean', defaultValue:false, label:'Confirma intercambio de los datos entre las encuestas? ' },
        ],
        roles:['coor_proc','procesamiento','admin'],
        progress:true,
        coreFunction:async function(context:ProcedureContext, params: CoreFunctionParameters){
            /**
             * Para controlar:
             * - que las hogares, personas, etc estén intercambiadas 
             *  * tanto en el json
             *  * como en las TDs
             * - cosas que se calculan por la app? cuales? (resumen_estado, rea y norea)
             */

            if (!params.confirma){
                throw new Error('No confirmó intercambio')
            }
            if ( !params.enc1 || !params.enc2)  {
                throw new Error('Error, Falta ingresar un numero de encuesta!');
            }
            if ( params.enc1==params.enc2)  {
                throw new Error('Error, enc1 y enc2 deben ser distintos!');
            }
            if (!params.cantHog1)  {
                throw new Error('Error, Cantidad de Hogares de enc1, no esta ingresado!');
            }
            if (!params.cantHog2)  {
                throw new Error('Error, Cantidad de Hogares de enc2, no esta ingresado!');
            }
            // CONTROLAR QUE NINGUNA DE LAS 2 encuestas ESTE CARGADA, ABIERTA FALTA
            const OPERATIVO = await getOperativoActual(context);
            var {unidad_analisis, pk_agregada} = (await getUAPrincipal(context.client, OPERATIVO));
            const cant_hogs=(await context.client.query(`
                select vivienda, count(*)nh from hogares where operativo=$1 and (vivienda=$2 or vivienda=$3)
                group by vivienda order by vivienda
                `,[OPERATIVO, params.enc1, params.enc2]).fetchAll()).rows;
                
            var param_nh=[params.cantHog1,params.cantHog2];
            cant_hogs.forEach((xe,i)=>{
                if (param_nh[i] !== xe.nh) {
                    const xmens=`Error, no coincide la cantidad de hogares de enc${i+1}`;
                    throw new Error(xmens);
                };
            });    
            
            var regEnc=(await context.client.query(`
            select enc, tarea_actual, json_encuesta from tem where operativo=$1 and (enc =$2 or enc=$3) order by enc
            `,[OPERATIVO, params.enc1, params.enc2]).fetchAll()).rows;
            
            if (regEnc.length!=2){
                throw new Error('Error, No se encontraron 2 encuestas')    
            }else{
                // limpia las TDs  
                let [enc1,enc2] = [regEnc[0], regEnc[1]]
                if(params.paso == 1){
                    await context.client.query(
                        `delete from ${context.be.db.quoteIdent(unidad_analisis)} where operativo=$1 and (vivienda=$2 OR vivienda=$3)`
                        , [OPERATIVO, enc1.enc, enc2.enc]
                        ).execute();
                }
                else if(params.paso == 2){
                    //simula guardado
                    await simularGuardadoDeEncuestaDesdeAppEscritorio(context, OPERATIVO, enc1.enc, enc1.tarea_actual , enc2.json_encuesta)
                    await simularGuardadoDeEncuestaDesdeAppEscritorio(context, OPERATIVO, enc2.enc, enc2.tarea_actual , enc1.json_encuesta)
                }
            }
            return (`Listo paso ${params.paso}. Intercambio realizado entre las encuestas  ${params.enc1} y ${params.enc2}. Por favor consista la encuesta`)
        }
    },
    {     
        action: 'encuestador_dms_mostrar',
        parameters:[
            {name:'operativo'       , typeName:'text', references:"operativos"},
            {name:'encuestador'     , typeName:'text'},
        ],
        roles:['coor_proc','coor_campo','admin'],
        resultOk:'mostrar_encuestas_a_blanquear',
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var result = await context.client.query(`
                select *
                    from tareas_tem
                    where operativo=$1 and asignado = $2 and cargado_dm is not null
                    order by cargado_dm
                `,
                [params.operativo, params.encuestador])
            .fetchAll();
            if(result.rowCount == 0){
                throw Error (`No se encontraron encuestas cargadas en un DM para el operativo ${params.operativo}, encuestador ${params.encuestador}`)
            }
            return {rows: result.rows, operativo: params.operativo};
        }
    },
    {
        action: 'dm_blanquear',
        parameters:[
            {name:'operativo'       , typeName:'text', references:"operativos"},
            {name:'token'         , typeName:'text'},
        ],
        roles:['coor_proc','coor_campo','admin'],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var be = context.be;
            let tareasTemResult = await context.client.query(`
                UPDATE tareas_tem
                    set cargado_dm = null, operacion = $3, estado = $4
                    where operativo=$1 and cargado_dm = $2
                    returning *`,
                [params.operativo, params.token, OPERACION_PREPARAR_DESCARGA, ESTADO_POSTERIOR_DESCARGA])
            .fetchAll();
            if(tareasTemResult.rowCount == 0){
                throw error('No se blanqueó ninguna encuesta')
            }
            for(let tt of tareasTemResult.rows){
                tt.result_blanqueo = `enc ${tt.enc} se blanqueó correctamente.`;
                let resultBackup = await context.client.query(`
                    UPDATE tem
                        set json_encuesta = json_backup, fecha_modif_encuesta = fecha_backup
                        where operativo=$1 and enc=$2 and fecha_backup > coalesce(fecha_modif_encuesta, '1900-01-01') and json_backup is not null
                        returning *`,
                    [tt.operativo, tt.enc])
                .fetchOneRowIfExists();
                if(resultBackup.rowCount){
                    tt.result_blanqueo+=` Se restableció el backup con fecha ${resultBackup.row.fecha_backup.toYmdHms()}.`
                    var {params:queryParams,setters} = getSettersAndParametersForReaNoReaResumenEstado({
                        tarea: tt.tarea,
                        respuestasUAPrincipal: resultBackup.row.json_encuesta,
                        setters: [],
                        params: [tt.operativo, tt.enc, tt.tarea]
                    })
                    await context.client.query(
                        `update tareas_tem
                            set ${setters.join(',')}
                            where operativo= $1 and enc = $2 and tarea = $3
                            returning 'ok'`
                        ,
                        queryParams
                    ).fetchUniqueRow();
                    await simularGuardadoDeEncuestaDesdeAppEscritorio(context, resultBackup.row.operativo, resultBackup.row.enc, tt.tarea,resultBackup.row.json_encuesta)
                }
            }
            return tareasTemResult.rows;
        }
    },
];
