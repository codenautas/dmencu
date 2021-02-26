import { FormStructureState } from "row-validator";

import { VivendasHdR, PlainForPk, IdVariable, IdFin, Respuestas, ForPk, Valor  } from "./tipos";

var datosByPass = {} as {
    hdr:VivendasHdR,
    feedbackRowValidator:{  // no se persiste
        [formulario in PlainForPk]:FormStructureState<IdVariable,IdFin> // resultado del rowValidator para estado.forPk
    }
    dirty:boolean
}


export function cargarHdr(){


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

export function dispatchByPass(_props:
    {tipo:'id-pregunta', forPk: ForPk}|
    {tipo:'registrar_respuesta', forPk:ForPk, variable:IdVariable, respuesta:Valor}
){
    console.log('dispatchByPass', arguments)
}