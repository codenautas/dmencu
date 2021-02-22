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
import { getRowValidator, Structure, Opcion as RowValidatorOpcion, FormStructureState } from "row-validator";
import * as JSON4all from "json4all";
import * as likeAr from "like-ar";
import * as bestGlobals from "best-globals";
import { controlarCodigoDV2 } from "./digitov";
import { Variable } from "operativos";

var my=myOwn;

export const ultimaVaribleVivienda = 'NO_ESTA_DEFINIDA_AUN//TODO' as IdVariable;

export const MAXCP=20;
// TODO: Generalizar
const OPERATIVO='etoi211';
var dv1 = 'dv1' as IdVariable;
var dv4 = 'dv4' as IdVariable;
var dv5 = 'dv5' as IdVariable;
var sp1 = 'sp1' as IdVariable;
var sp6 = 'sp6' as IdVariable;
var s1 = 's1' as IdVariable;
var s2 = 's2' as IdVariable;
var s3 = 's3' as IdVariable;
var d4 = 'd4' as IdVariable;
var d5c = 'd5c' as IdVariable;
var g1 = 'g1' as IdVariable;
var cp = 'cp' as IdVariable;
var p1 = 'p1' as IdVariable;
var p2 = 'p2' as IdVariable;
var p3 = 'p3' as IdVariable;
var p4 = 'p4' as IdVariable;
var p9 = 'p9' as IdVariable;
var sp6 = 'sp6' as IdVariable;

export var varEspeciales:{[idVariable in IdVariable]?:{cluster4:boolean}}={
    [dv5] :{cluster4:true},
    [cp]  :{cluster4:true},
    [p1]  :{cluster4:true},
    [p2]  :{cluster4:true},
    [p3]  :{cluster4:true},
    [p4]  :{cluster4:true},
    [p9]  :{cluster4:true},
}

const MAIN_FORM:IdFormulario='F:F1' as IdFormulario;
export const LOCAL_STORAGE_STATE_NAME ='hdr-campo-0.5';

/* REDUCERS */

var defaultActionFormulario = function defaultActionFormulario(
    formularioState:CasoState, 
){
    return deepFreeze({
        ...formularioState
    })
};
var reemplazosHabilitar:{[key:string]:string}={
    false: 'false',
    true: 'true',
    "=": '==',
    "<>": '!=',
    "&": '&&',
    "|": '||',
    "OR": '||',
    "AND": '&&',
    "or": '||',
    "and": '&&',
    "not": '!',
    "NOT": '!',
};

const helpersHabilitar={
    null2zero(posibleNull:any){
        if(posibleNull==null){
            return 0;
        }
        return posibleNull;
    },
    div0err(numerador:number, denominador:number, pk:string){
        if(denominador==0){
            throw new Error("Error en "+pk+" division por cero de "+numerador);
        }
        return numerador/denominador;
    },
    funs:{
        blanco(x:any){
            return x!==0 && !x
        },
        nsnc(x:any){
            return x == -9
        }
    }
};

type FuncionHabilitar = (valores:{[key:string]:any})=>boolean;
var funcionesHabilitar:{[key:string]:FuncionHabilitar}={
    'false': function(_valores){ return false },
    'v1 < v2': function(valores){ return valores.v1 < valores.v2 },
}

export function miniCompiladorSQlJs(expresionCasiSQL:string){
    var expresion = expresionCasiSQL.replace(/\u00A0/g,' ');
    var cuerpo = expresion.replace(/\bis distinct from\b/gi,'!=').replace(/\b.+?\b/g, function(elToken){
        var elTokenTrimeado=elToken.trim();
        if(elTokenTrimeado in reemplazosHabilitar){
            return reemplazosHabilitar[elTokenTrimeado];
        }else if(/^\d+\.?\d*$/.test(elTokenTrimeado)){
            return elToken
        }else if(/^\W+$/.test(elTokenTrimeado)){
            return elToken
        }else if(/^\s+$/.test(elToken)){
            return elToken
        }
        return 'helpers.null2zero(valores.'+elToken+')';
    });
    return cuerpo;
}

