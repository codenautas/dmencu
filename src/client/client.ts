import {html, HtmlTag} from "js-to-html";
import {dmTraerDatosFormulario, traerEstructura, replaceSpecialWords} from "../unlogged/redux-formulario";
import { CasoState, EtiquetaOpts, IdUnidadAnalisis, IdVariable, LOCAL_STORAGE_STATE_NAME,  
    ForPkRaiz, HojaDeRuta, IdFormulario, IdOperativo
} from "../unlogged/tipos";
import { crearEtiqueta } from "../unlogged/generador-qr";
import * as TypedControls from "typed-controls";
import * as likeAr from "like-ar";
import {getEstructura, getHojaDeRuta, setPersistirDatosByPass, DatosByPassPersistibles, calcularFeedbackHojaDeRuta, setDatosByPass, setEstructura} from "../unlogged/bypass-formulario"
import {cargarEstructura, cargarHojaDeRuta, GLOVAR_DATOSBYPASS, GLOVAR_ESTRUCTURA, GLOVAR_MODOBYPASS} from "../unlogged/abrir-formulario"

export const OPERATIVO = 'etoi211';

//TODO GENERALIZAR

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

async function sincronizarDatos(state:CasoState|null, persistentes:DatosByPassPersistibles|null){
    var datos = await my.ajax.dm_sincronizar({datos:state, persistentes});
    var operativo = datos.operativo;
    persistirEnMemoria({hojaDeRuta: {respuestas: datos.respuestas}, modoAlmacenamiento:'local'});
    var estructura = await traerEstructura({operativo})
    my.setLocalVar(GLOVAR_ESTRUCTURA, estructura);
    // @ts-ignore
    if(state==null){
        //@ts-ignore
        state={};
    }
    if(state){
        state.datos=datos;
        state.modo = {
            demo: false
        }
        // OJO state.opciones se modifica acá y en otro lado con este mismo cartel
        state.opciones = {
            bienvenido: false,
            forPk: null,
            pilaForPk: [], 
            modoDespliegue: "relevamiento",
            modoDirecto: false,
            modoBorrarRespuesta: null,
            conCampoOpciones: false,
            saltoAutomatico: true,
        }
        //@ts-ignore
        state.feedbackRowValidator={};
    }
    
    delete(state.datos.respuestas);
    my.setLocalVar(LOCAL_STORAGE_STATE_NAME, state);
    return datos;
}

myOwn.wScreens.abrir_encuesta={
    parameters:[
        {name:'operativo' , typeName:'text', defaultValue:'etoi211', references:'operativos'},
        {name:'formulario', typeName:'text', defaultValue:'F:RE'},
        {name:'encuesta'  , typeName:'integer', defaultValue:130031}
    ],
    autoproced:true,
    mainAction:async (params)=>{
        // antes: abrirDirecto
        var {operativo, encuesta, formulario} = params;
        let forPkRaiz:ForPkRaiz = {formulario, vivienda:encuesta}
        var estructura = getEstructura();
        // TODO: EN UN DM ESTO SE TRAE DEL LOCALSTORAGE
        var carga = await my.ajax.dm_forpkraiz_cargar({operativo, forPkRaiz}) as {hojaDeRuta:HojaDeRuta, timestampEstructura:number};
        if(!estructura || (estructura.timestamp??0) < carga.timestampEstructura || estructura.operativo != operativo || my.config.config.devel){
            estructura = await traerEstructura({operativo})
            cargarEstructura(estructura);
        }
        setPersistirDatosByPass(
            async function persistirDatosByPassEnBaseDeDatos(persistentes:DatosByPassPersistibles){
                await my.ajax.dm_forpkraiz_descargar({operativo, persistentes});
            }
        )
        if(!carga.hojaDeRuta.respuestas.viviendas[forPkRaiz.vivienda!]){
            throw new Error(`No se encuentra la vivienda ${forPkRaiz.vivienda!}`);
        }
        cargarHojaDeRuta({...carga, modoAlmacenamiento:'session'});
        // @ts-ignore
        desplegarFormularioActual({operativo, modoDemo:false, forPkRaiz, useSessionStorage:true});
    }
}

