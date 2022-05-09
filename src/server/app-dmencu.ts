"use strict";

import * as procesamiento from "procesamiento";
import {getOperativoActual, ProceduresDmEncu} from "./procedures-dmencu";

import * as pg from "pg-promise-strict";
import {json} from "pg-promise-strict";
import * as miniTools from "mini-tools";
import {Context, MenuInfoBase, Request, Response} from "./types-dmencu";
import { changing } from "best-globals";

import * as yazl from "yazl";
import { NextFunction } from "express-serve-static-core";
import * as likeAr from "like-ar";

import {promises as fs } from "fs";

import { roles               } from "./table-roles";
import { personal            } from "./table-personal";
import { recepcionistas      } from "./table-recepcionistas";
import { encuestadores         } from "./table-encuestadores";
import { mis_encuestadores     } from "./table-mis_encuestadores";
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
import { tareas_tem          } from './table-tareas_tem';
import { tareas_areas        } from './table-tareas_areas';
import { mis_tareas          } from './table-mis_tareas';
import { mis_tareas_tem      } from './table-mis_tareas_tem';
import { mis_tareas_areas    } from './table-mis_tareas_areas';
import { control_campo       } from './table-control_campo';
import { control_resumen     } from './table-control_resumen';
import { viviendas           } from './table-viviendas';
import { visitas             } from './table-visitas';
import { hogares             } from './table-hogares';
import { personas            } from './table-personas';
import { visitas_sup         } from './table-visitas_sup';
import { hogares_sup         } from './table-hogares_sup';
import { personas_sup        } from './table-personas_sup';


import {defConfig} from "./def-config"

const APP_DM_VERSION="#22-05-09";