export function getFuncionHabilitar(nombreFuncionComoExpresionJs:string):FuncionHabilitar{
    if(!funcionesHabilitar[nombreFuncionComoExpresionJs]){
        var cuerpo = nombreFuncionComoExpresionJs;
        try{
            // var cuerpo = miniCompiladorSQlJs(nombreFuncionComoExpresionJs);
            var internalFun =  new Function('valores', 'helpers', 'return '+cuerpo);
            funcionesHabilitar[nombreFuncionComoExpresionJs] = function(valores){
                try{
                    var result = internalFun(valores, helpersHabilitar);
                }catch(err){
                    console.log('ERROR EJECUCCION EXPRESION EXTERNA ',nombreFuncionComoExpresionJs)
                    console.log(cuerpo);
                    console.log(valores);
                    throw err;
                }
                return result;
            }
        }catch(err){
            console.log('ERROR COMPILACION EXPRESION EXTERNA ',nombreFuncionComoExpresionJs)
            console.log(cuerpo);
            throw err;
        }
    }
    return funcionesHabilitar[nombreFuncionComoExpresionJs];
}


var rowValidator = getRowValidator({getFuncionHabilitar})

////// TODOS LOS NOMBRES DE variables o formularios o casilleros deben estar en el objeto operativo
export var defOperativo = {
    esVacio:(respuestas:Respuestas)=>JSON.stringify(respuestas)=='{}',
    esNorea:(respuestas:Respuestas)=>respuestas['entrea' as IdVariable]!=1,
    UAprincipal:'viviendas' as IdUnidadAnalisis,
    defUA:{
        hogares  :{ pk: 'hogar'  , incluidas:['personas'], idsFor:['F:S1', 'F:A1']  },
        personas :{ pk: 'persona', incluidas:[]          , idsFor:['F:S1_P', 'F:I1']},
        viviendas:{ pk: false    , incluidas:['hogares'] , idsFor:['F:RE']          }
    } as unknown as {[i in IdUnidadAnalisis]:{pk:IdVariable, incluidas:IdUnidadAnalisis[], idsFor:IdFormulario[]}},
    defFor:{
        'F:RE':{arbolUA:[]},
        'F:S1':{arbolUA:['hogares']},
        'F:A1':{arbolUA:['hogares']},
        'F:S1_P':{arbolUA:['hogares', 'personas']},
        'F:I1':{arbolUA:['hogares', 'personas']}
    } as unknown as {[f in IdFormulario]:{arbolUA:IdUnidadAnalisis[]}}
}
///// ABAJO de esta línea no puede haber otros nombres de variables o formularios o casilleros en general

// TODO: GENERALIZAR
type Persona={p1:string, p2:number, p3:number, p4:number|null, p5:1|null, p6:1|null}

function num(num:number|string|null):number{
    //@ts-ignore la gracia es meter num cuando es string
    if(isNaN(num-0)) return 0;
    //@ts-ignore la gracia es meter num cuando es string
    return num-0;
}

type Backups={
    idActual:number,
    token:string|undefined,
    casos:{idBackup:number, idCaso:IdCaso, vivienda:DatosVivienda}[]
}

var backupPendiente = Promise.resolve();

async function enviarBackup(){
    var backups:Backups = my.getLocalVar('backups');
    var {token, casos} = backups;
    if(casos.length){
        try{
            await my.ajax.dm_backup({token, casos})
            // tengo que levantarlo de nuevo porque acá hay una interrupción del flujo
            var backupsALimpiar:Backups = my.getLocalVar('backups');
            backupsALimpiar.casos=backupsALimpiar.casos.filter(caso=>caso.idBackup>backups.idActual)
            my.setLocalVar('backups', backupsALimpiar);
        }catch(err){
            console.log('no se pudo hacer backup', err);
        }
    }
}

function encolarBackup(token:string|undefined, idCaso:IdCaso, vivienda:DatosVivienda){
    var backups:Backups = my.existsLocalVar('backups')?my.getLocalVar('backups'):{
        idActual:0,
        casos:[]
    };
    backups.idActual+=1;
    backups.token=token;
    backups.casos.push({idBackup:backups.idActual, idCaso, vivienda});
    my.setLocalVar('backups',backups);
    backupPendiente = backupPendiente.then(enviarBackup)
}

