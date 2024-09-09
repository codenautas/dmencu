"use strict";
import {Structure, Feedback} from "row-validator";
import * as LikeAr from "like-ar";

export type ModoAlmacenamiento = 'session'| // cuando sea para una sola pestaña, se usa en modo directo,
                                 'local'    // para todo el dispositivo, se usa al cargar hojas de ruta entres

export type IdOpcion = number
export type IdOperativo = 'etoi211'|'eah2022'|'etc...'
export type IdVariable = 'v1'|'v2'|'v3'|'etc...'|'vdominio'|'$p0'
export type IdPregunta = 'P1'|'P2'|'etc...'
export type IdBloque = 'B1'|'B2'|'etc...'
export type IdFormulario = 'F1'|'F2'|'etc...'
export type IdUnidadAnalisis = 'viviendas'|'hogares'|'personas'
export type IdBotonFormulario = 'BF:F1'|'BF:F2'|'etc...'
export type IdConsistencia = 'CONS1'|'CONS2'|'etc...'
export type IdTexto = 'D30_REF'|'MES_REF'|'SEM_REF'|'etc...'
export type IdFiltro = 'FILTRO1' | 'FILTRO2' | 'etc...'
export type IdCasillero = IdVariable | IdPregunta | IdBloque | IdFormulario | IdFiltro | IdOpcion
export type IdFin = 'fin'; // never // TODO: poder poner 'FIN'
export type IdDestino = IdPregunta | IdBloque | IdFin | IdFiltro 
export type Valor = string|number|null;
export type TipocDestinos = 'P'|'CP'|'B'|'FILTRO'|'BF'
export type Tipoc = TipocDestinos | 'F'|'O'|'OM'|'CONS' |'TEXTO' | 'LIBRE'

export type IdTarea = 'encu'|'recu'|'supe';

export type FeedbackVariable = Feedback<IdVariable, IdFin>

export type TipoVariables = 'texto'|'numero'|'fecha'|'horas'|'hora'

export type Despliegue = 'horizontal'|'oculta'

export type CasilleroBase = {
    id_casillero?:string
    tipoc:Tipoc
    casillero:IdCasillero
    nombre:string
    salto:IdDestino|IdFin|null
    ver_id:string|null
    despliegueEncabezado:'lateral'|'superior'|null
    despliegueContenido:'vertical'|'horizontal'|null
    despliegueTipoInput:'tel'|null
    despliegueOculta:boolean|null
    leer:boolean|null
    aclaracion:string|null
    primera_variable?:IdVariable|null
    var_name?:IdVariable|null
    var_name_especial?:string|null
    tipovar?:TipoVariables|'opciones'|'si_no'|null
    casilleros?:CasillerosImplementados[]|null
    expresion_habilitar?:string
    expresion_habilitar_js?:string
    expresion_autoingresar?:string
    expresion_autoingresar_js?:string
}

export type Opcion=CasilleroBase & {
    tipoc:'O'
    casillero:IdOpcion
    casilleros:PreguntaSimple[]
    var_name?:null
    tipovar?:null
    primera_variable?:null
}

export type OpcionSi=Opcion & {
    casillero:1
    nombre:'Sí'
    casilleros:PreguntaSimple[] 
}

export type OpcionNo=Opcion & {
    casillero:2
    nombre:'No'
    casilleros:PreguntaSimple[] 
}

export type OpcionMultiple=CasilleroBase & {
    tipoc:'OM'
    tipovar:'opciones'
    var_name:IdVariable
    casilleros:[OpcionSi, OpcionNo]
    calculada?:boolean
    libre?:boolean
    valor_ns_nc: any
}

export type PreguntaBase = CasilleroBase & {
    tipoc:'P'
    optativo:boolean|null
    casillero:IdPregunta
    calculada: boolean|null
    libre: boolean|null
    valor_ns_nc: any
}

export type PreguntaSimple = PreguntaBase & {
    tipovar:TipoVariables
    var_name:IdVariable
    longitud:string
    salto_ns_nc:IdVariable|null
    casilleros: PreguntaSimple[]
}

export type PreguntaConSiNo = PreguntaBase & {
    tipovar:'si_no'
    var_name:IdVariable
    salto_ns_nc:IdVariable|null
    casilleros: [OpcionSi, OpcionNo]
}

