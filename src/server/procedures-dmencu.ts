"use strict";

import { ProcedureDef, TableDefinition, Client, TableDefinitions } from "./types-dmencu";
import { ProcedureContext, CoreFunctionParameters, ForeignKey } from "meta-enc";
import * as likeAr from "like-ar";
export * from "./types-dmencu";
import { IdUnidadAnalisis, UnidadAnalisis, EstadoAccion, IdEnc, IdTarea, RespuestasRaiz, IdOperativo } from "../unlogged/tipos";

import {json, jsono} from "pg-promise-strict";

import {changing, date } from 'best-globals';
import {promises as  fs} from "fs";

import * as ExpresionParser from 'expre-parser';
import { tareas } from "./table-tareas";
import { prependListener } from "process";
import { getDiasAPasarQuery } from "./table-tareas_tem";
import { error } from "console";

var path = require('path');
var sqlTools = require('sql-tools');

var discrepances = require('discrepances');

const formPrincipal = 'F:F1';
const MAIN_TABLENAME ='viviendas';
const ESTADO_POSTERIOR_CARGA = 'C';
const ESTADO_POSTERIOR_DESCARGA = 'D';

export const getOperativoActual = async (context:ProcedureContext)=>{
    var be = context.be;
    var result = await be.procedure.table_data.coreFunction(context,{table: `parametros`, fixedFields:[]});
    if(result[0]?.operativo){
        return result[0].operativo
    }else{
        throw Error ('no se configuró un operativo en la tabla parámetros');
    }
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
    const UA_PRINCIPAL = await getUAPrincipal(context.client, operativo);
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


var getHdrQuery =  function getHdrQuery(quotedCondViv:string){
    return `
    with viviendas as 
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
                'viviendas', ${jsono(
                    `select enc, respuestas, jsonb_build_object('resumenEstado',"resumenEstado") as otras from viviendas`,
                    'enc',
                    `otras || coalesce(respuestas,'{}'::jsonb)`
                )}
            ) as respuestas,
            ${json(`
                select area as carga, observaciones_hdr as observaciones, min(fecha_asignacion) as fecha
                    from viviendas inner join areas using (area) 
                    group by area, observaciones_hdr`, 
                'fecha')} as cargas,
            ${jsono(
                `select enc, jsonb_build_object('tem', tem, 'tarea', tarea) as otras from viviendas`,
                 'enc',
                 `otras ||'{}'::jsonb`
                )}
            as "informacionHdr"
`
}

export var setHdrQuery = (myFun:(quotedCondViv:string)=>string)=> getHdrQuery=myFun

const getUAPrincipal = async (client:Client, operativo:string)=>
    (await client.query(
        `select unidad_analisis
            from unidad_analisis
            where operativo= $1 and principal
        `
        ,
        [operativo]
    ).fetchUniqueValue()).value

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
            var {con_rea_hogar: conReaHogar, config_sorteo: configSorteo, habilitacion_boton_formulario:habilitacionBotonFormulario} = (await context.client.query(`
                select config_sorteo, con_rea_hogar, habilitacion_boton_formulario 
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
            return {timestamp: be.caches.timestampEstructura, ...result.row, operativo:parameters.operativo, conReaHogar, configSorteo, habilitacionBotonFormulario, noReas:be.caches.tableContent.no_rea, noReasSup:be.caches.tableContent.no_rea_sup};
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
            var client=newClient || context.client;
            var datos_json=parameters.datos_caso;
            var be = context.be;
            var tableStructures_app:TableDefinitions = be.tableStructures;
        
            var struct_dmencu = createStructure(context, MAIN_TABLENAME);
            datos_json['operativo'] = parameters.operativo;
            //TODO : vivienda ó enc???
            datos_json['vivienda'] = parameters.id_caso;
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
            var client=context.client;
             var struct_dmencu = createStructure(context, MAIN_TABLENAME);
            var sql = sqlTools.structuredData.sqlRead({operativo: parameters.operativo, vivienda:parameters.id_caso}, struct_dmencu);
            var result = await client.query(sql).fetchUniqueValue();
            var response = {
                operativo: parameters.operativo,
                vivienda: parameters.id_caso,
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
            let resultMain = await context.client.query(`SELECT * FROM ${MAIN_TABLENAME} LIMIT 1`).fetchAll();
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
                    var {datos_caso, vivienda, operativo} = await be.procedure.caso_traer.coreFunction(context, {operativo:row.operativo, id_caso:row.id_caso})
                    var verQueGrabo = {datos_caso, vivienda, operativo}
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
            {name:'vivienda'          , typeName:'text'},
            {name:'tarea'             , typeName:'text', references:"tareas"},
        ],
        coreFunction:async function(context: ProcedureContext, parameters: CoreFunctionParameters){
            var be=context.be;
            var {operativo,vivienda, tarea} = parameters;
            var main_form = (await context.client.query(
                `select main_form
                    from tareas
                    where operativo= $1 and tarea=$2`
                ,
                [operativo, tarea]
            ).fetchUniqueValue()).value;
            var condviv= ` t.operativo= $1 and t.enc =$2`;
            var soloLectura = !!(await context.client.query(`select *
                    from tareas_tem join estados using (operativo, estado) --pk estado verificada
                    where operativo= $1 and enc = $2 and (
                        cargado_dm is not null or 
                        not permite_editar_encuesta and asignado <> ${context.be.db.quoteLiteral(context.user.idper)}
                    )`, [operativo, vivienda]).fetchOneRowIfExists()).rowCount;
            var {row} = await context.client.query(getHdrQuery(condviv),[operativo,vivienda]).fetchUniqueRow();
            row.informacionHdr[vivienda].tarea={
                tarea,
                main_form
            } ;
            return {
                ...row,
                operativo,
                soloLectura,
                idPer:context.user.idper,
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
            const UA_PRINCIPAL = await getUAPrincipal(context.client, operativo);
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
            var token:string|null=persistentes?.token;
            if(!token){
                token = (await be.procedure.token_get.coreFunction(context, {
                    useragent: context.session.req.useragent, 
                    username: context.username
                })).token;
            }
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
            `
            const UA_PRINCIPAL = await getUAPrincipal(context.client, OPERATIVO);
            if(persistentes){
                await Promise.all(likeAr(persistentes.respuestas[UA_PRINCIPAL]).map(async (respuestasUAPrincipal, idEnc)=>{
                    var tarea = persistentes.informacionHdr[idEnc].tarea.tarea;
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
                        await fs.appendFile('local-recibido-sin-token.txt', JSON.stringify({now:new Date(),user:context.username,idCaso: idEnc,vivienda: respuestasUAPrincipal})+'\n\n', 'utf8');
                    }

                }).array());
            }
            console.log("condviv: ", condviv);
            console.log("query: ", getHdrQuery(condviv));
            var {row} = await context.client.query(getHdrQuery(condviv),[OPERATIVO,context.user.idper]).fetchUniqueRow();
            // console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxx',getHdrQuery(condviv));
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
            {name:'token'         , typeName:'text'},
            {name:'tem'         , typeName:'jsonb'},
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
            if(parameters.tem){
                await Promise.all(likeAr(parameters.tem).map(async (backup:any)=>{
                    context.client.query(
                        `update tem
                            set json_backup = $3, fecha_backup = current_timestamp
                            where operativo= $1 and enc = $2 and json_backup is distinct from $4
                            returning 'ok'`
                        ,
                        [OPERATIVO, backup.forPkRaiz.vivienda, backup.respuestasRaiz, backup.respuestasRaiz]
                    ).fetchOneRowIfExists();
                }).array());
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
            {name:'vivienda'       ,typeName:'text'},
        ],
        coreFunction:async function(context: ProcedureContext, parameters: CoreFunctionParameters){
            var {be, client} =context;
            let param_proc={
                operativo: parameters.operativo,
                id_caso: parameters.vivienda
            } 
            let errMessage: string|null;
            let resultado: string|null;
            try{
                resultado= await be.procedure.consistir_encuesta.coreFunction(context, 
                        param_proc, client
                );    
            }catch(err){
                errMessage = " consistir_vivienda. "+ err ;
                console.log(errMessage)
            } 
            console.log('****** consistir_vivienda resultado:',resultado)               
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
            const ANALIZAR_CONDICION = true;
            if(ANALIZAR_CONDICION){
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
                ])
                .fetchUniqueValue()).value;
                if(!cumple){
                    throw Error(`No se pudo ejecutar la acción, no se cumple la condición "${params.condicion}" o bien el estado está desactualizado, refresque la grilla.`)
                }
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
            return result.row;

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
                    set operacion = 'cargar'
                    where operativo=$1 and tarea= $2 and enc=$3
                    returning *`,
                [params.operativo, params.tarea, params.enc])
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
                    set operacion = 'descargar'
                    where operativo=$1 and tarea= $2 and enc=$3
                    returning *`,
                [params.operativo, params.tarea, params.enc])
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
        action: 'encuesta_supervisar_presencial',
        parameters:[
            {name:'operativo'       , typeName:'text'},
            {name:'enc'             , typeName:'text'},
            {name:'tarea'           , typeName:'text'},
        ],
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            await context.client.query(`
                UPDATE tem
                    set tarea_actual = $3, tarea_proxima = $4, supervision_dirigida = $5
                    where operativo=$1 and enc=$2
                    returning *`,
                [params.operativo, params.enc, 'finc', 'supe', 1])
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
                    set tarea_actual = $3, tarea_proxima = $4, supervision_dirigida = $5
                    where operativo=$1 and enc=$2
                    returning *`,
                [params.operativo, params.enc, 'finc', 'supe', 2])
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
                    set tarea_actual = $3, tarea_proxima = $4, supervision_dirigida = null
                    where operativo=$1 and enc=$2
                    returning *`,
                [params.operativo, params.enc, null, 'finc'])
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
            //parametros.dias_finc
            /*
            var select = `select * 
                            from tareas_tem left join tem t using (operativo,enc)
                            where operativo=$1 and tarea= $2 and (${getDiasAPasarQuery()} <= 0 or coalesce(adelantar,false)) and tarea_proxima = $3`
            */                
            var select = `select t.operativo, t.enc, t.tarea_actual, t.tarea_proxima, tt.ts_entrada, tta.estado 
                            from tareas_tem tt left join tem t using (operativo,enc) join tareas_tem tta on tta.operativo=t.operativo and tta.enc=t.enc and tta.tarea=t.tarea_actual
                            where tt.operativo=$1 and tt.tarea= $2 and (${getDiasAPasarQuery('tt')} <= 0 or coalesce(tt.adelantar,false)) and tarea_proxima = $3
                              and tta.estado='V' and tta.asignado is not null and tta.recepcionista is not null
                        `;
            await context.client.query(`
                    UPDATE tareas_tem tt
                        set estado = 'A'
                        from (${select}) aux
                        where tt.operativo = aux.operativo and tt.enc = aux.enc and tt.tarea = $4
                        returning *`,
                [parametros.operativo, 'finc', 'finc','proc'])
            .fetchAll();
            await context.client.query(`
                update tem t
                    set tarea_actual = 'proc', tarea_proxima = null
                    from (${select}) aux
                    where t.operativo = aux.operativo and t.enc = aux.enc
                    returning *` ,
            [parametros.operativo, 'finc','finc']).fetchAll();
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
                        `delete from viviendas where operativo=$1 and (vivienda=$2 OR vivienda=$3)`
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
        coreFunction:async function(context:ProcedureContext, params:CoreFunctionParameters){
            var be = context.be;
            const UA_PRINCIPAL = await getUAPrincipal(context.client, params.operativo);
            let tareasTemResult = await context.client.query(`
                UPDATE tareas_tem
                    set cargado_dm = null, operacion = 'descargar', estado = $3
                    where operativo=$1 and cargado_dm = $2
                    returning *`,
                [params.operativo, params.token, ESTADO_POSTERIOR_DESCARGA])
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