function variablesCalculadas(datosVivienda: DatosVivienda):DatosVivienda{
    return datosVivienda;
    // TODO: GENERALIZAR
//    var cp='cp' as IdVariable;
//    var _personas_incompletas = '_personas_incompletas' as IdVariable
//    var p9='p9' as IdVariable;
//    var p11='p11' as IdVariable;
//    var tipo_seleccion = 'tipo_seleccion' as IdVariable;
//    var tipo_relevamiento = 'tipo_relevamiento' as IdVariable;
//    //@ts-ignore
//    var cantidadPersonasActual:number = datosVivienda.respuestas.personas?.length||0;
//    //@ts-ignore
//    var personasIncompletas=datosVivienda.respuestas.personas.filter(p=>!p.p1 || !p.p2 || !p.p3 || p.p3>=18 && !p.p4).length;
//    /*
//    if(
//        (datosVivienda.respuestas[cp]||1)==cantidadPersonasActual
//        && datosVivienda.respuestas[_personas_incompletas]==personasIncompletas
//        && (datosVivienda.respuestas[p9]==null && datosVivienda.respuestas[p11]==null)
//    ) return datosVivienda;
//    */
//    datosVivienda=bestGlobals.changing({respuestas:{personas:[{}]}},datosVivienda) // deepCopy
//    var respuestas = datosVivienda.respuestas as unknown as {
//        cp:number, personas:Persona[],
//        _personas_incompletas:number, 
//        _edad_maxima:number, 
//        _edad_minima:number, 
//        d4:number|null, d5:number|null, d5c:number|null, 
//        p9:number|null, p11:number|null, p12:string|null,
//        dv4:number|null, g1:number|null,
//        c5:string|null,
//        c5ok:number|null
//    };
//    if(respuestas.c5==null){
//        respuestas.c5ok=null;
//    }else{
//        respuestas.c5 = respuestas.c5.replace(/[\+\*\.# _\/,]/g,'-');
//        if(!/-/.test(respuestas.c5) && respuestas.c5.length>4){
//            respuestas.c5=respuestas.c5.substr(0,4)+'-'+respuestas.c5.substr(4);
//        }
//        respuestas.c5ok=controlarCodigoDV2(respuestas.c5)?1:2;
//    }
//    if(respuestas.dv4==2 && respuestas.g1==6 && respuestas.p9==null){
//        respuestas.p9=1;
//    }
//    if(respuestas.d4==1){
//        respuestas.d5c=respuestas.d5c||respuestas.d5;
//        respuestas.d5=null;
//    }else{
//        respuestas.d5=respuestas.d5||respuestas.d5c;
//        respuestas.d5c=null;
//    }
//    respuestas.personas.forEach(p=>{if(p.p3<18) p.p4=null});
//    if(respuestas.p9==2){
//        respuestas.cp=Math.max(respuestas.personas.length,respuestas.cp)+1
//        respuestas.p9=null;
//    }
//    if(respuestas.cp>MAXCP) respuestas.cp=MAXCP;
//    if(respuestas.cp<respuestas.personas.length){
//        respuestas.personas=respuestas.personas.filter(p=>p.p1||p.p3);
//    }
//    if(respuestas.cp>respuestas.personas.length){
//        while(respuestas.cp>respuestas.personas.length){
//            respuestas.personas.push({} as Persona)
//        }
//    }
//    if(respuestas.personas.length==0){
//        respuestas.personas.push({} as Persona)
//    }
//    respuestas._personas_incompletas=respuestas.personas.filter(
//        p=>!p.p1 || !p.p2 || !p.p3 
//            || p.p3>=18 && (!p.p4 && datosVivienda.respuestas[tipo_seleccion]==2 && datosVivienda.respuestas[tipo_relevamiento]==1)
//    ).length;
//    respuestas._edad_maxima=respuestas.personas.reduce((acc,p)=>Math.max(p.p3,acc),0);
//    respuestas._edad_minima=respuestas.personas.reduce((acc,p)=>Math.min(p.p3,acc),99);
//    if(respuestas.p9!=1){
//        respuestas.p11=null;
//        respuestas.p12=null;
//    }
//    if(respuestas.p9==1 && !respuestas.p11 && respuestas._personas_incompletas==0){
//        var sortear=likeAr(respuestas.personas).filter(
//            p=>p.p3>=18 && (
//                datosVivienda.respuestas[tipo_seleccion]==1 && datosVivienda.respuestas[tipo_relevamiento]==1
//                || datosVivienda.respuestas[tipo_seleccion]==1 && datosVivienda.respuestas[tipo_relevamiento]==2 && p.p6==1
//                || datosVivienda.respuestas[tipo_seleccion]==2 && datosVivienda.respuestas[tipo_relevamiento]==1 && p.p4==1
//                || datosVivienda.respuestas[tipo_seleccion]==2 && datosVivienda.respuestas[tipo_relevamiento]==2 && p.p5==1
//            )
//        ).map((p,i)=>({p0:num(i)+1, ...p})).array();
//        sortear.sort(bestGlobals.compareForOrder([{column:"p3"},{column:"p2"},{column:"p1"},{column:"p0"}]));
//        var posicionSorteada=((num(datosVivienda.tem.nrocatastral)*13+num(datosVivienda.tem.piso))*17 % 3127) % sortear.length
//        respuestas.p11=sortear[posicionSorteada].p0;
//        respuestas.p12 = respuestas.personas[respuestas.p11-1].p1;
//    }
//    return datosVivienda;
}

