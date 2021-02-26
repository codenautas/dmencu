import { createStore } from "redux";
import { CasilleroBase, CasillerosImplementados, CasoState, 
    DatosVivienda, EstadoCarga, EstructuraRowValidator, 
    FeedbackVariable, Formulario, ForPk, 
    IdCarga, IdCasillero, IdCaso, IdDestino, IdFin, IdFormulario, IdTarea, IdVariable, 
    IdUnidadAnalisis,
    InfoFormulario, 
    ModoDespliegue, 
    Opcion, PlainForPk, Respuestas, ResumenEstado,
    Tareas, TareasEstructura, TEM, Visita
} from "./tipos";
import { deepFreeze, datetime } from "best-globals";
import { createReducer, createDispatchers, ActionsFrom } from "redux-typed-reducer";
import { getHdr } from "./bypass-formulario"
import * as JSON4all from "json4all";
import * as likeAr from "like-ar";
import * as bestGlobals from "best-globals";
import { controlarCodigoDV2 } from "./digitov";
import { Variable } from "operativos";

import { Opcion as RowValidatorOpcion } from "row-validator";

export const LOCAL_STORAGE_STATE_NAME ='hdr-campo-0.6';

export const OPERATIVO = 'eseco211';

var my=myOwn;

var reducers={
    MODO_DESPLIEGUE: (payload: {modoDespliegue:ModoDespliegue}) => 
        function(state: CasoState){
            return {
                ...state,
                opciones:{
                    ...state.opciones,
                    modoDespliegue:payload.modoDespliegue
                }
            }
        },
    CAMBIAR_FORMULARIO: (payload: {forPk:ForPk, apilarVuelta:boolean}) => 
        function(state: CasoState){
            return {
                ...state,
                opciones:{
                    ...state.opciones,
                    forPk: payload.forPk,
                    ...(payload.apilarVuelta?{
                        pilaForPk: state.opciones.forPk==null?[]:[...state.opciones.pilaForPk, state.opciones.forPk]
                    }:{})
                }
            }
        },
    VOLVER_DE_FORMULARIO: (_payload: {}) => 
        function(state: CasoState){
            return {
                ...state,
                opciones:{
                    ...state.opciones,
                    forPk: state.opciones.pilaForPk[state.opciones.pilaForPk.length-1]||null,
                    pilaForPk: state.opciones.pilaForPk.slice(0,state.opciones.pilaForPk.length-1)
                }
            }
        },
    ESTADO_CARGA: (payload: {idCarga:IdCarga, estado_carga:EstadoCarga}) =>
        function(state: CasoState){
            return {
                ...state,
                datos:{
                    ...state.datos,
                    cargas:{
                        ...state.datos.cargas,
                        [payload.idCarga]: {
                            ...state.datos.cargas[payload.idCarga],
                            estado_carga: payload.estado_carga
                        }
                    }
                }
            }
        },
    VOLVER_HDR: (_payload: {}) => 
        function(state: CasoState){
            return {
                ...state,
                opciones:{
                    ...state.opciones,
                    forPk: null,
                    pilaForPk: []
                }
            }
        },
    SET_OPCION: (payload: {opcion:keyof CasoState['opciones'], valor:any}) => 
        function(state: CasoState){
            return {
                ...state,
                opciones:{
                    ...state.opciones,
                    [payload.opcion]: payload.valor
                }
            }
        },
    RESET_OPCIONES: (_payload: {}) => 
        function(state: CasoState){
            return {
                ...state,
                opciones:{
                    ...state.opciones,
                    forPk: null
                }
            }
        },
    REINICIAR_DEMO: (_payload: {}) =>
        function(state: CasoState){
            if(!state.modo.demo) return state;
            return {
                ...state,
                // @ts-ignore copio los datos iniciales
                datos:bestGlobals.deepCopy(state.modo.demo)
            }
        },
    CONFIRMAR_BORRAR_RESPUESTA: (payload: {forPk:ForPk, variable:IdVariable|null}) => 
        function(state: CasoState){
            return {
                ...state,
                opciones:{
                    ...state.opciones,
                    forPk:payload.forPk,
                    modoBorrarRespuesta: payload.variable
                }
            }
        },
}

export type ActionFormularioState = ActionsFrom<typeof reducers>;
/* FIN ACCIONES */

export const dispatchers = createDispatchers(reducers);

interface IDataSeparada<T extends {tipoc:string}> {
    data:T,
    childs:IDataSeparada<T>[]
}