export type PreguntaConOpciones = PreguntaBase & {
    tipovar:'opciones'
    var_name:IdVariable
    salto_ns_nc:IdVariable|null
    casilleros: Opcion[]
}

export type PreguntaConOpcionesMultiples = PreguntaBase & {
    var_name?:null
    tipovar?:null
    casilleros: OpcionMultiple[]
}

export type Pregunta=PreguntaSimple | PreguntaConSiNo | PreguntaConOpciones | PreguntaConOpcionesMultiples

export type ConjuntoPreguntas= CasilleroBase & {
    tipoc:'CP'
    casillero:IdPregunta
    var_name?:null
    tipovar?:null
    casilleros:Pregunta[]
}

/*
export interface IContenido extends CasilleroBase {
    casilleros:IContenido[]
}
*/

export type Filtro = CasilleroBase & {
    tipoc:'FILTRO'
    casillero:IdFiltro
    var_name?:null
    tipovar?:null
    primera_variable?:null
    calculada?:null
    libre?:null
}

export type ContenidoFormulario=Bloque|Pregunta|ConjuntoPreguntas|Filtro|BotonFormulario|Consistencia|Texto

export type Bloque = CasilleroBase & {
    tipoc:'B'
    casillero:IdBloque
    casilleros:ContenidoFormulario[]
    var_name?:null
    tipovar?:null
    unidad_analisis?:IdUnidadAnalisis
}

export type Consistencia = CasilleroBase & {
    tipoc:'CONS'
    casillero:IdConsistencia
    var_name?:null
    tipovar?:null
    primera_variable?:null
}
export type Texto = CasilleroBase & {
    tipoc:'TEXTO'
    casillero:IdTexto
    var_name?:null
    tipovar?:null
    primera_variable?:null
}
export type Libre = CasilleroBase & {
    tipoc:'LIBRE'
    casillero:IdTexto
    var_name?:null
    tipovar?:null
    primera_variable?:null
}
export type BotonFormulario = CasilleroBase & {
    tipoc:'BF'
    casillero:IdBotonFormulario
    var_name?:null
    tipovar?:null
    primera_variable?:null
    var_name_BF?:IdVariable
    longitud?:string
}

export type Formulario = CasilleroBase & {
    tipoc:'F'
    casillero:IdFormulario
    formulario_principal:boolean
    casilleros:ContenidoFormulario[]
    var_name?:null
    tipovar?:null
    hermano?:true
    unidad_analisis:IdUnidadAnalisis
}

export type CasillerosImplementados=Formulario|Bloque|Filtro|ConjuntoPreguntas|Pregunta|OpcionMultiple|Opcion|BotonFormulario|Consistencia|Texto|Libre

export type CampoPkRaiz = 'vivienda'|'etc...';

export type ForPkRaiz={
    formulario:IdFormulario, 
    vivienda:IdEnc
} & {
    [campo in CampoPkRaiz]?:number
}

export type CampoPk = 'vivienda'|'hogar'|'persona'|'etc...';
export type ForPk = {
    formulario:IdFormulario, 
    vivienda:IdEnc
} & {
    [campo in CampoPk]?:number
}
export type PlainForPk='{"formulario":"F:F1","vivienda":"10202","persona":null}'|'etc...';

export type ObjetoNumeradoOArray<T> = T[] | {[n in number]:T}

export type RespuestasUnaUA = {
    [pregunta in IdVariable]:Valor
}

export type RespuestaLasUA = {
    [ua in IdUnidadAnalisis]:ObjetoNumeradoOArray<Respuestas>
}

export type Respuestas= RespuestasUnaUA & RespuestaLasUA

export type RespuestasRaiz=Respuestas & {
    resumenEstado:ResumenEstado
    resumenEstadoSup:ResumenEstado
    $dirty:boolean
    codNoRea: string|null
    codRea: number|null
    codNoReaSup: string|null
    codReaSup: number|null
}

/*
    aclaración:
    {v1:'x', v2:'x', personas:[{p1:1, p2:'x},{p1:2, p2:x}], mascotas:[] }
    está anidado por unidad de análisis
*/

export type UnidadAnalisis = {
    unidad_analisis:IdUnidadAnalisis, 
    padre?:IdUnidadAnalisis, 
    pk_agregada:CampoPk, 
    principal?:boolean, 
    hijas: {[k in IdUnidadAnalisis]?: UnidadAnalisis}
}