// total_h>1 & edad==2 & 

export async function calcularFeedbackUnidadAnalisis(
    feedbackRowValidator:{ [formulario in PlainForPk]:FormStructureState<IdVariable,IdFin> },
    formularios:{ [nombreFormulario in IdFormulario]:InfoFormulario }, 
    respuestas:Respuestas, 
    UA:IdUnidadAnalisis, 
    forPk:ForPk,
    respuestasAumentadas:Respuestas // incluyen la de todos los padres y ansestros
){
    // recorriend UA personas y mascotas
    for(var UAincluida of defOperativo.defUA[UA].incluidas){
        var pkNueva = defOperativo.defUA[UAincluida].pk;
        var conjuntoRespuestasUA = respuestas[UAincluida];
        conjuntoRespuestasUA.forEach((respuestas, i)=>{
            calcularFeedbackUnidadAnalisis(
                feedbackRowValidator, 
                formularios, 
                respuestas, 
                UAincluida, 
                {...forPk, [pkNueva]:i+1},
                {...respuestasAumentadas, ...respuestas, [pkNueva]:i+1}
            );
        })
    }
    // S1 , A1
    for(var formulario of defOperativo.defUA[UA].idsFor){
        feedbackRowValidator[toPlainForPk({...forPk, formulario})]=
            rowValidator(
                formularios[formulario].estructuraRowValidator, 
                respuestasAumentadas
            )
    }
}

export async function calcularFeedbackEncuesta(
    feedbackRowValidator:{ [formulario in PlainForPk]:FormStructureState<IdVariable,IdFin> },
    formularios:{ [nombreFormulario in IdFormulario]:InfoFormulario }, 
    vivienda:IdCaso, 
    respuestas:Respuestas
){
    var forPk={vivienda, formulario:defOperativo.defUA[defOperativo.UAprincipal].idsFor[0]}
    calcularFeedbackUnidadAnalisis(feedbackRowValidator, formularios, respuestas, defOperativo.UAprincipal, forPk, respuestas);
}

function calcularFeedback(state: CasoState, forPk?:ForPk|null):CasoState{
    forPk = forPk || state.opciones.forPk;
    if(forPk == null){
        return state;
    }
    var tipo_seleccion = 'tipo_seleccion' as IdVariable;
    var tipo_relevamiento = 'tipo_relevamiento' as IdVariable;
    var vivienda = forPk.vivienda;
    var respuestas = state.datos.hdr[vivienda].respuestas;
    if(respuestas){
        /*
        var nuevosRows = likeAr([
            ...likeAr(state.estructura.formularios).map((_, id)=>({
                forPk:{vivienda, formulario:id},
                formulario:id,
                post:null
            })).array()
        ]).build(({forPk, formulario, post})=>{
            var respuestasUnidadAnalisis;
            var respuestasVivienda=state.datos.hdr[forPk.vivienda].respuestas;
                respuestasUnidadAnalisis=respuestasVivienda;
            }
            var estructura=state.estructura.formularios[formulario].estructuraRowValidator;
            if(respuestas[g1]==6){
                estructura={
                    ...estructura,
                    variables: likeAr(estructura.variables).map((v,name)=>({
                        ...v, 
                        calculada: varEspeciales?.[name]?.cluster4 || v.calculada
                    })).plain()
                }
            }
            var row=rowValidator(estructura, respuestasUnidadAnalisis)
            // TODO: GENERALIZAR
            if(post){
                // @ts-ignore
                if(row.feedback.p1.estado=='actual' && (
                // @ts-ignore
                    forPk.persona==1 && respuestasVivienda.cp==null 
                // @ts-ignore
                    || forPk.persona>1 && respuestasVivienda.personas[forPk.persona-2].p1 == null
                )){
                // @ts-ignore
                    row.feedback.p1.estado='todavia_no';
                }
            }
            return {
                [toPlainForPk(forPk)]: row
            }
        })
        */
        // @ts-ignore Partial
        var nuevosRows : {[x in PlainForPk]:FormStructureState<IdVariable,IdFin>}={}
        calcularFeedbackEncuesta(nuevosRows, state.estructura.formularios, forPk.vivienda, respuestas);
        var resumenEstado = calcularResumenVivienda(forPk.vivienda, 
            // @ts-ignore sí, tiene los feedbacks de los formularios 
            nuevosRows,
            respuestas
        );
    }else{
        //@ts-ignore sin nuevas rows
        nuevosRows={};
        resumenEstado='vacio';
    }
    var datosVivienda = state.datos.hdr[forPk.vivienda];
    var feedbackRowValidator
    return {
        ...state,
        datos:{
            ...state.datos,
            hdr:{
                ...state.datos.hdr,
                [forPk.vivienda]:{
                    ...datosVivienda,
                    resumenEstado
                }
            }
        },
        feedbackRowValidator:{
            ...state.feedbackRowValidator,
            ...nuevosRows
        }
    }
}