type IDataConCasilleros<T> = T & {
    casilleros:readonly IDataConCasilleros<T>[]
}

const casilleroVacio={salto:null, despliegue:null, aclaracion:null, ver_id:null}

const opcionesSiNo: Opcion[] = [
    {...casilleroVacio, casillero:1, tipoc:'O', nombre:'Sí', casilleros:[]},
    {...casilleroVacio, casillero:2, tipoc:'O', nombre:'No', casilleros:[]},
]

type CaracerizacionEstadoRowValidator={
    correcto:boolean,
    conValor:boolean|null, // null = unknown
}

function aplanarLaCurva<T extends {tipoc:string}>(casillerosData:IDataSeparada<T>):IDataConCasilleros<T|Opcion>{
    return {
        ...casillerosData.data,
        casilleros: !casillerosData.childs.length && casillerosData.data.tipoc=='OM' ? opcionesSiNo :
             casillerosData.childs.map(casillero=>aplanarLaCurva(casillero))
    }
}

// type AnyRef<T extends {}>=[T, keyof T];

function rellenarVariablesYOpciones(estructura:EstructuraRowValidator, casillero:CasillerosImplementados, unidadAnalisis?:string|null,
    subordinadaVar?:IdVariable, subordinadaValor?:any
){
    if(casillero.var_name != null || casillero.tipoc=='FILTRO'){
        var var_name:IdVariable
        if(casillero.tipoc=='FILTRO'){
            // @ts-ignore pongo como nombre de variable el filtro;
            var_name = casillero.casillero;
        }else if(casillero.var_name.endsWith('!')){
            // @ts-ignore las variables espejo son las que terminan en !
            var_name = casillero.var_name_especial.replace(/!+$/,'');
            casillero.var_name = var_name;
        }else{
            var_name = casillero.var_name
        }
        let variableDef={
            tipo:casillero.tipoc=='FILTRO'?'filtro':casillero.tipoc=='OM' || casillero.tipovar=='si_no'?'opciones':casillero.tipovar,
            // @ts-ignore optativo podría no existir, quedará null.
            optativa:casillero.optativo!,
            opciones:(casillero.tipoc=='OM' || casillero.tipovar=='opciones' || casillero.tipovar=='si_no'?
                likeAr.createIndex(casillero.casilleros, 'casillero'):{}) as unknown as { [key: string]: RowValidatorOpcion<IdVariable> },
            salto:casillero.salto as IdVariable,
            saltoNsNr:'salto_ns_nc' in casillero && casillero.salto_ns_nc || null,
            funcionHabilitar:casillero.expresion_habilitar_js,
            calculada:
                // @ts-ignore // TODO. Averiguar si las preguntas y filtros pueden tener unidad de análisis
                casillero.unidad_analisis && casillero.unidad_analisis!=unidadAnalisis 
                || casillero.despliegue?.includes('calculada'),
            libre:casillero.despliegue?.includes('libre')
        } as (typeof estructura.variables)[IdVariable]
        if(subordinadaValor != undefined){
            variableDef.subordinadaVar = subordinadaVar;
            variableDef.subordinadaValor = subordinadaValor;
        }
        estructura.variables[var_name]=variableDef;
    } else if (casillero.tipoc=='BF'){
        // agregamos 100 botones 1, 2 ,3 ,4 ,5 ,6 (múltiples)
        // c/u salto listo
        // 1 variable mas $FOR:M1:listo guaramos
        let variableDef={
            tipo:'opciones',
            // @ts-ignore optativo podría no existir, quedará null.
            optativa:casillero.optativo!,
            opciones:{1:{}},
            funcionHabilitar:casillero.expresion_habilitar_js,
            libre:casillero.despliegue?.includes('libre')
        }
        estructura.variables['$FOR:'+casillero.salto as IdVariable]=variableDef;
    }
    if(casillero.casilleros){
        casillero.casilleros.forEach((casilleroHijo:CasillerosImplementados)=>
            rellenarVariablesYOpciones(estructura, casilleroHijo, unidadAnalisis, casillero.var_name?casillero.var_name:casillero.tipoc=='O'?subordinadaVar:undefined,casillero.tipoc=='O'?casillero.casillero:undefined)
        )
    }
}

type RegistroDestinos={[destino in IdDestino]:IdVariable|null};