export type Constructor<T> = new(...args: any[]) => T;
export function emergeAppDmEncu<T extends Constructor<procesamiento.AppProcesamientoType>>(Base:T){
  return class AppDmEncu extends Base{
    constructor(...args:any[]){ 
        super(args); 
        this.caches.tableContent = this.caches.tableContent || {};
        this.caches.tableContent.no_rea=[]
        this.caches.tableContent.no_rea_groups=[]
        this.metaEncIncluirCasillerosSaltoREL = false;
        this.timestampEstructura = new Date().getTime();
    }
    async getProcedures(){
        var be = this;
        var procedimientoAReemplazar=["caso_guardar","caso_traer"];
        var parentProc = await super.getProcedures();
        parentProc = parentProc.filter((procedure:any) => !procedimientoAReemplazar.includes(procedure.action));
        parentProc = parentProc.map(procDef=>{
            if(procDef.action == 'table_record_save' || procDef.action == 'table_record_delete'){
                var coreFunctionInterno = procDef.coreFunction;
                procDef.coreFunction = async function(context, parameters){
                    var result = await coreFunctionInterno(context, parameters)
                    if(parameters.table == 'casilleros'){
                        be.timestampEstructura = new Date().getTime();
                        console.log('se tocó la estructura', be.timestampEstructura)
                    }
                    return result;
                }
            }
            return procDef;
        })
        return parentProc.concat(ProceduresDmEncu);
    }
    async checkDatabaseStructure(_client:Client){
    }
    addSchrödingerServices(mainApp:procesamiento.Express, baseUrl:string){
        let be=this;
        super.addSchrödingerServices(mainApp, baseUrl);
        mainApp.use(function(req:Request,res:Response, next:NextFunction){
            if(req.session && !req.session.install){
                req.session.install=Math.random().toString().replace('.','');
            }
            next();
        })
        mainApp.get(baseUrl+'/campo',async function(req,res,_next){
            // @ts-ignore sé que voy a recibir useragent por los middlewares de Backend-plus
            var {useragent, user} = req;
            if(user){
                /** @type {{type:'js', src:string}[]} */
                var webManifestPath = 'carga-dm/web-manifest.webmanifest';
                var htmlMain=be.mainPage({useragent, user}, false, {skipMenu:true, webManifestPath}).toHtmlDoc();
               miniTools.serveText(htmlMain,'html')(req,res);
            }else{
                res.redirect(baseUrl+'/login#w=path&path=/campo')
            }
        });
        var createServiceWorker = async function(){
            var sw = await fs.readFile('node_modules/service-worker-admin/dist/service-worker-wo-manifest.js', 'utf8');
            var manifest = be.createResourcesForCacheJson({});
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
                miniTools.serveErr(req,res,next)(err);
            }
        });
        mainApp.get(baseUrl+`/carga-dm/web-manifest.webmanifest`, async function(req, res, next){
            const APP_NAME = (await be.inTransaction(null, (client:pg.Client)=>
                client.query("select operativo from parametros where unico_registro").fetchUniqueValue()
            )).value;
            var sufijo = baseUrl.includes('test')?'_test':
                baseUrl.includes('capa')?'_capa':'';
            try{
                const content = {
                  "name": `${APP_NAME} Progressive Web App`,
                  "short_name": `${APP_NAME} PWA`,
                  "description": `Progressive Web App for ${APP_NAME}.`,
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
                  "start_url": "../campo",
                  "display": "standalone",
                  "theme_color": "#3F51B5",
                  "background_color": "#6d60ed"
                }
                miniTools.serveText(JSON.stringify(content), 'application/json')(req,res);
            }catch(err){
                console.log(err);
                miniTools.serveErr(req, res, next)(err);
            }
        });
    }
    addLoggedServices(){
        var be = this;
        super.addLoggedServices();
        be.app.get('/manifest.manifest', async function(req:Request, res:Response, next:NextFunction){
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
                if(stat.isFile){
                    zip.addFile(path,fileName);
                }
            }));
            zip.end();
        })
    }
    async postConfig(){
        await super.postConfig();
        var be=this;
        be.metaEncIncluirCasillerosSaltoREL = false;
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
            be.permisosRol=results[0].value;
            be.permisosRolSoloTrue=results[1].value;
            be.permisosSuperuser=results[2].value;
            be.permisosParaNadie=likeAr(be.permisosSuperuser).map(p=>likeAr(p).map(va=>false).plain()).plain()
            //console.dir(be.permisosRolSoloTrue,{depth:9});
            //console.dir(be.permisosSuperuser,{depth:9});
            //console.dir(be.permisosParaNadie,{depth:9});
        });
        await this.refreshCaches();
    }
    configStaticConfig(){
        super.configStaticConfig();
        this.setStaticConfig(defConfig);
    }
    clientIncludes(req, opts) {
        var be = this;
        var logged = req && opts && !opts.skipMenu ;
        var menuedResources=logged ? [
            { type:'js' , src: 'client/client.js' },
        ]:[
            {type:'js' , src:'unlogged.js' },
        ];
        if(opts && opts.extraFiles){
            menuedResources = menuedResources.concat(opts.extraFiles);
        }
        var resources = [
            { type: 'js', module: 'react', modPath: 'umd', fileDevelopment:'react.development.js', file:'react.production.min.js' },
            { type: 'js', module: 'react-dom', modPath: 'umd', fileDevelopment:'react-dom.development.js', file:'react-dom.production.min.js' },
            { type: 'js', module: '@material-ui/core', modPath: 'umd', fileDevelopment:'material-ui.development.js', file:'material-ui.production.min.js' },
            { type: 'js', module: 'clsx', file:'clsx.min.js' },
            { type: 'js', module: 'redux', modPath:'../dist', fileDevelopment:'redux.js', file:'redux.min.js' },
            { type: 'js', module: 'react-redux', modPath:'../dist', fileDevelopment:'react-redux.js', file:'react-redux.min.js' },
            { type: 'js', module: 'memoize-one',  file:'memoize-one.js' },
            { type: 'js', module: 'qrcode', modPath: '../build', file: 'qrcode.js'},
            ...super.clientIncludes(req, opts).filter(m=>m.file!='formularios.css')
                .filter(m=>logged || true
                                //&& m.file!='operativos.js' 
                                //&& m.file!='meta-enc.js'
                                //&& m.file!='datos-ext.js'
                                //&& m.file!='consistencias.js'
                                && m.file!='var-cal.js'
                                && m.file!='var-cal.js'
                                //&& m.file!='varcal.js'
                //)
                //.filter(m=>logged || true
                //    && m.file!='operativos.js' 
                //    && m.file!='meta-enc.js'
                //    && m.file!='datos-ext.js'
                //    && m.file!='consistencias.js'
                //    && m.file!='varcal.js'
                ),
            { type: 'js', module: 'service-worker-admin',  file:'service-worker-admin.js' },
            { type: 'js', module: 'redux-typed-reducer', modPath:'../dist', file:'redux-typed-reducer.js' },
            { type: 'js', src: 'adapt.js' },
            { type: 'js', src: 'tipos.js' },
            { type: 'js', src: 'bypass-formulario.js' },
            { type: 'js', src: 'redux-formulario.js' },
            { type: 'js', src: 'render-general.js' },
            { type: 'js', src: 'render-formulario.js' },
            { type: 'js', src: 'abrir-formulario.js' },
            { type: 'css', file: 'menu.css' },
            { type: 'css', file: 'formulario-react.css' },
            ... menuedResources
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
        })
        console.log('caches ok');
    }
    //sqlNoreaCase(campoNecesario:string){
    //    var be=this;
    //    return `CASE ${be.caches.tableContent.no_rea.map(x=>
    //        ` WHEN norea  = ${be.db.quoteLiteral(x.no_rea)}::integer THEN ${be.db.quoteLiteral(x[campoNecesario])}`
    //    ).join('')} WHEN TRUE THEN NULL END`
    //}    
    getContext(req:Request):Context{
        var be = this;
        var fatherContext = super.getContext(req);
        if(fatherContext.user){
            if(be.permisosRol[req.user.rol]?.superuser){
                return {superuser:true, puede: be.permisosSuperuser, ...fatherContext}
            }else{
                return {puede: be.permisosRol[req.user.rol]?.puede, ...fatherContext}
            }
        }
        return {puede:be.permisosParaNadie, ...fatherContext};
    }
    getContextForDump():Context{
        var fatherContext = super.getContextForDump();
        return {superuser:true, puede: this.permisosSuperuser, ...fatherContext};
    }
    getClientSetupForSendToFrontEnd(req:Request){
        return {
            ...super.getClientSetupForSendToFrontEnd(req),
            idper: req.user?.idper
        }
    
    }
    createResourcesForCacheJson(parameters){
        var be = this;
        var jsonResult = {};
        
        jsonResult.version = APP_DM_VERSION;
        jsonResult.appName = 'dmencu';
        jsonResult.cache=[
            "campo",
            "offline",
            "lib/react.production.min.js",
            "lib/react-dom.production.min.js",
            "lib/material-ui.production.min.js",
            "lib/clsx.min.js",
            "lib/redux.min.js",
            "lib/react-redux.min.js",
            "lib/memoize-one.js",
            "lib/qrcode.js",
            "lib/require-bro.js",
            "lib/cast-error.js",
            "lib/like-ar.js",
            "lib/best-globals.js",
            "lib/json4all.js",
            "lib/js-to-html.js",
            "lib/redux-typed-reducer.js",
            "adapt.js",
            "unlogged.js",
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
            "tipos.js",
            "bypass-formulario.js",
            "redux-formulario.js",
            "render-general.js",
            "render-formulario.js",
            "abrir-formulario.js",
            "client_modules/row-validator.js",
            "client/menu.js",
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
        ]
        jsonResult.fallback=[
            {"path":"login", "fallback":"offline"},
            {"path":"logout", "fallback":"offline"},
            {"path":"login#i=sincronizar", "fallback":"offline"},
            {"path":"menu#i=sincronizar", "fallback":"offline"}
        ];
        return jsonResult
    }
    getMenu(context:Context){
        let menu:MenuInfoBase[] = [];
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
                menu.push(
                    {menuType:'abrir_encuesta', name:'abrir_encuesta'},
                )
                menu.push(
                    {menuType:'menu', name:'recepcion', label:'recepción' ,menuContent:[
                        {menuType:'table', name:'mis_areas', table:'areas', ff:{recepcionista:context.user.idper}},
                        {menuType:'table', name:'mis_encuestadores'},
                        {menuType:'table', name:'areas'},
                        {menuType:'table', name:'tem_recepcion', label:'TEM'},
                    ]},            
                )
            }
            console.log("context user", context.user)
            if(context.superuser){
                menu.push(
                    {menuType:'menu', name:'control', menuContent:[
                        {menuType:'table', name:'resumen', table:'control_resumen', selectedByDefault:true},
                        {menuType:'table', name:'dominio', table:'control_campo_dominio'},
                        {menuType:'table', name:'zona'   , table:'control_campo_zona'  },
                        {menuType:'table', name:'comuna' , table:'control_campo_comuna'},
                        {menuType:'table', name:'área'   , table:'control_campo_area'  },
                        {menuType:'table', name:'participacion'        , table:'control_campo_participacion'  },
                    ]},            
                )
            }
            if(context.puede.encuestas.procesar){
                menu = [ ...menu,
                    {menuType:'menu', name:'procesar', menuContent:[
                        {menuType:'table', name:'variables'    },
                        {menuType:'table', name:'consistencias'},
                        {menuType:'table', name:'inconsistencias'},
                        {menuType:'table', name:'tabla_datos'  },
                        {menuType:'table', name:'diccionario'  , label:'diccionarios' },
                    ]},
                ]
            }
            if(context.superuser){
                menu = [ ...menu,
                    {menuType:'menu', name:'configurar', menuContent:[
                        {menuType:'menu', name:'muestra', label:'muestra', menuContent:[
                            {menuType:'table', name:'tem', label: 'TEM'} ,
                            {menuType:'table', name:'tareas'},
                        // {menuType:'table', name:'personal_rol'},
                        ]},
                        {menuType:'menu', name:'metadatos', menuContent:[
                            {menuType:'table', name:'operativos'},
                            {menuType:'table', name:'formularios' , table:'casilleros_principales'},
                            {menuType:'table', name:'plano'       , table:'casilleros'},
                            {menuType:'table', name:'tipoc'       , label:'tipos de celdas'},
                            {menuType:'table', name:'tipoc_tipoc' , label:'inclusiones de celdas'},
                        ]},
                        {menuType:'table', name:'parametros'},
                    ]},
                    {menuType:'menu', name:'usuarios', menuContent:[
                        {menuType:'table', name:'usuarios', selectedByDefault:true},
                        {menuType:'table', name:'roles'},
                        {menuType:'table', name:'permisos'},
                        {menuType:'table', name:'roles_permisos'},
                    ]},
                    // {menuType:'proc', name:'generate_tabledef', proc:'tabledef_generate', label:'generar tablas'  },
                ]
            }
        }
        
        
        return {menu};
    }
    prepareGetTables(){
        var be=this;
        super.prepareGetTables();
        this.getTableDefinition={
            ...this.getTableDefinition
            , roles
            , usuarios
            , personal
            , recepcionistas
            , encuestadores
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
            , tem: tem
            , tem_recepcion
            , parametros
            , operaciones
            , comunas
            , areas
            , sincronizaciones
            , tareas
            , tareas_tem: tareas_tem
            , tareas_areas
            , mis_tareas
            , mis_tareas_tem
            , mis_tareas_areas
            , control_campo
            , control_resumen
            , control_campo_zona: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x zona solo cemento', camposCorte:[{name:'zona', typeName:'text'}], filtroWhere:'dominio=3' }
            )
            , control_campo_comuna: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x comuna solo cemento', camposCorte:[{name:'zona', typeName:'text'},{name:'nrocomuna', typeName:'integer'}], filtroWhere:'dominio=3' }
            )
            , control_campo_area: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x area', camposCorte:[{name:'zona', typeName:'text'},{name:'nrocomuna', typeName:'integer'},{name:'area', typeName:'integer'},{name:'participacion_a', typeName:'text'},{name:'clase_a', typeName:'text'}]}
            )
            , control_campo_participacion: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x participacion', camposCorte:[{name:'participacion', typeName:'bigint'}]}
            )
            , control_campo_dominio: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x dominio', camposCorte:[{name:'dominio', typeName:'integer'}]}
            ),
            viviendas,
            visitas,
            hogares,      
            personas,     
            visitas_sup,  
            hogares_sup,  
            personas_sup,         
        }
        be.appendToTableDefinition('consistencias',function(tableDef, context){
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
            tableDef.fields.splice(2,0,
                {name:'id_caso', typeName:'text'   , label:'caso'   , editable: false},
               // {name:'p0'     , typeName:'integer', label:'persona', editable: false}
            );
            tableDef.editable=tableDef.editable || context.puede?.encuestas.justificar;
            tableDef.fields.forEach(function(field){
                if(field.name=='pk_integrada'){
                    field.visible=false;
                }
                if(field.name=='justificacion'){
                    field.editable=context.forDump || context.puede?.encuestas.justificar;
                }
            })
        })
        be.appendToTableDefinition('operativos',function(tableDef, context){
            tableDef.fields.splice(2,0,{
                name:'config_sorteo', 
                typeName:'jsonb',
                editable: false
            });
            tableDef.fields.splice(3,0,{
                name:'disform_cerrado', 
                typeName:'boolean', 
                defaultValue: false, 
                editable: context.forDump||['admin','dis_conceptual'].includes(context.user.rol)}
            );
        })

        // be.appendToTableDefinition('casilleros',function(tableDef, context){
        //     tableDef.constraints = tableDef.constraints.filter(c=>c.consName!='casilleros salto REL')
        // })
    }
  }
}