function calcularResumenVivienda(
    idCaso:IdCaso, 
    feedbackRowValidator:{[formulario in PlainForPk]:FormStructureState<IdVariable,IdFin>}, 
    respuestas:Respuestas
){
    if(defOperativo.esNorea(respuestas)){
       return "no rea";
    }
    if(defOperativo.esVacio(respuestas)){
        return "vacio";
    }
    //TODO GENERALIZAR
    var feedBackVivienda = likeAr(feedbackRowValidator).filter((_row, plainPk)=>JSON.parse(plainPk).vivienda==idCaso && JSON.parse(plainPk).formulario != 'F:F2_personas').array();
    var feedBackViviendaPlain = likeAr(feedbackRowValidator).filter((_row, plainPk)=>JSON.parse(plainPk).vivienda==idCaso && JSON.parse(plainPk).formulario != 'F:F2_personas').plain();
    var prioridades:{[key in ResumenEstado]: {prioridad:number, cantidad:number}} = {
        'no rea':{prioridad: 1, cantidad:0},
        'con problemas':{prioridad: 2, cantidad:0},
        'incompleto':{prioridad: 3, cantidad:0},
        'vacio':{prioridad: 4, cantidad:0},
        'cita pactada':{prioridad: 5, cantidad:0},
        'ok':{prioridad: 6, cantidad:0}
    }
    var min = 6;
    var minResumen: ResumenEstado = 'ok';
    for(var feedback of feedBackVivienda){
        var resumen = feedback.resumen;
        prioridades[resumen].cantidad++;
        if(prioridades[resumen].prioridad<min){
            min=prioridades[resumen].prioridad;
            minResumen=resumen;
        }
    }
    if(minResumen=='vacio'&& prioridades['ok'].cantidad || minResumen=='incompleto'){
        if(respuestas[sp1]==2 && respuestas[sp6]==null){
            minResumen='cita pactada';
        }else{
            minResumen='incompleto';
        }
    }
    return minResumen
}

export const respuestasForPk = (oldState:CasoState, forPk:ForPk, clone?:boolean)=>{
    var state:CasoState;
    if(clone){
        var respuestasVivienda:Respuestas = {...oldState.datos.hdr[forPk.vivienda].respuestas};
        var datosVivienda = {
            ...oldState.datos.hdr[forPk.vivienda], 
            respuestas:respuestasVivienda
        }
        state = {
            ...oldState,
            datos:{
                ...oldState.datos,
                hdr:{
                    ...oldState.datos.hdr,
                    [forPk.vivienda]:datosVivienda
                }
            }
        }
    }else{
        state=oldState;
        var datosVivienda=state.datos.hdr[forPk.vivienda]
        var respuestasVivienda=datosVivienda.respuestas;
    }
    var respuestas:typeof respuestasVivienda = respuestasVivienda;
    var arbol = defOperativo.defFor[forPk.formulario].arbolUA.slice();
    while(arbol.length){
        var ua = arbol.shift()!; // ejemplo "hogares"
        var pkUa = defOperativo.defUA[ua].pk; // ejemplo "hogar"
        // @ts-ignore forPk
        var valorUa:number = forPk[pkUa]-1
        if(clone){
            respuestas[ua] = respuestas[ua].slice();
            respuestas[ua][valorUa] = {...respuestas[ua][valorUa]};
        }
        respuestas = respuestas[ua][valorUa];
    }
    return {respuestas, datosVivienda, respuestasVivienda, state}
}

