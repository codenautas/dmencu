import {html} from "js-to-html";
import {traerEstructura} from "../unlogged/redux-formulario";
import { CasoState,  
    IdFormulario, DatosByPassPersistibles, IdEnc,
} from "../unlogged/tipos";
import * as likeAr from "like-ar";
import {getEstructura, setPersistirDatosByPass} from "../unlogged/bypass-formulario"
import {cargarEstructura, cargarHojaDeRuta, GLOVAR_DATOSBYPASS, GLOVAR_ESTRUCTURA, GLOVAR_MODOBYPASS} from "../unlogged/abrir-formulario"

//TODO GENERALIZAR

const TAREA_DEFAULT = 'encu';

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
    return datos;
}

myOwn.wScreens.abrir_encuesta={
    parameters:[
        {name:'operativo' , typeName:'text', defaultValue:'etoi211', references:'operativos'},
        {name:'tarea'     , typeName:'text', defaultValue:TAREA_DEFAULT, references: 'tareas'},
        {name:'encuesta'  , typeName:'integer', defaultValue:130031}
    ],
    autoproced:true,
    mainAction:async (params)=>{
        // antes: abrirDirecto
        var {operativo, encuesta, tarea} = params;
        var estructura = getEstructura();
        var carga = await my.ajax.dm_forpkraiz_cargar({operativo, vivienda:encuesta, tarea}) as DatosByPassPersistibles;
        if(!estructura || (estructura.timestamp??0) < carga.timestampEstructura! || estructura.operativo != operativo || my.config.config.devel){
            estructura = await traerEstructura({operativo})
            cargarEstructura(estructura);
        }
        //@ts-ignore
        var state:CasoState = {}
        inicializarState(state);
        var forPkRaiz = {formulario:carga.informacionHdr[encuesta as IdEnc].tarea.main_form, vivienda:encuesta};
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
myOwn.clientSides.tareasTemRow={
    update:(depot)=>{
        var tarea:'nada'|'preasignar'|'cargar'|'realizar'|'verificar'='nada';
        var row=depot.row;
        // @ts-ignore
        var idper=my.config.idper;
        var esperar:boolean=false;
        if(row.habilitada){
            if(!row.asignante && !row.asignado){
                tarea='preasignar';
                esperar=true;
            }else if(!row.asignado || !row.fecha_asignacion || !row.operacion){
                tarea='cargar';
                esperar=row.asignante!=idper;
            }else if(!row.rea){
                tarea='realizar';
                esperar=row.asignado!=idper;
            }else if(!row.verificado){
                tarea='verificar';
                esperar=row.asignante!=idper;
            }
        }
        var poner={
            asignante          :tarea=='preasignar' && (esperar?'esperar':'normal'),
            asignado           :tarea=='cargar'     && (esperar?'esperar':'normal'),
            fecha_asignacion   :tarea=='cargar'     && (esperar?'esperar':'normal'),
            operacion          :tarea=='cargar'     && (esperar?'esperar':'normal'),
            carga_observaciones:(tarea=='cargar'     || tarea=='realizar' && !row.cargado && !row.rea ) && row.asignante==idper && 'optativo',
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
var crearBotonVer = async (depot:myOwn.Depot, fieldName:string, label:'abrir'|'ver')=>{
    tareas = tareas?tareas:(await myOwn.ajax.table_data({table: `tareas`, fixedFields:[]})).filter((tarea)=>!!tarea.main_form && tarea.operativo==depot.row.operativo);
    depot.rowControls[fieldName].innerHTML='';
    tareas.forEach((tarea:{tarea:string, nombre:string, main_form:IdFormulario})=>{
        var openButton = html.button({class:'open-dm-button'},`${label} ${tarea.tarea}`).create();
        depot.rowControls[fieldName].appendChild(openButton);
        openButton.onclick = async function(){
            var urlAndWindowName = `menu#i=abrir_encuesta&up={"operativo":"${depot.row.operativo}","tarea":"${tarea.tarea}","encuesta":${depot.row.enc}}&autoproced=true`;
            window.open(urlAndWindowName,urlAndWindowName);
        }
    })
}

myOwn.clientSides.abrir={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        var label:'ver'|'abrir' = depot.row.cargado_dm?'ver':'abrir';
        crearBotonVer(depot,fieldName,label); //no espero promesa porque no es necesario
    }
};

myOwn.clientSides.abrirRecepcion={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        var label:'ver'|'abrir' = depot.row.cargado?'ver':'abrir';
        crearBotonVer(depot,fieldName,label); //no espero promesa porque no es necesario
    }
};

myOwn.wScreens.demo=async function(_addrParams){
    // @ts-ignore desplegarFormularioActual global
    window.desplegarFormularioActual({modoDemo:true});
}

function arrayFlat<T>(arrays:T[][]):T[]{
    return ([] as T[]).concat.apply([], arrays);
}