export type TEM = {
    nomcalle:string
    dominio:number
    sector:string
    edificio:string
    entrada:string
    nrocatastral:string
    piso:string	
    departamento:string
    habitacion:string
    casa:string
    prioridad:1|2|3
    observaciones:string
    seleccionado:number,
    cita: string,
    carga:string
}

export type ResumenEstado = 'vacio' | 'con problemas' | 'incompleto' | 'ok' | 'no rea' | 'cita pactada';

export type InfoTarea= {
    tarea: IdTarea
    notas?:string
    fecha_asignacion?:Date
    asignado?:string
    main_form: IdFormulario
}

export type Visita={
    fecha: string | null
    hora: string | null
    idper: string | null
    observaciones: string | null
}

export type  DatosHdrUaPpal= {
    tarea: InfoTarea
    tem: TEM
    
/*
    aclaración:
    {v1:'x', v2:'x', personas:[{p1:1, p2:'x},{p1:2, p2:x}], mascotas:[] }
    está anidado por unidad de análisis
*/
}

export type IdCarga="1"|"2"|"etc"

export type EstadoCarga='resumen'|'relevamiento'|'recibo'

export type Carga={
    fecha: Date
    estado_carga: EstadoCarga
    necesarias: number
    observaciones: string
}

export type Cargas={
    [idCarga in IdCarga]: Carga
}

export type EstructuraRowValidator=Structure<IdVariable,Valor,IdFin>;

export type ModoDespliegue = 'metadatos'|'relevamiento'|'PDF'

export type InfoFormulario={
    casilleros:Formulario, // casilleros aplanados
    estructuraRowValidator:EstructuraRowValidator // estructura de variables para el RowValidator
}

export type IdResultado = 'AVERIGUAR'|'TODO';

export type TareasEstructura={
    [idTarea in IdTarea]:{
        resultados:{
            [idResultado in IdResultado]:{
                descripcion:string
            }
        }
    }
}

export type Estructura = {
    formularios:{ 
        [nombreFormulario in IdFormulario]:InfoFormulario
    }
    unidades_analisis:{ 
        [idUnidadAnalisis in IdUnidadAnalisis]: UnidadAnalisis
    }
    tareas:TareasEstructura
    timestamp:number
    operativo:IdOperativo
    configSorteo: ConfiguracionSorteo
    habilitacionBotonFormulario: ConfiguracionHabilitarBotonFormulario
    permiteGenerarMuestra: boolean
    conReaHogar: boolean
	noReas: { 
	      no_rea: string  
		  descripcion: string
		  grupo:     string    
		  variable:  string
		  valor:     string
		  grupo0:    string
	}[]
    noReasSup: { 
        no_rea_sup: string  
        desc_norea_sup: string
        grupo_sup:     string    
        variable_sup:  string
        valor_sup:     string
        grupo0_sup:    string
        defaultInformacionHdr: DatosHdrUaPpal
  }[]
}

export type IdEnc = 130031|130032;
export type InformacionHdr={[enc in IdEnc]: DatosHdrUaPpal}

export type CasoState={
    opciones:{ // datos de navegación que elije el usuario
        forPk:ForPk|null // índice dentro de las unidades de análisis. Null = en hoja de ruta
        pilaForPk:ForPk[]
        modoDespliegue:ModoDespliegue
        bienvenido:boolean
        modoDirecto:boolean
        modoBorrarRespuesta:IdVariable|null
        conCampoOpciones:boolean
        saltoAutomatico:boolean
    }, 
    modo:{ // no se persiste
        demo:boolean
    }
}

export type DefOperativo = {
    esNoRea:(respuestas:Respuestas)=> {codNoRea:string|null, esNoRea:boolean},
    esNoReaSup:(respuestas:Respuestas)=> {codNoReaSup:string|null, esNoReaSup:boolean},
    esRealizada:(respuestas:Respuestas)=> {codRea:number|null, esRea:boolean},
    esRealizadaSup:(respuestas:Respuestas)=> {codReaSup:number|null, esReaSup:boolean},
    UAprincipal: IdUnidadAnalisis,
    defUA:{[i in IdUnidadAnalisis]:{pk:IdVariable, incluidas:IdUnidadAnalisis[], idsFor:IdFormulario[]}},
    defFor:{[f in IdFormulario]:{/*arbolUA:IdUnidadAnalisis[], */ hermano?:true}}
}

