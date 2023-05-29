import {html} from "js-to-html";
import {traerEstructura} from "../unlogged/redux-formulario";
import { CasoState,  
    IdFormulario, DatosByPassPersistibles, IdEnc, IdOperativo, IdTarea, EstadoAccion, DireccionAccion,
} from "../unlogged/tipos";
import * as likeAr from "like-ar";
import {getEstructura, setPersistirDatosByPass} from "../unlogged/bypass-formulario"
import {BACKUPS, cargarEstructura, cargarHojaDeRuta, GLOVAR_DATOSBYPASS, GLOVAR_ESTRUCTURA, GLOVAR_MODOBYPASS} from "../unlogged/abrir-formulario"
import { Operativo } from "meta-enc";
import {sleep, coalesce} from "best-globals";


//TODO GENERALIZAR

const ABRIR_TAB = "_abrir";
const TAREA_DEFAULT = 'encu';
var OPERATIVO_DEFAULT:string|null= null;

myOwn.autoSetupFunctions.push(async ()=>{
    var my = myOwn;    
    try{
        OPERATIVO_DEFAULT = await my.ajax.operativo_get({});
    }catch(err){
        OPERATIVO_DEFAULT=null;
    }
    myOwn.wScreens.abrir_encuesta={
        parameters:[
            {name:'operativo' , typeName:'text', defaultValue:OPERATIVO_DEFAULT, references:'operativos'},
            {name:'tarea'     , typeName:'text', defaultValue:TAREA_DEFAULT, references: 'tareas'},
            {name:'enc'       , typeName:'integer', defaultValue:130031}
        ],
        autoproced:true,
        mainAction:async (params)=>{
            // antes: abrirDirecto
            var {operativo, enc, tarea} = params;
            var estructura = getEstructura();
            var carga = await my.ajax.dm_forpkraiz_cargar({operativo, vivienda:enc, tarea}) as DatosByPassPersistibles;
            if(!estructura || (estructura.timestamp??0) < carga.timestampEstructura! || estructura.operativo != operativo || my.config.config.devel){
                estructura = await traerEstructura({operativo})
                cargarEstructura(estructura);
            }
            //@ts-ignore
            var state:CasoState = {}
            inicializarState(state);
            var forPkRaiz = {formulario:carga.informacionHdr[enc as IdEnc].tarea.main_form, vivienda:enc};
            setPersistirDatosByPass(
                async function persistirDatosByPassEnBaseDeDatos(persistentes:DatosByPassPersistibles){
                    if(persistentes.soloLectura){
                        throw new Error("Está intentando modificar una encuesta abierta como solo lectura, no se guardaron los cambios")
                    }
                    await my.ajax.dm_forpkraiz_descargar({operativo, persistentes});
                }
            )
            if(!carga.respuestas.viviendas[forPkRaiz.vivienda!]){
                throw new Error(`No se encuentra la vivienda ${forPkRaiz.vivienda!}`);
            }
            cargarHojaDeRuta({...carga, modoAlmacenamiento:'session'});
            // @ts-ignore
            desplegarFormularioActual({operativo, modoDemo:false, forPkRaiz});
        }
    };
    myOwn.wScreens.obtener_telefono={
        parameters:[],
        autoproced:true,
        mainAction:async (_params)=>{
            // antes: abrirDirecto
            var {operativo, tarea} = {operativo: OPERATIVO_DEFAULT, tarea: TAREA_DEFAULT};
            let enc = parseInt(await my.ajax.get_random_free_case({operativo})); 
            await myOwn.wScreens.abrir_encuesta.mainAction({operativo, enc, tarea});
        }
    };
    myOwn.wScreens.consistir_encuesta={
        parameters:[
            {name:'operativo' , typeName:'text', defaultValue:OPERATIVO_DEFAULT, references:'operativos'},
            {name:'tarea'     , typeName:'text'},
            {name:'enc'       , typeName:'integer'}
        ],
        autoproced:true,
        mainAction:async (params)=>{
            var {operativo, tarea, enc } = params;
            var result = await myOwn.ajax.consistir_encuesta({
                operativo: operativo,
                id_caso: enc
            });
            if(result.ok){
                var fixedFields = [];
                fixedFields.push({fieldName: 'operativo', value: operativo});
                fixedFields.push({fieldName: 'vivienda', value: enc});
                var mainLayout = document.getElementById('main_layout')!;
                var divGrilla = html.div({id:'inconsistencias'}).create();
                mainLayout.insertBefore(divGrilla, mainLayout.firstChild);
                mainLayout.insertBefore(
                    crearBotonVerAbrirEncuesta(
                        operativo,
                        tarea,
                        enc, 
                        `ir a encuesta ${enc}`
                    ), 
                    mainLayout.firstChild
                );
                my.tableGrid("inconsistencias", divGrilla,{tableDef:{},fixedFields: fixedFields});
            }else{
                throw new Error(result.message);
            }
        }
    }
});


