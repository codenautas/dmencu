"use strict";

import * as procesamiento from "procesamiento";
import {ProceduresDmEncu} from "./procedures-dmencu";

import * as pg from "pg-promise-strict";
import {json} from "pg-promise-strict";
import * as miniTools from "mini-tools";
import {Context, MenuInfoBase, Request, Response} from "./types-dmencu";
import { changing } from "best-globals";

import * as yazl from "yazl";
import { NextFunction } from "express-serve-static-core";
import * as likeAr from "like-ar";

//import { tem               } from "./table-tem";
import { roles               } from "./table-roles";
import { personal            } from "./table-personal";
import { recepcionistas      } from "./table-recepcionistas";
import { relevadores         } from "./table-relevadores";
import { mis_relevadores     } from "./table-mis_relevadores";
import { personal_rol        } from "./table-personal_rol";
import { permisos            } from "./table-permisos";
import { roles_permisos      } from "./table-roles_permisos";
import { parametros          } from "./table-parametros";
import { roles_subordinados  } from "./table-roles_subordinados";

import {no_rea               } from "./table-no_rea";
import {tem                  } from "./table-tem";
import {tem_recepcion        } from "./table-tem_recepcion";
import {semanas              } from "./table-semanas";
import { planchas            } from './table-planchas';
import { resultados_test     } from './table-resultados-test';
import { etiquetas           } from './table-etiquetas';
import { etiquetas_resultado } from './table-etiquetas_resultado';
import { etiquetas_resultado_plus } from './table-etiquetas_resultado_plus';
import { usuarios            } from './table-usuarios';
import { operaciones         } from './table-operaciones';
import { comunas             } from './table-comunas';
import { areas               } from './table-areas';
import { sincronizaciones    } from './table-sincronizaciones';
import { viviendas           } from './table-viviendas';
import { viviendas_extendida } from './table-viviendas_extendida';
import { personas            } from './table-personas';
import { personas_extendida  } from './table-personas_extendida';
import { personas_extendida_onda_anterior  } from './table-personas_extendida_onda_anterior';
import { tareas              } from './table-tareas';
import { tareas_tem          } from './table-tareas_tem';
import { tareas_areas        } from './table-tareas_areas';
import { mis_tareas          } from './table-mis_tareas';
import { mis_tareas_tem      } from './table-mis_tareas_tem';
import { mis_tareas_areas    } from './table-mis_tareas_areas';
import { resultados_tarea    } from './table-resultados_tarea';
import { control_campo       } from './table-control_campo';
import { control_resumen     } from './table-control_resumen';
import { rea_sin_resultados  } from './table-rea_sin_resultados';
import { etiquetas_duplicadas} from './table-etiquetas_duplicadas';

import {defConfig} from "./def-config"

