import {html, HtmlTag} from "js-to-html";
import {dmTraerDatosFormulario, traerEstructura, replaceSpecialWords} from "../unlogged/redux-formulario";
import { CasoState, EtiquetaOpts, IdUnidadAnalisis, IdVariable, LOCAL_STORAGE_STATE_NAME,  
    ForPkRaiz, HojaDeRuta, IdFormulario
} from "../unlogged/tipos";
import { crearEtiqueta } from "../unlogged/generador-qr";
import * as TypedControls from "typed-controls";
import * as likeAr from "like-ar";
import {cargarEstructura, cargarHojaDeRuta, getEstructura, getHojaDeRuta, calcularFeedbackHojaDeRuta} from "../unlogged/bypass-formulario"

const OPERATIVO = 'etoi211';
const OPERATIVO_ACTUAL = 'etoi211';

async function traerHdr(opts:{modoDemo:boolean}){
    await dmTraerDatosFormulario({...opts, modoAlmacenamiento:'local'});
    history.replaceState(null, '', `${location.origin+location.pathname}/../campo`);
    location.reload();   
}


function htmlNumero(num:number){
    return html.span({class:'numero'},''+(num??''))
}

async function sincronizarDatos(state:CasoState|null){
    var datos = await my.ajax.dm_sincronizar({datos:state?.datos||null});
    var estructura = await traerEstructura({operativo:OPERATIVO})
    cargarEstructura(estructura);
    // @ts-ignore
    cargarHojaDeRuta(datos.hojaDeRuta);
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
        }
        //@ts-ignore
        state.feedbackRowValidator={};
        my.setLocalVar(LOCAL_STORAGE_STATE_NAME, state);
    }
    return datos;
}

async function abrirDirecto(forPkRaiz:ForPkRaiz){
    if(!getEstructura() || my.config.config.devel){
        var estructura = await traerEstructura({operativo:OPERATIVO})
        cargarEstructura(estructura);
    }
    var carga = await my.ajax.dm_forpkraiz_cargar({forPkRaiz}) as {hojaDeRuta:HojaDeRuta};
    if(!carga.hojaDeRuta.respuestas.viviendas[forPkRaiz.vivienda!]){
        throw new Error(`No se encuentra la vivienda ${forPkRaiz.vivienda!}`);
    }
    cargarHojaDeRuta({...carga, modoAlmacenamiento:'session'});
}

myOwn.wScreens.abrir_encuesta={
    parameters:[
        {name:'encuesta', typeName:'integer', defaultValue:130031}
    ],
    mainAction:(params, _divResult)=>{
        // GENERALIZAR:
        // @ts-ignore
        return myOwn.wScreens.abrirDirecto({forPkRaiz:{formulario:"F:RE" as IdFormulario, vivienda:params.encuesta}})
    }
}