//quita bootstrap del head para que no rompa los estilos de BEPlus (solo se usa bootstrap en el form)
var linkNode = document.querySelectorAll('[href="css/bootstrap.min.css"]');
linkNode[0]?.parentNode?.removeChild(linkNode[0]);

function consistir_filtro(tarea, rea_tem, rea){
    return tarea?rea_tem:rea;
};

var tareas:any = null;

function htmlNumero(num:number){
    return html.span({class:'numero'},''+(num??''))
}

var persistirEnMemoria = async (persistentes:DatosByPassPersistibles) => {
    var {modoAlmacenamiento} = persistentes
        if(modoAlmacenamiento=='local'){
            my.setLocalVar(GLOVAR_DATOSBYPASS, persistentes)
        }else{
            my.setSessionVar(GLOVAR_DATOSBYPASS, persistentes)
        }
        my.setSessionVar(GLOVAR_MODOBYPASS, modoAlmacenamiento)
}

async function sincronizarDatos(persistentes:DatosByPassPersistibles|null){
    var datos = await my.ajax.dm_sincronizar({persistentes});
    var operativo = datos.operativo;
    persistirEnMemoria({...datos, modoAlmacenamiento:'local'});
    var estructura = await traerEstructura({operativo})
    my.setLocalVar(GLOVAR_ESTRUCTURA, estructura);
    my.removeLocalVar(BACKUPS);
    return datos;
}



var mostrarInfoLocal = (divAvisoSincro:HTMLDivElement, titulo:string, nroSincro:number|null, mostrarLinkHdr: boolean)=>{
    let datosByPass = my.getLocalVar(GLOVAR_DATOSBYPASS);
    if(datosByPass){
        divAvisoSincro.append(html.div({id:'aviso-sincro'}, [
            nroSincro?html.p(["Número de sincronización: ", html.b(""+nroSincro.toString())]):null,
            html.h4(titulo),
            html.p([htmlNumero(likeAr(datosByPass.cargas).array().length),' areas: ',likeAr(datosByPass.cargas).keys().join(', ')]),
            html.p([htmlNumero(likeAr(datosByPass.respuestas.viviendas).array().length),' viviendas']),
            mostrarLinkHdr?html.a({href:'./campo'},[html.b('IR A LA HOJA DE RUTA')]):null
        ]).create());
    }else{
        divAvisoSincro.appendChild(html.div({class:'aviso'},[
            html.h4('Sistema vacío'),
            html.p('No hay información de formularios'),
            html.p('No hay información de viviendas')
        ]).create());
    }
}
var procederSincroFun = async (button:HTMLButtonElement, divAvisoSincro:HTMLDivElement)=>{
    button.disabled=true;
    button.className='download-dm-button';
    divAvisoSincro.innerHTML='';
    try{
        var datosByPass:DatosByPassPersistibles = my.getLocalVar(GLOVAR_DATOSBYPASS);
        var datos = await sincronizarDatos(datosByPass);
        mostrarInfoLocal(divAvisoSincro, 'datos recibidos', datos.num_sincro, true)
    }catch(err){
        alertPromise(err.message)
        throw err
    }finally{
        button.disabled=false;
        button.className='download-dm-button-cont';
    }
}
myOwn.wScreens.sincronizar_dm=async function(){
    var mainLayout = document.getElementById('main_layout')!;
    var procederButton = html.button({class:'download-dm-button-cont'},'proceder ⇒').create();
    var divAvisoSincro:HTMLDivElement=html.div().create();
    mostrarInfoLocal(mainLayout as HTMLDivElement, 'información a transmitir', null, false)
    mainLayout.appendChild(procederButton);
    mainLayout.appendChild(divAvisoSincro);
    procederButton.onclick = ()=>procederSincroFun(procederButton, divAvisoSincro)
};

