"use strict";

import * as procesamiento from "procesamiento";
import {emergeAppProcesamiento, emergeAppConsistencias, emergeAppVarCal, emergeAppDatosExt, emergeAppOperativos, AppBackend, ClientModuleDefinition, OptsClientPage} from "procesamiento";
import {ACCION_PASAR_PROIE, getOperativoActual, ProceduresDmEncu} from "./procedures-dmencu";

import * as pg from "pg-promise-strict";
import {json} from "pg-promise-strict";
import * as miniTools from "mini-tools";
import {
    Client, Context, CoreFunctionParameters, 
    MenuInfoBase, 
    Request, Response,
    SufijosAmbiente,
} from "./types-dmencu";

import { unexpected } from "cast-error";

import * as yazl from "yazl";
import { NextFunction } from "express-serve-static-core";
import * as likeAr from "like-ar";
import * as express from "express";

import {promises as fs } from "fs";

import { roles               } from "./table-roles";
import { personal            } from "./table-personal";
import { recepcionistas      } from "./table-recepcionistas";
import { encuestadores_asignados } from "./table-encuestadores";
import { recuperadores_asignados } from "./table-encuestadores";
import { supervisores_asignados  } from "./table-encuestadores";
import { mis_supervisores_asignados  } from "./table-encuestadores";
import { mis_encuestadores   } from "./table-mis_encuestadores";
import { recuperadores       } from "./table-recuperadores";
import { supervisores        } from "./table-supervisores";
import { personal_rol        } from "./table-personal_rol";
import { permisos            } from "./table-permisos";
import { roles_permisos      } from "./table-roles_permisos";
import { parametros          } from "./table-parametros";
import { roles_subordinados  } from "./table-roles_subordinados";

import {no_rea               } from "./table-no_rea";
import {no_rea_sup           } from "./table-no_rea_sup";
import {tem                  } from "./table-tem";
import {tem_recepcion        } from "./table-tem_recepcion";
import {semanas              } from "./table-semanas";
import { usuarios            } from './table-usuarios';
import { operaciones         } from './table-operaciones';
import { comunas             } from './table-comunas';
import { areas               } from './table-areas';
import { sincronizaciones    } from './table-sincronizaciones';
import { tareas              } from './table-tareas';
import { tareas_tem, 
         tareas_tem_encu, 
         tareas_tem_recu, 
         tareas_tem_supe     } from './table-tareas_tem';
import { tareas_areas        } from './table-tareas_areas';
import { areas_asignacion_general } from './table-areas_asignacion_general';
import { grilla_hoja_ruta    } from './table-grilla_hoja_ruta';
import { t_encu_areas        } from './table-tareas_areas';
import { t_recu_areas        } from './table-tareas_areas';
import { t_supe_areas        } from './table-tareas_areas';
import { mis_tareas          } from './table-mis_tareas';
import { tem_asignacion      } from './table-tem_asignacion';
import { tareas_tem_recepcion} from './table-tareas_tem_recepcion';
import { tareas_tem_ingreso} from './table-tareas_tem_ingreso';
import { tareas_tem_fin_campo} from './table-tareas_tem_fin_campo';
import { tareas_tem_procesamiento} from './table-tareas_tem_procesamiento';
import { mis_tareas_areas    } from './table-mis_tareas_areas';
import { control_campo       } from './table-control_campo';
import { control_resumen     } from './table-control_resumen';
import { control_dias_carga  } from './table-control_dias_carga';
import { viviendas           } from './table-viviendas';
import { visitas             } from './table-visitas';
import { hogares             } from './table-hogares';
import { personas            } from './table-personas';
import { visitas_sup         } from './table-visitas_sup';
import { hogares_sup         } from './table-hogares_sup';
import { personas_sup        } from './table-personas_sup';

import { estados             } from './table-estados';
import { acciones            } from './table-acciones';
import { estados_acciones    } from './table-estados_acciones';


export * from "./types-dmencu";
import {defConfig} from "./def-config"
import { ProcedureDef } from "backend-plus";
import { table } from "console";

const APP_DM_VERSION="#22-12-15";

var registrarCronJobPasarAProie = async (be) => {
    let procedures = await be.getProcedures()
    var procPasar = procedures.find((proc:ProcedureDef)=>proc.action == ACCION_PASAR_PROIE)
    var context = be.getContextForDump();
    setInterval(async ()=>{
        try{
            console.log('inicia cron posaje a proie')
            var result = await be.inTransaction(null, async (client)=>{
                context.client=client;
                return await procPasar.coreFunction(context,[]);
            })
            console.log("result proc pasaje a proie: ", result)
        }catch(err){
            console.log(`error pasaje a proie. ${err.message}`);
        }finally{
            console.log('termina cron proie')
        }
    },1000*60*60)
}

