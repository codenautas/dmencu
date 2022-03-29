"use strict";

import { ProcedureDef, TableDefinition, Client } from "./types-dmencu";
import { ProcedureContext, CoreFunctionParameters, ForeignKey } from "meta-enc";
import * as likeAr from "like-ar";
export * from "./types-dmencu";
import { IdUnidadAnalisis, UnidadAnalisis } from "../unlogged/tipos";

import {json, jsono} from "pg-promise-strict";

import {changing, date } from 'best-globals';
import {promises as  fs} from "fs";

import * as ExpresionParser from 'expre-parser';
import { tareas } from "./table-tareas";

var path = require('path');
var sqlTools = require('sql-tools');

var discrepances = require('discrepances');

const formPrincipal = 'F:F1';
const MAIN_TABLENAME ='viviendas';

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

var getParametersAndSettersForUpdateTem = async (context, operativo, idEnc, respuestasUAPrincipal, tarea)=>{
    var registraEstadoEnTem = (await context.client.query(
        `select registra_estado_en_tem
            from tareas
            where operativo=$1 and tarea = $2`
        ,
        [operativo, tarea]
    ).fetchUniqueValue()).value;
    var params = [operativo, idEnc, respuestasUAPrincipal]
    var setters = `json_encuesta = $3`;
    if(registraEstadoEnTem){
        setters+= `, resumen_estado=$4, norea=$5, rea=$6`
        params = params.concat([respuestasUAPrincipal.resumenEstado, respuestasUAPrincipal.codNoRea, respuestasUAPrincipal.codRea]);
    }
    return {setters, params}
}