var mostrarInfoLocal = (divAvisoSincro:HTMLDivElement, titulo:string, nroSincro:number|null, mostrarLinkHdr: boolean)=>{
    if(my.existsLocalVar(LOCAL_STORAGE_STATE_NAME)){
        let state = my.getLocalVar(LOCAL_STORAGE_STATE_NAME);
        let datosByPass = my.getLocalVar(GLOVAR_DATOSBYPASS);
        divAvisoSincro.append(html.div({id:'aviso-sincro'}, [
            nroSincro?html.p(["Número de sincronización: ", html.b(""+nroSincro.toString())]):null,
            html.h4(titulo),
            html.p([htmlNumero(likeAr(state.datos.cargas).array().length),' areas: ',likeAr(state.datos.cargas).keys().join(', ')]),
            html.p([htmlNumero(likeAr(datosByPass.hojaDeRuta.respuestas.viviendas).array().length),' viviendas']),
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
        var state = my.getLocalVar(LOCAL_STORAGE_STATE_NAME);
        var datosByPass:DatosByPassPersistibles = my.getLocalVar(GLOVAR_DATOSBYPASS);
        var datos = await sincronizarDatos(state?.datos || null, datosByPass);
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

myOwn.clientSides.avisar={
    prepare: (depot, fieldName)=>{
        var avisarButton = html.button({class:'avisar-button'},'aviso').create();
        depot.rowControls[fieldName].appendChild(avisarButton);
        avisarButton.onclick = async function(){
            try{
                avisarButton.disabled=true;
                await my.ajax.etiqueta_avisar({operativo: depot.row['operativo'], etiqueta:depot.row['etiqueta']});        
                var grid=depot.manager;
                grid.retrieveRowAndRefresh(depot)
            }catch(err){
                alertPromise(err.message)
            }finally{
                avisarButton.disabled=false;
            }
        }
    },
};

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
            }else if(!row.resultado){
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
            carga_observaciones:(tarea=='cargar'   || tarea=='realizar' && !row.cargado && !row.resultado && !row.notas) && row.asignante==idper && 'optativo',
            resultado          :tarea=='realizar'   && (esperar?'esperar':'normal'),
            notas              :(tarea=='realizar' || tarea=='verificar' && !row.verificado) && row.asignado==idper && 'optativo',
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

myOwn.clientSides.avisar_email={
    prepare: (depot, fieldName)=>{
        var {email, resultado, nombre, apellido, mail_aviso_texto, mail_aviso_asunto, tipo_informe} = depot.row;
        if(resultado && email && resultado.toLowerCase()=='negativo' && tipo_informe!='5'){
            // OJO QUE EL TEXTO CAMBIA MUCHO SI FUERA A POSITIVOS.
            var body = replaceSpecialWords(mail_aviso_texto || '', nombre || '', apellido || '', resultado || '');
            var subject = replaceSpecialWords(mail_aviso_asunto || '', nombre || '', apellido || '', resultado || '');
            var avisarEmailButton = html.a({
                class:'email-button',
                href:`mailto:${email}?Subject=${subject}&body=${body}`
            },'enviar mail').create();
            depot.rowControls[fieldName].appendChild(avisarEmailButton);
        }else if(tipo_informe==5){
            depot.rowControls[fieldName].appendChild(html.span("geriatrico").create());
        }else if(resultado && resultado.toLowerCase()!='negativo'){
            depot.rowControls[fieldName].appendChild(html.span("avisa salud").create());
        }
    },
};

myOwn.wScreens.resultados_ver = async ()=>{
    var mainLayout = document.getElementById('main_layout')!;
    mainLayout.appendChild(html.h1('ingrese fecha de busqueda').create());
    var fechaElement=html.td({style:'min-width:100px; border:solid 1px black', $attrs:{"typed-controls-direct-input":"true"}}).create();
    var searchButton = html.button({class:'ver-resultados-button'},'buscar').create();
    var allButton = html.button({class:'ver-todos-resultados-button'},'todos').create();
    mainLayout.appendChild(html.label(['fecha:',fechaElement]).create());
    mainLayout.appendChild(searchButton);
    mainLayout.appendChild(allButton);
    TypedControls.adaptElement(fechaElement,{typeName:'date'});
    var resultDiv=html.div({id:"grilla-resultados-div"}).create();
    mainLayout.appendChild(resultDiv);
    searchButton.onclick=async ()=>{
        resultDiv.innerHTML='';
        var fecha;
        try{
            // @ts-ignore typed-controls
            fecha = fechaElement.getPlainValue();
        }catch(err){
            // @ts-ignore typed-controls
            fechaElement.setTypedValue(null)
        }
        var fixedFields = [];
        if(fecha){
            fixedFields.push({fieldName: 'fecha', value: fecha})
            
        }
        my.tableGrid('etiquetas_resultado',resultDiv,{tableDef:{}, fixedFields})
    }
    allButton.onclick=async ()=>{
        resultDiv.innerHTML='';
        // @ts-ignore typed-controls
        fechaElement.setTypedValue(null)
        my.tableGrid('etiquetas_resultado',resultDiv,{tableDef:{}})
    }
}

var crearBotonVer = (depot:myOwn.Depot, fieldName:string, label:'abrir'|'ver')=>{
    var openButton = html.button({class:'open-dm-button'},label).create();
    depot.rowControls[fieldName].innerHTML='';
    depot.rowControls[fieldName].appendChild(openButton);
    openButton.onclick = async function(){
        var urlAndWindowName = 'menu#w=abrir_encuesta&formulario=F:RE&encuesta='+depot.row.enc;
        window.open(urlAndWindowName,urlAndWindowName);
    }
}

myOwn.clientSides.abrir={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        var label:'ver'|'abrir' = depot.row.cargado_dm?'ver':'abrir';
        crearBotonVer(depot,fieldName,label);
    }
};

myOwn.clientSides.abrirRecepcion={
    prepare: (_depot, _fieldName)=>{},
    update: (depot, fieldName)=>{
        var label:'ver'|'abrir' = depot.row.cargado?'ver':'abrir';
        crearBotonVer(depot,fieldName,label);
    }
};

myOwn.wScreens.demo=async function(_addrParams){
    // @ts-ignore desplegarFormularioActual global
    window.desplegarFormularioActual({modoDemo:true});
}

function arrayFlat<T>(arrays:T[][]):T[]{
    return ([] as T[]).concat.apply([], arrays);
}
