import { strict as likeAr, beingArray } from "like-ar";

import { getRowValidator, FormStructureState, OpcionesRowValidator } from "row-validator";

import { date, compareForOrder, coalesce } from "best-globals";

import {
    Estructura, 
    ForPk, ForPkRaiz,
    IdFin, IdFormulario, IdPregunta, IdTarea, IdVariable, 
    IdUnidadAnalisis,
    InfoFormulario, 
    PlainForPk, Respuestas, RespuestasRaiz, ResumenEstado,
    Valor, Visita, 
    toPlainForPk,
    UnidadAnalisis,
    Formulario,
    ConfiguracionSorteoFormulario,
    DatosByPassPersistibles
} from "./tipos";

var especiales = {} as {
    calcularVariables?:(respuestasRaiz:RespuestasRaiz, forPk:ForPk)=>void
}
export function setCalcularVariables(calcularVariables:(respuestasRaiz:RespuestasRaiz,forPk:ForPk)=>void){
    especiales.calcularVariables = calcularVariables
}

type DatosByPass = DatosByPassPersistibles & {
    feedbackRowValidator:{  // no se persiste
        [formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin> // resultado del rowValidator para estado.forPk
    }
    dirty:boolean
};

var datosByPass = {} as DatosByPass

//@ts-ignore arranca en blanco
var estructura:Estructura = null as Estructura;

let persistirDatosByPassInterno:(dbpp:DatosByPassPersistibles)=>Promise<any> = ()=>{
    throw new Error('persistirDatosByPass SIN DEFINIR')
}

export function setPersistirDatosByPass(persistirDatosByPassFun:typeof persistirDatosByPass){
    persistirDatosByPassInterno = persistirDatosByPassFun;
}

async function persistirDatosByPass(dbpp:DatosByPassPersistibles){
    await persistirDatosByPassInterno(dbpp);
    datosByPass.dirty = false
    refrescarMarcaDirty();
}

export function setEncolarBackup(
    encolarBackupFun:(token:string|undefined, forPkRaiz:ForPkRaiz, respuestasRaiz:Respuestas)=>void
){
    encolarBackup = encolarBackupFun
}

let encolarBackup:(token:string|undefined, forPkRaiz:ForPkRaiz, respuestasRaiz:Respuestas)=>void = ()=>{
    throw new Error("SIN ESPECIFICAR encolarBackup")
}

export var intentarBackup = (forPk:ForPk)=>{
    var {respuestasRaiz, forPkRaiz} = respuestasForPk(forPk, true)
    var token = datosByPass.token;
    if(token){
        encolarBackup(token, forPkRaiz, respuestasRaiz)
    }else{
        console.log("no hay token, no se pudo hacer el backup")
    }
}

export function setEstructura(estructuraACargar:Estructura){
    estructura = estructuraACargar;
    defOperativo.UAprincipal = likeAr(estructura.unidades_analisis).find(ua=>!!ua.principal)?.unidad_analisis!
    defOperativo.defFor = likeAr(estructura.formularios).map(f=>({hermano: f.casilleros.hermano})).plain()
    defOperativo.defUA = likeAr(estructura.unidades_analisis).map((uaDef, ua)=>({
        pk:uaDef.pk_agregada as IdVariable, 
        incluidas: likeAr(uaDef.hijas).keys(),
        idsFor: likeAr(estructura.formularios).filter(f=>f.casilleros.unidad_analisis == ua).keys()
    })).plain()
    return estructura; 
}

export function setDatosByPass(dbpp:DatosByPassPersistibles & {dirty?:boolean}){
    datosByPass = {
        dirty:false,
        ...dbpp,
        feedbackRowValidator:{} as DatosByPass["feedbackRowValidator"]
    }
    calcularFeedbackHojaDeRuta();
}

export var getDatosByPass = ()=> datosByPass

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

type DirectFunction<T, Result> = (respuestasAumentadas:Respuestas, feedbackForm: FormStructureState<IdVariable,Valor,IdFin>, elemento:T,
    feedbackAll:{
        [formulario in PlainForPk]:FormStructureState<IdVariable,Valor,IdFin> // resultado del rowValidator para estado.forPk
    },
    estructura:Estructura
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
    var respuestas = datosByPass.respuestas as Respuestas;
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
                persistirDatosByPass(datosByPass); // OJO ASYNC DESCONTROLADA
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
    var plainForPk = toPlainForPk(forPkRaiz)
    var rowValidator =  datosByPass.feedbackRowValidator[plainForPk];
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
        var value = def.fun(respuestasAumentadas, rowValidator, def.elemento, datosByPass.feedbackRowValidator, estructura);
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
    if(rowValidator.actual){
        var {top, bottom} = calcularElementoEnfocado(rowValidator.actual);
        if(top != null && bottom !=null){
            // @ts-ignore
            document.getElementById('fab-activo-arriba').elTopVisibilizar = top;
            // @ts-ignore
            document.getElementById('fab-activo-abajo').elBottomVisibilizar = bottom;
        }
    }
}

export function calcularElementoEnfocado(idVariable:IdVariable|IdFin){
    var elementoVariableAEnfocar = document.getElementById(idVariable=='fin'?`boton-volver-2`:`var-${idVariable}`)
        ||document.getElementById(`seccion-boton-formulario-${idVariable}`);
    var elemento = elementoVariableAEnfocar;
    var MARGEN_SCROLL = 64;
    var altoPantalla = window.innerHeight*0.7 - MARGEN_SCROLL;
    var elementoEntero:HTMLElement|null = elemento; // es el elemento que va a entar entero en pantalla, define el bottom
    var rectElementoEntero:ReturnType<typeof myOwn.getRect>|null = null;
    var elementoSuperior:HTMLElement|null = null; // es el elemento que va a mostrarse desde arriba aunque no entre entero, define el top
    var rectElementoSuperior:ReturnType<typeof myOwn.getRect>|null = null;
    while(elemento != null){
        if(elemento.classList.contains('variable') 
        || elemento.classList.contains('multiple') 
        || elemento.classList.contains('pregunta') 
        || elemento.classList.contains('conjuntopreguntas') 
        || elemento.classList.contains('seccion-boton-formulario') 
        || elemento.classList.contains('botonformulario') 
        ){
            if(elementoSuperior == null && elemento.clientHeight < altoPantalla){
                elementoEntero = elemento;
            }else{
                if(rectElementoEntero == null){
                    elementoSuperior = elementoEntero
                    rectElementoEntero = myOwn.getRect(elementoEntero!)
                    rectElementoSuperior = rectElementoEntero;
                }
                var rect = myOwn.getRect(elemento);
                if(rectElementoEntero.top + rectElementoEntero.height - rect.top < altoPantalla){
                    elementoSuperior = elemento;
                    rectElementoSuperior = rect;
                }else{
                    elemento = null;
                }
            }
        }
        elemento = elemento?.parentElement ?? null;
    }
    if(elementoSuperior == null){
        elementoSuperior = elementoEntero;
    }
    var result:{
        elementoInputVariable?:HTMLElement|null
        top?:number|null
        bottom?:number|null
        enfocado?:boolean|null
        desenfoque?:string|null
    } = {};
    if(elementoEntero != null){
        if(rectElementoEntero == null){
            rectElementoEntero = myOwn.getRect(elementoEntero)
        }
        result.elementoInputVariable = elementoVariableAEnfocar;
        var top = (rectElementoSuperior??rectElementoEntero).top - MARGEN_SCROLL;
        result.top = top;
        result.bottom = rectElementoEntero.top+rectElementoEntero.height;
        if(top<document.documentElement.scrollTop){
            result.desenfoque='arriba';
        }else if(rectElementoEntero.top+rectElementoEntero.height > document.documentElement.scrollTop + altoPantalla){
            result.desenfoque='abajo';
        }else{
            result.enfocado=true
        }
    }
    return result;
}

export function setAttrDistinto<N extends string>(
    objeto:{setAttribute:(name:N, valor:string)=>void, getAttribute:(name:N)=>string|null},
    name:N,
    valor:string
){
    if(objeto && objeto.getAttribute(name) != valor){
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

export const NO_CAMBIAR__SOLO_TRAER_STATUS = Symbol('NO_CAMBIAR_SOLO_TRAER_STATUS')
export const NO_CAMBIAR__VERIFICAR_SI_ES_NECESARIO = Symbol('NO_CAMBIAR_VERIFICAR_SI_ES_NECESARIO')

function refrescarMarcaDirty(){
    var botonGrabar = document.getElementById("save-button") as HTMLButtonElement;
    if(botonGrabar){
        if(botonGrabar.disabled !== !datosByPass.dirty){
            botonGrabar.disabled = !datosByPass.dirty;
        }
    }
}

export function accion_registrar_respuesta(payload:{
    forPk:ForPk, 
    variable:IdVariable|typeof NO_CAMBIAR__SOLO_TRAER_STATUS, 
    respuesta:Valor|typeof NO_CAMBIAR__VERIFICAR_SI_ES_NECESARIO
}, _datosByPass:DatosByPass){
    let token = 'AVERIGUAR TODO'
    let { forPk, respuesta, variable } = payload;
    var {respuestas, respuestasRaiz, forPkRaiz}  = respuestasForPk(forPk);
    var unidad_analisis = estructura.formularios[forPk.formulario];
    var recentModified = false;
    var valorAnterior = variable != NO_CAMBIAR__SOLO_TRAER_STATUS ? respuestas[variable] : null;
    if(respuesta !== NO_CAMBIAR__VERIFICAR_SI_ES_NECESARIO && variable != NO_CAMBIAR__SOLO_TRAER_STATUS){
        if(respuesta === ''){
            respuesta = null;
        }else if(estructura.formularios[forPk.formulario].estructuraRowValidator.variables[variable].tipo=='numero'){
            if(respuesta != null){
                respuesta = Number(respuesta);
            }
        }
        // si es un falsy (0 == false) tengo que comparar con !==
        recentModified = respuesta ? valorAnterior != respuesta : valorAnterior !== respuesta
        if(recentModified){
            respuestas[variable] = respuesta ?? null; // cambio undefined por null
        }
    }
    var feedbackRow = datosByPass.feedbackRowValidator[toPlainForPk(forPk)];
    var siguienteVariable:IdVariable|IdFin|null|undefined;
    if(variable != NO_CAMBIAR__SOLO_TRAER_STATUS && (recentModified || NO_CAMBIAR__VERIFICAR_SI_ES_NECESARIO && feedbackRow.autoIngresadas?.[variable])){
        variablesCalculadas(respuestasRaiz, forPk);
        if(estructura.configSorteo && !datosByPass?.soloLectura){
            verificarSorteo({
                configuracionSorteo: estructura.configSorteo[getMainFormForVivienda(forPk.vivienda!)], 
                respuestas,
                respuestasRaiz,
                variableActual: variable, 
                forPk: forPk
            })
        }
        datosByPass.dirty = datosByPass.dirty || recentModified;
        respuestasRaiz.$dirty = respuestasRaiz.$dirty || recentModified;
        refrescarMarcaDirty();
        calcularFeedback(respuestasRaiz, forPkRaiz, {autoIngreso: true});
        feedbackRow = datosByPass.feedbackRowValidator[toPlainForPk(forPk)];
        calcularVariablesBotonFormulario(forPk);
        volcadoInicialElementosRegistrados(forPk);
        persistirDatosByPass(datosByPass); // OJO ASYNC DESCONTROLADA
        siguienteVariable = variable;
        do{
            siguienteVariable = feedbackRow.feedback[siguienteVariable].siguiente;
        }while(valorAnterior == null && recentModified && siguienteVariable != null && siguienteVariable != 'fin' && estructura.formularios[forPk.formulario].estructuraRowValidator.variables[siguienteVariable].funcionAutoIngresar)
        if(siguienteVariable == null && feedbackRow.feedback[variable].estado == 'valida'){
            siguienteVariable = 'fin';
        }
    }
    return {recentModified, siguienteVariable, variableActual: feedbackRow.actual};
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
    var {respuestas, unidadAnalisis, respuestasAumentadas, respuestasRaiz} = respuestasForPk(forPk, true, true);
    variablesCalculadas(respuestasRaiz, forPk);
    calcularFeedbackUnidadAnalisis(datosByPass.feedbackRowValidator, estructura.formularios, respuestas, unidadAnalisis.unidad_analisis, forPk, respuestasAumentadas, null, {})
    calcularVariablesBotonFormulario(forPk);
}

export function accion_abrir_formulario({forPk}: {forPk:ForPk}, _datosByPass:DatosByPass){
    var {respuestas, unidadAnalisis, respuestasAumentadas, respuestasRaiz} = respuestasForPk(forPk, true, true);
    variablesCalculadas(respuestasRaiz, forPk);
    calcularFeedbackUnidadAnalisis(datosByPass.feedbackRowValidator, estructura.formularios, respuestas, unidadAnalisis.unidad_analisis, forPk, respuestasAumentadas, null, {})
    calcularVariablesBotonFormulario(forPk);
}

export function dispatchByPass<T, R>(
    fun:(payload:T, datos:typeof datosByPass)=>R,
    payload:T
){
    return fun(payload, datosByPass);
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
        hoy(){
            return date.today().toDmy()
        },
        informado(x:any){
            return x!==undefined && x!==null && (!(x instanceof Array)|| x.length!==0 )
            && (!(x instanceof Object)|| Object.keys(x).length !== 0 )
        },
        nsnc(x:any){
            return x == -9
        },
        par(x:number){
            return x % 2==0
        },
        /*
        dbo:{
            datoFamiliar(encu:string,hog:number,per:number, dato:string){
                var xpersonas=personas;
                return encu==enc && hog==hogar && informado(xpersonas) && per<= xpersonas.length && per>=1 && !!xpersonas[per-1][dato]? xpersonas[per-1][dato]:null
            },
            edadfamiliar(encu:string,hog:number,per:number){
                var xpersonas=personas;
                return datoFamiliar(encu:string,hog:number,per:number,'edad')
            },
            existeindividual(encu:string,hog:number,per:number){
                var xpersonas=personas;
                return encu==enc && hog==hogar && !!personas && per<= personas.length && per>=1 && !!personas[per-1]['entreaind']
            },
            existemiembro(encu:string,hog:number,per:number){
                var xpersonas=personas;
                return encu==enc && hog==hogar && !!personas && per<= personas.length && per>=1
            },
            nroconyuges(encu:string,hog:number){
                var xpersonas=personas
                return xpersonas.filter( per->per.p4==2).length
            },
            nrojefes(encu:string,hog:number,per:number){
                return personas.filter( per->per.p4==1).length
            },
            parentescofamiliar(encu:string,hog:number,per:number){
                return datoFamiliar(encu:string,hog:number,per:number,'p4')
            },
            sexofamiliar(encu:string,hog:number,per:number){
                var xpersonas=personas;
                return encu==enc && hog==hogar && !!xpersonas && per<= xpersonas.length && per>=1 && !!xpersonas[per-1].sexo? xpersonas[per-1]['sexo']:null
            },
            sitconyjefe(encu:string,hog:number){
                return datoFamiliar(encu:string,hog:number,1,'p5')
            }
        } */       
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


var rowValidator = getRowValidator<IdVariable, Valor, IdFin>({getFuncionHabilitar, getFuncionValorar})

////// TODOS LOS NOMBRES DE variables o formularios o casilleros deben estar en el objeto operativo
//// QUITARLO Y REEMPLAZARLO por buscar en estructura.unidad_analisis y estructura.formulario
export var defOperativo = {
    //TODO: GENERALIZAR
    //esNorea:(respuestas:Respuestas)=>{
    //    const NO_REA_VAR = 'entreav' as IdVariable; 
    //    return respuestas[NO_REA_VAR] && respuestas[NO_REA_VAR]!=1
    //},
    
    esNorea:(respuestas:Respuestas)=>{
        //TODO GENERALIZAR
        var unidadesARecorrer = ['viviendas','hogares','personas'] as IdUnidadAnalisis[];
        var uaPrincipal = likeAr(estructura.unidades_analisis).find((ua)=>!ua.padre);
        var esNoRea = false;
        var codNoRea:string|null= null;

        var buscarNoReaEnRespuestas = (unidadAnalisis:UnidadAnalisis, respuestas:Respuestas)=>{
            if(unidadesARecorrer.includes(unidadAnalisis.unidad_analisis)){
                for(let noRea of estructura.noReas){
                    var {variable, valor, no_rea} = noRea;
                    if(respuestas[variable as IdVariable]==valor){
                        codNoRea = no_rea;
                        esNoRea = true;
                        return true
                    }
                }
            }
            for(let ua of (likeAr(unidadAnalisis?.hijas).array())){
                if(ua?.unidad_analisis && respuestas[ua.unidad_analisis] instanceof Array){
                    for(let respuestasHijas of respuestas[ua?.unidad_analisis]){
                        let result = buscarNoReaEnRespuestas(ua,respuestasHijas);
                        if(result){
                            break;
                        }
                    }
                }
            }
            return false
        }
        buscarNoReaEnRespuestas(uaPrincipal!,respuestas);
        return {codNoRea,esNoRea}
    },
	/*
    esNoreaSup:(respuestas:Respuestas)=>{
        //TODO GENERALIZAR buscarNoreaRespuestas
       var unidadesARecorrerSup = ['viviendas','hogares_sup','personas_sup'] as IdUnidadAnalisis[];
       var uaPrincipal = likeAr(estructura.unidades_analisis).find((ua)=>!ua.padre);
       var esNoReaSup = false;
       var codNoReaSup:string|null= null;
      // buscarNoReaEnRespuestas( unidadesARecorrerSup,uaPrincipal!,respuestas,noReasSup,'no_rea_sup');//con los parametros que necesitariamos para generalizar
      // return {codNoReaSup,esNoReaSup}
    },
	*/
    esRealizada:(respuestas:Respuestas)=>{
        //TODO GENERALIZAR
        var esRea = false;
        var codRea:number|null= null;
        if(!respuestas['identif' as IdVariable]){
            return {codRea, esRea}
        }else if(respuestas['identif' as IdVariable]==2 ||respuestas['resid_hog' as IdVariable]==2||respuestas['contact' as IdVariable]==2){
            codRea = 2;
            esRea = false;
        }else{
            var reahs: number[]=[] ;
            var respuestasHs = respuestas['hogares'];
            if(respuestasHs){
                for(let respuestasH of respuestasHs){
                    var reah:number;
                    var selec:number;
                    if(respuestasH['entrea' ] != 1||respuestasH['prejue1']==2||respuestasH['tp']==0){
                        reah=2;
                    }else{
                        selec=respuestasH['cr_num_miembro']
                        if(respuestasH['personas'] && respuestasH.personas[selec-1] ){
                            var respuestasP = respuestasH.personas[selec-1];
                            var resp_entrea_ind = respuestasP['entreaind' as IdVariable ];
                            if(resp_entrea_ind==null){ //queremos contemplar el undefined
                                reah = 3;
                            }else{
                                reah = Number(resp_entrea_ind);
                            }
                        }else{
                            reah = 3;
                        }
                    }
                    reahs.push(reah);
                }
                if (reahs.every(rh=>rh==1)){
                    codRea = 1;
                    esRea = true;
                }else if(reahs.every(rh=>rh==2)){
                    codRea = 2;
                    esRea = false;
                }else if(reahs.every(rh=>rh==1||rh==3)){
                    codRea = 3;
                    esRea = false;
                }else{
                    codRea = 4;
                    esRea = false;
                }
            } else{
                codRea = 3;
                esRea = false;
            }
        }
        return {codRea,esRea}
    },
    /*
    esRealizadaSup:(respuestas:Respuestas)=>{
        //TODO GENERALIZAR 
        var esReaSup = false;
        var codReaSup:number|null= null;
        if(!respuestas['confir_tel_sup' as IdVariable] && !respuestas['sp1a' as IdVariable]){
            return {codReaSup, esReaSup}
        }else if( respuestas['confir_tel_sup' as IdVariable]==2 || respuestas['confir_dom_sup' as IdVariable]==2||respuestas['sp1a' as IdVariable]==2 ||respuestas['sp1b' as IdVariable]==2||respuestas['sp1c' as IdVariable]==2){
            codReaSup = 2;
            esReaSup = false;
        }else{
            var reahs: number[]=[] ;
            var respuestasHs = respuestas['hogares_sup'];
            if(respuestasHs){
                for(let respuestasH of respuestasHs){
                    var reah:number;
                    var selec:number;
                    if(respuestasH['entrea_sup' ] != 1||respuestasH['spr1_sup']==2||respuestasH['sp4']==3||respuestasH['total_rango_sup']==0){
                        reah=2;
                    }else{
                        reah = 3;
                    }
                    reahs.push(reah);
                }
                if (reahs.every(rh=>rh==1)){
                    codReaSup = 1;
                    esReaSup = true;
                }else if(reahs.every(rh=>rh==2)){
                    codReaSup = 2;
                    esReaSup = false;
                }else if(reahs.every(rh=>rh==1||rh==3)){
                    codReaSup = 3;
                    esReaSup = false;
                }else{
                    codReaSup = 4;
                    esReaSup = false;
                }
            } else{
                codReaSup = 3;
                esReaSup = false;
            }
        }
        return {codReaSup,esReaSup}
    },
    */    
    UAprincipal:'' as IdUnidadAnalisis,
    defUA:{} as {[i in IdUnidadAnalisis]:{pk:IdVariable, incluidas:IdUnidadAnalisis[], idsFor:IdFormulario[]}},
    defFor:{} as {[f in IdFormulario]:{/*arbolUA:IdUnidadAnalisis[], */ hermano?:true}}
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

var funcionesConocidas:{[k in string]:boolean} = {}

export function verificarSorteo(opts:{
    configuracionSorteo:ConfiguracionSorteoFormulario, 
    respuestas:Respuestas,
    respuestasRaiz: RespuestasRaiz
    forPk:ForPk,
    variableActual:IdVariable

}){
    const resetearSorteo = (opts:{respuestas:Respuestas})=>{
        var {respuestas} = opts;
        respuestas[configuracionSorteo.resultado]=null;
        respuestas[configuracionSorteo.cantidad_sorteables]=null;
        respuestas[configuracionSorteo.disparador] = null;
        configuracionSorteo.sorteado_mostrar?.forEach((mostrar)=>respuestas[mostrar.target]=null);
        if('var_letra' in configuracionSorteo.param_metodo){
            if(respuestas[unidadAnalisis] && respuestas[unidadAnalisis] instanceof Array){
                for(var per of respuestas[unidadAnalisis]){
                    per[configuracionSorteo.param_metodo.var_letra] = null;
                }
            }
        }
    }

    var {configuracionSorteo, variableActual, respuestas, forPk, respuestasRaiz} = opts;
    var idEnc = forPk.vivienda!;
    var {respuestasAumentadas} = respuestasForPk(forPk, true);
    var expr_incompletitud_fun = getFuncionHabilitar(configuracionSorteo.expr_incompletitud_js[respuestasAumentadas.vdominio].expr);
    var filtro_fun =  getFuncionHabilitar(configuracionSorteo.filtro_js[respuestasAumentadas.vdominio].expr);
    var unidadAnalisis = configuracionSorteo.unidad_analisis;

    if(configuracionSorteo.parametros.includes(variableActual)){
        var uaPadre = likeAr(estructura.unidades_analisis).find((ua)=>ua.unidad_analisis==unidadAnalisis)?.padre;
        var pkAgregadaPadre = likeAr(estructura.unidades_analisis).find((ua)=>ua.unidad_analisis==uaPadre)?.pk_agregada
        if(uaPadre && respuestasAumentadas[uaPadre]){
            //@ts-ignore pkAgregadaPadre existe e indica la posicion del padre
            var padre = respuestasAumentadas[uaPadre][Number(respuestasAumentadas[pkAgregadaPadre])-1];
            if(variableActual != configuracionSorteo.cantidad_total){
                padre[configuracionSorteo.cantidad_total]=padre[unidadAnalisis].length; //si agrega desde boton agregar
            }
            resetearSorteo({respuestas:padre});
            respuestas = padre;
        }
    }
    if(respuestas[unidadAnalisis] != null){
        if(respuestas[unidadAnalisis] instanceof Array){
            var respuestasUA = respuestas[unidadAnalisis] as Respuestas[]
            if(respuestas[configuracionSorteo.disparador]!=1){
                if(respuestas[configuracionSorteo.disparador]==2){
                    respuestas[configuracionSorteo.cantidad_total]=respuestasUA.length + 1
                }
                resetearSorteo({respuestas});
            }
            let cantidadTotal = Number(respuestas[configuracionSorteo.cantidad_total]);
            if(cantidadTotal<respuestasUA.length){
                // doble asignación para que lo cargue en respuestas
                respuestasUA = respuestasUA.filter((p,i)=>
                    configuracionSorteo.parametros.some((param)=>p[param] || i <= cantidadTotal-1)
                );
                respuestas[unidadAnalisis] = respuestasUA
            }
            while(cantidadTotal>respuestasUA.length){
                respuestasUA.push({} as Respuestas)
            }
            
            respuestas[configuracionSorteo.incompletas] = respuestasUA.filter(p=>expr_incompletitud_fun(p)).length;
            
            if(respuestas[configuracionSorteo.disparador]==1 &&
                !respuestas[configuracionSorteo.resultado] &&
                respuestas[configuracionSorteo.incompletas]==0
            ){
                var sortear=respuestasUA.filter(p=>filtro_fun(p));
                if(sortear.length){
                    respuestasUA.forEach((per, i)=>per.$p0=i+1);
                    configuracionSorteo.orden.push({variable:"$p0" as IdVariable, orden:1});
                    sortear.sort(compareForOrder(configuracionSorteo.orden.map(elem => ({column:elem.variable, order:elem.orden}))));
                    var posicionSorteada = null;
                    if(configuracionSorteo.metodo=='hash'){
                        throw new Error('NO IMPLEMENTADO');
                        /*posicionSorteada=(
                            configuracionSorteo.param_metodo.var_coef.reduce(
                                ((sum, pair)=>sum + datosVivienda.tem[pair.var] * pair.coef),
                                0
                            ) % configuracionSorteo.param_metodo.divisor
                        ) % sortear.length*/
                    }else{
                        var letra = 'A';
                        const varLetra:IdVariable = configuracionSorteo.param_metodo.var_letra;
                        for(var persona of sortear){
                            respuestasUA.find((_per,i)=>i==persona.$p0-1)![varLetra] = letra;
                            persona[varLetra]=letra;
                            letra = String.fromCharCode(letra.charCodeAt(0)+1);   
                        }
                        var tablaAleatoriaMiembros = configuracionSorteo.param_metodo.tabla.map((lista)=>lista.split(''));
                        var resto = idEnc % 10;
                        var columnaTablaAleatoria = resto?resto - 1:9;
                        if(sortear.length > tablaAleatoriaMiembros.length){
                            sortear.splice(tablaAleatoriaMiembros.length) //descarto candidatos si son más que lo que permite la tabla
                        }
                        var filaTablaAleatoria = sortear.length - 1 ;
                        var letraSeleccionada = tablaAleatoriaMiembros[filaTablaAleatoria][columnaTablaAleatoria];
                        posicionSorteada = respuestasUA.findIndex((p:Respuestas)=>p[varLetra]==letraSeleccionada) + 1;
                        respuestas[configuracionSorteo.resultado]=posicionSorteada;
                        respuestas[configuracionSorteo.cantidad_sorteables]=sortear.length;
                        configuracionSorteo.sorteado_mostrar?.forEach((mostrar)=>
                            respuestas[mostrar.target]=respuestasUA[respuestas[configuracionSorteo.resultado] as number -1][mostrar.source]
                        )
                    }
                }else{
                    respuestas[configuracionSorteo.cantidad_sorteables]=0;
                }
            }
            respuestas[configuracionSorteo.cantidad_total]= respuestasUA.length || null; //no queremos el valor 0
            respuestas[configuracionSorteo.variableBotonFormularioUA]='ok';
            if(configuracionSorteo.variableBotonFormularioUAIndividual){
                respuestas[configuracionSorteo.variableBotonFormularioUAIndividual]='ok';
            }
        }
    }
}

function variablesCalculadas(respuestasRaiz: RespuestasRaiz, forPk:ForPk){
    if(especiales.calcularVariables){
        especiales.calcularVariables(respuestasRaiz, forPk);
    }
}

export function calcularFeedbackUnidadAnalisis(
    feedbackRowValidator:{ [formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin> },
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
            var maxPasosAutoingresadas = 10;
            var varAutoIngresadas = [];
            do{
                var huboAutoingresos = false;
                feedbackRowValidator[plainForPk]=
                    rowValidator(
                        {marcaFin:'fin', ...formularios[formulario].estructuraRowValidator}, 
                        respuestasAumentadas,
                        opts
                    )
                var {resumen, autoIngresadas} = feedbackRowValidator[plainForPk];
                var varName:IdVariable;
                if(autoIngresadas!=null){
                    for(varName in autoIngresadas){
                        var cambio = respuestas[varName] !== autoIngresadas[varName] as Valor;
                        if(cambio){
                            respuestas[varName] = autoIngresadas[varName] as Valor;
                            respuestasAumentadas[varName] = autoIngresadas[varName] as Valor;
                            varAutoIngresadas.push(varName);
                            huboAutoingresos = true;
                        }
                    }
                }
            } while(huboAutoingresos && maxPasosAutoingresadas-->0);
            varAutoIngresadas.forEach(varname=>{
                // feedbackRowValidator[plainForPk].estados[varname as IdVariable] = 'actual';
            })
            var BF_varname = '$B.'+formulario as IdVariable
            var formPrincipalForVivienda = getMainFormForVivienda(forPk.vivienda!);
            if(estructura.configSorteo && !estructura.configSorteo[formPrincipalForVivienda]){
                throw new Error(`no hay configuracion de sorteo para el formulario ${formPrincipalForVivienda}`)
            }
            var configSorteoFormulario = estructura.configSorteo && estructura.configSorteo[formPrincipalForVivienda];
            var resumenOrNull = 
                configSorteoFormulario &&
                configSorteoFormulario.variableBotonFormularioUAIndividual && 
                configSorteoFormulario.variableBotonFormularioUAIndividual == BF_varname?
                    'ok'
                :resumen == 'vacio' ? 
                    null
                :resumen
            if(esHermano){
                respuestas[BF_varname] = resumenOrNull;
            }else if(respuestasPadre != null){
                respuestasPadre[BF_varname] = resumenOrNull;
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

export var getMainFormForVivienda = (vivienda:number):IdFormulario=>{
    //@ts-ignore la vivienda es el parametro correcto
    return datosByPass.informacionHdr[vivienda].tarea.main_form
}

export function calcularFeedbackHojaDeRuta(){
    likeAr(estructura.unidades_analisis).filter(uaDef=>!uaDef.padre).forEach(uaDef=>{
        var esPrincipal = (f:Formulario, enc:any)=> {
            let formularioPrincipal = getMainFormForVivienda(enc);
            return formularioPrincipal?formularioPrincipal==f.id_casillero:f.formulario_principal
        }
        var conjuntoRespuestasUA = datosByPass.respuestas[uaDef.unidad_analisis]
        beingArray(conjuntoRespuestasUA).forEach((respuestas, valorPkOPosicion)=>{
            var valorPk = numberOrStringIncIfArray(valorPkOPosicion, conjuntoRespuestasUA);
            likeAr(estructura.formularios).filter(f=>f.casilleros.unidad_analisis == uaDef.unidad_analisis && esPrincipal(f.casilleros, valorPk as number)).forEach((_defF, formulario)=>{
                var forPkRaiz = {formulario, [uaDef.pk_agregada]:valorPk}
                calcularFeedback(respuestas, forPkRaiz, {});
            })
        })
    });
}

export function calcularFeedbackEncuesta(
    feedbackRowValidator:{ [formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin> },
    formularios:{ [nombreFormulario in IdFormulario]:InfoFormulario }, 
    forPkRaiz: ForPkRaiz, 
    respuestas:Respuestas, 
    opts:OpcionesRowValidator
){
    var forPk:ForPk ={...forPkRaiz};
    calcularFeedbackUnidadAnalisis(feedbackRowValidator, formularios, respuestas, defOperativo.UAprincipal, forPk, respuestas, null, opts);
}

function calcularFeedback(respuestas: Respuestas, forPkRaiz:ForPkRaiz, opts:OpcionesRowValidator){
    var resumenEstado:ResumenEstado;
    // @ts-ignore Partial
    var nuevosRows : {[x in PlainForPk]:FormStructureState<IdVariable,IdFin>}={}
    calcularFeedbackEncuesta(nuevosRows, estructura.formularios, forPkRaiz, respuestas, opts);
    datosByPass.feedbackRowValidator = {...datosByPass.feedbackRowValidator, ...nuevosRows};
    var {resumenEstado, codNoRea, codRea} = calcularResumenVivienda(
        forPkRaiz, 
        nuevosRows,
        respuestas
    );
    datosByPass.respuestas.viviendas[forPkRaiz.vivienda!].resumenEstado = resumenEstado;
    datosByPass.respuestas.viviendas[forPkRaiz.vivienda!].codNoRea = codNoRea;
    datosByPass.respuestas.viviendas[forPkRaiz.vivienda!].codRea = codRea;
}

export var getFormulariosForIdVivienda = (idVivienda:number)=>{
    var mainFormForVivienda = getMainFormForVivienda(idVivienda);
    var formsFeedback = [mainFormForVivienda];
    var buscarFormulariosHijos = (idFormulario:IdFormulario)=>{
        estructura.formularios[idFormulario].casilleros.casilleros.forEach((casillero)=>{
            if(casillero.tipoc == 'BF'){
                var formHijo = (casillero.salto?.startsWith('F:')?casillero.salto:'F:' + casillero.salto) as IdFormulario;
                if(formHijo){
                    formsFeedback.push(formHijo);
                    buscarFormulariosHijos(formHijo);
                }
            }
        })
    }
    buscarFormulariosHijos(mainFormForVivienda);
    return formsFeedback;
}

export var calcularActualBF = (configSorteoFormulario:ConfiguracionSorteoFormulario|null, numElementoUA: number, numActual:number|null, formulario:IdFormulario, r:Respuestas)=>
    !!(configSorteoFormulario && 
    configSorteoFormulario.id_formulario_individual &&
    configSorteoFormulario.id_formulario_individual == formulario
    ? 
        numElementoUA == coalesce(
            r[configSorteoFormulario.resultado_manual],
            r[configSorteoFormulario.resultado]
        )
    :
        numActual == numElementoUA
    )

export var calcularDisabledBF = (configSorteoFormulario:ConfiguracionSorteoFormulario|null, numElementoUA: number, formulario:IdFormulario, r:Respuestas)=>
    !!(configSorteoFormulario && 
    configSorteoFormulario.id_formulario_individual == formulario &&
    numElementoUA != coalesce(
        r[configSorteoFormulario.resultado_manual],
        r[configSorteoFormulario.resultado]
    ))

export function calcularResumenVivienda(
    forPkRaiz:ForPkRaiz, 
    feedbackRowValidator:{[formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin>}, 
    respuestas:Respuestas
):{resumenEstado:ResumenEstado,codNoRea:string|null,codRea:number|null}{
    var {codRea, esRea} = defOperativo.esRealizada(respuestas)
    var {codNoRea, esNoRea} = defOperativo.esNorea(respuestas)
   // var {codReaSup,esReaSup} = defOperativo.esRealizadaSup(respuestas)
    if(esNoRea){
        return {resumenEstado: "no rea", codNoRea, codRea};
    }
    
    var formsFeedback = getFormulariosForIdVivienda(forPkRaiz.vivienda!);
    var configuracionSorteoFormulario = estructura.configSorteo && estructura.configSorteo[getMainFormForVivienda(forPkRaiz.vivienda!)]
    var feedBackVivienda = likeAr(feedbackRowValidator).filter((_row, plainPk)=>{
        var tieneIndividual = configuracionSorteoFormulario && !!(configuracionSorteoFormulario.id_formulario_individual && configuracionSorteoFormulario.id_formulario_padre)
        return JSON.parse(plainPk).vivienda==forPkRaiz.vivienda && 
            formsFeedback.includes(JSON.parse(plainPk).formulario) &&
            (tieneIndividual?
                !calcularDisabledBF(
                    configuracionSorteoFormulario, 
                    JSON.parse(plainPk).persona, 
                    JSON.parse(plainPk).formulario, 
                    JSON.parse(plainPk).hogar?respuestasForPk({
                        vivienda:forPkRaiz.vivienda, 
                        formulario:configuracionSorteoFormulario.id_formulario_padre!,
                        hogar:JSON.parse(plainPk).hogar 
                    }).respuestas:{} as Respuestas
                )
            :true)
    }).array();
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
        if(false /*respuestas[sp1]==2 && respuestas[sp6]==null*/){
            minResumen='cita pactada';
        }else{
            minResumen='incompleto';
        }
    }
    return {resumenEstado: minResumen, codNoRea, codRea};
}