function inicializarState(state: CasoState) {
    state.modo = {
        demo: false
    };
    // OJO state.opciones se modifica acá y en otro lado con este mismo cartel
    state.opciones = {
        bienvenido: true,
        forPk: null,
        pilaForPk: [],
        modoDespliegue: "relevamiento",
        modoDirecto: false,
        modoBorrarRespuesta: null,
        conCampoOpciones: false,
        saltoAutomatico: true,
    };
    //@ts-ignore
    state.feedbackRowValidator = {};
}
/*
function mostrarDatosPersona(hayDatos:boolean, datos:any, divResult:HTMLDivElement){
    //TODO: EVALUAR SI CONVIENE TRAERLO DE LA BASE
    var tiposDocumento = ['DNI argentino', 'Documento extranjero', 'No tiene documento', 'Otro'];
    var paisDocumento = ['Uruguay', 'Paraguay', 'Brasil', 'Bolivia', 'Chile', 'Perú', 'Venezuela', 'Otro'];
    divResult.appendChild(
        hayDatos?
            html.div({class:'datos-persona-cargada'},[
                html.h2("Datos persona"),
                html.div({class:'ficha-persona'},[
                    html.div([html.label('Apellido: '), datos.apellido]),
                    html.div([html.label('Nombres: '), datos.nombres]),
                    datos.tipoDocumento?
                        html.div([
                            html.label('Tipo documento: '), 
                            tiposDocumento[datos.tipoDocumento-1],
                            datos.tipoDocumento==4 && datos.tipoDocumentoEspecificado?' ('+ datos.tipoDocumentoEspecificado+')':'',
                        ])
                    :
                        '',
                    datos.tipoDocumento==2 && datos.paisDocumento?
                        html.div([
                            html.label('Pais: '), 
                            paisDocumento[datos.paisDocumento-1],
                            datos.paisDocumento==8 && datos.paisDocumentoEspecificado?' ('+datos.paisDocumentoEspecificado+')':'',
                        ])
                    :
                        '',
                    datos.tipoDocumento!=3 && datos.tipoDocumento?html.div([html.label('Nº Documento: '), datos.documento]):'',
                    datos.celular?html.div([html.label('Cel.: '), datos.celular]):'',
                    datos.email?html.div([html.label('Email: '), datos.email]):'',
                    datos.telefonoAlternativo?html.div([html.label('Tel. alternativo: '), datos.telefonoAlternativo]):'',
                    datos.observaciones?html.div([html.label('Observaciones: '), datos.observaciones]):'',
                ])
            ]).create()
        :
            html.p("No se encontró una encuesta para la etiqueta cargada").create()
    )
}
*/
/*myOwn.clientSides.tareasTemRow={
    update:(depot)=>{
        var tarea:'nada'|'preasignar'|'cargar'|'realizar'|'verificar'='nada';
        var row=depot.row;
        // @ts-ignore
        var idper=my.config.idper;
        var esperar:boolean=false;
        if(row.habilitada){
            if(!row.recepcionista && !row.asignado){
                tarea='preasignar';
                esperar=true;
            }else if(!row.asignado || !row.fecha_asignacion || !row.operacion){
                tarea='cargar';
                esperar=row.recepcionista!=idper;
            }else if(!row.rea){
                tarea='realizar';
                esperar=row.asignado!=idper;
            }else if(!row.verificado){
                tarea='verificar';
                esperar=row.recepcionista!=idper;
            }
        }
        var poner={
            recepcionista          :tarea=='preasignar' && (esperar?'esperar':'normal'),
            asignado           :tarea=='cargar'     && (esperar?'esperar':'normal'),
            fecha_asignacion   :tarea=='cargar'     && (esperar?'esperar':'normal'),
            operacion          :tarea=='cargar'     && (esperar?'esperar':'normal'),
            carga_observaciones:(tarea=='cargar'     || tarea=='realizar' && !row.cargado && !row.rea ) && row.recepcionista==idper && 'optativo',
            verificado         :tarea=='verificar'  && (esperar?'esperar':'normal'),
            obs_verificado     :tarea=='verificar'  && (esperar?'esperar':'optativo'),
        }
        likeAr(poner).forEach((valor, campo)=>{
            if(!valor){
                depot.rowControls[campo].removeAttribute('my-mandatory')
            }else{
                depot.rowControls[campo].setAttribute('my-mandatory',valor);
            }
        })
    },
    prepare: function(){}
}
*/

var crearBotonVerAbrirEncuesta = (operativo:IdOperativo,tarea:IdTarea,encuesta:number, label:string)=>{
    var up = {
        operativo:operativo,
        tarea:tarea,
        enc:encuesta
    }
    let ver = html.button({},label).create();
    ver.onclick = ()=> window.open(location.origin+location.pathname+my.menuSeparator+`w=abrir_encuesta&up=${JSON.stringify(up)}&autoproced=true`, ABRIR_TAB)
    return ver
}