export type DatosByPassPersistibles = {
    respuestas:{[ua in IdUnidadAnalisis]:RespuestasRaiz[]}
    modoAlmacenamiento:ModoAlmacenamiento
    persona:string
    tarea:IdTarea
    idper:string
    cargas: Cargas
    informaciinformacionHdr: InformacionHdr
    soloLectura: boolean
    token?:string
    num_sincro?:number
    timestampEstructura?:number
}

type ConfiguracionSorteoTabla = {
    metodo: "tabla",
    param_metodo: {
        tabla:string[],
        var_letra:IdVariable,
    }    
}

type ConfiguracionSorteoHash = {
    metodo: "hash",
    param_metodo: {
        var_coef: [
            {var:IdVariable, coef:number},
            {var:IdVariable, coef:number},
        ],
        divisor: number
    }    
}

export type ConfiguracionSorteo = {[key in IdFormulario]:ConfiguracionSorteoFormulario}

export type ConfiguracionHabilitarBotonFormulario = {[key in IdFormulario]:ConfiguracionHabilitarBotonFormularioForm}

export type ConfiguracionSorteoFormulario = {
    unidad_analisis: IdUnidadAnalisis,
    unidad_analisis_padre: IdUnidadAnalisis,
    //expr_incompletitud: string //"not (p1) or no t (p2) or not(p3)"
    expr_incompletitud: {
        [key in number]:{dominio:number, expr:string}
    } 
    //expr_incompletitud_js: string //se crea al compilar
    expr_incompletitud_js: {
        [key in number]:{dominio:number, expr:string}
    } 
    disparador: IdVariable //"p9"
    //filtro: string //"p3>=18"
    filtro: {
        [key in number]:{dominio:number, expr:string}
    } 
    //filtro_js: string //se crea al compilar
    filtro_js: {
        [key in number]:{dominio:number, expr:string}
    } 
    orden: {
        variable:IdVariable
        orden: 1|-1
    }[] //["p3", "p2", "p1", "p0"], // p0 es construida, no va en parámetros, se pone para que el orden sea determinístico
    parametros:IdVariable[]// ["p1","p2","p3", "p4", "p5", "p6"], // variables que anulan al disparador
    cantidad_sorteables: IdVariable
    cantidad_total: IdVariable
    resultado: IdVariable //"p11"
    resultado_manual: IdVariable //"p11"
    sorteado_mostrar?: {source:IdVariable, target:IdVariable}[],
    incompletas: IdVariable
    variableBotonFormularioUA: IdVariable//'$B.F:S1_P'
    variableBotonFormularioUAIndividual?: IdVariable //'$B.F:I1'
    id_formulario_individual?: IdFormulario // 'F:I1'
    id_formulario_padre?: IdFormulario // 'F:S1'
} & (ConfiguracionSorteoHash | ConfiguracionSorteoTabla)

export type ConfiguracionHabilitarBotonFormularioForm = {
    unidad_analisis: IdUnidadAnalisis,
    expr_habilitar_boton: string,
    expr_habilitar_boton_js: string,
    habilitar_agregar_listo: boolean
}

export function toPlainForPk(forPk:ForPk):PlainForPk{
    // @ts-ignore sabemos que hay que hacer un JSON
    return JSON.stringify(forPk);
}

export var iterator:<T>(o:ObjetoNumeradoOArray<T>)=>Iterable<T> = LikeAr.iterator
export var empty:<T>(o:ObjetoNumeradoOArray<T>|null|undefined)=>boolean = LikeAr.empty

declare global {
    namespace myOwn{
        interface AddrParams {
            state_forPk:string
            state_pilaForPk:string
        }
    }
}

export type DireccionAccion = 'avance' | 'retroceso' | 'blanqueo'

export type EstadoAccion = {
    operativo: string
    estado: string
    eaccion: string
    condicion: string
    estado_destino: string
    eaccion_direccion: DireccionAccion
    path_icono_svg: string
    nombre_procedure: string
    nombre_wscreen: string
    desactiva_boton: boolean
    confirma: boolean
}