myOwn.wScreens.sincronizar_dm=async function(){
    var mainLayout = document.getElementById('main_layout')!;
    // TODO: Generalizar
    var dv1='dv1' as IdVariable;
    var c5ok='c5ok' as IdVariable;

    if(myOwn.existsLocalVar(LOCAL_STORAGE_STATE_NAME)){
        var state: CasoState = my.getLocalVar(LOCAL_STORAGE_STATE_NAME);
        var hojaDeRuta = getHojaDeRuta();
        mainLayout.appendChild(html.div({class:'aviso'},[
            html.h4('información a transmitir'),
            html.p([htmlNumero(likeAr(state.datos.cargas).array().length),' areas: ',likeAr(state.datos.cargas).keys().join(', ')]),
            ...(likeAr(hojaDeRuta.respuestas).map((lista, nombreLista)=>
                html.p([htmlNumero(lista.length), ' '+nombreLista])
            ).array())
        ]).create());
        var downloadButton = html.button({class:'download-dm-button-cont'},'proceder ⇒').create();
        mainLayout.appendChild(downloadButton);
        var divAvisoSincro:HTMLDivElement=html.div().create();
        mainLayout.appendChild(divAvisoSincro);
        downloadButton.onclick = async function(){
            downloadButton.disabled=true;
            downloadButton.className='download-dm-button';
            divAvisoSincro.innerHTML='';
            try{
                var datos = await sincronizarDatos(state);
                divAvisoSincro.append(html.div({id:'aviso-sincro'}, [
                    html.p(["Número de sincronización: ", html.b(""+datos.num_sincro)]),
                    html.h4('datos recibidos'),
                    html.p([htmlNumero(likeAr(datos.cargas).array().length),' areas: ',likeAr(state.datos.cargas).keys().join(', ')]),
                    html.p([htmlNumero(likeAr(datos.hdr).array().length),' viviendas']),
                    html.p([htmlNumero(likeAr(datos.hdr).filter(dv=>dv.respuestas?.[dv1]==1 && dv.respuestas?.[c5ok]==1).array().length),' viviendas con muestras']),
                    html.a({href:'./campo'},[html.b('IR A LA HOJA DE RUTA')])
                ]).create());
                //traer nueva
                // await traerHdr({modoDemo:false});
            }catch(err){
                alertPromise(err.message)
            }finally{
                downloadButton.disabled=false;
            }
        }
    }else{
        mainLayout.appendChild(html.div({class:'aviso'},[
            html.h4('Sistema vacío'),
            html.p('No hay información de formularios'),
            html.p('No hay información de viviendas')
        ]).create());
        var loadButton = html.button({class:'load-dm-button'},'proceder').create();
        mainLayout.appendChild(loadButton);
        loadButton.onclick = async function(){
            //traer nueva
            await sincronizarDatos(null);
            await traerHdr({modoDemo:false});
        }
    }
};

myOwn.wScreens.proc.result.qrs_traer = async (result:{etiquetas:EtiquetaOpts[]}, divResult:HTMLDivElement)=>{
    var planchas=html.div({class:"planchas"}).create();
    // var etiquetas:HtmlTag<HTMLDivElement>[]=[];
    var etiquetas:HTMLDivElement[]=[];
    divResult.appendChild(planchas);
    var planchaAnterior='';
    var cerrarPlancha=function(){
        planchas.appendChild(html.div({class:'pre-plancha'}, [
            html.div("PLANCHA "+planchaAnterior+" - Dirección General de Estadística y Censos - "+ OPERATIVO_ACTUAL)
        ]).create());
        planchas.appendChild(html.div({class:'plancha'},etiquetas).create());
        etiquetas=[];
    }
    for(let etiqueta of result.etiquetas){
        let etiquetaDiv = await crearEtiqueta(etiqueta, 128);
        if(planchaAnterior!=etiqueta.plancha){
            if(planchaAnterior){
                cerrarPlancha();
            }
            planchaAnterior=etiqueta.plancha;
        }
        etiquetas.push(etiquetaDiv);
    }
    cerrarPlancha();
}

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

myOwn.wScreens.abrirDirecto=async function(addrParams:myOwn.AddrParams){
    // @ts-ignore AddPrams
    var forPkRaiz = addrParams.forPkRaiz;
    try{
        var hdr = getHojaDeRuta();
        var reabrirDeMemoria = false;
        if(hdr?.respuestas?.viviendas?.[forPkRaiz.vivienda]){
            reabrirDeMemoria = await confirmPromise('Ya había abierto esa encuesta ¿quiere traerla de memoria?');
        }
        if(!reabrirDeMemoria){
            await abrirDirecto(forPkRaiz);
        }else{
            getEstructura();
            calcularFeedbackHojaDeRuta();
        }
        // @ts-ignore desplegarFormularioActual es global
        desplegarFormularioActual({modoDemo:false, forPkRaiz, useSessionStorage:true});
    }catch(err){
        alertPromise(err.message)
    }
};

var crearBotonVer = (depot:myOwn.Depot, fieldName:string, label:'abrir'|'ver')=>{
    //var openButton = my.createForkeableButton({w:'abrirDirecto',enc:depot.row.enc},{label})
    var openButton = html.button({class:'open-dm-button'},label).create();
    depot.rowControls[fieldName].innerHTML='';
    depot.rowControls[fieldName].appendChild(openButton);
    openButton.onclick = async function(){
        var urlAndWindowName = 'menu#w=abrirDirecto&enc='+depot.row.enc;
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