var reducers={
    REGISTRAR_RESPUESTA: (payload: {forPk:ForPk, variable:IdVariable, respuesta:any}) => 
        function(oldState: CasoState){
            let datosViviendaRecibidos=oldState.datos.hdr[payload.forPk.vivienda];
            if(datosViviendaRecibidos==null){
                return oldState;
            }
            let {respuestas, datosVivienda, state} = respuestasForPk(oldState, payload.forPk, true); // se clona la respuesta particular
            /////////// ESPECIALES
            let respuestasAModificar = respuestas;
            let dirty = respuestasAModificar[payload.variable] != payload.respuesta
            respuestasAModificar[payload.variable] = payload.respuesta;
            ////////// FIN ESPECIALES
            datosVivienda=variablesCalculadas(datosVivienda)
            if(datosViviendaRecibidos.respuestas[ultimaVaribleVivienda]==null && datosVivienda.respuestas[ultimaVaribleVivienda]!=null){
                encolarBackup(state.datos.token, payload.forPk.vivienda, datosVivienda);
            }
            datosVivienda.dirty = datosVivienda.dirty || dirty;
            return calcularFeedback({
                ...state,
                datos:{
                    ...state.datos,
                    hdr:{
                        ...state.datos.hdr,
                        [payload.forPk.vivienda]:datosVivienda
                    }
                }
            }, payload.forPk)
        },
    REGISTRAR_NOTA: (payload: {vivienda:IdCaso, tarea:IdTarea, nota:string|null}) => 
        function(state: CasoState){
            return calcularFeedback({
                ...state,
                datos:{
                    ...state.datos,
                    hdr:{
                        ...state.datos.hdr,
                        [payload.vivienda]:{
                            ...state.datos.hdr[payload.vivienda],
                            tareas:{
                                ...state.datos.hdr[payload.vivienda].tareas,
                                [payload.tarea]:{
                                    ...state.datos.hdr[payload.vivienda].tareas[payload.tarea],
                                    notas: payload.nota
                                }
                            }
                        }
                        
                    }
                }
            })
        },
    AGREGAR_VISITA: (payload: {vivienda:IdCaso, observaciones:string|null}) => 
        function(state: CasoState){
            //para que funcione también en la DEMO
            var visitas = state.datos.hdr[payload.vivienda].visitas || [];
            visitas.push({
                fecha: datetime.now().toYmd(),
                hora: datetime.now().toHm(),
                idper: state.datos.idper,
                observaciones:payload.observaciones
            })
            return calcularFeedback({
                ...state,
                datos:{
                    ...state.datos,
                    hdr:{
                        ...state.datos.hdr,
                        [payload.vivienda]:{
                            ...state.datos.hdr[payload.vivienda],
                            visitas:
                                visitas
                        }
                    }
                }
            })
        },
    MODIFICAR_VISITA: (payload: {vivienda:IdCaso, index:number, opcion:keyof Visita , valor:string|null}) => 
        function(state: CasoState){
            var visitas = state.datos.hdr[payload.vivienda].visitas;
            visitas[payload.index][payload.opcion]=payload.valor
            return calcularFeedback({
                ...state,
                datos:{
                    ...state.datos,
                    hdr:{
                        ...state.datos.hdr,
                        [payload.vivienda]:{
                            ...state.datos.hdr[payload.vivienda],
                            visitas:
                                visitas
                        }
                    }
                }
            })
        },
    BORRAR_VISITA: (payload: {vivienda:IdCaso, index:number}) => 
        function(state: CasoState){
            var visitas = state.datos.hdr[payload.vivienda].visitas;
            visitas.splice(payload.index, 1);
            return calcularFeedback({
                ...state,
                datos:{
                    ...state.datos,
                    hdr:{
                        ...state.datos.hdr,
                        [payload.vivienda]:{
                            ...state.datos.hdr[payload.vivienda],
                            visitas:
                                visitas
                        }
                    }
                }
            })
        },
    MODO_DESPLIEGUE: (payload: {modoDespliegue:ModoDespliegue}) => 
        function(state: CasoState){
            return calcularFeedback({
                ...state,
                opciones:{
                    ...state.opciones,
                    modoDespliegue:payload.modoDespliegue
                }
            })
        },
    AGREGAR_FORMULARIO: (payload: {forPk:ForPk}) => 
        function(state: CasoState){
            var {state, respuestas} = respuestasForPk(state, payload.forPk, true);
            return calcularFeedback(state)
        },
    CAMBIAR_FORMULARIO: (payload: {forPk:ForPk, apilarVuelta:boolean}) => 
        function(state: CasoState){
            return calcularFeedback({
                ...state,
                opciones:{
                    ...state.opciones,
                    forPk: payload.forPk,
                    ...(payload.apilarVuelta?{
                        pilaForPk: state.opciones.forPk==null?[]:[...state.opciones.pilaForPk, state.opciones.forPk]
                    }:{})
                }
            })
        },
    VOLVER_DE_FORMULARIO: (_payload: {}) => 
        function(state: CasoState){
            return calcularFeedback({
                ...state,
                opciones:{
                    ...state.opciones,
                    forPk: state.opciones.pilaForPk[state.opciones.pilaForPk.length-1]||null,
                    pilaForPk: state.opciones.pilaForPk.slice(0,state.opciones.pilaForPk.length-1)
                }
            })
        },
    ESTADO_CARGA: (payload: {idCarga:IdCarga, estado_carga:EstadoCarga}) =>
        function(state: CasoState){
            return calcularFeedback({
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
            })
        },
    VOLVER_HDR: (_payload: {}) => 
        function(state: CasoState){
            return calcularFeedback({
                ...state,
                opciones:{
                    ...state.opciones,
                    forPk: null,
                    pilaForPk: []
                }
            })
        },
    SET_OPCION: (payload: {opcion:keyof CasoState['opciones'], valor:any}) => 
        function(state: CasoState){
            return calcularFeedback({
                ...state,
                opciones:{
                    ...state.opciones,
                    [payload.opcion]: payload.valor
                }
            })
        },
    RESET_OPCIONES: (_payload: {}) => 
        function(state: CasoState){
            return calcularFeedback({
                ...state,
                opciones:{
                    ...state.opciones,
                    forPk: null
                }
            })
        },
    REINICIAR_DEMO: (_payload: {}) =>
        function(state: CasoState){
            if(!state.modo.demo) return state;
            return calcularFeedback({
                ...state,
                // @ts-ignore copio los datos iniciales
                datos:bestGlobals.deepCopy(state.modo.demo)
            })
        },
    CONFIRMAR_BORRAR_RESPUESTA: (payload: {forPk:ForPk, variable:IdVariable|null}) => 
        function(state: CasoState){
            return calcularFeedback({
                ...state,
                opciones:{
                    ...state.opciones,
                    forPk:payload.forPk,
                    modoBorrarRespuesta: payload.variable
                }
            })
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
            calculada:casillero.unidad_analisis && casillero.unidad_analisis!=unidadAnalisis || casillero.despliegue?.includes('calculada'),
            libre:casillero.despliegue?.includes('libre')
        }
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
    rellenarVariablesYOpciones(estructuraIncompleta, casillero, casillero.unidad_analisis);
    var destinos=obtenerDestinosCasilleros(casillero);
    return rellenarDestinos(estructuraIncompleta, destinos);
}

export function toPlainForPk(forPk:ForPk):PlainForPk{
    // @ts-ignore sabemos que hay que hacer un JSON
    return JSON.stringify(forPk);
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
        if(myOwn.config.config.ambiente=='test'){
            likeAr(initialState.datos.hdr).forEach((viv,_k,_,i)=>{ 
                // @ts-ignore lo lleno después
                viv.respuestas={personas:[]}; 
                viv.tem.observaciones=i==1?'Timbre verde':''
            })
        }
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
                        feedbackRowValidator:casoState.feedbackRowValidator
                    }
                }
            }
            //inicializo feedbacks
            
            return initialState;
        }
        for(var vivienda in casoState.datos.hdr){
            casoState=calcularFeedback(casoState, {vivienda:vivienda as IdCaso, formulario: 'F:F1' as IdFormulario});
        }
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