function obtenerDestinosCasilleros(casillero:CasillerosImplementados, destinos?:RegistroDestinos):RegistroDestinos{
    if(destinos==null) return obtenerDestinosCasilleros(casillero, {} as RegistroDestinos);
    if(casillero.tipoc=='FILTRO'){
        destinos[casillero.casillero]=casillero.casillero as IdVariable;
    }else if(casillero.tipoc!='F' && casillero.tipoc!='O' && casillero.tipoc!='OM'){
        destinos[casillero.casillero]=casillero.primera_variable||null
    }
    if(casillero.casilleros){
        casillero.casilleros.forEach(c=>obtenerDestinosCasilleros(c,destinos));
    }
    return destinos;
}

function rellenarDestinos(estructura:EstructuraRowValidator, destinos:RegistroDestinos):EstructuraRowValidator{
    function obtenerDestino(idVariableQueTieneUnDestino:IdVariable|null|undefined):IdVariable|null{
        return idVariableQueTieneUnDestino=='fin' as IdVariable ? 'fin' as IdVariable : idVariableQueTieneUnDestino!=null && destinos[idVariableQueTieneUnDestino as IdDestino] || null
    }
    return {
        ...estructura,
        variables:likeAr(estructura.variables).map(variableDef=>({
            ...variableDef,
            salto:obtenerDestino(variableDef.salto),
            saltoNsNr:obtenerDestino(variableDef.saltoNsNr),
            opciones:variableDef.opciones!=null ? likeAr(variableDef.opciones).map(opcionDef=>({salto:obtenerDestino(opcionDef.salto)})).plain():undefined
        })).plain()
    }
}

function generarEstructuraRowValidator(casillero:CasillerosImplementados):EstructuraRowValidator{
    var estructuraIncompleta:EstructuraRowValidator={variables:{}, marcaFin:'fin'} as unknown as EstructuraRowValidator;
    rellenarVariablesYOpciones(estructuraIncompleta, casillero, 
        // @ts-ignore ver si cualquier cosa puede tener unidad_analisis
        casillero.unidad_analisis
    );
    var destinos=obtenerDestinosCasilleros(casillero);
    return rellenarDestinos(estructuraIncompleta, destinos);
}

export function replaceSpecialWords(text:string, nombre:string, apellido:string, resultado:string):string{
    function capitalizeFirstLetter(text:string) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
    var simplificatedChars:{[k:string]:string}={
        "#nombre":capitalizeFirstLetter(nombre),
        "#apellido":capitalizeFirstLetter(apellido),
        "#resultado":resultado,
    };
    var re = new RegExp(Object.keys(simplificatedChars).join("|"),"gi");

    return text.replace(re, function(matched){
        return simplificatedChars[matched.toLowerCase()];
    });
}

export function gotoSincronizar(){
    history.replaceState(null, '', `${location.origin+location.pathname}/../menu#i=sincronizar`);
    location.reload();   
}

export function gotoCampo(){
    history.replaceState(null, '', `${location.origin+location.pathname}/../campo`);
    location.reload();   
}

export function gotoVer(){
    history.replaceState(null, '', `${location.origin+location.pathname}/../consulta`);
    location.reload();   
}

export async function consultarEtiqueta(etiqueta:string, numero_documento:string){
    try{
        var result = await my.ajax.resultado_consultar({
            etiqueta,
            numero_documento
        });
        if(result){
            let {pagina_texto, nombre, apellido, resultado } = result;
            return replaceSpecialWords(pagina_texto || '', nombre || '', apellido || '', resultado || '')
        }else{
            return 'Sin resultado aún. '
        }
        
    }catch(err){
        return err.message;
    }
}

var redirectIfNotLogged = function redirectIfNotLogged(err:Error){
    if(err.message == my.messages.notLogged){
        setTimeout(()=>{
            history.replaceState(null, '', `${location.origin+location.pathname}/../login${location.hash}`);
            location.reload();   
        },1500)
        
    }
}

export async function saveSurvey(){
    try{
        await my.ajax.dm_enc_descargar({
            datos: my.getSessionVar(LOCAL_STORAGE_STATE_NAME)?.datos
        });
        return 'encuesta guardada'
    }catch(err){
        redirectIfNotLogged(err);
        return err.message;
    }
}