export type Constructor<T> = new(...args: any[]) => T;
export function emergeAppDmEncu<T extends Constructor<procesamiento.AppProcesamientoType>>(Base:T){
  return class AppDmEncu extends Base{
    constructor(...args:any[]){ 
        super(args); 
        this.caches.tableContent = this.caches.tableContent || {};
        this.caches.tableContent.no_rea=[]
        this.caches.tableContent.no_rea_groups=[]
        this.metaEncIncluirCasillerosSaltoREL = false;
    }
    async getProcedures(){
        var procedimientoAReemplazar=["caso_guardar","caso_traer"];
        var parentProc = await super.getProcedures();
        parentProc = parentProc.filter((procedure:any) => !procedimientoAReemplazar.includes(procedure.action));
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
                var htmlMain=be.mainPage({useragent, user}, false, {skipMenu:true}).toHtmlDoc();
               miniTools.serveText(htmlMain,'html')(req,res);
            }else{
                res.redirect(baseUrl+'/login#w=path&path=/campo')
            }
        });
        mainApp.get(baseUrl+'/consulta',async function(req,res,_next){
            // @ts-ignore sé que voy a recibir useragent por los middlewares de Backend-plus
            var {useragent, user} = req;
            //if(user){
                var manifestPath = 'carga-dm/dm-manifest.manifest';
                /** @type {{type:'js', src:string}[]} */
                var htmlMain=be.mainPage({useragent, user}, false, {skipMenu:true}).toHtmlDoc();
               miniTools.serveText(htmlMain,'html')(req,res);
            //}else{
            //    res.redirect(baseUrl+'/login#w=path&path=/consulta')
            //}
        });
        mainApp.get(baseUrl+'/consulta-ws',async function(req,res,_next){
            var {etiqueta,numero_documento} = req.query;
            var context = be.getContext(req);
            let response =  await be.inTransaction(req, function(client:pg.Client){
                context.client=client;
                var procedureResultadoConsultar = ProceduresDmEncu.find((proc)=>proc.action =='resultado_consultar');
                return procedureResultadoConsultar.coreFunction(context, {etiqueta,numero_documento});
            });
            miniTools.serveText(JSON.stringify(response), 'application/json')(req,res);
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
            console.dir(be.permisosRolSoloTrue,{depth:9});
            console.dir(be.permisosSuperuser,{depth:9});
            console.dir(be.permisosParaNadie,{depth:9});
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
        return [
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
                ),
            { type: 'js', module: 'redux-typed-reducer', modPath:'../dist', file:'redux-typed-reducer.js' },
            { type: 'js', src: 'adapt.js' },
            { type: 'js', src: 'tipos.js' },
            { type: 'js', src: 'generador-qr.js' },
            { type: 'js', src: 'digitov.js' },
            { type: 'js', src: 'bypass-formulario.js' },
            { type: 'js', src: 'redux-formulario.js' },
            { type: 'js', src: 'render-general.js' },
            { type: 'js', src: 'render-formulario.js' },
            { type: 'js', src: 'client/service-worker.js' },
            { type: 'css', file: 'menu.css' },
            { type: 'css', file: 'formulario-react.css' },
            { type: 'css', file: 'etiquetas-qr.css' },
            ... menuedResources
        ]
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
        })
        console.log('caches ok');
    }
    sqlNoreaCase(campoNecesario:string){
        var be=this;
        return `CASE ${be.caches.tableContent.no_rea.map(x=>
            ` WHEN json_encuesta ->> ${be.db.quoteLiteral(x.variable)} = ${be.db.quoteLiteral(x.valor)} THEN ${be.db.quoteLiteral(x[campoNecesario])}`
        ).join('')} WHEN TRUE THEN NULL END`
    }
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
    getMenu(context:Context){
        let menu:MenuInfoBase[] = [];
        if((context.puede?.encuestas.relevar || "TODO: CORREGIR, POR AHORA TODOS PUEDEN") && this.config['client-setup'].para_dm){
            if(this.config['client-setup'].ambiente=='demo' || this.config['client-setup'].ambiente=='test' || this.config['client-setup'].ambiente=='capa'){
                menu.push({menuType:'demo', name:'demo', selectedByDefault:true})
            }else{
                menu.push({menuType:'path', name:'relevamiento', path:'/campo'})
            }
            menu.push(
                {menuType:'sincronizar_dm', name:'sincronizar'},
            );
            menu.push(
                {menuType:'abrir_encuesta', name:'abrir_encuesta'},
            )
        }
        if(context.puede?.lab_resultado?.editar || context.puede?.lab_resultado?.ver){
            let menuContent=[];
            if(context.puede?.lab_resultado?.editar && !context.superuser){
                menuContent.push(
                    {menuType:'proc', name:'laboratorio_ingresar' , label:'recepción muestra'}
                )
                menuContent.push(
                    {menuType:'proc', name:'resultado_cargar'    , label:'carga resultado'}
                )
            }
            if(context.puede?.lab_resultado?.ver){
                menuContent.push(
                    {menuType:'resultados_ver', name:'resultados_ver',  label:'ver resultados'},
                )
            }
            if(context.puede?.lab_resultado?.editar){
                if(!context.superuser){
                    menuContent.push(
                        {menuType:'proc', name:'resultado_rectificar', label:'rectificar resultado'},
                    )
                    menuContent.push(
                        {menuType:'table', name:'usuarios'}
                    )
                }
            }
            menu = [ ...menu, 
                // {menuType:'menu', name:'laboratorio', menuContent}
            ]
        }
        if(context.puede?.campo?.editar){
            menu.push(
                {menuType:'menu', name:'recepcion', label:'recepción' ,menuContent:[
                    //{menuType:'carga_recepcionista', name:'cargar'},
                    {menuType:'table', name:'mis_areas', table:'areas', ff:{recepcionista:context.user.idper}},
                    {menuType:'table', name:'mis_relevadores'},
                    {menuType:'table', name:'areas'},
                    {menuType:'table', name:'tem_recepcion', label:'TEM'},
                ]},            
            )
        }
        console.log("context user", context.user)
        if(context.superuser){
            menu.push(
                {menuType:'menu', name:'control', menuContent:[
                    //{menuType:'carga_recepcionista', name:'cargar'},
                    {menuType:'table', name:'resumen', table:'control_resumen', selectedByDefault:true},
                    {menuType:'table', name:'dominio', table:'control_campo'},
                    {menuType:'table', name:'zona'   , table:'control_campo_zona'  },
                    {menuType:'table', name:'comuna' , table:'control_campo_comuna'},
                    {menuType:'table', name:'área'   , table:'control_campo_area'  },
                    {menuType:'table', name:'participacion'        , table:'control_campo_participacion'  },
                    {menuType:'table', name:'rea_sin_resultados'   , table:'rea_sin_resultados'  },
                    {menuType:'table', name:'etiquetas_duplicadas' , table:'etiquetas_duplicadas'  },
                ]},            
            )
        }else if(context.user.rol=='comunicacion'){
            menu.push(
                {menuType:'menu', name:'control', menuContent:[
                    {menuType:'table', name:'rea_sin_resultados' , table:'rea_sin_resultados'  },
                ]},            
            )
        }
        if(context.puede?.citas?.programar){
            //menu.push(
            //    {menuType:'menu', name:'citas' ,menuContent:[
            //        //{menuType:'carga_recepcionista', name:'cargar'},
            //        {menuType:'table', name:'mis_areas', table:'areas', ff:{recepcionista:context.user.idper}}, //REVISAR CONDICION de búsqueda
            //        {menuType:'table', name:'areas'},
            //    ]},            
            //)
        }
        if(context.superuser){
            menu = [ ...menu,
                {menuType:'menu', name:'configurar', menuContent:[
                    {menuType:'menu', name:'etiquetas', menuContent:[
                        {menuType:'table', name:'planchas'},
                        {menuType:'table', name:'etiquetas'},
                        {menuType:'table', name:'resultados_test'},
                        {menuType:'proc', name:'imprimir', proc:'qrs_traer'},
                    ]},
                    {menuType:'menu', name:'muestra', label:'muestra', menuContent:[
                        {menuType:'table', name:'tem', label: 'TEM'} ,
                        {menuType:'table', name:'tareas'},
                        {menuType:'table', name:'resultados_tarea'},
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
            , relevadores
            , mis_relevadores
            , personal_rol
            , permisos
            , roles_permisos
            , roles_subordinados
            , no_rea
            , semanas
            , tem: tem
            , tem_recepcion
            , parametros
            , planchas
            , resultados_test
            , etiquetas
            , etiquetas_resultado
            , etiquetas_resultado_plus
            , operaciones
            , comunas
            , areas
            , sincronizaciones
            , viviendas
            , viviendas_extendida
            , personas
            , personas_extendida
            , personas_extendida_onda_anterior
            , tareas
            , resultados_tarea
            , tareas_tem: tareas_tem
            , tareas_areas
            , mis_tareas
            , mis_tareas_tem
            , mis_tareas_areas
            , control_campo
            , control_resumen
            , control_campo_zona: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x zona solo cemento', camposCorte:[{name:'zona', typeName:'text'}], filtroWhere:'tipo_domicilio=1' }
            )
            , control_campo_comuna: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x comuna solo cemento', camposCorte:[{name:'zona', typeName:'text'},{name:'nrocomuna', typeName:'integer'}], filtroWhere:'tipo_domicilio=1' }
            )
            , control_campo_area: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x area', camposCorte:[{name:'zona', typeName:'text'},{name:'nrocomuna', typeName:'integer'},{name:'area', typeName:'integer'},{name:'participacion_a', typeName:'text'},{name:'clase_a', typeName:'text'}]}
            )
            , control_campo_participacion: context=>control_campo(context, 
                {nombre:'control_campo_comuna', title:'control campo x participacion', camposCorte:[{name:'tipo_domicilio', typeName:'bigint'},{name:'participacion', typeName:'bigint'}]}
            ),
            rea_sin_resultados
            , etiquetas_duplicadas
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
        // be.appendToTableDefinition('casilleros',function(tableDef, context){
        //     tableDef.constraints = tableDef.constraints.filter(c=>c.consName!='casilleros salto REL')
        // })
        // be.appendToTableDefinition('usuarios', function (tableDef,context) {
        //     tableDef.fields.splice(2,0,
        //         {name:'idper', typeName:'text'}
        //     );
        //     tableDef.fields.forEach(function(field){
        //         if(field.name=='clave_nueva'){
        //             field.allow=changing(field.allow, {
        //                 select:true, update:true, insert:true
        //             });
        //             //field.editable=true;
        //             // no deja cambiar clave_nueva por condicion en admin_chpass
        //         }
        //     })
        //     var q = context.be.db.quoteLiteral;
        //     var esSuperUser=context.superuser||false;
        //     //o filtrar por usuario ${q(context.user.usuario)}
        //     //asumo solo relacion de rol de un nivel
        //     tableDef.sql=changing(tableDef.sql,{
        //         isTable:true,
        //         where:` (${q(esSuperUser)} 
        //             or usuarios.rol= ${q(context.user.rol)}
        //             or exists (select rol_subordinado from roles_subordinados s where s.rol=${q(context.user.rol)} and usuarios.rol=s.rol_subordinado)                      
        //         )`
        //     });
        //     tableDef.editable=true;
        //     tableDef.foreignKeys = tableDef.foreignKeys||[];
        //     tableDef.foreignKeys.push({references:'roles'  , fields:['rol'] , onDelete: 'cascade'});
        //     tableDef.constraints=tableDef.constraints||[];
        //     tableDef.constraints.push(
        //         {constraintType:'unique', fields:['idper']}
        //     );
        // });
    }
  }
}