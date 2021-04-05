import { strict as likeAr } from "like-ar";

import { getRowValidator, Structure, Opcion as RowValidatorOpcion, FormStructureState, OpcionesRowValidator } from "row-validator";

import { date } from "best-globals";

import { CasilleroBase, CasillerosImplementados, CasoState, 
    DatosVivienda, EstadoCarga, EstructuraRowValidator, Estructura, 
    FeedbackVariable, Formulario, ForPk, ForPkRaiz,
    HojaDeRuta,  
    IdCarga, IdCasillero, IdDestino, IdFin, IdFormulario, IdPregunta, IdTarea, IdVariable, 
    IdUnidadAnalisis,
    InfoFormulario, 
    ModoDespliegue, 
    Opcion, PlainForPk, Respuestas, RespuestasRaiz, ResumenEstado,
    Tareas, TareasEstructura, TEM, Valor, Visita, 
    toPlainForPk,
    ModoAlmacenamiento, 
    UnidadAnalisis
} from "./tipos";

const GLOVAR_DATOSBYPASS='datosbypass';
const GLOVAR_MODOBYPASS='modobypass';
const GLOVAR_ESTRUCTURA='estructura';

type DatosByPass = {
    hojaDeRuta:HojaDeRuta
    feedbackRowValidator:{  // no se persiste
        [formulario in PlainForPk]:FormStructureState<IdVariable,IdFin> // resultado del rowValidator para estado.forPk
    }
    dirty:boolean
    modoAlmacenamiento:ModoAlmacenamiento
};

var datosByPass = {} as DatosByPass

//@ts-ignore arranca en blanco
var estructura:Estructura = null as Estructura;

function persistirDatosByPass(){
    var {modoAlmacenamiento, feedbackRowValidator, ...persistentes} = datosByPass
    if(modoAlmacenamiento=='local'){
        my.setLocalVar(GLOVAR_DATOSBYPASS, persistentes)
    }else{
        my.setSessionVar(GLOVAR_DATOSBYPASS, persistentes)
    }
    my.setSessionVar(GLOVAR_MODOBYPASS, modoAlmacenamiento)
}

function recuperarDatosByPass(){
    var recuperado:DatosByPass;
    var modoAlmacenamiento = my.getSessionVar(GLOVAR_MODOBYPASS) as ModoAlmacenamiento;
    if(modoAlmacenamiento=='local'){
        recuperado = my.getLocalVar(GLOVAR_DATOSBYPASS)
    }else{
        recuperado = my.getSessionVar(GLOVAR_DATOSBYPASS)
    }
    recuperado.feedbackRowValidator={} as DatosByPass["feedbackRowValidator"];
    datosByPass = {...recuperado, modoAlmacenamiento}
    calcularFeedbackHojaDeRuta();
}

export function cargarHojaDeRuta(nuevoPaquete:{hojaDeRuta:HojaDeRuta, modoAlmacenamiento:ModoAlmacenamiento, dirty?:boolean}){
    var modoActual = my.getSessionVar(GLOVAR_MODOBYPASS);
    if(modoActual && nuevoPaquete.modoAlmacenamiento!=modoActual){
        throw new Error('No se pueden mezclar modos de apertura de encuestas, directo y por hoja de ruta para MD ('+modoActual+', '+nuevoPaquete.modoAlmacenamiento+')');
    }
    datosByPass = {
        ...nuevoPaquete, 
        feedbackRowValidator: {} as DatosByPass["feedbackRowValidator"],
        dirty: nuevoPaquete.dirty??false
    }
    calcularFeedbackHojaDeRuta();
    persistirDatosByPass();
}

export function cargarEstructura(estructuraACargar:Estructura){
    estructura = estructuraACargar;
    my.setLocalVar(GLOVAR_ESTRUCTURA, estructura);
}


export function getHojaDeRuta(){
    if(!datosByPass.hojaDeRuta){
        recuperarDatosByPass();
    }
    return datosByPass.hojaDeRuta;
}