export async function traerEstructura(params:{operativo: string}){
    var casillerosOriginales:{} = await my.ajax.operativo_estructura(params);
    //TODO: GENERALIZAR
    //@ts-ignore
    // casillerosOriginales['F:F2_personas']=casillerosOriginales['F:F2'].childs.find(casillero=>casillero.data.casillero=='LP');
    var mainForm:IdFormulario|undefined;
    //@ts-ignore
    var casillerosTodosFormularios:{[f in IdFormulario]:{casilleros:Formulario, estructuraRowValidator:EstructuraRowValidator}}=
        likeAr(casillerosOriginales).map(
            (casillerosJerarquizados:any, id)=>{
                var casillerosAplanados:CasillerosImplementados = aplanarLaCurva(casillerosJerarquizados);
                if(casillerosAplanados.tipoc=='F' && casillerosAplanados.formulario_principal){
                    mainForm=id;
                }
                return {
                    casilleros: casillerosAplanados,
                    estructuraRowValidator: generarEstructuraRowValidator(casillerosAplanados)
                }
            }
        ).plain();
    var estructura={
        formularios:casillerosTodosFormularios,
        tareas:{} as TareasEstructura
    };
    return estructura;
}

export async function dmTraerDatosFormulario(opts:{modoDemo:boolean, vivienda?: IdCaso, useSessionStorage?:boolean}){
    opts.useSessionStorage= opts.useSessionStorage||false;
    var createInitialState = async function createInitialState(){
        var estructura = await traerEstructura({ operativo: OPERATIVO });
        var initialState:CasoState={
            estructura,
            datos:{
                // @ts-ignore
                cargas:{},
                // @ts-ignore
                hdr:{}
            },
            opciones:{} as CasoState["opciones"], // poner los valores por defecto más abajo
            modo:{
                demo:false
            },
            // @ts-ignore lo lleno después
            feedbackRowValidator:{}
        };
        // @ts-ignore variable global
        if(myOwn.config.config.ambiente=='produccion'){
            // @ts-ignore lo vacio
            initialState.datos={hdr:{}, casos:{}}
        }
        var vivienda:IdCaso;
        var formulario:IdFormulario;
        // @ts-ignore esto se va
        for(var vivienda in initialState.datos.hdr){
            // calcularFeedbackEncuesta(vivienda);
        }
        return initialState;
    }
    var loadState = async function loadState():Promise<CasoState>{
        var casoState:CasoState|null = opts.useSessionStorage?my.getSessionVar(LOCAL_STORAGE_STATE_NAME):my.getLocalVar(LOCAL_STORAGE_STATE_NAME);
        if(casoState && !opts.modoDemo){
            /*
            if(casoState.estructura==null){
                initialState = await createInitialState();
                casoState = {...initialState, ...casoState};
                casoState={
                    ...casoState,
                    // OJO state.opciones se modifica acá y en otro lado con este mismo cartel
                    opciones: {
                        ...casoState.opciones,
                        modoDirecto: opts.vivienda?true:false,
                        forPk: opts.vivienda?{vivienda:opts.vivienda, formulario:MAIN_FORM}:null,
                        pilaForPk:[],
                        bienvenido:true,
                    }
                }
            }
            */
        }else{
            var initialState = await createInitialState();
            if(opts.modoDemo){
                initialState = {
                    ...initialState, 
                    modo:{
                        ...initialState.modo, 
                        //@ts-ignore es un booleano pero pongo ahí los datos de demo!
                        demo: initialState.datos && 
                            // @ts-ignore
                            myOwn.config.config.ambiente=='test' || myOwn.config.config.ambiente=='demo',
                    }
                };
                if(casoState){
                    initialState = {
                        ...initialState, 
                        datos:casoState.datos, 
                        opciones:casoState.opciones,
                    }
                }
            }
            //inicializo feedbacks
            
            return initialState;
        }
        /*
        for(var vivienda in casoState.datos.hdr){
            casoState=calcularFeedback(casoState, {vivienda:vivienda as IdCaso, formulario: 'F:F1' as IdFormulario});
        }
        */
        return casoState;
    }
    var saveState = function saveState(state:CasoState){
        opts.useSessionStorage?my.setSessionVar(LOCAL_STORAGE_STATE_NAME, state):my.setLocalVar(LOCAL_STORAGE_STATE_NAME, state);
    }
    /* DEFINICION CONTROLADOR */
    var initialState:CasoState = await loadState();
    const hdrReducer = createReducer(reducers, initialState);
    /* FIN DEFINICION CONTROLADOR */
    /* CARGA Y GUARDADO DE STATE */

    
    /* CREACION STORE */
    const store = createStore(hdrReducer, initialState); 
    saveState(store.getState());
    store.subscribe(function(){
         saveState(store.getState());
    });
    /* FIN CREACION STORE */

    //HDR CON STORE CREADO
    return store;
}


