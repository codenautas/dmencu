import { strict as likeAr } from "like-ar";

import { getRowValidator, Structure, Opcion as RowValidatorOpcion, FormStructureState } from "row-validator";

import { deepFreeze, datetime } from "best-globals";

import { CasilleroBase, CasillerosImplementados, CasoState, 
    DatosVivienda, EstadoCarga, EstructuraRowValidator, Estructura, 
    FeedbackVariable, Formulario, ForPk, 
    IdCarga, IdCasillero, IdCaso, IdDestino, IdFin, IdFormulario, IdPregunta, IdTarea, IdVariable, 
    IdUnidadAnalisis,
    InfoFormulario, 
    ModoDespliegue, 
    Opcion, PlainForPk, Respuestas, ResumenEstado,
    Tareas, TareasEstructura, TEM, Valor, Visita, VivendasHdR,
    toPlainForPk
} from "./tipos";


type DatosByPass = {
    hdr:VivendasHdR,
    feedbackRowValidator:{  // no se persiste
        [formulario in PlainForPk]:FormStructureState<IdVariable,IdFin> // resultado del rowValidator para estado.forPk
    }
    dirty:boolean
};

var datosByPass = {} as DatosByPass

var estructura:Estructura = {
    
} as Estructura;


export function cargarHdr(){


}

export function cargarEstructura(estructuraACargar:Estructura){
    estructura = estructuraACargar;
}


export function getHdr(){
    return datosByPass.hdr;
}

export function getFeedbackRowValidator(){
    return datosByPass.feedbackRowValidator;
}

export function getDirty(){
    return datosByPass.dirty
}

export function getEstructura(){
    return estructura;
}

export function registrarElemento<T extends HTMLInputElement|HTMLDivElement>(def:{
    id:string, 
    fun:(respuestas:Respuestas, feedback: FormStructureState<IdVariable,IdFin>, elemento:T)=>void
} & ({prop:string}|{attr:string}|{style:string}|{direct:true}) ){
    console.log(registrarElemento, def);
}

export function setAttrDistinto<N extends string>(
    objeto:{setAttribute:(name:N, valor:string)=>void, getAttribute:(name:N)=>string|null},
    name:N,
    valor:string
){
    if(objeto.getAttribute(name) != valor){
        objeto.setAttribute(name, valor);
    }
}


export function setValorDistinto<V, N extends string>(
    objeto:{[K in N]:V},
    name:N,
    valor:V
){
    if(objeto[name] != valor){
        objeto[name] = valor;
    }
}

export function accion_id_pregunta(_payload:{pregunta: IdPregunta, forPk: ForPk}, _datosByPass:DatosByPass){
}

export function accion_registrar_respuesta(payload:{forPk:ForPk, variable:IdVariable, respuesta:Valor}, datosByPass:DatosByPass){
    let token = 'AVERIGUAR TODO'
    let { forPk, respuesta, variable } = payload;
    var datosVivienda = datosByPass.hdr[forPk.vivienda as IdCaso];
    var recentModified = datosVivienda.respuestas[variable] != respuesta
    if(recentModified){
        datosVivienda.respuestas[variable] = respuesta;
    }
    variablesCalculadas(datosVivienda)
    if(datosVivienda.respuestas[ultimaVaribleVivienda]==null && datosVivienda.respuestas[ultimaVaribleVivienda]!=null){
        encolarBackup(token, forPk.vivienda, datosVivienda);
    }
    datosVivienda.dirty = datosVivienda.dirty || recentModified;
    calcularFeedback(datosVivienda, forPk)
}

export function accion_registrar_nota(payload:{vivienda:IdCaso, tarea:IdTarea, nota:string|null}, _datosByPass:DatosByPass){
    let { vivienda, tarea, nota } = payload;
    console.log("FALTA // TODO")
}

export function accion_agregar_visita(payload:{vivienda:IdCaso, observaciones:string|null}, datosByPass:DatosByPass){
    let { vivienda, observaciones } = payload;
    if(!datosByPass.hdr[vivienda].visitas){
        datosByPass.hdr[vivienda].visitas = [];
    }
    var visitas = datosByPass.hdr[vivienda].visitas;
    visitas.push({
        fecha: datetime.now().toYmd(),
        hora: datetime.now().toHm(),
        idper: null, // TODO: VER DE DONDE SE SACA EL IDPER state.datos.idper,
        observaciones:observaciones
    })
}

export function accion_modificar_visita(payload: {vivienda:IdCaso, index:number, opcion:keyof Visita , valor:string|null}, datosByPass:DatosByPass){
    let { vivienda, index, opcion, valor} = payload;
    var visitas = datosByPass.hdr[vivienda].visitas;
    visitas[index][opcion] = valor;
}

export function accion_borrar_visita(payload: {vivienda:IdCaso, index:number}, datosByPass:DatosByPass){
    let { vivienda, index} = payload;
    var visitas = datosByPass.hdr[vivienda].visitas;
    visitas.splice(index, 1);
}

export function accion_agregar_formulario(_payload: {forPk:ForPk}, _datosByPass:DatosByPass){
    // REVISAR!!!! TODO
    // var {state, respuestas} = respuestasForPk(state, payload.forPk, true);
    // return calcularFeedback(state)
}

export function dispatchByPass<T>(
    fun:(payload:T, datos:typeof datosByPass)=>void,
    payload:T
){
    fun(payload, datosByPass);
}

//////////////////////////////////////////////////////////////////////////


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
        var plainForPk:PlainForPk = toPlainForPk({...forPk, formulario})
        feedbackRowValidator[plainForPk]=
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

function calcularFeedback(datosVivienda: DatosVivienda, forPk:ForPk){
    var tipo_seleccion = 'tipo_seleccion' as IdVariable;
    var tipo_relevamiento = 'tipo_relevamiento' as IdVariable;
    var vivienda = forPk.vivienda;
    var respuestas = datosVivienda.respuestas;
    if(respuestas){
        // @ts-ignore Partial
        var nuevosRows : {[x in PlainForPk]:FormStructureState<IdVariable,IdFin>}={}
        calcularFeedbackEncuesta(nuevosRows, estructura.formularios, forPk.vivienda, respuestas);
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
    datosByPass.feedbackRowValidator = {...datosByPass.feedbackRowValidator, ...nuevosRows};
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