function objetoVacio(o:object){
    for(var k in o){
        return false;
    }
    return true;
}

export function getFeedbackRowValidator(){
    if(!datosByPass.feedbackRowValidator || objetoVacio(datosByPass.feedbackRowValidator)){
        calcularFeedbackHojaDeRuta();
    }
    return datosByPass.feedbackRowValidator;
}

export function getDirty(){
    return datosByPass.dirty
}

export function getEstructura(){
    return estructura;
}

type ElementosRegistrables = HTMLDivElement|HTMLButtonElement|HTMLInputElement;

type DirectFunction<T, Result> = (respuestasAumentadas:Respuestas, feedbackForm: FormStructureState<IdVariable,IdFin>, elemento:T,
    feedbackAll:{
        [formulario in PlainForPk]:FormStructureState<IdVariable,IdFin> // resultado del rowValidator para estado.forPk
    }
) => Result

type RegistroElemento<T extends ElementosRegistrables> = {
    id: string, 
    fun: DirectFunction<T, any>
} & ({
    prop:keyof T
    fun: DirectFunction<T, T[keyof T]>
}|{
    attr:string
    fun: DirectFunction<T, string>
}|{
    style:keyof CSSStyleDeclaration
    fun: DirectFunction<T, string>
}|{
    direct:true
    fun: DirectFunction<T, void>
})

type RegistroElementos<T extends ElementosRegistrables> = { [id:string]: RegistroElemento<T> & {elemento?:T} };

var registroElementosGlobal = {} as RegistroElementos<ElementosRegistrables>;

export function registrarElemento<T extends ElementosRegistrables>(def:RegistroElemento<T>){
    // @ts-ignore Sí, podría ser que los tipos de T sean distintos, pero van a ser coherentes
    var registroElementos:RegistroElementos<T> = registroElementosGlobal;
    registroElementos[def.id] = def;
}

type RespuestasForPkComun = {respuestas:Respuestas, respuestasRaiz:RespuestasRaiz, forPkRaiz:ForPkRaiz, unidadAnalisis:UnidadAnalisis}

function respuestasForPk(forPk:ForPk):RespuestasForPkComun
function respuestasForPk(forPk:ForPk, conAumentadas:true, agregarSiFalta?:boolean):RespuestasForPkComun & {respuestasAumentadas:Respuestas}
function respuestasForPk(forPk:ForPk, conAumentadas?:boolean, agregarSiFalta?:boolean):RespuestasForPkComun & {respuestasAumentadas?:Respuestas} {
    var respuestasAumentadas = {} as Respuestas;
    // @ts-expect-error lo que sobrar de respuestas no me importa...
    var respuestas = datosByPass.hojaDeRuta.respuestas as Respuestas;
    var respuestasRaiz: RespuestasRaiz; 
    var forPkRaiz: ForPk; 
    var unidad_analisis:IdUnidadAnalisis|undefined = estructura.formularios[forPk.formulario].casilleros.unidad_analisis
    var forPkApilada = forPk;
    var pila:[unidad_analisis:IdUnidadAnalisis, uaDef:UnidadAnalisis, forPk:ForPk][] = [];
    while(unidad_analisis){
        var uaDef:UnidadAnalisis = estructura.unidades_analisis[unidad_analisis];
        pila.push([unidad_analisis, uaDef, forPkApilada]);
        forPkApilada={...forPkApilada};
        delete forPkApilada[uaDef.pk_agregada]
        unidad_analisis=uaDef.padre
    }
    while(pila.length){
        [unidad_analisis, uaDef, forPkApilada] = pila.pop()!
        var valorPkOPosicion = forPkApilada[uaDef.pk_agregada];
        if(valorPkOPosicion == undefined){
            throw new Error(`falta un valor para ${JSON.stringify(uaDef.pk_agregada)}`)
        }
        if(respuestas[unidad_analisis] == null){
            respuestas[unidad_analisis] = [];
        }
        var respuestasAnterior=respuestas;
        let posicion = respuestas[unidad_analisis] instanceof Array?valorPkOPosicion - 1:valorPkOPosicion
        respuestas = respuestas[unidad_analisis][posicion];
        if(respuestas == null){
            if(agregarSiFalta){
                respuestas = {} as Respuestas
                respuestasAnterior[unidad_analisis][posicion] = respuestas
            }else{
                throw new Error(`No existe el elemento '${posicion}' en la unidad_analisis '${unidad_analisis}'`);
            }
        }
        forPkRaiz ||= forPkApilada;
        // @ts-expect-error Sé que es raíz por cómo estoy revolviendo la pila
        respuestasRaiz ||= respuestas;
        if(conAumentadas){
            respuestasAumentadas = {...respuestasAumentadas, ...respuestas, [uaDef.pk_agregada]:valorPkOPosicion}
        }
    }
    return {
        respuestas, respuestasAumentadas, 
        // @ts-ignore Sé que la pila tiene al menos un elemento por lo tanto esto está lleno seguro. 
        respuestasRaiz, forPkRaiz, unidadAnalisis: uaDef
    }
}