export function emergeAppDmEncu<T extends procesamiento.Constructor<procesamiento.AppProcesamientoType>>(Base:T){
  return class AppDmEncu extends Base{
    constructor(...args:any[]){ 
        super(args); 
        this.caches.tableContent = this.caches.tableContent || {};
        this.caches.tableContent.no_rea=[]
        this.caches.tableContent.no_rea_groups=[]
        this.caches.metaEncIncluirCasillerosSaltoREL = false;
        this.caches.timestampEstructura = new Date().getTime();
        this.caches.tableContent.conReaHogar = {};
    }
    override async canChangePass(reqOrContext, userToChangePass){
        var be = this;
        var result = await be.inDbClient(null, async (client)=>{
            var q = be.db.quoteLiteral;
            var rol = reqOrContext.user.rol;
            return (await client.query(`
                select * 
                  from usuarios 
                  where rol in (select rol_subordinado from roles_subordinados where rol = ${q(rol)})`).fetchAll()).rows;
        })
        var puede = !!result.find((user)=>user.usuario == userToChangePass);
        var isAdmin = be.isAdmin(reqOrContext);
        return isAdmin || puede
        
    }
    override async getProcedures(){
        var be = this;
        var procedimientoAReemplazar=["caso_guardar","caso_traer"];
        var parentProc = await super.getProcedures();
        parentProc = parentProc.filter((procedure:any) => !procedimientoAReemplazar.includes(procedure.action));
        parentProc = parentProc.map(procDef=>{
            if(procDef.action == 'table_record_save' || procDef.action == 'table_record_delete'){
                var coreFunctionInterno = procDef.coreFunction;
                procDef.coreFunction = async function(context:Context, parameters:CoreFunctionParameters){
                    var result = await coreFunctionInterno(context, parameters)
                    if(parameters.table == 'casilleros'){
                        be.caches.timestampEstructura = new Date().getTime();
                        console.log('se tocó la estructura', be.caches.timestampEstructura)
                    }
                    return result;
                }
            }
            return procDef;
        })
        return parentProc.concat(ProceduresDmEncu);
    }
    override async checkDatabaseStructure(_client:Client){
    }
    override addSchrödingerServices(mainApp:procesamiento.Express, baseUrl:string){
        let be=this;
        super.addSchrödingerServices(mainApp, baseUrl);
        //permito levantar mis imagenes en aplicaciones dependientes
        be.app.use('/img', express.static('node_modules/dmencu/dist/unlogged/unlogged/img'))
        mainApp.use(function(req:Request,_res:Response, next:NextFunction){
            if(req.session && !req.session.install){
                req.session.install=Math.random().toString().replace('.','');
            }
            next();
        })
        mainApp.get(baseUrl+'/salvar',async function(req,res,_next){
            // @ts-ignore sé que voy a recibir useragent por los middlewares de Backend-plus
            var {useragent} = req;
            var htmlMain=be.mainPage({useragent}, false, {skipMenu:true, offlineFile:true}).toHtmlDoc();
            miniTools.serveText(htmlMain,'html')(req,res);
        });
        mainApp.get(baseUrl+'/campo',async function(req,res,_next){
            // @ts-ignore sé que voy a recibir useragent por los middlewares de Backend-plus
            var {useragent, user} = req;
            if(user){
                /** @type {{type:'js', src:string}[]} */
                var webManifestPath = 'carga-dm/web-manifest.webmanifest';
                var htmlMain=be.mainPage({useragent, user}, false, {skipMenu:true, webManifestPath, offlineFile:true}).toHtmlDoc();
               miniTools.serveText(htmlMain,'html')(req,res);
            }else{
                res.redirect(401, baseUrl+'/login#w=path&path=/campo')
            }
        });
        var createServiceWorker = async function(){
            var sw = await fs.readFile('node_modules/service-worker-admin/dist/service-worker-wo-manifest.js', 'utf8');
            var manifest = be.createResourcesForCacheJson();
            var swManifest = sw
                .replace("'/*version*/'", JSON.stringify(manifest.version))
                .replace("'/*appName*/'", JSON.stringify(manifest.appName))
                .replace(/\[\s*\/\*urlsToCache\*\/\s*\]/, JSON.stringify(manifest.cache))
                .replace(/\[\s*\/\*fallbacks\*\/\s*\]/, JSON.stringify(manifest.fallback || []));
                //.replace("/#CACHE$/", "/(a\\d+m\\d+p\\d+t\\d+_estructura.js)|(a\\d+m\\d+p\\d+t\\d+_hdr.json)/");
            return swManifest
        }
        mainApp.get(baseUrl+`/sw-manifest.js`, async function(req, res, next){
            try{
                miniTools.serveText(await createServiceWorker(),'application/javascript')(req,res);
            }catch(err){
                miniTools.serveErr(req,res,next)(unexpected(err));
            }
        });
        mainApp.get(baseUrl+`/carga-dm/web-manifest.webmanifest`, async function(req, res, next){
            const APP_NAME = (await be.inTransaction(null, (client:pg.Client)=>
                client.query("select operativo from parametros where unico_registro").fetchUniqueValue()
            )).value;
            var sufijo = baseUrl.includes('test') || baseUrl.includes('/pr')?'_test':
                baseUrl.includes('capa')?'_capa':'';
            try{
                const content = {
                  "name": `${APP_NAME}${sufijo} Progressive Web App`,
                  "short_name": `${APP_NAME}${sufijo} PWA`,
                  "description": `Progressive Web App for ${APP_NAME}${sufijo}.`,
                  "icons": [
                    {
                      "src": `../img/${APP_NAME}-logo-dm-32${sufijo}.png`,
                      "sizes": "32x32",
                      "type": "image/png"
                    },
                    {
                      "src": `../img/${APP_NAME}-logo-dm-48${sufijo}.png`,
                      "sizes": "48x48",
                      "type": "image/png"
                    },
                    {
                      "src": `../img/${APP_NAME}-logo-dm-64${sufijo}.png`,
                      "sizes": "64x64",
                      "type": "image/png"
                    },
                    {
                      "src": `../img/${APP_NAME}-logo-dm-72${sufijo}.png`,
                      "sizes": "72x72",
                      "type": "image/png"
                    },
                    {
                      "src": `../img/${APP_NAME}-logo-dm-192${sufijo}.png`,
                      "sizes": "192x192",
                      "type": "image/png"
                    },
                    {
                      "src": `../img/${APP_NAME}-logo-dm-512${sufijo}.png`,
                      "sizes": "512x512",
                      "type": "image/png"
                    }
                  ],
                  ...be.getColorsJson(sufijo as SufijosAmbiente)
                }
                miniTools.serveText(JSON.stringify(content), 'application/json')(req,res);
            }catch(err){
                miniTools.serveErr(req, res, next)(unexpected(err));
            }
        });
    }
    getColorsJson(_sufijo: SufijosAmbiente){
        return {
            "start_url": "../campo",
            "display": "standalone",
            "theme_color": "#3F51B5",
            "background_color": "#6d60ed"
        }
    }
    override addLoggedServices(){
        var be = this;
        super.addLoggedServices();
        be.app.get('/manifest.manifest', async function(req:Request, res:Response, _next:NextFunction){
            miniTools.serveFile('src/client/manifest.manifest',{})(req,res);
        });
        this.app.get('/file', async function(req:Request,res:Response){
            let result = await be.inTransaction(req, 
                (client:pg.Client)=>
                client.query("select ruta from adjuntos where id_adjunto = $1",[req.query.id_adjunto])
                .fetchUniqueValue()
            );
            var path = result.value;
            miniTools.serveFile(path,{})(req,res);
        });
        this.app.get('/imagenes', async function(req:Request,res:Response){
            miniTools.serveFile('local-images/'+req.query.pdf,{})(req,res);
        });
        this.app.get('/download/all',async function(req:Request, res:Response, next:()=>void){
            if(req.user==null || req.user.rol!='admin'){
                console.log('no está autorizado a bajarse todo',req.user)
                return next();
            }
            let zip = new yazl.ZipFile();
            zip.outputStream.pipe(res);
            let base = 'local-attachments'
            let files = await fs.readdir(base);
            await Promise.all(files.map(async function(fileName:string){
                var path = base+'/'+fileName;
                var stat = await fs.stat(path);
                if(stat.isFile()){
                    zip.addFile(path,fileName);
                }
            }));
            zip.end();
        })
    }
    override async postConfig(){
        await super.postConfig();
        var be=this;
        be.caches.metaEncIncluirCasillerosSaltoREL = false;
        await be.inTransaction(null, async function(client:pg.Client){
            var qPermisos=`
            SELECT jsonb_object_agg(r.rol,jsonb_build_object('superuser',r.superuser,'puede',(
                  SELECT jsonb_object_agg(rp.permiso,(
                        SELECT jsonb_object_agg(rpa.accion,rpa.habilitado)
                          FROM roles_permisos rpa
                          WHERE rpa.rol=rp.rol AND rpa.permiso=rp.permiso
                    ))
                    FROM roles_permisos rp
                    WHERE rp.rol=r.rol #condHabilitado#
              )))
              FROM roles r
            `;
            var results = [
                await client.query(qPermisos.replace('#condHabilitado#','')).fetchUniqueValue(),
                await client.query(qPermisos.replace('#condHabilitado#',` and rp.${pg.quoteIdent('habilitado')}`)).fetchUniqueValue(),
                await client.query(`
                    SELECT jsonb_object_agg(permiso,(
                        SELECT jsonb_object_agg(accion,true)
                          FROM permisos pa
                          WHERE pa.permiso=p.permiso
                      ))
                      FROM permisos p
                `).fetchUniqueValue()
            ];
            be.caches.permisosRol=results[0].value;
            be.caches.permisosRolSoloTrue=results[1].value;
            be.caches.permisosSuperuser=results[2].value;
            be.caches.permisosParaNadie=likeAr(be.caches.permisosSuperuser).map(p=>likeAr(p).map(_=>false).plain()).plain()
            //console.dir(be.caches.permisosRolSoloTrue,{depth:9});
            //console.dir(be.caches.permisosSuperuser,{depth:9});
            //console.dir(be.caches.permisosParaNadie,{depth:9});
        });
        await this.refreshCaches();
        await registrarCronJobPasarAProie(be);
    }
    override configStaticConfig(){
        super.configStaticConfig();
        this.setStaticConfig(defConfig);
    }
    override clientIncludes(req:Request, opts:OptsClientPage):ClientModuleDefinition[] {
        var be = this;
        var unlogged = opts && opts.offlineFile;
        var menuedResources:ClientModuleDefinition[]= unlogged?[
            { type: 'js', module: 'dmencu', modPath: '../../unlogged/unlogged', file: 'unlogged.js', path: 'dmencu' },
        ]:[
            { type: 'js', module: 'dmencu', modPath: '../../client/client', file: 'client.js', path: 'dmencu' },
        ];
        if(opts && opts.extraFiles){
            menuedResources = menuedResources.concat(opts.extraFiles);
        }
        let externalResources:ClientModuleDefinition[] = [
            { type: 'js', module: 'react', modPath: 'umd', fileDevelopment:'react.development.js', file:'react.production.min.js' },
            { type: 'js', module: 'react-dom', modPath: 'umd', fileDevelopment:'react-dom.development.js', file:'react-dom.production.min.js' },
            { type: 'js', module: '@material-ui/core', modPath: 'umd', fileDevelopment:'material-ui.development.js', file:'material-ui.production.min.js' },
            { type: 'js', module: 'clsx', file:'clsx.min.js' },
            { type: 'js', module: 'redux', modPath:'../dist', fileDevelopment:'redux.js', file:'redux.min.js' },
            { type: 'js', module: 'react-redux', modPath:'../dist', fileDevelopment:'react-redux.js', file:'react-redux.min.js' },
            { type: 'js', module: 'memoize-one',  file:'memoize-one.js' },
            //{ type: 'js', module: 'qrcode', modPath: '../build', file: 'qrcode.js'},
            ...super.clientIncludes(req, opts).filter(m=>m.file!='formularios.css')
            .filter(m=>!unlogged || true
                && m.file!='var-cal.js'
                && m.file!='var-cal.js'     
            ),
            { type: 'js', module: 'service-worker-admin',  file:'service-worker-admin.js' },
            { type: 'js', module: 'redux-typed-reducer', modPath:'../dist', file:'redux-typed-reducer.js' }
        ];
        var resources:ClientModuleDefinition[] = [
            ...externalResources,
            { type: 'js', module: 'dmencu', modPath: '../../unlogged/unlogged', file: 'adapt.js', path: 'dmencu' },
            { type: 'js', module: 'dmencu', modPath: '../../unlogged/unlogged', file: 'tipos.js', path: 'dmencu' },
            { type: 'js', module: 'dmencu', modPath: '../../unlogged/unlogged', file: 'bypass-formulario.js', path: 'dmencu' },
            { type: 'js', module: 'dmencu', modPath: '../../unlogged/unlogged', file: 'redux-formulario.js', path: 'dmencu' },
            { type: 'js', module: 'dmencu', modPath: '../../unlogged/unlogged', file: 'render-general.js', path: 'dmencu' },
            { type: 'js', module: 'dmencu', modPath: '../../unlogged/unlogged', file: 'render-formulario.js', path: 'dmencu' },
            { type: 'js', module: 'dmencu', modPath: '../../unlogged/unlogged', file: 'abrir-formulario.js', path: 'dmencu' },
            { type: 'css', module: 'dmencu', modPath: '../../client/client/css', file: 'menu.css', path: 'css' },
            { type: 'css', module: 'dmencu', modPath: '../../unlogged/unlogged/css', file: 'formulario-react.css', path: 'css' },
            { type: 'css', module: 'dmencu', modPath: '../../unlogged/unlogged/css', file: 'bootstrap.min.css', path: 'css' },
            { type: 'ttf', module: 'dmencu', modPath: '../../unlogged/unlogged/css', file: 'Roboto-Regular.ttf', path: 'css' },
            ... menuedResources,
        ]
        return resources
        // .map(m=>({...m, file:m.fileDevelopment||m.file}));
    }
    async refreshCaches(){
        this.caches.tableContent = this.caches.tableContent || {};
        await this.inDbClient(null, async (client)=>{
            this.caches.tableContent.no_rea = (await client.query(`select * from no_rea order by no_rea`).fetchAll()).rows;
            console.log('caches',this.caches.tableContent.no_rea)
            this.caches.tableContent.no_rea_groups = (await client.query(`
                select grupo, jsonb_agg(to_json(r.*)) as codigos from no_rea r group by grupo order by 1
            `).fetchAll()).rows;
            this.caches.tableContent.no_rea_groups0 = (await client.query(`
                select grupo0 as grupo, jsonb_agg(to_json(r.*)) as codigos from no_rea r group by grupo0 order by 1
            `).fetchAll()).rows;
            this.caches.tableContent.no_rea_sup = (await client.query(`select * from no_rea_sup order by no_rea_sup`).fetchAll()).rows;
            console.log('caches',this.caches.tableContent.no_rea_sup)
            this.caches.tableContent.no_rea_sup_groups = (await client.query(`
            select grupo_sup, jsonb_agg(to_json(r.*)) as codigos from no_rea_sup r group by grupo_sup order by 1
            `).fetchAll()).rows;
            this.caches.tableContent.no_rea_sup_groups0 = (await client.query(`
            select grupo0_sup as grupo, jsonb_agg(to_json(r.*)) as codigos from no_rea_sup r group by grupo0_sup order by 1
        `).fetchAll()).rows;
           this.caches.tableContent.conReaHogar = (await client.query(`
            select con_rea_hogar,operativo, config_sorteo from operativos
             `).fetchUniqueRow()).row;
            console.log('caches ',this.caches.tableContent.conReaHogar )
        })
        console.log('caches ok');
    }
    //sqlNoreaCase(campoNecesario:string){
    //    var be=this;
    //    return `CASE ${be.caches.tableContent.no_rea.map(x=>
    //        ` WHEN norea  = ${be.db.quoteLiteral(x.no_rea)}::integer THEN ${be.db.quoteLiteral(x[campoNecesario])}`
    //    ).join('')} WHEN TRUE THEN NULL END`
    //}    
    override getContext(req:Request):Context{
        var be = this;
        var fatherContext = super.getContext(req);
        if(fatherContext.user){
            if(req.user?.rol !=null && be.caches.permisosRol[req.user.rol]?.superuser){
                return {superuser:true, puede: be.caches.permisosSuperuser, ...fatherContext}
            }else{
                return {puede: be.caches.permisosRol[req.user.rol]?.puede, ...fatherContext}
            }
        }
        return {puede:be.caches.permisosParaNadie, ...fatherContext};
    }
    override getContextForDump():Context{
        var fatherContext = super.getContextForDump();
        return {superuser:true, puede: this.caches.permisosSuperuser, ...fatherContext};
    }
    override async getClientSetupForSendToFrontEnd(req:Request){
        return {
            ...(await super.getClientSetupForSendToFrontEnd(req)),
            idper: req.user?.idper
        }
    }
    createResourcesForCacheJson(){
        var be = this;
        var jsonResult = {
            version: APP_DM_VERSION,
            appName: 'dmencu',
            cache: [
                "campo",
                "offline",
                "lib/react.production.min.js",
                "lib/react-dom.production.min.js",
                "lib/material-ui.production.min.js",
                "lib/clsx.min.js",
                "lib/redux.min.js",
                "lib/react-redux.min.js",
                "lib/memoize-one.js",
                //"lib/qrcode.js",
                "lib/require-bro.js",
                "lib/cast-error.js",
                "lib/like-ar.js",
                "lib/best-globals.js",
                "lib/json4all.js",
                "lib/js-to-html.js",
                "lib/redux-typed-reducer.js",
                "dmencu/adapt.js",
                "dmencu/unlogged.js",
                "lib/js-yaml.js",
                "lib/xlsx.core.min.js",
                "lib/lazy-some.js",
                "lib/sql-tools.js",
                "dialog-promise/dialog-promise.js",
                "moment/min/moment.js",
                "pikaday/pikaday.js",
                "lib/polyfills-bro.js",
                "lib/big.js",
                "lib/type-store.js",
                "lib/typed-controls.js",
                "lib/ajax-best-promise.js",
                "my-ajax.js",
                "my-start.js",
                "lib/my-localdb.js",
                "lib/my-websqldb.js",
                "lib/my-localdb.js.map",
                "lib/my-websqldb.js.map",
                "lib/my-things.js",
                "lib/my-tables.js",
                "lib/my-inform-net-status.js",
                "lib/my-menu.js",
                "lib/my-skin.js",
                "lib/cliente-en-castellano.js",
                "lib/service-worker-admin.js",
                "lib/redux-typed-reducer.js",
                "client_modules/operativos.js",
                "client_modules/varcal.js",
                "client_modules/form-structure.js",
                "client_modules/meta-enc.js",
                "client_modules/datos-ext.js",
                "client_modules/consistencias.js",
                "client_modules/procesamiento.js",
                "dmencu/tipos.js",
                "dmencu/bypass-formulario.js",
                "dmencu/redux-formulario.js",
                "dmencu/render-general.js",
                "dmencu/render-formulario.js",
                "dmencu/abrir-formulario.js",
                "client_modules/row-validator.js",
                "client/menu.js",
                "img/logo.png",
                //"img/logo-dm.png",
                "img/logo-128.png",
                "img/main-loading.gif",
                "img/borrar-valor.png",
                "img/fondo-salteado-error.png",
                "img/fondo-salteado.png",
                "img/background-test.png",
                "client-setup",
                "css/bootstrap.min.css",
                "css/formulario-react.css",
                "pikaday/pikaday.css",
                "dialog-promise/dialog-promise.css",
                "rel-enc/estados.css",
                "css/my-tables.css",
                "css/my-menu.css",
                "css/my-things.css",
                "css/menu.css",
                "rel-enc/my-things2.css",
                "css/formulario-react.css",
                "css/Roboto-Regular.ttf"
            ],
            fallback: [
                {"path":"login", "fallback":"offline"},
                {"path":"logout", "fallback":"offline"},
                {"path":"login#i=sincronizar", "fallback":"offline"},
                {"path":"menu#i=sincronizar", "fallback":"offline"}
            ]
        };
        return jsonResult
    }
    getMenuControles(context:Context) { return [
        {menuType:'proc', name:'encuestas_procesamiento_pasar', label: 'pasar encuestas a procesamiento'},
        {menuType:'table', name:'resumen', table:'control_resumen', selectedByDefault:true},
        {menuType:'table', name:'dominio', table:'control_campo_dominio'},
        {menuType:'table', name:'zona'   , table:'control_campo_zona'  },
        {menuType:'table', name:'comuna' , table:'control_campo_comuna'},
        {menuType:'table', name:'área'   , table:'control_campo_area'  },
    ];
    }
    getMenuLimpieza(context:Context) { 
        return [
            {menuType:'proc', name:'intercambiar_encuestas'},
        ];
    }    
    getMenu(context:Context){
        let menu:MenuInfoBase[] = [];
        let filtroRecepcionista = context.user.rol=='recepcionista' ? {recepcionista: context.user.idper} : {};
        if(this.config.server.policy=='web'){
            if(context.puede?.encuestas.relevar){
                if(this.config['client-setup'].ambiente=='demo' || this.config['client-setup'].ambiente=='test' || this.config['client-setup'].ambiente=='capa'){
                    menu.push({menuType:'demo', name:'demo', selectedByDefault:true})
                }else{
                    menu.push({menuType:'path', name:'relevamiento', path:'/campo'})
                }
                menu.push(
                    {menuType:'sincronizar_dm', name:'sincronizar'},
                );
            }
        }else{
            if(context.puede?.campo?.editar){
                let submenuAsignacion:MenuInfoBase[] = []
                let submenuRecepcion:MenuInfoBase[] = []
                if (context.puede?.campo?.administrar) {
                    submenuAsignacion.push({ menuType: 'table', name: 'general', table: 'areas_asignacion_general' });
                }
                submenuAsignacion.push(
                    { menuType: 'table', name: 'encuestador', table: 't_encu_areas', ff: { tarea: 'encu', ...filtroRecepcionista } },
                    { menuType: 'table', name: 'recuperador', table: 'tareas_tem_recu', ff: { tarea_asignar: 'recu', tarea: 'recu', ...filtroRecepcionista } },
                );
                if(context.puede?.campo?.administrar){
                    submenuAsignacion.push(
                        { menuType: 'table', name: 'supervisor' , table: 'tareas_tem_supe', ff: { tarea_asignar: 'supe', tarea: 'supe', ...filtroRecepcionista } },
                    );
                }
                submenuRecepcion.push(
                    {menuType:'table', name:'encuestador', table:'encuestadores_asignados'},
                    {menuType:'table', name:'recuperador', table:'recuperadores_asignados'},
                )
                menu.push(
                    {menuType:'menu', name:'asignacion', label:'asignación' ,menuContent: submenuAsignacion},
                    {menuType:'menu', name:'recepcion', label:'recepción' ,menuContent:submenuRecepcion},  
                );
                if(context.puede?.campo?.administrar){
                    submenuRecepcion.push(
                        {menuType:'table', name:'supervisor' , table:'supervisores_asignados' },
                        {menuType:'table', name: 'mis_supervisores' , table: 'mis_supervisores_asignados'}
                    );
                    menu.push({menuType:'table', name:'tareas_tem_fin_campo', label:'fin campo'})
                }else{
                    menu.push(
                        {menuType:'menu', name:'supervision', label:'supervisión' ,menuContent:[
                            {menuType:'table', name:'supervisar' , table:'tareas_tem_ingreso', ff:{tarea:'supe', asignado:context.user.idper } }
                        ]}
                    )
                }    
            }
            if(context.puede?.campo?.editar||context.puede?.encuestas?.procesar){
                let submenuVarios:MenuInfoBase[] = [{menuType: 'abrir_encuesta', name: 'abrir_encuesta'}]
                if(context.puede?.campo?.editar){
                    submenuVarios.push({menuType: 'table', name: 'hoja_ruta', table: 'grilla_hoja_ruta', label: 'hoja de ruta'})
                }
                if(context.puede?.campo?.administrar){
                    submenuVarios.push({menuType:'proc', name:'encuestador_dms_mostrar', label:'forzar descarga encuestas DM'})
                } 
                menu.push(      
                    {menuType: 'menu', name: 'varios', menuContent: submenuVarios}
                );
            }    
            if(context.puede?.campo?.administrar||context.puede?.encuestas?.procesar){
                menu.push(
                    {menuType:'menu', name:'control', menuContent:  this.getMenuControles(context) } )  ;
                 /*{menuType:'table', name:'participacion'        , table:'control_campo_participacion'  },*/

            }
            if(context.puede?.encuestas?.procesar){
                menu.push(
                    {menuType:'menu', name:'procesar', menuContent:[
                        {menuType:'table', name:'variables'    },
                        {menuType:'table', name:'consistencias'},
                        {menuType:'table', name:'inconsistencias'},
                        {menuType:'table', name:'tabla_datos'  },
                        {menuType:'table', name:'diccionario'  , label:'diccionarios' },
                        {menuType:'table', name:'tareas_tem_procesamiento', label:'encuestas'}
                    ]},
                );
                if (this.getMenuLimpieza(context).length){
                    menu.push(
                        {menuType:'menu', name:'limpieza', menuContent:this.getMenuLimpieza(context)},                       
                    );
                }    
            }
            var menuConfigurar:MenuInfoBase[] = [];
            if(context.puede?.campo?.administrar||context.puede?.encuestas?.procesar){
                let submenuMuestra:MenuInfoBase[] = [{menuType:'table', name:'tem', label: 'TEM'}]
                if(context.puede?.campo?.administrar){
                    submenuMuestra.push({menuType:'table', name:'tareas'})
                } 
                menuConfigurar.push(
                    {menuType:'menu', name:'muestra', label:'muestra', menuContent:submenuMuestra}
                );
            }
            if(context.puede?.casilleros_texto?.editar){
                menuConfigurar.push(
                    {menuType:'menu', name:'metadatos', menuContent:[
                        {menuType:'table', name:'operativos'},
                        {menuType:'table', name:'formularios' , table:'casilleros_principales'},
                        {menuType:'table', name:'plano'       , table:'casilleros'},
                        {menuType:'table', name:'tipoc'       , label:'tipos de celdas'},
                        {menuType:'table', name:'tipoc_tipoc' , label:'inclusiones de celdas'},
                    ]},
                );
            }
            if(context.superuser){
                menuConfigurar.push(
                    {menuType:'menu', name:'estados_acciones', label:'estados/acciones', menuContent:[
                        {menuType:'table', name:'estados'},
                        {menuType:'table', name:'acciones'},
                        {menuType:'table', name:'estados_acciones'},
                    ]},
                    {menuType:'table', name:'parametros'},
                )
            }
            if(context.puede?.campo?.administrar || context.puede?.encuestas?.procesar){
                menuConfigurar.push(
                    {menuType:'menu', name:'usuarios', menuContent:[
                        {menuType:'table', name:'usuarios', selectedByDefault:true},
                        {menuType:'table', name:'roles'},
                        {menuType:'table', name:'permisos'},
                        {menuType:'table', name:'roles_permisos'},
                    ]},
                )
            }
            if(menuConfigurar.length){
                menu.push({menuType:'menu', name:'configurar', menuContent:menuConfigurar});
            }
        }
        return {menu};
    }
    override prepareGetTables(){
        var be=this;
        super.prepareGetTables();
        this.getTableDefinition={
            ...this.getTableDefinition
            , roles
            , usuarios
            , personal
            , recepcionistas
            , encuestadores_asignados
            , recuperadores_asignados
            , supervisores_asignados
            , mis_supervisores_asignados
            , mis_encuestadores
            , recuperadores
            , supervisores
            , personal_rol
            , permisos
            , roles_permisos
            , roles_subordinados
            , no_rea
            , no_rea_sup
            , semanas
            , estados
            , acciones
            , estados_acciones
            , tem
            , tem_recepcion
            , parametros
            , operaciones
            , comunas
            , areas
            , sincronizaciones
            , tareas
            , tareas_tem
            , tareas_tem_encu
            , tareas_tem_recu
            , tareas_tem_supe
            , tareas_areas
            , areas_asignacion_general
            , grilla_hoja_ruta
            , t_encu_areas
            , t_recu_areas
            , t_supe_areas
            , mis_tareas
            , tem_asignacion
            , tareas_tem_recepcion
            , tareas_tem_ingreso
            , tareas_tem_fin_campo
            , tareas_tem_procesamiento
            , mis_tareas_areas
            , control_campo
            , control_resumen
            , control_campo_zona: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x zona solo cemento', camposCorte:[{name:'zona', typeName:'text'}], sinhogfin:!context.be.caches.tableContent.conReaHogar.con_rea_hogar,filtroWhere:'dominio=3' }
            )
            , control_campo_comuna: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x comuna solo cemento', camposCorte:[{name:'zona', typeName:'text'},{name:'nrocomuna', typeName:'integer'}], sinhogfin:!context.be.caches.tableContent.conReaHogar.con_rea_hogar,filtroWhere:'dominio=3' }
            )
            , control_campo_area: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x area', camposCorte:[{name:'zona', typeName:'text'},{name:'nrocomuna', typeName:'integer'},{name:'area', typeName:'integer'},{name:'participacion_a', typeName:'text'},{name:'clase_a', typeName:'text'}] ,sinhogfin:!context.be.caches.tableContent.conReaHogar.con_rea_hogar}
            )
            , control_campo_participacion: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x participacion', camposCorte:[{name:'participacion', typeName:'bigint'}],sinhogfin:!context.be.caches.tableContent.conReaHogar.con_rea_hogar}
            )
            , control_campo_dominio: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x dominio', camposCorte:[{name:'dominio', typeName:'integer'}],sinhogfin:!context.be.caches.tableContent.conReaHogar.con_rea_hogar}
            )
            , control_dias_carga
            , viviendas
            , visitas
            , hogares
            , personas
            , visitas_sup
            , hogares_sup
            , personas_sup
        }
        be.appendToTableDefinition('consistencias',function(tableDef, context){
            tableDef.editable=tableDef.editable || context.puede?.encuestas?.procesar;
            tableDef.fields.forEach(function(field){
                if(field.name=='error_compilacion'){
                    if(field.visible){
                        console.error('************ QUITAR ESTO error_compilacion ya es visible');
                    }
                    field.visible=true;
                }
            })
        })
        be.appendToTableDefinition('inconsistencias',function(tableDef, context){
            tableDef.sql={...tableDef.sql, isTable:true};
            tableDef.fields.splice(2,0,
                {name:'vivienda'    , typeName:'text'     , editable: false},
                {name:'hogar'       , typeName:'bigint'   , editable: false},
                {name:'persona'     , typeName:'bigint'   , editable: false},
                {name:'visita'      , typeName:'bigint'   , editable: false},
            );
            tableDef.editable=tableDef.editable || context.puede?.encuestas.justificar;
            tableDef.fields.forEach(function(field){
                if(field.name=='pk_integrada'){
                    field.visible=false;
                }
                if(field.name=='justificacion'){
                    field.editable=context?.forDump || context?.puede?.encuestas.justificar;
                }
            })
            tableDef.fields=tableDef.fields.concat(['tarea_actual','tarea_anterior'].map(fn=>{
                return {name: fn   , typeName: 'text'  , editable: false, inTable: false}
            }))
            tableDef.sql!.from=`
                (select i.*, t.tarea_actual,tt.tarea_anterior
                  from inconsistencias i join tem t on i.vivienda=t.enc and i.operativo=t.operativo 
                  left join tareas_tem tt on t.operativo=tt.operativo and t.enc=tt.enc and t.tarea_actual=tt.tarea 
                )  
            `
        })
        be.appendToTableDefinition('operativos',function(tableDef, context){
            tableDef.fields.splice(2,0,{
                name:'config_sorteo', 
                typeName:'jsonb',
                editable: false
            },{
                name:'habilitacion_boton_formulario', 
                typeName:'jsonb',
                editable: false
            },{
                name:'disform_cerrado', 
                typeName:'boolean', 
                defaultValue: false, 
                editable: context?.forDump||['admin','dis_conceptual'].includes(context.user.rol)
            },{
                name:'con_rea_hogar', 
                typeName:'boolean', 
                editable: false,
                defaultDbValue: 'true'
            });
        })
        be.appendToTableDefinition('usuarios',function(tableDef, context){
            let claveNuevaField = tableDef.fields.find((field)=>field.name == 'clave_nueva')!;
            var adminOCoord = 'admin'===context?.user.rol||context?.puede?.campo?.administrar;
            claveNuevaField.allow = {select:adminOCoord, update:true, insert:false};
        })
        be.appendToTableDefinition('variables',function(tableDef, context){
            var esAdmin= context?.user.rol==='admin';
            tableDef.editable=tableDef.editable || context?.puede?.encuestas?.procesar;
            tableDef.allow={delete: esAdmin};            
        })

        // be.appendToTableDefinition('casilleros',function(tableDef, context){
        //     tableDef.constraints = tableDef.constraints.filter(c=>c.consName!='casilleros salto REL')
        // })
    }
  }
}

export var AppDmEncu = emergeAppDmEncu(emergeAppProcesamiento(emergeAppConsistencias(emergeAppVarCal(emergeAppDatosExt(emergeAppOperativos(AppBackend))))));
export type AppAppDmEncuType = InstanceType<typeof AppDmEncu>;