var crearBotonesVerAbrirTareas = async (depot:myOwn.Depot, fieldName:string, label:'abrir'|'ver')=>{
    tareas = tareas?tareas:(await myOwn.ajax.table_data({table: `tareas`, fixedFields:[]}));
    var misTareas = tareas.filter((tarea)=>!!tarea.main_form && tarea.operativo==depot.row.operativo && depot.manager.def.tableName=='tem'?true:depot.row.tarea == tarea.tarea);
    depot.rowControls[fieldName].innerHTML='';
    misTareas.forEach((tarea:{tarea:string, nombre:string, main_form:IdFormulario})=>{
        let buttonLabel = `${label} ${tarea.tarea}`;
        let ver = crearBotonVerAbrirEncuesta(
            depot.row.operativo as IdOperativo,
            tarea.tarea as IdTarea, 
            Number(depot.row.enc),
            buttonLabel
        );
        ver.style='margin:0px 2px;';
        depot.rowControls[fieldName].appendChild(ver);
    })
}

var getAbrirOver = (depot:myOwn.Depot,_fieldName:string)=>
    depot.row.cargado_dm || !depot.row['estados__permite_editar_encuesta']?'ver':'abrir'


myOwn.clientSides.abrir={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        var label:'ver'|'abrir' = getAbrirOver(depot,fieldName);
        crearBotonesVerAbrirTareas(depot,fieldName,label); //no espero promesa porque no es necesario
    }
};

myOwn.clientSides.abrirRecepcion={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        var label:'ver'|'abrir' = getAbrirOver(depot,fieldName);
        crearBotonesVerAbrirTareas(depot,fieldName,label); //no espero promesa porque no es necesario
    }
};

myOwn.clientSides.verIconoSvg={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        let td = depot.rowControls[fieldName];
        td.innerHTML='';
        if(depot.row.path_icono_svg){
            var svg = html.svg({
                class:"svg-acciones"
            },[
                html.path({
                    d:depot.row.path_icono_svg
                })
            ]).create();
            svg.setAttribute("viewBox","0 0 50 50");
            td.appendChild(svg);
        }
    }
};

var crearSVG = (path:string,props:any) => {
    var svg = html.svg(props || {},[
        html.path({
            d:path
        })
    ]).create();
    svg.setAttribute("viewBox","0 0 50 50");
    return svg
}
var crearBotonAccion = (depot:myOwn.Depot, action:EstadoAccion)=>{
    let  accionSinGuiones = action.eaccion.replace('_',' ');
    var svg = crearSVG(action.path_icono_svg,{class:"svg-acciones"})
    if(action.desactiva_boton){
        return html.span({class:`sin-boton-accion`},[accionSinGuiones, svg as unknown as HTMLElement]).create()
    }
    let button = html.button({
        class:`boton-accion boton-accion-${action.eaccion_direccion}`
    },[
        `${accionSinGuiones}`,
        //@ts-ignore svg es htmlelement
        action.path_icono_svg?svg:null,
    ]).create();
    button.onclick = ()=> {
        var actionFun = async ()=>{
            button.disabled=true;
            try{
                var result = await my.ajax.accion_tareas_tem_ejecutar({
                    operativo: depot.row.operativo,
                    tarea: depot.row.tarea,
                    enc: depot.row.enc,
                    condicion: action.condicion,
                    accion: action
                });
                console.log(result)
                var grid=depot.manager;
                grid.retrieveRowAndRefresh(depot)
                if(action.nombre_wscreen){
                    //TODO acomodar esto en algun momento
                    let params = depot.row;
                    params.enc = Number(params.enc);
                    window.open(location.origin+location.pathname+my.menuSeparator+`w=${action.nombre_wscreen}&up=${JSON.stringify(params)}&autoproced=true`, ABRIR_TAB)
                }
            }catch(err){
                alertPromise(err.message)
                throw err
            }finally{
                //retraso la habilitación porque a veces tarda en redibujarse la botonera y puede traer problemas si dan doble click 
                //ya que ejecuta nuevamente una acción que ya se ejecutó (y terminó) antes
                setTimeout(()=>button.disabled=false,3000)
            }
        }
        
        var confirmPromiseOpts: DialogOptions = {}
        if(action.confirma){
            confirmPromiseOpts.askForNoRepeat = 'no volver a mostrar'; //muestra mensaje por default pero anda igual
            var buttonsDef = [
                {label:'sí', value:true},
                {label:'no', value:false}
            ]
            confirmPromise(`confirma acción "${accionSinGuiones}"?`, {...confirmPromiseOpts, buttonsDef}).then(actionFun);
        }else{
            actionFun();
        }
    }
    return button
}