export function volcadoInicialElementosRegistrados(forPkRaiz:ForPkRaiz){
    var {respuestasAumentadas} = respuestasForPk(forPkRaiz, true)
    var registroElementos = registroElementosGlobal;
    for(var id in registroElementos){
        var def = registroElementos[id];
        if(def.elemento){
            if(!document.body.contains(def.elemento)){
                def.elemento = undefined;
            }
        }
        if(!def.elemento){
            def.elemento = document.getElementById(def.id) as ElementosRegistrables;
        }
        if(!def.elemento){
            // console.log('BUSCANDO el elemento registrado ',id,'no está en el DOM')
            continue;
        }
        var value = def.fun(respuestasAumentadas, datosByPass.feedbackRowValidator[toPlainForPk(forPkRaiz)], def.elemento, datosByPass.feedbackRowValidator);
        if('prop' in def){
            setValorDistinto(def.elemento, def.prop, value)
        }
        if('attr' in def){
            setAttrDistinto(def.elemento, def.attr, value)
        }
        if('style' in def){
            setValorDistinto(def.elemento.style, def.style, value)
        }
    }
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

export function setValorDistinto<T extends {}, N extends keyof T>(
    objeto:T,
    name:N,
    valor:T[N]
){
    if(objeto[name] != valor){
        objeto[name] = valor;
    }
}

function calcularVariablesBotonFormulario(_forPk:ForPk){
    
};


export function accion_id_pregunta(_payload:{pregunta: IdPregunta, forPk: ForPk}, _datosByPass:DatosByPass){
}

export const NO_CAMBIAR_VERIFICAR_SI_ES_NECESARIO = Symbol('NO_CAMBIAR_VERIFICAR_SI_ES_NECESARIO')

export function accion_registrar_respuesta(payload:{forPk:ForPk, variable:IdVariable, respuesta:Valor|typeof NO_CAMBIAR_VERIFICAR_SI_ES_NECESARIO, onAlreadyExists?:()=>void}, _datosByPass:DatosByPass){
    let token = 'AVERIGUAR TODO'
    let { forPk, respuesta, variable } = payload;
    var {respuestas, respuestasRaiz, forPkRaiz}  = respuestasForPk(forPk);
    var unidad_analisis = estructura.formularios[forPk.formulario];
    var recentModified = false;
    if(respuesta !== NO_CAMBIAR_VERIFICAR_SI_ES_NECESARIO){
        if(respuesta == ''){
            respuesta = null;
        }else if(estructura.formularios[forPk.formulario].estructuraRowValidator.variables[variable].tipo=='numero'){
            respuesta = Number(respuesta);
        }
        recentModified = respuestas[variable] != respuesta
        if(recentModified){
            respuestas[variable] = respuesta;
        }
    }
    if(recentModified || NO_CAMBIAR_VERIFICAR_SI_ES_NECESARIO && datosByPass.feedbackRowValidator[toPlainForPk(forPk)].autoIngresadas?.[variable]){
        variablesCalculadas(respuestasRaiz)
        if(respuestas[ultimaVaribleVivienda]==null && respuestas[ultimaVaribleVivienda]!=null){
            encolarBackup(token, forPkRaiz, respuestasRaiz);
        }
        respuestasRaiz.$dirty = respuestasRaiz.$dirty || recentModified;
        calcularFeedback(respuestasRaiz, forPkRaiz, {autoIngreso: true});
        calcularVariablesBotonFormulario(forPk);
        volcadoInicialElementosRegistrados(forPk);
        persistirDatosByPass();
    }
    if(!recentModified && payload.onAlreadyExists != null){
        payload.onAlreadyExists();
    }
}

export function accion_registrar_nota(payload:{forPkRaiz:ForPkRaiz, tarea:IdTarea, nota:string|null}, _datosByPass:DatosByPass){
    let { forPkRaiz, tarea, nota } = payload;
    console.log("FALTA // TODO")
}

export function accion_agregar_visita(payload:{forPkRaiz:ForPkRaiz, observaciones:string|null}, _datosByPass:DatosByPass){
    let { forPkRaiz, observaciones } = payload;
    /*
    if(!datosByPass.hojaDeRuta[vivienda].visitas){
        datosByPass.hojaDeRuta[vivienda].visitas = [];
    }
    var visitas = datosByPass.hojaDeRuta[vivienda].visitas;
    visitas.push({
        fecha: datetime.now().toYmd(),
        hora: datetime.now().toHm(),
        idper: null, // TODO: VER DE DONDE SE SACA EL IDPER state.datos.idper,
        observaciones:observaciones
    })
    */
}

export function accion_modificar_visita(payload: {forPkRaiz:ForPkRaiz, index:number, opcion:keyof Visita , valor:string|null}, _datosByPass:DatosByPass){
    let { forPkRaiz, index, opcion, valor} = payload;
    // var visitas = datosByPass.hojaDeRuta[vivienda].visitas;
    // visitas[index][opcion] = valor;
}

export function accion_borrar_visita(payload: {forPkRaiz:ForPkRaiz, index:number}, _datosByPass:DatosByPass){
    let { forPkRaiz, index} = payload;
    // var visitas = datosByPass.hojaDeRuta[vivienda].visitas;
    // visitas.splice(index, 1);
}

export function accion_agregar_formulario({forPk}: {forPk:ForPk}, _datosByPass:DatosByPass){
    var {respuestas, unidadAnalisis, respuestasAumentadas} = respuestasForPk(forPk, true, true);
    calcularFeedbackUnidadAnalisis(datosByPass.feedbackRowValidator, estructura.formularios, respuestas, unidadAnalisis.unidad_analisis, forPk, respuestasAumentadas, null, {})
    calcularVariablesBotonFormulario(forPk);
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

/* REDUCERS */

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

const helpersCasilleros={
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
        },
        hoy(){
            return date.today().toDmy()
        }
    }
};