var getHdrQuery =  function getHdrQuery(quotedCondViv:string){
    return `
    with viviendas as 
        (select enc, t.json_encuesta as respuestas, t.resumen_estado as "resumenEstado", 
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
                'tarea', tarea,
                'fecha_asignacion', fecha_asignacion,
                'asignado', asignado,
                'main_form', main_form
            ) as tarea,
            min(fecha_asignacion) as fecha_asignacion
            from tem t left join tareas_tem tt using (operativo, enc) left join tareas using (tarea)
            where ${quotedCondViv}
            group by t.enc, t.json_encuesta, t.resumen_estado, dominio, nomcalle,sector,edificio, entrada, nrocatastral, piso,departamento,habitacion,casa,reserva,tt.carga_observaciones, cita, t.area, tarea, fecha_asignacion, asignado, main_form
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
    )).replace(/helpers\.funs\.blanco\(helpers.null2zero\(/g,'helpers.funs.blanco((');
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
                    ${jsono(`select unidad_analisis, padre, pk_agregada, '{}'::jsonb as hijas from unidad_analisis`, 'unidad_analisis')} as unidades_analisis
                `,
                [parameters.operativo]
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
            var configSorteo = (await context.client.query(`
                select config_sorteo 
                    from operativos 
                    where operativo = $1
            `,[parameters.operativo]).fetchUniqueValue()).value;
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
            return {timestamp: be.timestampEstructura, ...result.row, operativo:parameters.operativo, configSorteo,noReas:be.caches.tableContent.no_rea};
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
        coreFunction:function(context, parameters, files){
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
        }){
            var client=context.client;
            var datos_json=parameters.datos_caso;
            var struct_dmencu = createStructure(context, MAIN_TABLENAME);
            datos_json['operativo'] = parameters.operativo;
            datos_json['enc'] = parameters.id_caso;
            if (datos_json.personas && datos_json.personas.length>=1) {
                var personas_con_pk =datos_json.personas.map(function(per: Object,i: number){
                    return {...per,'persona': i +1}
                });
                datos_json.personas=personas_con_pk;
            }
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
                console.log("ENTRA EN EL CATCH: ",err)
                throw err
            })
           
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
            var sql = sqlTools.structuredData.sqlRead({operativo: parameters.operativo, enc:parameters.id_caso}, struct_dmencu);
            var result = await client.query(sql).fetchUniqueValue();
            var response = {
                operativo: parameters.operativo,
                id_caso: parameters.id_caso,
                datos_caso: result.value,
                formulario: formPrincipal,
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
        coreFunction:async function(context:ProcedureContext, parameters:CoreFunctionParameters){
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
                `SELECT operativo, enc id_caso, json_encuesta datos_caso from tem WHERE operativo=$1`,
                [OPERATIVO]
            ).fetchAll();
            var procedureGuardar = be.procedure.caso_guardar;
            if(procedureGuardar.definedIn!='dmencu'){
                throw new Error('hay que sobreescribir caso_guardar');
            }
            return Promise.all(resultJson.rows.map(async function(row){
                await procedureGuardar.coreFunction(context, row)
                if(!('r4_esp' in row.datos_caso)){
                    row.datos_caso.r4_esp = null;
                }
                var {datos_caso, enc, operativo} = await be.procedure.caso_traer.coreFunction(context, {operativo:row.operativo, enc:row.id_caso})
                var verQueGrabo = {datos_caso, id_caso, operativo}
                try{
                    discrepances.showAndThrow(verQueGrabo,row)
                }catch(err){
                    console.log(verQueGrabo,row)
                }
                return 'Ok!';
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
            var soloLectura = !!(await context.client.query(
                `select *
                    from tareas_tem
                    where operativo= $1 and enc = $2 and cargado_dm is not null`
                ,
                [operativo, vivienda]
            ).fetchOneRowIfExists()).rowCount;
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
                timestampEstructura:be.timestampEstructura
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
                var {params, setters} = await getParametersAndSettersForUpdateTem(context, operativo, idEnc, respuestasUAPrincipal, persistentes.informacionHdr[idEnc].tarea.tarea);
                await context.client.query(
                    `update tem
                        set ${setters}
                        where operativo= $1 and enc = $2
                        returning 'ok'`
                    ,
                    params
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
                        and tt.habilitada
                        and (tt.cargado_dm is null or tt.cargado_dm = ${context.be.db.quoteLiteral(token)})
            `
            const UA_PRINCIPAL = await getUAPrincipal(context.client, OPERATIVO);
            if(persistentes){
                await Promise.all(likeAr(persistentes.respuestas[UA_PRINCIPAL]).map(async (respuestasUAPrincipal, idEnc)=>{
                    var tarea = persistentes.informacionHdr[idEnc].tarea.tarea;
                    var puedoGuardarEnTEM=true;
                    var queryTareasTem = await context.client.query(
                        `update tareas_tem
                            set cargado_dm=null, resumen_estado=$5, norea = $6, rea=$7
                            where operativo= $1 and enc = $2 and tarea = $3 and cargado_dm = $4
                            returning 'ok'`
                        ,
                        [OPERATIVO, idEnc, tarea, token, respuestasUAPrincipal.resumenEstado, respuestasUAPrincipal.codNoRea, respuestasUAPrincipal.codRea]
                    ).fetchOneRowIfExists();
                    puedoGuardarEnTEM=queryTareasTem.rowCount==1;
                    if(puedoGuardarEnTEM){
                        var {params, setters} = await getParametersAndSettersForUpdateTem(context, OPERATIVO, idEnc, respuestasUAPrincipal, tarea);
                        await context.client.query(
                            `update tem
                                set ${setters}
                                where operativo= $1 and enc = $2
                                returning 'ok'`
                            ,
                            params
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
                    set  cargado_dm=$3::text
                    where ${condviv} `
                ,
                [OPERATIVO, parameters.enc?parameters.enc:context.user.idper, token]
            ).execute();
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
                await Promise.all(parameters.tem.map(async (backup:any)=>{
                    context.client.query(
                        `update tem
                            set json_backup = $3
                            where operativo= $1 and enc = $2 and json_backup is distinct from $4
                            returning 'ok'`
                        ,
                        [OPERATIVO, backup.forPkRaiz.vivienda, backup.respuestasRaiz, backup.respuestasRaiz]
                    ).fetchOneRowIfExists();
                }));
            }
            return {
                ok:'ok'
            };
        }
    },
];