var crearBotonesAcciones = async (opts:{depot:myOwn.Depot, fieldName:string, direccion: DireccionAccion})=>{
    let {depot,fieldName,direccion} = opts;
    let td = depot.rowControls[fieldName];
    td.innerHTML='';
    (depot.rowControls.acciones.getTypedValue()||[])
        .filter((action:EstadoAccion)=>action.eaccion_direccion==direccion)
        .forEach((action:EstadoAccion)=>td.appendChild(crearBotonAccion(depot, action)));
}

var crearSwitch = (opts:{round?:boolean, disabled?:boolean, checked?:boolean, onClickFun:Function, onErrFun?:Function})=>{
    var checkbox = html.input({type:'checkbox', checked:opts.checked}).create();
    checkbox.onclick = async()=>{
        try{
            checkbox.disabled=true;
            await opts.onClickFun()
        }catch(err){
            alertPromise(err.message)
            throw err
        }finally{
            checkbox.disabled=false;
        }
    }
    return html.label({class:'switch'},[
        checkbox,
        html.span({class:`slider ${opts.round?'round':''}`}),
    ]).create();
}

myOwn.clientSides.habilitar={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        var td = depot.rowControls[fieldName];
        td.innerHTML = "";
        td.appendChild(
            crearSwitch({
                round:true,
                checked:depot.row.habilitada,
                onClickFun: async ()=>{
                    await my.ajax.encuesta_habilitar_deshabilitar({
                        operativo: depot.row.operativo,
                        enc: depot.row.enc
                    });
                    var grid=depot.manager;
                    setTimeout(()=>grid.retrieveRowAndRefresh(depot),300);//para que se vea el efecto
                }
            })
        );
    }
};

myOwn.clientSides.accionesAvance={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        crearBotonesAcciones({depot,fieldName,direccion:'avance'});
    }
};

myOwn.clientSides.accionesRetroceso={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        crearBotonesAcciones({depot,fieldName,direccion:'retroceso'});
    }
};

myOwn.clientSides.accionesBlanqueo={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        crearBotonesAcciones({depot,fieldName,direccion:'blanqueo'});
    }
};

function 
botonClientSideEnGrilla(opts: { nombreBoton: string, llamada: (depot: myOwn.Depot) => Promise<any> }) {
    return {
        prepare: function (depot: myOwn.Depot, fieldName: string) {
            var td = depot.rowControls[fieldName];
            var boton = html.button(opts.nombreBoton).create();
            td.innerHTML = "";
            td.appendChild(boton);
            var restaurarBoton = function () {
                boton.disabled = false;
                boton.textContent = opts.nombreBoton;
                boton.style.backgroundColor = '';
            }

            boton.onclick = function () {
                boton.disabled = true;
                boton.textContent = 'procesando...';
                opts.llamada(depot).then(async function(result){
                    if(result && typeof result === 'object' && 'ok' in result){
                        if(result.ok){
                            var grid=depot.manager;
                            await grid.retrieveRowAndRefresh(depot);
                            if (depot.detailControls.inconsistencias){
                                depot.detailControls.inconsistencias.forceDisplayDetailGrid({});
                            }  
                            boton.textContent =  result.message;
                            boton.title = result;
                            boton.style.backgroundColor = '#8F8';
                        }else{
                            throw new Error(result.message);
                        }
                    }
                    setTimeout(restaurarBoton, 2500);
                }, function (err) {
                    boton.textContent = 'error';
                    boton.style.backgroundColor = '#FF8';
                    alertPromise(err.message);
                })
            }
            //if ((depot.row.consistido==null  && depot.row.rea!=null) || depot.row.modificado!=null && depot.row.consistido!=null && depot.row.modificado >depot.row.consistido){
            //    boton.style.backgroundColor='#8CF'
            //}
        }        
    };
}


myOwn.clientSides.consistir = botonClientSideEnGrilla({
    nombreBoton: 'consistir',
    llamada: function (depot: myOwn.Depot) {
        var myReaFieldName = depot.manager.def.tableName=="tem"?'rea':'ult_rea';
        var filtroRea=consistir_filtro(depot.row.tarea, depot.row[myReaFieldName], depot.row.rea)
        return filtroRea? myOwn.ajax.consistir_encuesta({
            operativo: depot.row.operativo,
            id_caso: depot.row.enc
        }): alertPromise('La encuesta debe tener dato en rea para poder consistirla.');
    }
});

myOwn.wScreens.demo=async function(_addrParams){
    // @ts-ignore desplegarFormularioActual global
    window.desplegarFormularioActual({modoDemo:true});
}

function arrayFlat<T>(arrays:T[][]):T[]{
    return ([] as T[]).concat.apply([], arrays);
}