type FuncionHabilitar = (valores:{[key:string]:any})=>boolean;
type FuncionValorar = (valores:{[key:string]:any})=>any;
var funcionesHabilitar:{[key:string]:FuncionHabilitar}={
}
var funcionesValorar:{[key:string]:FuncionValorar}={
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

export function getFuncionCompilada<T>(conjuntoDeFunciones:{[key:string]:(valores:{[key:string]:any})=>T}){
    return function(nombreFuncionComoExpresionJs:string){
        if(!conjuntoDeFunciones[nombreFuncionComoExpresionJs]){
            var cuerpo = nombreFuncionComoExpresionJs;
            try{
                // var cuerpo = miniCompiladorSQlJs(nombreFuncionComoExpresionJs);
                var internalFun =  new Function('valores', 'helpers', 'return '+cuerpo);
                conjuntoDeFunciones[nombreFuncionComoExpresionJs] = function(valores){
                    try{
                        var result = internalFun(valores, helpersCasilleros);
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
        return conjuntoDeFunciones[nombreFuncionComoExpresionJs];
    }
}

export const getFuncionHabilitar = getFuncionCompilada(funcionesHabilitar);
export const getFuncionValorar   = getFuncionCompilada(funcionesValorar);


var rowValidator = getRowValidator({getFuncionHabilitar, getFuncionValorar})

////// TODOS LOS NOMBRES DE variables o formularios o casilleros deben estar en el objeto operativo
//// QUITARLO Y REEMPLAZARLO por buscar en estructura.unidad_analisis y estructura.formulario
export var defOperativo = {
    esVacio:(respuestas:Respuestas)=>JSON.stringify(respuestas)=='{}',
    esNorea:(respuestas:Respuestas)=>respuestas['entrea' as IdVariable]!=1,
    UAprincipal:'viviendas' as IdUnidadAnalisis,
    defUA:{
        hogares  :{ pk: 'hogar'  , incluidas:['personas'], idsFor:['F:A1', 'F:S1']  },
        personas :{ pk: 'persona', incluidas:[]          , idsFor:['F:S1_P', 'F:I1']},
        viviendas:{ pk: false    , incluidas:['hogares'] , idsFor:['F:RE']          }
    } as unknown as {[i in IdUnidadAnalisis]:{pk:IdVariable, incluidas:IdUnidadAnalisis[], idsFor:IdFormulario[]}},
    defFor:{
        'F:RE':{arbolUA:[]},
        'F:S1':{arbolUA:['hogares']},
        'F:A1':{hermano:true, arbolUA:['hogares']},
        'F:S1_P':{arbolUA:['hogares', 'personas']},
        'F:I1':{arbolUA:['hogares', 'personas']}
    } as unknown as {[f in IdFormulario]:{arbolUA:IdUnidadAnalisis[], hermano?:true}}
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
    casos:{idBackup:number, forPkRaiz:ForPkRaiz, respuestasRaiz:Respuestas}[]
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

function encolarBackup(token:string|undefined, forPkRaiz:ForPkRaiz, respuestasRaiz:Respuestas){
    var backups:Backups = my.existsLocalVar('backups')?my.getLocalVar('backups'):{
        idActual:0,
        casos:[]
    };
    backups.idActual+=1;
    backups.token=token;
    backups.casos.push({idBackup:backups.idActual, forPkRaiz, respuestasRaiz});
    my.setLocalVar('backups',backups);
    backupPendiente = backupPendiente.then(enviarBackup)
}

function variablesCalculadas(_respuestasRaiz: Respuestas){
    return; 
}

export async function calcularFeedbackUnidadAnalisis(
    feedbackRowValidator:{ [formulario in PlainForPk]:FormStructureState<IdVariable,IdFin> },
    formularios:{ [nombreFormulario in IdFormulario]:InfoFormulario }, 
    respuestas:Respuestas, 
    UA:IdUnidadAnalisis, 
    forPk:ForPk,
    respuestasAumentadas:Respuestas, // incluyen la de todos los padres y ansestros,
    respuestasPadre:Respuestas|null, 
    opts:OpcionesRowValidator,
){
    // recorriend UA personas y mascotas
    for(var UAincluida of defOperativo.defUA[UA].incluidas){
        var pkNueva = defOperativo.defUA[UAincluida].pk;
        var conjuntoRespuestasUA = respuestas[UAincluida];
        likeAr(conjuntoRespuestasUA).forEach((respuestasHijo, valorPkOPosicion)=>{
            var valorPk = numberOrStringIncIfArray(valorPkOPosicion, conjuntoRespuestasUA);
            calcularFeedbackUnidadAnalisis(
                feedbackRowValidator, 
                formularios, 
                respuestasHijo, 
                UAincluida, 
                {...forPk, [pkNueva]:valorPk},
                {...respuestasAumentadas, ...respuestasHijo, [pkNueva]:valorPk},
                respuestas,
                opts
            );
        })
    }
    // S1 , A1
    for(var esHermano of [true, false]){
        for(var formulario of defOperativo.defUA[UA].idsFor) if(!!esHermano == !!defOperativo.defFor[formulario].hermano){
            var plainForPk:PlainForPk = toPlainForPk({...forPk, formulario})
            feedbackRowValidator[plainForPk]=
                rowValidator(
                    formularios[formulario].estructuraRowValidator, 
                    respuestasAumentadas,
                    opts
                )
            var {resumen, autoIngresadas} = feedbackRowValidator[plainForPk];
            var varName:IdVariable;
            if(autoIngresadas!=null){
                for(varName in autoIngresadas){
                    respuestas[varName] = autoIngresadas[varName];
                }
            }
            var resumenOrNull = resumen == 'vacio' ? null : resumen
            if(esHermano){
                respuestas['$B.'+formulario as IdVariable] = resumenOrNull;
            }else if(respuestasPadre != null){
                respuestasPadre['$B.'+formulario as IdVariable] = resumenOrNull;
            }
        }
    }
}

export function numberOrStringIncIfArray(numberOrString:number|string, object:object|any[]):(number|string){
    // @ts-expect-error estoy usando isNaN para ver si es o no un número sumable
    if(isNaN(numberOrString)){
        return numberOrString;
    }
    return Number(numberOrString)+(object instanceof Array?1:0);
}

export async function calcularFeedbackHojaDeRuta(){
    likeAr(estructura.unidades_analisis).filter(uaDef=>!uaDef.padre).forEach(uaDef=>{
        likeAr(estructura.formularios).filter(f=>f.casilleros.unidad_analisis == uaDef.unidad_analisis).forEach((_defF, formulario)=>{
            var conjuntoRespuestasUA = datosByPass.hojaDeRuta.respuestas[uaDef.unidad_analisis]
            likeAr(conjuntoRespuestasUA).forEach((respuestas, valorPkOPosicion)=>{
                var valorPk = numberOrStringIncIfArray(valorPkOPosicion, conjuntoRespuestasUA);
                var forPkRaiz = {formulario, [uaDef.pk_agregada]:valorPk}
                calcularFeedback(respuestas, forPkRaiz, {});
            })
        })
    });
}

export async function calcularFeedbackEncuesta(
    feedbackRowValidator:{ [formulario in PlainForPk]:FormStructureState<IdVariable,IdFin> },
    formularios:{ [nombreFormulario in IdFormulario]:InfoFormulario }, 
    forPkRaiz: ForPkRaiz, 
    respuestas:Respuestas, 
    opts:OpcionesRowValidator
){
    var forPk:ForPk ={...forPkRaiz};
    calcularFeedbackUnidadAnalisis(feedbackRowValidator, formularios, respuestas, defOperativo.UAprincipal, forPk, respuestas, null, opts);
}

function calcularFeedback(respuestas: Respuestas, forPkRaiz:ForPkRaiz, opts:OpcionesRowValidator){
    if(respuestas){
        // @ts-ignore Partial
        var nuevosRows : {[x in PlainForPk]:FormStructureState<IdVariable,IdFin>}={}
        calcularFeedbackEncuesta(nuevosRows, estructura.formularios, forPkRaiz, respuestas, opts);
        var resumenEstado = calcularResumenVivienda(forPkRaiz, 
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
    _forPkRaiz:ForPkRaiz, 
    _feedbackRowValidator:{[formulario in PlainForPk]:FormStructureState<IdVariable,IdFin>}, 
    respuestas:Respuestas
){
    if(defOperativo.esNorea(respuestas)){
       return "no rea";
    }
    if(defOperativo.esVacio(respuestas)){
        return "vacio";
    }
    //TODO GENERALIZAR
    return "no rea"; 
    /*
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
    return minResumen;
    */
}

