import * as React from "react";
import * as ReactDOM from "react-dom";
import {  
    RenderPrincipal, 
    adaptarTipoVarCasillero,
    ICON,
    focusToId,
    scrollToTop,
    scrollToBottom,
    materialIoIconsSvgPath
} from "./render-general";
import {Bloque, BotonFormulario, 
    CasilleroBase, CasoState, ConjuntoPreguntas, Consistencia, 
    EstadoCarga, Filtro, ForPk, ForPkRaiz, Formulario, 
    IdFormulario, IdPregunta, IdTarea, IdVariable, InfoFormulario,
    ModoDespliegue,
    Opcion, OpcionMultiple, PlainForPk, 
    Pregunta, PreguntaConOpciones, PreguntaSimple, 
    Respuestas, RespuestaLasUA, RespuestasRaiz, Valor, TEM, IdCarga, Carga, IdFin, IdUnidadAnalisis,
    ModoAlmacenamiento,
    toPlainForPk,
    IdCasillero,
    PreguntaConSiNo,
    Texto, Estructura, InformacionHdr, DatosHdrUaPpal, ConfiguracionSorteoFormulario, ResumenEstado, DatosByPassPersistibles, IdOperativo, IdEnc, Libre, UnidadAnalisis,
    iterator, empty, ConfiguracionHabilitarBotonFormulario,
    CampoPkRaiz,
    ValuePkRaiz
} from "./tipos";
import{ 
    accion_abrir_formulario,
    accion_borrar_formulario,
    calcularActualBF,
    calcularDisabledBF,
    calcularPermiteBorrarBF,
    calcularResumenVivienda,
    crearEncuesta,
    getDatosByPass,
    getFormulariosForValuePkRaiz,
    getMainFormForVivienda,
    intentarBackup,
    setCalcularVariables
} from "./bypass-formulario"
import { dmTraerDatosFormulario, dispatchers, 
    gotoSincronizar,
    getCacheVersion,
    gotoConsistir,
} from "./redux-formulario";
import { useState, useEffect, useLayoutEffect } from "react";
import { useSelector, useDispatch } from "react-redux"; 
import { strict as likeAr, beingArray } from "like-ar";
import {sleep, coalesce} from "best-globals";
import { unexpected } from "cast-error";

import {
    AppBar, ButtonGroup, CircularProgress, Checkbox, 
    Dialog, DialogActions, DialogContent, DialogContentText, 
    DialogTitle, Divider, Fab, IconButton,
    Menu, MenuItem, Paper, Popover,
    Table, TableBody, TableCell, TableHead, TableRow, Toolbar, CssBaselineProps
} from "@material-ui/core";
import { EstadoVariable, FormStructureState } from "row-validator";
import { CSSProperties } from "@material-ui/core/styles/withStyles";

import { 
    registrarElemento, setAttrDistinto, setValorDistinto, dispatchByPass, 
    getDirty, getFeedbackRowValidator,
    getFuncionHabilitar, 
    getEstructura, 
    defOperativo,
    volcadoInicialElementosRegistrados,
    numberOrStringIncIfArray, 
    calcularElementoEnfocado,
    accion_registrar_respuesta,
    accion_id_pregunta,
    accion_agregar_formulario,
    NO_CAMBIAR__VERIFICAR_SI_ES_NECESARIO,
    NO_CAMBIAR__SOLO_TRAER_STATUS
} from "./bypass-formulario"

import {html, HtmlTag} from "js-to-html";

const DELAY_SCROLL_3 = 50;

function breakeableText(text:string|null):string|undefined;
function breakeableText(text:string|null, diccionario?:{[clave:string]:React.ReactNode}){
    if(typeof text != "string") return undefined;
    text = text.replace(/\//g,"/\u2063").replace(/\/\u2063(\w)\b/g,'/$1');
    text = text.replace(/___*/g,(todo)=>`[${todo}]`).replace(/\@\w+\@/g,(todo)=>`[${todo}]`);
    if(!diccionario || true) return text;
    /*
    return <span>{partes.map((parte:string, i:number) => <span style={i%2==1?{textDecoration:"underline"}:{}}> {parte+" "} </span>)}</span>
    */
}

const VER_DOMINIO = false; // el encuestador no necesita ver el dominio en cada encuesta porque el dominio depende del área y se deduce del primer dígito del número de encuesta
// no poner VER_DOMINIO en true, cambiar por una variable que se fije si el DM está en modo prueba o en modo "diseño conceptual"

const ID_BOTON_VOLVER_HDR = 'boton-volver-hdr';
const ID_BOTON_CERRAR = 'boton-cerrar-encuesta';

var debeSaltar:boolean = false;

window.addEventListener('load', ()=>{
    /*
    window.addEventListener('keydown', (ev:KeyboardEvent)=>{
        debeSaltar = ev.key == 'Enter' || ev.keyCode == 13;
    })
    */
    window.addEventListener('click', ()=>{
        debeSaltar = false;
    })
})

// /*

type CommonAttributes = {className?:string,style?:CSSProperties,id?:string, tabIndex?:number} // CSSProperties
type ColorValues = 'primary'|'secondary'|'default'|'inherit'

export type LibreDespliegueType = (props:{
    key:string
    casillero:Libre
    formulario:Formulario
    forPk:ForPk
})=>JSX.Element;

var LibreDespliegue: LibreDespliegueType

export const Button = ({variant, onClick, disabled, children, className, color, size, 
        disableElevation, disableFocusRipple, disableRipple, 
        ...other
    }:{
    variant?:string,
    color?:ColorValues,
    onClick?:React.MouseEventHandler<HTMLButtonElement>, //  (event:MouseEvent/* <HTMLButtonElement, MouseEvent>*/)=>void,
    disabled?:boolean
    children:any,
    className?:string,
    size?:'small',
    disableElevation?:any, disableFocusRipple?:any, disableRipple?:any,
} & CommonAttributes)=><button 
    {...other}
    className={`btn btn${variant=='contained'?'':'-'+(variant=='outlined'?'outline':variant)}-${(color=='default' || color=='inherit'?'secondary':color=='secondary'?'danger':color)||'secondary'} ${className||''} ${size=='small'?'btn-sm':''}`}
    disabled={disabled}
    onClick={onClick}
>{children}</button>;

const Button2 = ({variant, onClick, disabled, children, className, color, size, ...other}:{
    variant?:string,
    color?:ColorValues,
    onClick?:()=>void,
    disabled?:boolean
    children:any,
    className?:string,
    size?:'small',
    $attrs?:{}
} & CommonAttributes)=>html.button({
    ...other,
    class: `btn btn${variant=='contained'?'':'-'+(variant=='outlined'?'outline':variant)}-${(color=='default' || color=='inherit'?'secondary':color=='secondary'?'danger':color)||'secondary'} ${className||''} ${size=='small'?'btn-sm':''}`,
    disabled,
    $on:{click:onClick}
}, children);


const TextField = (props:{
    id:string,
    disabled?:boolean,
    className?:string,
    autoFocus?:boolean,
    fullWidth:boolean
    inputProps?:any,
    value?:any,
    type:any,
    label?:string,
    error?:boolean,
    helperText?:string,
    multiline?:boolean,
    onChange?:(event:any)=>void,
    onFocus?:(event:any)=>void,
    onBlur?:(event:any, valor:any)=>void,
    // onKeyDown?:(event:KeyboardEvent)=>void // KeyboardEventHandler<HTMLInputElement>
    onKeyDown?:React.KeyboardEventHandler<HTMLInputElement>
})=><input
    id={props.id}
    disabled={props.disabled}
    className={props.className}
    autoFocus={props.autoFocus}
    value={props.value} 
    type={props.type}
    onChange={props.onChange}
    onFocus={props.onFocus}
    onBlur={(evt)=>props.onBlur?.(evt, evt.target.value)}
    onKeyDown={props.onKeyDown}
    placeholder={props.label}
/>;

const Typography = ({children, ...others}:{
    children:any,
    component?:string
    variant?:'h6'
}&CommonAttributes)=>React.createElement(others.variant||others.component||'div',others,children);

function Grid(props:{
    container?:boolean,
    spacing?:number,
    item?:boolean,
    wrap?:'wrap'|'nowrap',
    direction?:'row'|'column'
    alignItems?:'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline',
    children:any,
    xs?:number,
    sm?:number,
}&CommonAttributes){
    var {container, item, wrap, direction, alignItems, children, className, xs, sm, spacing, ...other} = props;
    return <div
    {...other}
    className={`${className||''} ${xs!=null?'grid-xs-'+xs:''} ${sm!=null?'grid-sm-'+sm:''}`}
    style={container?{
        display:'flex',
        flexWrap:wrap,
        flexDirection:direction,
        alignItems:alignItems,
        margin:spacing!=null?spacing*8+'px':undefined
    }:{
    }}
>{children}</div>
}

var p12 = 'p12' as IdVariable;
var sp2 = 'sp2' as IdVariable;
var sp3 = 'sp3' as IdVariable;
var sp4 = 'sp4' as IdVariable;
var sp5 = 'sp5' as IdVariable;

var diccionario = {}

/*
// const takeElementOrDefault<K, T extends [K in], D>()
function isIn<V, T>(k:keyof T, object:T): object[k] is V{
    return true
}
*/
function takeElementOrDefault<V,K extends string,KO extends string>(k:K, object:{[k in KO]:V}, defaultValue:V):V{
    return k in object ? 
        // @ts-expect-error por alguna razón TS no quiere entender que si k está en object, object[k] existe
        object[k] 
    : defaultValue
}

function DespliegueEncabezado(props:{casillero:CasilleroEncabezable, leer?:boolean}){
    const forPkNull={} as ForPk;
    return <EncabezadoDespliegue casillero={props.casillero} leer={props.leer} forPk={forPkNull}/>;
}

function subirHasta(elemento:HTMLElement|null, fun:(elemento:HTMLElement)=>boolean):HTMLElement|null{
    if(elemento == null) return null;
    if(fun(elemento)) return elemento;
    return subirHasta(elemento.parentElement, fun);
}

var elementoConSennialBorrar:HTMLElement|null = null;

function BotonBorrar({id, variable, forPk, valorOpcion}:{id:string, variable:IdVariable, forPk:ForPk, valorOpcion?:any}){
    var handleClickBorrar=()=>{
        dispatchByPass(accion_registrar_respuesta, {respuesta:null, variable:variable, forPk:forPk})
    };
    return <div className="boton-borrar">
        <Button
            id={id}
            mi-variable={variable}
            valor-opcion={valorOpcion}
            variant="outlined"
            className="boton-opcion boton-opcion-borrar"
            onClick={handleClickBorrar}
        >
            <ICON.DeleteForever/>
        </Button>
    </div>
}

function SaltoDespliegue({casillero,prefijo}:{casillero:Pregunta|Opcion|Filtro, prefijo?:string}){
    return casillero.salto?
        <div className="pase">
            {prefijo?<span className="prefijo">{prefijo} </span>:null}
            <ICON.TrendingFlat /><span>{casillero.salto}</span>
        </div>
    :null
}

function OpcionDespliegue(props:{casillero:Opcion, valorOpcion:number, variable:IdVariable, forPk:ForPk, leer:boolean, conBotonBorrar:boolean}){
    const {casillero} = props;
    const dispatch = useDispatch();
    var saltoAutomatico = useSelector((state:CasoState)=>state.opciones.saltoAutomatico);
    var handleClick:React.MouseEventHandler<HTMLButtonElement> = async (event)=>{
        var container = subirHasta(event.target as HTMLElement, elemento=>elemento.classList.contains('pregunta') || elemento.classList.contains('multiple')) || document.getElementById('main_layout')!;
        var tiene = container.getAttribute('estoy-borrando');
        container.setAttribute('estoy-borrando','NO');
        if(elementoConSennialBorrar){
            elementoConSennialBorrar.setAttribute('estoy-borrando','NO');
            elementoConSennialBorrar = null;
        }
        var {recentModified, siguienteVariable} = dispatchByPass(accion_registrar_respuesta, {respuesta:props.valorOpcion, variable:props.variable, forPk:props.forPk});
        if(!recentModified){
            container.setAttribute('estoy-borrando',tiene=='SI'?'NO':'SI');
            if(tiene!='SI'){
                elementoConSennialBorrar=container;
            }
        }else{
            if(siguienteVariable && saltoAutomatico){
                var botonStyle = (event.target as HTMLElement)?.style;
                if(botonStyle) botonStyle.color = 'green';
                await sleep(DELAY_SCROLL_3);
                if(botonStyle) botonStyle.color = 'blue';
                await sleep(DELAY_SCROLL_3);
                if(botonStyle) botonStyle.color = 'green';
                await sleep(DELAY_SCROLL_3);
                if(botonStyle) botonStyle.color = '';
                //@ts-ignore algunos casilleros tienen especial y otros no
                (casillero.especial?.noScroll == true)?null:enfocarElementoDeVariable(casillero.especial?.scrollTo ?? siguienteVariable);
            }
        }
    };
    return <Grid className="opcion"> 
        {props.conBotonBorrar?<BotonBorrar
            id={`opcion-var-${props.variable}-${props.valorOpcion}-borrar`}
            forPk={props.forPk}
            variable={props.variable}
            valorOpcion={props.valorOpcion}
            />:null}
        <Button 
            id={`opcion-var-${props.variable}-${props.valorOpcion}`}
            mi-variable={props.variable}
            valor-opcion={props.valorOpcion}
            variant="outlined"
            className="boton-opcion boton-opcion-seleccion"
            onClick={handleClick}
            tabIndex={-1}
        >
            <Grid container wrap="nowrap">
                <Grid className="id">
                    {casillero.ver_id || casillero.casillero}
                </Grid>
                <Grid className="opcion-texto">
                    <Typography debe-leer={casillero.leer?'SI':casillero.leer===false?'NO':props.leer?'SI':'NO'}>{breakeableText(casillero.nombre)}</Typography>
                    {casillero.aclaracion?
                        <Typography className='aclaracion'>{breakeableText(casillero.aclaracion)}</Typography>
                    :null}
                </Grid>
            </Grid>
        </Button>
        <SaltoDespliegue casillero={casillero}/>
    </Grid>
}
interface IcasilleroConOpciones{
    var_name:IdVariable,
    despliegueContenido:'vertical'|'horizontal'|null,
    casilleros:Opcion[]
}


function SiNoDespliegue(props:{casilleroConOpciones:IcasilleroConOpciones, forPk:ForPk, despliegueContenido:'vertical'|'horizontal'}){
    return <OpcionesDespliegue 
        casilleroConOpciones={props.casilleroConOpciones} 
        forPk={props.forPk} 
        leer={false}
        despliegueContenido={props.despliegueContenido}
    />
}

function registradorDeVariable(pregunta:Pregunta|OpcionMultiple|ConjuntoPreguntas){
    return (
        respuestas:Respuestas, feedbackForm: FormStructureState<IdVariable, Valor, IdFin>, elemento:HTMLDivElement
    )=>{
        var valorActual = pregunta.var_name == null ? null : respuestas[pregunta.var_name];
        var feedbackRow = feedbackForm.feedback;
        var feedbackVar = pregunta.var_name == null ? null : feedbackRow[pregunta.var_name];
        var tieneValor=valorActual!=null && feedbackVar!=null?(feedbackVar.conProblema?'invalido':'valido'):'NO';
        var estado:EstadoVariable; 
        if(pregunta.tipovar){
            estado=feedbackVar?.estado!;
        }else{
            var feedbackMulti = pregunta.casilleros.filter(c=>c.var_name!=null).reduce((pv, om)=>{
                var fb=feedbackRow?.[om.var_name!]!
                return {
                    tieneActual: pv.tieneActual || fb.estado=='actual',
                    estaSalteada: pv.estaSalteada && (fb.estado=='salteada' || fb.estado=='fuera_de_flujo_por_salto')
                }
            }, {tieneActual:false, estaSalteada:true});
            estado=feedbackMulti.tieneActual?'actual':feedbackMulti.estaSalteada?'salteada':'todavia_no'
        }
        setAttrDistinto(elemento, 'nuestro-validator', estado);
        setAttrDistinto(elemento, 'tiene-valor', tieneValor);
        setAttrDistinto(elemento, 'esta-inhabilitada', feedbackVar?.inhabilitada?'SI':'NO');
        if(pregunta.var_name){
            var opciones:HTMLButtonElement[] = Array.prototype.slice.call(elemento.querySelectorAll(`.boton-opcion[mi-variable="${pregunta.var_name}"]`),0);
            var elementoOpcion:HTMLButtonElement;
            for(elementoOpcion of opciones){
                var valorOpcion = elementoOpcion.getAttribute('valor-opcion');
                setAttrDistinto(elementoOpcion, 'opcion-seleccionada', valorOpcion == valorActual ? "SI": "NO")
            }
            var elementosInput:HTMLInputElement[] = Array.prototype.slice.call(elemento.querySelectorAll('.variable'));
            var elementoInput:HTMLInputElement;
            for(elementoInput of elementosInput){
                setValorDistinto(elementoInput, 'value', valorActual == null ? '' : valorActual.toString());
            }
            var botonNsNc = document.getElementById("nsnc-pregunta-"+pregunta.var_name)!;
            setAttrDistinto(botonNsNc, 'opcion-seleccionada', valorActual == (pregunta.valor_ns_nc ?? -9) ? "SI" : "NO")
        }
    }
}

function OpcionMultipleDespliegue(props:{opcionM:OpcionMultiple, forPk:ForPk}){
    const {opcionM} = props;
    var id = `opcionM-${opcionM.id_casillero}`;
    //@ts-ignore altunos casilleros no tienen especial, no importa, es solo para poner los metadatos
    var styles = opcionM.especial?.flexDirection?{flexDirection:opcionM.especial.flexDirection}:{};
    registrarElemento({
        id, 
        direct:true, 
        fun: registradorDeVariable(opcionM)
    })
    return <DesplegarCasillero 
        id={id}
        casillero={opcionM}
        despliegueEncabezado='lateral'
        style={styles}
    >
        <EncabezadoDespliegue 
            casillero={opcionM} 
            verIdGuion={true} 
            leer={opcionM.leer!==false} 
            forPk={props.forPk}
        />
        <SiNoDespliegue 
            casilleroConOpciones={opcionM} 
            forPk={props.forPk}
            despliegueContenido={props.opcionM.despliegueContenido??'horizontal'}
        />
    </DesplegarCasillero>
}

type CasilleroEncabezable = Formulario|Bloque|Filtro|ConjuntoPreguntas|Pregunta|OpcionMultiple|PreguntaSimple|Consistencia|Texto

function EncabezadoDespliegue(props:{casillero:CasilleroEncabezable, verIdGuion?:boolean, leer?:boolean, forPk:ForPk}){
    var {casillero, forPk} = props;
    var conCampoOpciones = useSelector((state:CasoState)=>state.opciones.conCampoOpciones)
    var handleClickBorrar=()=>{
        dispatchByPass(accion_registrar_respuesta, {respuesta:null, variable:casillero.var_name as IdVariable, forPk:forPk})
    };
    var ver_id = casillero.ver_id ?? casillero.casillero;
    // @ts-ignore no está en todos los casilleros pero acá para el despliegue de metadatos no importa
    var calculada = casillero.calculada;
    var id = `id-div-${casillero.var_name||casillero.casillero}`;
    var idAcciones = "acciones-"+id;
    return <div 
        className="encabezado" 
        debe-leer={props.leer?'SI':'NO'} 
    >
        <div id={id} className="id-div" title={`${casillero.casillero} - ${casillero.var_name}`}
            onClick={()=>{
                var div = document.getElementById(idAcciones);
                div!.setAttribute("accion-visible", (1-Number(div!.getAttribute("accion-visible"))).toString());
                // TODO. Ver qué hacemos cuando se toca el ID de la pregutna
                dispatchByPass(accion_id_pregunta, {pregunta: casillero.casillero as IdPregunta, forPk});
            }}
        >
            <div className="id">
                {ver_id}
            </div>
            {(casillero.tipovar=="si_no"||casillero.tipovar=="opciones")?<Campo disabled={false} pregunta={casillero} forPk={forPk} mini={true} hidden={!conCampoOpciones && 'quitar'}/>:null}
            <div className="acciones-pregunta" id={idAcciones} accion-visible="0">
                {casillero.var_name?<div><Button
                    id={"borrar-pregunta-"+casillero.var_name}
                    mi-variable={casillero.var_name}
                    variant="outlined"
                    className="boton-pregunta-borrar"
                    onClick={handleClickBorrar}
                >
                    <ICON.DeleteForever/>
                </Button></div>:null}
                {casillero.var_name?(ns_nc=><div><Button
                    id={"nsnc-pregunta-"+casillero.var_name}
                    mi-variable={casillero.var_name}
                    variant="outlined"
                    className="boton-pregunta-nsnc"
                    onClick={()=>{
                        dispatchByPass(accion_registrar_respuesta, {respuesta:ns_nc, variable:casillero.var_name as IdVariable, forPk:forPk})
                    }}
                >
                    NS/NC
                </Button></div>)(casillero.valor_ns_nc??-9):null}
            </div>
        </div>
        <div className="nombre-div">
            <div className="nombre">{breakeableText(casillero.nombre)}
                {casillero.especial?.gps?
                    <span>
                        <Button color="primary" variant="outlined" style={{marginLeft:'10px'}} onClick={(event)=>{
                            navigator.geolocation.getCurrentPosition(position => {
                                let {siguienteVariable} = dispatchByPass(accion_registrar_respuesta, {forPk:props.forPk, variable:casillero.var_name, respuesta:JSON.stringify(position)})
                                console.log(position);
                                if(siguienteVariable){
                                    enfocarElementoDeVariable(siguienteVariable);
                                }
                            }, e => {
                                let {siguienteVariable} = dispatchByPass(accion_registrar_respuesta, {forPk:props.forPk, variable:casillero.var_name, respuesta:"no se pudo obtener el punto, active el gps"})
                                if(siguienteVariable){
                                    enfocarElementoDeVariable(siguienteVariable);
                                }
                            });

                        }}><ICON.Location/></Button>
                    </span>
                :null}
            </div>
            {casillero.aclaracion?
                <div className="aclaracion">
                    {casillero.salto && casillero.tipoc=='FILTRO'?
                        <SaltoDespliegue casillero={casillero} prefijo={breakeableText(casillero.aclaracion)}/>
                    :
                        breakeableText(casillero.aclaracion)
                    }        
                </div>
            :null}
            <div los-metadatos="si">
                <span el-metadato="variable">{casillero.var_name}</span>
                {casillero.tipovar && casillero.tipovar!='opciones' && casillero.tipovar!='si_no'?
                    <span el-metadato="tipovar">{casillero.tipovar}</span>
                :null}
                {   //@ts-ignore una opción múltiple nunca lo a a ser, no tiene el campo, no importa
                    casillero.optativo?<span el-metadato="optativa">optativa</span>:null
                }
                {calculada?<span el-metadato="calculada">calculada</span>:null}
                {casillero.despliegueOculta?<span el-metadato="oculta">oculta</span>:null}
                {casillero.expresion_habilitar?<span el-metadato="expresion_habilitar">habilita: {casillero.expresion_habilitar}</span>:null}
                {   //@ts-ignore altunos casilleros no tienen especial, no importa, es solo para poner los metadatos
                    casillero.especial?.autoing?<span el-metadato="expresion_autoing">autoing: {casillero.especial?.autoing}</span>:null
                }
            </div>
        </div>
    </div>
}

function DesplegarConfirmarBorrarRespuesta(props:{forPk:ForPk, variableBorrar:IdVariable}){
    var [open, setOpen] = useState(!!props.variableBorrar)
    const dispatch = useDispatch();
    const handleClose = () => {
        dispatch(dispatchers.CONFIRMAR_BORRAR_RESPUESTA({forPk:props.forPk, variable:null}));
        setOpen(false);
    }
    return <Popover
            id={"popover-confirmar"}
            open={open}
            onClose={handleClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
        >   
            <Typography>La pregunta tiene registrada una respuesta que no fue detectada como errónea</Typography>
            <div className="confirma-botones">
                <Button color="secondary" variant="outlined" onClick={()=>{
                    if(props.variableBorrar){
                        dispatchByPass(accion_registrar_respuesta, {forPk:props.forPk, variable:props.variableBorrar, respuesta:null})
                    }
                    handleClose();
                }}>borrar respuesta</Button>
                <Button color="primary" variant="outlined" onClick={handleClose}>volver sin borrar</Button>
            </div>
        </Popover>;
}

function calcularNuestraLongitud(longitud:string |null){
    return longitud;
}

function enfocarElementoDeVariable(siguienteVariable:IdVariable|IdFin){
    debeSaltar = false;
    var {top, enfocado, elementoInputVariable} = calcularElementoEnfocado(siguienteVariable);
    if(top != null && top>0 && (!enfocado || "salta siempre")){
        window.scrollTo({top, left:0, behavior:'smooth'});
    }
    elementoInputVariable?.focus();
}

function Campo(props:{disabled:boolean, pregunta:PreguntaSimple|PreguntaConOpciones|PreguntaConSiNo|OpcionMultiple, forPk:ForPk, mini?:boolean, hidden?:boolean|'quitar'}){
    var {pregunta, disabled, mini } = props;
    var {saltoAutomatico, conCampoOpciones} = useSelector((state:CasoState)=>state.opciones);
    const longitud = mini ? pregunta.casilleros.reduce((acum, o)=>Math.max(o.casillero.toString().length, acum), 0) : 
        // @ts-ignore mini es para los otros
        pregunta.longitud;
    // var [valor, setValor] = useState(props.valor);
    var [editando, setEditando] = useState(false);
    // useEffect(() => {
    //     setValor(props.valor)
    // }, [props.valor]);
    const inputProps = {
        maxLength: longitud,
    };
    const onChange=(nuevoValor:Valor|typeof NO_CAMBIAR__VERIFICAR_SI_ES_NECESARIO)=>{
        var {siguienteVariable} = dispatchByPass(accion_registrar_respuesta, {forPk:props.forPk, variable:pregunta.var_name, respuesta:nuevoValor});
        if(siguienteVariable && debeSaltar){
            //@ts-ignore algunos casilleros tienen especial y otros no
            (pregunta.especial?.noScroll == true)?null:enfocarElementoDeVariable(pregunta.especial?.scrollTo ?? siguienteVariable);
        }
    };
    var nuestraLongitud = calcularNuestraLongitud(longitud)
    return <div className="campo" nuestra-longitud={nuestraLongitud} style={props.hidden=='quitar'?{display:'none'}:props.hidden?{visibility:'hidden'}:undefined}>
        {mini?null:<BotonBorrar
            id={`borrar-abierta-${pregunta.var_name}`}
            variable={pregunta.var_name}
            forPk={props.forPk}
        />}
        <div className="input-campo">
            <TextField 
                id={`var-${pregunta.var_name}`}
                //@ts-ignore algunos casilleros tienen especial y otros no
                disabled={disabled || pregunta.especial?.gps}
                className="variable" 
                //var-length={pregunta.longitud} 
                fullWidth={true}
                inputProps={inputProps}
                type={pregunta.despliegueTipoInput??adaptarTipoVarCasillero(pregunta.tipovar)}
                onKeyDown={(event:React.KeyboardEvent)=>{
                    var esEnter = (event.key == 'Enter' || event.keyCode == 13)
                    debeSaltar = esEnter && (saltoAutomatico || conCampoOpciones);
                    if(esEnter){
                        if(event.target instanceof HTMLElement){
                            event.target.blur();
                        }
                        event.preventDefault();
                    }
                }}
                onFocus={(_event)=>setEditando(true)}
                onBlur={(event, valor)=>{
                    if(event?.relatedTarget?.getAttribute('boton-confirmar')){
                        debeSaltar = true;
                    }
                    onChange(valor);
                    setEditando(false)
                }}
            />
        </div>
        {disabled || mini?null:
            <div className="boton-confirmar-campo">
                <Button variant={editando?"contained":'outlined'} size="small" color={editando?'primary':'default'}
                    boton-confirmar={pregunta.var_name}
                    tabIndex={-1}
                    onClick={()=>{
                        onChange(NO_CAMBIAR__VERIFICAR_SI_ES_NECESARIO);
                        setEditando(false)
                    }}
                ><ICON.Check/></Button>
            </div>
        }
    </div>
}

interface IcasilleroConOpciones{
    var_name:IdVariable,
    casilleros:Opcion[]
}

function OpcionesDespliegue(
    {casilleroConOpciones, forPk,  leer, despliegueContenido}:
    {casilleroConOpciones:IcasilleroConOpciones, forPk:ForPk, leer:boolean, despliegueContenido:'vertical'|'horizontal'}
){
    const desplegarOtros = (opcion:Opcion, soloParaDespliegue:'vertical'|'horizontal'|null) => opcion.casilleros.map((subPregunta:Pregunta)=>(
        soloParaDespliegue == null || soloParaDespliegue == subPregunta.despliegueContenido ?
        <div className="otros-especificar" key={subPregunta.id_casillero}>
            <PreguntaDespliegue 
                pregunta={subPregunta} 
                forPk={forPk} 
                despliegueEncabezado='superior'
            />
        </div>:null
    ))
    return <div className="contenido">
            <div className="opciones" despliegue-contenido={despliegueContenido??'vertical'}>
            {casilleroConOpciones.casilleros.map((opcion:Opcion, i:number)=>
                <Grid key={opcion.id_casillero} item
                    ocultar-salteada={opcion.despliegueOculta?(opcion.expresion_habilitar_js?'INHABILITAR':'SI'):'NO'}
                >
                    <OpcionDespliegue 
                        casillero={opcion} 
                        variable={casilleroConOpciones.var_name} 
                        valorOpcion={opcion.casillero}
                        forPk={forPk} 
                        leer={leer}
                        conBotonBorrar={i==0 || despliegueContenido!='horizontal'}
                    />
                    {despliegueContenido=='horizontal'?null:desplegarOtros(opcion,null)}
                </Grid>
            )}
        </div>
        {despliegueContenido=='horizontal'?casilleroConOpciones.casilleros.map((opcion:Opcion)=>
            desplegarOtros(opcion,null)
        ):null}
    </div>
}

const nombreCasillero={
    F: 'formulario',
    B: 'bloque',
    P: 'pregunta',
    CP: 'conjuntopreguntas',
    O: 'opcion',
    OM: 'multiple',
    FILTRO: 'filtro',
    CONS: 'consistencia',
    BF: 'botonformulario',
    TEXTO: 'aclaracionsuperior',
}

function DesplegarCasillero(props:{
    casillero:Pregunta|Bloque|Filtro|ConjuntoPreguntas|BotonFormulario|Consistencia|OpcionMultiple|Texto,
    id?:string,
    style?:React.CSSProperties,
    despliegueEncabezado?:'lateral'|'superior'
    children:React.ReactNode|React.ReactNode[],
    "ocultar-salteada"?:'SI'|'NO'|'INHABILITAR'|undefined
}){
    return <div 
        key={`${props.casillero.tipoc}-${props.id||props.casillero.id_casillero}`}
        className={`casillero ${nombreCasillero[props.casillero.tipoc]}`}
        id={props.id}
        style={props.style}
        despliegue-encabezado={props.casillero.despliegueEncabezado??props.despliegueEncabezado??'superior'}
        ocultar-salteada={props["ocultar-salteada"]}
    >{props.children}</div>
}

function PreguntaDespliegue(props:{
    pregunta:Pregunta, 
    forPk:ForPk, 
    despliegueEncabezado:'lateral'|'superior'
}){
    var {pregunta} = props;
    const dispatch=useDispatch();
    var estado:EstadoVariable;
    var id = `pregunta-${pregunta.id_casillero}`
    registrarElemento({
        id, 
        direct:true, 
        fun: registradorDeVariable(pregunta)
    })
    var style: CSSProperties = {}
    if(pregunta.despliegue == 'grid'){
        style.display = 'grid';
        style.gridTemplateColumns = 'repeat(3,1fr)';
    }
    return <DesplegarCasillero
        id={id}
        casillero={pregunta}
        style={style}
        nuestro-tipovar={pregunta.tipovar||"multiple"} 
        ocultar-salteada={pregunta.despliegueOculta?(pregunta.expresion_habilitar_js?'INHABILITAR':'SI'):'NO'}
        despliegueEncabezado={props.despliegueEncabezado}

    >
        <EncabezadoDespliegue 
            casillero={pregunta} 
            leer={pregunta.leer!==false}  
            forPk={props.forPk}
        />
        <div className="contenido">{
            pregunta.tipovar=="si_no"?<Grid container>
                <SiNoDespliegue 
                    casilleroConOpciones={pregunta} 
                    forPk={props.forPk} 
                    despliegueContenido={props.pregunta.despliegueContenido??'vertical'}
                />
            </Grid>:
            pregunta.tipovar=="opciones" ?
                <OpcionesDespliegue 
                    casilleroConOpciones={pregunta} 
                    forPk={props.forPk} 
                    leer={!!pregunta.leer}
                    despliegueContenido={pregunta.despliegueContenido??'vertical'}
                />:
            pregunta.tipovar==null?
                (pregunta.casilleros as (OpcionMultiple|Consistencia)[]).map((opcionMultiple)=>
                    opcionMultiple.tipoc=='OM'?                
                        <OpcionMultipleDespliegue
                            key={opcionMultiple.id_casillero} 
                            opcionM={opcionMultiple} 
                            forPk={props.forPk} 
                        />
                    : //las consistencias pueden ser hermanas de OM
                        <ConsistenciaDespliegue
                            key={opcionMultiple.id_casillero}
                            casillero={opcionMultiple}
                            forPk={props.forPk}
                        />    
                )
            :
            ((preguntaSimple:PreguntaSimple)=>
                <Campo
                    disabled={preguntaSimple.calculada?true:false}
                    pregunta={preguntaSimple}
                    forPk={props.forPk}
                />
            )(pregunta)
        }</div>
        <div className="pie-pregunta">
            <SaltoDespliegue 
                casillero={pregunta}
                prefijo={pregunta.tipovar=="opciones"?(
                    pregunta.casilleros.some(opcion=>opcion.salto)?"resto de las opciones":"todas las opciones"
                ):""}
            />
        </div>
    </DesplegarCasillero>
}

var calcularDisabledBFAgregarListo = (
    configSorteoFormulario:ConfiguracionSorteoFormulario|null, 
    habilitacionBotonFormulario: ConfiguracionHabilitarBotonFormulario|null,
    formulario:IdFormulario
)=>{
    if(habilitacionBotonFormulario && habilitacionBotonFormulario[formulario]){
        return !habilitacionBotonFormulario[formulario].habilitar_agregar_listo
    }else{
        return !!(configSorteoFormulario && configSorteoFormulario.id_formulario_individual == formulario)
    }
}

function botonesDelFormulario(r:Respuestas, unidad_analisis:IdUnidadAnalisis, estructura:Estructura, forPkPadre:ForPk, feedbackAll:{[formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin>}):HtmlTag<HTMLDivElement>{
    var formsVivienda = getFormulariosForValuePkRaiz(forPkPadre[estructura.pkAgregadaUaPpal]);
    var uaDef = estructura.unidades_analisis[unidad_analisis];
    var arrayEstructuraFormularios = (likeAr(estructura.formularios)).array();
    var x = likeAr(uaDef.hijas).filter(uaHija=>
            //descarto uas que no estén en ningun form
            arrayEstructuraFormularios.filter((infoFormulario)=>
                infoFormulario.casilleros.unidad_analisis == uaHija?.unidad_analisis && formsVivienda.includes(infoFormulario.casilleros.id_casillero as IdFormulario)
            ).length > 0
        ).map(uaHija=>(
        uaHija == null ? null :
        html.div({class:'ua-hijas'},[
            html.div(uaHija.unidad_analisis),
            html.div(
                likeAr(r[uaHija.unidad_analisis]||[]).map((respuestasHija, i)=>{
                    var num = Number(i)+1
                    var forPkHijaParcial = {...forPkPadre, [uaHija.pk_agregada]: num};
                    var configSorteoFormulario = estructura.configSorteo?estructura.configSorteo[getMainFormForVivienda(forPkPadre[estructura.pkAgregadaUaPpal])]:null
                    var habilitacionBotonFormulario = estructura.habilitacionBotonFormulario;
                    return html.div({class:'numerador-ua'}, [
                        html.div({class:'botones-ua'},[
                            html.div({class:'numero-ua'},num.toString()),
                            ...likeAr(estructura.formularios)
                            .filter(formDef=>formDef.casilleros.unidad_analisis == uaHija.unidad_analisis && formsVivienda.includes(formDef.casilleros.id_casillero as IdFormulario))
                            .map((_formDef, formulario)=>{
                                var forPk = {...forPkHijaParcial, formulario};
                                var feedbackForm = feedbackAll[toPlainForPk(forPk)];
                                return feedbackForm ? html.div({},[
                                    // html.button((uaHija!).pk_agregada+" ok: "+(Number(i)+1)),
                                    botonFormularioConResumen(
                                        {
                                            forPk, 
                                            num, 
                                            actual: true || calcularActualBF(configSorteoFormulario, num, null, formulario, r), //REVISAR true para que no se grisen
                                            previo:false, 
                                            disabled: calcularDisabledBF(configSorteoFormulario, habilitacionBotonFormulario, num, formulario, r)
                                        },
                                        feedbackForm, 
                                        r,
                                        {despliegueOculta:false, expresion_habilitar_js:'', nombre:formulario, aclaracion:null, salto:formulario},
                                        forPkPadre,
                                        "boton-ir-resumen-formulario",
                                        estructura.formularios[formulario].casilleros
                                    )
                                ]) : null
                            }).array().map(x=>x == null ? null : x).reverse(),
                        ])
                        ,botonesDelFormulario(respuestasHija, uaHija.unidad_analisis, estructura, forPkHijaParcial, feedbackAll)
                    ])
                }).array().map(x=>x == null ? null : x)
            )
        ])
    )).array().map(x=>x == null ? null : x);
    return html.div(/*{style:'display:flex; flex-direction:row'},*/x);
}

function TextoDespliegue(props:{casillero:Texto, forPk:ForPk}){
    var {casillero, forPk} = props;
    const dispatch = useDispatch();
    var habilitador = casillero.expresion_habilitar_js?getFuncionHabilitar(casillero.expresion_habilitar_js):()=>true;
    var {modoDespliegue} = useSelectorVivienda(forPk);
    var id = `texto-${casillero.id_casillero}`;
    registrarElemento({id, style:'display', fun:(r:Respuestas)=>habilitador(r) || modoDespliegue=='metadatos'?'block':'none'})
    var esResumenFormulario = casillero.casillero=='ResFor' as IdCasillero; // TODO: Cambia esto que está jarcodeado.
    if(esResumenFormulario){
        registrarElemento({id, direct:true, 
            fun:(
                r:Respuestas, 
                _feedbackForm: FormStructureState<IdVariable, Valor, IdFin>, 
                elemento:HTMLDivElement, 
                feedbackAll:{[formulario in PlainForPk]:FormStructureState<IdVariable,Valor, IdFin>}, 
                estructura:Estructura
            )=>{
                elemento.style.display='';
                //@ts-ignore las respuestas son respuestasRaiz porque ResFor está en el form ppal
                if(r['resumenEstado'] as ResumenEstado == 'vacio'){
                    elemento.textContent = "relevamiento sin empezar";
                }else{
                    elemento.textContent = "relevamiento empezado";
                    var {unidad_analisis} = estructura.formularios[forPk.formulario].casilleros;
                    elemento.innerHTML="";
                    elemento.appendChild(botonesDelFormulario(r, unidad_analisis, estructura, forPk, feedbackAll).create());
                }
            }
        })
    }
    var ir = (defBoton:DefinicionFormularioAbrir)=>{
        // var nuevaForPk={...forPk, formulario:idFormularioDestino};
        // nuevaForPk[nuevoCampoPk] = defBoton.num
        dispatchByPass(accion_abrir_formulario,{forPk:defBoton.forPk});
        dispatch(dispatchers.CAMBIAR_FORMULARIO({forPk:defBoton.forPk, apilarVuelta:true}));
    }
    return <DesplegarCasillero 
        id={`${id}-externo`}
        casillero={casillero}
    >
        <EncabezadoDespliegue casillero={casillero} leer={false} forPk={forPk}/>
        <div id={id} style={{display:'none'}}></div>
        {esResumenFormulario?
        <Button className="special-button" id="boton-ir-resumen-formulario" style={{display:'none'}}
            onClick={(event)=>{
                ir(JSON.parse((event.target! as unknown as HTMLButtonElement).getAttribute('def-button')!))
            }}
        >ir (interno)</Button>
        :null}

    </DesplegarCasillero>
}

function FiltroDespliegue(props:{filtro:Filtro, forPk:ForPk}){
    var {filtro} = props;
    return <DesplegarCasillero casillero={filtro}>
        <DespliegueEncabezado casillero={filtro}/>
    </DesplegarCasillero>
}

function ConsistenciaDespliegue(props:{casillero:Consistencia, forPk:ForPk}){
    var {casillero, forPk} = props;
    var habilitador = casillero.expresion_habilitar_js?getFuncionHabilitar(casillero.expresion_habilitar_js):()=>true;
    var {modoDespliegue} = useSelectorVivienda(forPk);
    var id = `consistencia-${casillero.id_casillero}`;
    registrarElemento({id, style:'display', fun:(r:Respuestas)=>habilitador(r) || modoDespliegue=='metadatos'?'block':'none'})
    return <DesplegarCasillero 
        id={id}
        casillero={casillero}
        style={{display:'none'}}
    >
        <EncabezadoDespliegue casillero={casillero} leer={false} forPk={forPk}/>
    </DesplegarCasillero>
}

type DefinicionFormularioAbrir=
({forPk:ForPk, num:number, actual:boolean, previo:boolean} | 
{forPk:ForPk, num:number, actual:boolean, previo:false, esAgregar:true} | 
{forPk:ForPk, num:number, actual:boolean, previo:false, esConfirmar:true} |
{forPk:ForPk, num:number, actual:boolean, previo:false, permiteBorrar:boolean} |
{forPk:ForPk, num:false, actual:boolean, previo:true, unico:true})
& {esConfirmar?:true, esAgregar?:true, permiteBorrar?:boolean, disabled?:boolean|undefined};


var botonFormularioConResumen = (
    defBoton:DefinicionFormularioAbrir, 
    feedbackForm:FormStructureState<IdVariable, Valor, IdFin>, 
    respuestasAumentadas:Respuestas,
    casillero:{despliegueOculta?:boolean|null, expresion_habilitar_js?:string, aclaracion:string|null, expresion_habilitar?:string, nombre?:string, salto:string|null, especial?:any},
    forPkPadre: ForPk,
    idButton:string,
    formularioAAbrir:Formulario
)=>{
    var forPk:ForPk = defBoton.forPk;
    var sufijoIdElemento = toPlainForPk(forPk)+(defBoton.esConfirmar?'-listo':'');
    var id = `div-boton-formulario-${sufijoIdElemento}`;
    var estado = feedbackForm.resumen;
    return html.tr({
        id, 
        class:"seccion-boton-formulario" , 
        $attrs:{
            "nuestro-validator":defBoton.actual?'actual':defBoton.previo?'valida':'todavia_no',
            "ocultar-salteada":casillero.despliegueOculta?(casillero.expresion_habilitar_js?'INHABILITAR':'SI'):'NO',
            "tiene-valor":"NO",
            "def-button":JSON.stringify(defBoton)
        }
    }, [
        casillero.aclaracion?
            html.td({class:"aclaracion"}, [breakeableText(casillero.aclaracion)])
        :null,
        html.td({colspan:(defBoton.esAgregar || defBoton.esConfirmar)?
                (casillero.especial?.camposResumen.length??1)+(casillero.aclaracion?0:1)
            :null},[
            Button2({
                // id:`var-${idVariable}`,
                id:`boton-formulario-${sufijoIdElemento}`, 
                variant:"outlined",
                disabled: defBoton.disabled,
                color:"inherit",
                onClick:()=>{
                    if(defBoton.esConfirmar){
                        if(defBoton.num != null){
                            if(casillero.salto){
                                var BF_varname = '$B.F:'+ casillero.salto as IdVariable
                                dispatchByPass(accion_registrar_respuesta,{forPk:forPkPadre, variable:BF_varname, respuesta:defBoton.num==0?null:defBoton.num as Valor});
                            }
                            dispatchByPass(accion_registrar_respuesta,{forPk:forPkPadre, variable:casillero.expresion_habilitar as IdVariable, respuesta:defBoton.num as Valor});
                        }
                    }else{
                        var button = document.getElementById(idButton)! as HTMLButtonElement;
                        button.setAttribute('def-button', JSON.stringify(defBoton));
                        button.click();
                    }
                },
                $attrs:{
                    "resumen-estado":estado!='vacio'?estado: defBoton.actual?'actual':defBoton.previo?estado:'todavia_no',
                }
                , children:[
                    (defBoton.esAgregar?'agregar':defBoton.esConfirmar?'Listo':casillero.nombre + ' ' + (defBoton.num||'')),
                    html.svg({class:"MuiSvgIcon-root", focusable:false, viewbox:"0 0 24 24", "aria-hidden":"true"},[
                        html.path({d:(defBoton.esAgregar?materialIoIconsSvgPath.Add:defBoton.esConfirmar?materialIoIconsSvgPath.Check:casillero.salto?materialIoIconsSvgPath.Forward:materialIoIconsSvgPath.ExitToApp)})
                    ])
                ]
            }),
            (defBoton.permiteBorrar?
                Button2({
                    className:"boton-borrar-ua-vacia",
                    color:"default",
                    variant:"outlined",
                    children:
                        html.svg({class:"MuiSvgIcon-root", focusable:false, viewbox:"0 0 24 24", "aria-hidden":"true"},[
                            html.path({d:materialIoIconsSvgPath.DeleteForever})
                        ]), 
                    onClick:()=>accion_borrar_formulario({forPk, forPkPadre})})
            :null) 
        ]),
        (defBoton.num !== false && !defBoton.esAgregar && !defBoton.esConfirmar?
            (casillero.especial?.camposResumen??[/*defBoton.num.toString()*/]).map(
                (campo:string)=>html.td(respuestasAumentadas[formularioAAbrir.unidad_analisis][defBoton.num-1][campo as IdVariable])
            )
        :null)
        // html.div({class:'inline-dialog', $attrs:{"inline-dialog-open": confirmarForzarIr == defBoton.num?'visible':'hidden'}},[                ])
        
        /*
            {defBoton.esAgregar?<> <span>  </span> <Button
                variant="outlined"
                color="inherit"
                onClick={()=>{
                }}
            ><ICON.Check/></Button></>:null}
        </div>
        */
    ]).create()
}

var buscarHnosFormulario = (idFormularioDestino:IdFormulario)=>{
    var estructura = getEstructura();
    var ua = estructura.formularios[idFormularioDestino].casilleros.unidad_analisis;
    return likeAr(estructura.formularios)
        .filter((infoFormulario:InfoFormulario, idForm:IdFormulario)=>
            infoFormulario.casilleros.unidad_analisis == ua
        ).map((_infoFormulario:InfoFormulario, idForm:IdFormulario)=>
            idForm
        ).array()
}

var checkFormsVacios = (forms:IdFormulario[], feedbackAll:{
    [formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin> // resultado del rowValidator para estado.forPk
}, forPk:ForPk)=>{
    return forms.filter((form:IdFormulario)=>{
        let myforPk={...forPk, formulario:form};
        var feedback = feedbackAll[toPlainForPk(myforPk)];
        return feedback.resumen != 'vacio'
    }).length == 0
}

function BotonFormularioDespliegue(props:{casillero:BotonFormulario, formulario:Formulario, forPk:ForPk}){
    var {casillero, forPk} = props;
    var habilitador = casillero.expresion_habilitar_js?getFuncionHabilitar(casillero.expresion_habilitar_js):()=>true;
    var {opciones} = useSelectorVivienda(forPk);
    //var idFormularioDestino = 'F:'+casillero.salto! as IdFormulario;   //original
    var armoNomSalto=casillero.salto?.substring(0,2)=='F:'?casillero.salto.slice(2):casillero.salto;
    //console.log('BotonFormularioDespliegue armoNomSalto ' +armoNomSalto);
    var idFormularioDestino = 'F:'+armoNomSalto! as IdFormulario;
    var estructura = getEstructura();
    var {formularioAAbrir} = useSelector((_state:CasoState)=>({
        formularioAAbrir:estructura.formularios[idFormularioDestino].casilleros,
    }));
    var sufijoIdElemento = toPlainForPk(forPk);
    /*
    registrarElemento({
        id:`div-boton-formulario-${sufijoIdElemento}`, 
        attr:'esta-inhabilitada', 
        // fun: (r:Respuestas)=>habilitador(r)?'SI':'NO'
        fun: (_r:Respuestas)=>'NO'
    });
    registrarElemento<HTMLButtonElement>({
        id:`boton-formulario-${sufijoIdElemento}`, 
        prop:'disabled', 
        // fun: (r:Respuestas)=>!habilitador(r)
        fun: (_r:Respuestas)=>false
    });
    */
    const dispatch = useDispatch();
    var [confirmarForzarIr, setConfirmarForzarIr] = useState<DefinicionFormularioAbrir|false|null>(null);
    var multipleFormularios=formularioAAbrir.unidad_analisis != props.formulario.unidad_analisis;
    var nuevoCampoPk = defOperativo.defUA[formularioAAbrir.unidad_analisis].pk;
   // var var_name='$B.'+casillero.salto; //original
    var var_name='$B.F:'+armoNomSalto;
    var idSeccion=`seccion-boton-formulario-${var_name}`;
    var idButton=`special-button-${idSeccion}`;
    registrarElemento<HTMLDivElement>({
        id:idSeccion, 
        direct:true,
        fun: (respuestasAumentadas:Respuestas, feedbackRow: FormStructureState<IdVariable, Valor, IdFin>, div:HTMLDivElement,
                feedbackAll:{
                    [formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin> // resultado del rowValidator para estado.forPk
                }
            )=>{
            try{
                var listaDeBotonesAbrir:DefinicionFormularioAbrir[] = [];
               // var esVarActual = feedbackRow.actual == '$B.F:'+casillero.salto;  //original
                var esVarActual = feedbackRow.actual  == '$B.F:'+armoNomSalto;
               // console.log('BotonFormularioDespliegue esVarActual ' +esVarActual  );
                if(multipleFormularios && casillero.salto!=null){
                  //  let defFormulario:InfoFormulario = estructura.formularios['F:'+casillero.salto as IdFormulario];      //original
                    let defFormulario:InfoFormulario = estructura.formularios['F:'+armoNomSalto as IdFormulario];
                    let defUA = estructura.unidades_analisis[defFormulario.casilleros.unidad_analisis!];
                    let conjunto = respuestasAumentadas[defFormulario.casilleros.unidad_analisis!];
                    let cantidadEsperada = respuestasAumentadas[casillero.expresion_habilitar as IdVariable];
                    var numActual:number|null = null;
                  //  var estadoDelBoton = feedbackRow.feedback['$B.F:'+casillero.salto as IdVariable].estado   //original
                      var estadoDelBoton = feedbackRow.feedback['$B.F:'+armoNomSalto as IdVariable].estado
                   // console.log('BotonFormularioDespliegue estadoDelBoton ' +estadoDelBoton  );
                    var configSorteoFormulario = estructura.configSorteo?estructura.configSorteo[getMainFormForVivienda(forPk[estructura.pkAgregadaUaPpal])]:null
                    var habilitacionBotonFormulario = estructura.habilitacionBotonFormulario;
                    listaDeBotonesAbrir = likeAr(conjunto).map((_, i)=>{
                        let num:number = numberOrStringIncIfArray(i, conjunto) as number;
                        let forPk={...props.forPk, formulario:idFormularioDestino, [nuevoCampoPk]:num};
                        var formHnos = buscarHnosFormulario(idFormularioDestino)
                        var feedback = feedbackAll[toPlainForPk(forPk)];
                        if(numActual == null && feedback.resumen == "vacio" && estadoDelBoton =='valida'){
                            numActual = num;
                        }
                        return {
                            forPk, 
                            resumen:null, 
                            num, 
                            actual: calcularActualBF(configSorteoFormulario, num, numActual, idFormularioDestino, respuestasAumentadas),
                            previo: numActual == null, 
                            permiteBorrar: likeAr(conjunto).array().length == Number(i) + 1 && 
                                checkFormsVacios(formHnos, feedbackAll, forPk) &&
                                calcularPermiteBorrarBF(configSorteoFormulario,idFormularioDestino),
                            disabled: calcularDisabledBF(configSorteoFormulario, habilitacionBotonFormulario, num, idFormularioDestino, respuestasAumentadas)
                        }
                    }).array();
                    if("puede agregar //TODO VER ESTO" && (conjunto instanceof Array || conjunto == null)){
                        let nuevoValorPk=(conjunto==null ? 0 : conjunto.length) + 1;
                        let forPk={...props.forPk, formulario:idFormularioDestino, [nuevoCampoPk]:nuevoValorPk};
                        let debeAgregarOlisto = numActual == null && (cantidadEsperada == null || cantidadEsperada != (conjunto !=null && conjunto.length)) 
                            && (estadoDelBoton =='valida' || esVarActual);
                        listaDeBotonesAbrir.push({
                            forPk, 
                            num:nuevoValorPk, 
                            esAgregar:true, 
                            actual:debeAgregarOlisto, 
                            previo: false, 
                            disabled: calcularDisabledBFAgregarListo(configSorteoFormulario, habilitacionBotonFormulario, idFormularioDestino)
                        });
                        listaDeBotonesAbrir.push({
                            forPk, 
                            num:nuevoValorPk - 1, 
                            esConfirmar:true, 
                            actual:debeAgregarOlisto && (!casillero.longitud || nuevoValorPk > Number(casillero.longitud)), 
                            previo: false, 
                            disabled: calcularDisabledBFAgregarListo(configSorteoFormulario, habilitacionBotonFormulario, idFormularioDestino)
                        });
                    }
                }else{
                    let forPk={...props.forPk, formulario:idFormularioDestino};
                    listaDeBotonesAbrir = [{forPk, num:false, unico:true, actual:esVarActual, previo:true}]
                }
                var todosLosBotones = listaDeBotonesAbrir.map(defBoton=>
                    botonFormularioConResumen(defBoton, feedbackAll[toPlainForPk(defBoton.forPk)]??{resumen:'vacio'}, respuestasAumentadas,
                        casillero, props.forPk, idButton, formularioAAbrir
                    )
                )
                let nombresCamposResumen = likeAr((casillero.especial?.camposResumen||[])).array().map(c=>c);
                var htmlSeccion=document.getElementById(idSeccion)!;
                htmlSeccion.innerHTML="";
                htmlSeccion.appendChild(html.table({class:`table table-striped ${nombresCamposResumen.length?'w-auto':''}`},[
                    html.thead([
                        html.tr([
                            casillero.aclaracion?html.th():null,
                            html.th(casillero.nombre),
                            nombresCamposResumen.map((nombreCampo)=>html.th(nombreCampo)),
                        ])
                    ]),
                    html.tbody([
                        todosLosBotones
                    ])
                ]).create());
            }catch(err){
                var error = unexpected(err);
                console.log("entra al catch")
                div.textContent='esto, FALLÉ '+error.message;
            }
        }
    });
    const ir = (defBoton:DefinicionFormularioAbrir)=>{
        if(!casillero.salto){
            opciones.modoDirecto?
                null
            :
                dispatch(dispatchers.VOLVER_HDR({}));
        }else{
            var nuevaForPk={...forPk, formulario:idFormularioDestino};
            if(multipleFormularios){
                // @ts-ignore forPk y sus componentes
                nuevaForPk[nuevoCampoPk] = defBoton.num
                if(defBoton.esAgregar){
                    dispatchByPass(accion_agregar_formulario,{forPk:nuevaForPk});
                }else{
                    dispatchByPass(accion_abrir_formulario,{forPk:nuevaForPk});
                }
            }
            dispatch(dispatchers.CAMBIAR_FORMULARIO({forPk:nuevaForPk, apilarVuelta:true}));
        }
        if(confirmarForzarIr){setConfirmarForzarIr(false)}
    };
    return <DesplegarCasillero casillero={casillero}>
        <div id={idSeccion}>
        </div>
        <Button className="special-button" id={idButton}
            onClick={(event)=>{
                ir(JSON.parse((event.target! as unknown as HTMLButtonElement).getAttribute('def-button')!))
            }}
        >ir (interno)</Button>
        <Dialog 
            className="nuestro-dialogo"
            open={!!confirmarForzarIr}
            onClose={()=>setConfirmarForzarIr(null)}
        >
            <div className="nuestro-dialogo">
                <Typography>No se puede avanzar al siguiente formulario.</Typography>
                <Typography>Quizás no terminó de contestar las preguntas correspondientes</Typography>
                <Typography>Quizás no corresponde en base a las respuestas obtenidas</Typography>
            </div>
            <Button color="secondary" onClick={()=>confirmarForzarIr && ir(confirmarForzarIr)}>forzar</Button>
            <Button color="primary" variant="contained" onClick={()=>setConfirmarForzarIr(null)}>Entendido</Button>
        </Dialog>
    </DesplegarCasillero>
}

function CasilleroDesconocido(props:{casillero:CasilleroBase, forPk:ForPk}){
    return <DesplegarCasillero 
        id={`casillerodesconocido-${props.casillero.id_casillero}`}
        casillero={props.casillero as Bloque}
        style={{display:'none'}}
    >
        <Typography>Tipo de casillero no implementado: "{props.casillero.tipoc}" para "{props.casillero.casillero}"</Typography>
        <EncabezadoDespliegue casillero={props.casillero as CasilleroEncabezable} leer={false} forPk={props.forPk}/>
    </DesplegarCasillero>
}

function useSelectorVivienda(forPk:ForPk){
    return useSelector((state:CasoState)=>{
        var estructura = getEstructura();
        return {
            formulario: estructura.formularios[forPk.formulario].casilleros,
            modoDespliegue: true || state.modo.demo?state.opciones.modoDespliegue:'relevamiento',
            modo: state.modo,
            opciones: state.opciones,
        }
    })
}

function ConjuntoPreguntasDespliegue(props:{casillero:ConjuntoPreguntas, formulario:Formulario, forPk:ForPk}){
    let {casillero, forPk} = props;
    var id = `conjunto-preguntas-${casillero.id_casillero}`;
    registrarElemento({
        id, 
        direct:true, 
        fun: registradorDeVariable(casillero)
    })
    let modoDespliegue = "normal";
    let habilitado = true;
    return habilitado || modoDespliegue=='metadatos'?<DesplegarCasillero id={id} casillero={casillero}>
        <EncabezadoDespliegue casillero={casillero} forPk={forPk} leer={casillero.leer!==false}/>
        <DesplegarContenidoInternoBloqueOFormulario bloqueOFormulario={casillero} formulario={props.formulario} forPk={forPk} multiple={false}/>
    </DesplegarCasillero>:null;
}

function DesplegarContenidoInternoBloqueOFormulario(props:{bloqueOFormulario:Bloque|Formulario|ConjuntoPreguntas, formulario:Formulario, forPk:ForPk, multiple:boolean}){
    var parcializable = props.bloqueOFormulario.tipoc=='F';
    const [verTodo, setVerTodo] = useState(!parcializable);
    const [forPkActual, setForPkActual] = useState<IdCasillero|null>(null);
    if(parcializable){
        if(forPkActual != props.bloqueOFormulario.casillero){
            setVerTodo(false)
            setForPkActual(props.bloqueOFormulario.casillero)
        }
        useEffect(()=>{
            var timer = setTimeout(()=>{
                setVerTodo(true);
            },250)
            return ()=>{
                if(timer){
                    clearTimeout(timer);
                }
            }
        })
    }
    const limiteNoVerTodo = 3;
    useEffect(()=>{
        if(props.bloqueOFormulario.tipoc=='F'){
            volcadoInicialElementosRegistrados(props.forPk);
        }
    },[toPlainForPk(props.forPk),verTodo])
    useEffect(() => {
        if(props.bloqueOFormulario.tipoc=='F' && verTodo){
            var {siguienteVariable, variableActual} = dispatchByPass(accion_registrar_respuesta, {respuesta:null, variable:NO_CAMBIAR__SOLO_TRAER_STATUS, forPk:props.forPk});
            if(variableActual || siguienteVariable){
                enfocarElementoDeVariable(coalesce(variableActual as string|null,siguienteVariable as string|null) as IdVariable)
            }else{
                var feedbackRowValidator = getFeedbackRowValidator()
                if(feedbackRowValidator[toPlainForPk(props.forPk)].resumen=='ok'){
                    scrollToTop()
                }else{
                    scrollToTop()
                }
            }
        }
    });
    return <div className="contenido">
        {verTodo?null:<div style={{height:"500px", textAlign:'center', verticalAlign:'middle', width:'100%', position:"fixed", backgroundColor: 'rgba(100,100,100,0.3)', fontSize:'200%'}} >cargando...</div>}
        {props.bloqueOFormulario.casilleros.map((casillero, i)=>{
            var key = casillero.tipoc+'-'+casillero.id_casillero+'-'+i;
            return (verTodo || i < limiteNoVerTodo?
                (
                    casillero.tipoc == "P"?<PreguntaDespliegue key={key} pregunta={casillero} forPk={props.forPk} despliegueEncabezado={casillero.despliegueEncabezado??(props.bloqueOFormulario.tipoc=='CP'?'lateral':'superior')}/>:
                    casillero.tipoc == "B"?<BloqueDespliegue key={key} bloque={casillero} formulario={props.formulario} forPk={props.forPk}/>:
                    casillero.tipoc == "FILTRO"?<FiltroDespliegue key={key} filtro={casillero} forPk={props.forPk}/>:
                    casillero.tipoc == "BF"?<BotonFormularioDespliegue key={key} casillero={casillero} formulario={props.formulario} forPk={props.forPk}/>:
                    casillero.tipoc == "CONS"?<ConsistenciaDespliegue key={key} casillero={casillero} forPk={props.forPk}/>:
                    casillero.tipoc == "CP"?<ConjuntoPreguntasDespliegue key={key} casillero={casillero} formulario={props.formulario} forPk={props.forPk}/>:
                    casillero.tipoc == "TEXTO"?<TextoDespliegue key={key} casillero={casillero} forPk={props.forPk}/>:
                    casillero.tipoc == "LIBRE"?<LibreDespliegue key={key} casillero={casillero} formulario={props.formulario} forPk={props.forPk}/>:
                    <CasilleroDesconocido key={key} casillero={casillero} forPk={props.forPk}/>
                )
            :i==limiteNoVerTodo?
                <div key='$spinner' className="spinner-border" role="status">
                    <span>cargando bloque...</span>
                </div>
            :null
            )
        })
    }</div>
}

function BloqueDespliegue(props:{bloque:Bloque, formulario:Formulario, forPk:ForPk}){
    var {bloque, forPk} = props;
    var key=bloque.ver_id!='-' && bloque.ver_id || bloque.casillero;
    var activeStep=0;
    var multiple = !!bloque.unidad_analisis;
    var lista = [{forPk, key:0, multiple:false}];
    var habilitador = bloque.expresion_habilitar_js?getFuncionHabilitar(bloque.expresion_habilitar_js):()=>true;
    var {modoDespliegue} = useSelectorVivienda(forPk);
    if(multiple){
        // TODO: GENERALIZAR
        // @ts-ignore 
        // lista=respuestas.personas.map((_persona, i)=>(
        //     {forPk:{...forPk, persona:i+1}, key:i+1, multiple:true}
        // ))
    }
    var id = `bloque-${bloque.id_casillero}`;
    registrarElemento({
        id,
        style:'display',
        fun: (respuestas:Respuestas)=> habilitador(respuestas) || modoDespliegue=='metadatos'?'unset':'none'
    })
    return <DesplegarCasillero casillero={bloque} nuestro-bloque={bloque.id_casillero} es-multiple={multiple?'SI':'NO'} id={id}>
        <EncabezadoDespliegue casillero={bloque} forPk={forPk}/>
        {lista.map(({key, forPk, multiple})=>
            <DesplegarContenidoInternoBloqueOFormulario key={key} bloqueOFormulario={bloque} formulario={props.formulario} forPk={forPk} multiple={multiple}/>
        )}
    </DesplegarCasillero>;
}

const FormularioEncabezado = DespliegueEncabezado;

function MenuLetra(props:{tamannio:number, denominacion:string}){
    const cambiarLetra = (tamannio:number)=>{
        var root = document.documentElement;
        root.style.fontSize=tamannio+"px";
    }
    return <MenuItem
        onClick={()=>cambiarLetra(props.tamannio)} style={{fontSize:props.tamannio+'px'}}
    >letra {props.denominacion}</MenuItem>
}

function FastSettup(){
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [open, setOpen] = React.useState(false);
    const handleClick = (event:any) => {
        setAnchorEl(event.currentTarget);
        setOpen((prev) => !prev);
    };
    const dispatch = useDispatch();
    const cambiar = (modoDespliegue:ModoDespliegue)=>{
        dispatch(dispatchers.MODO_DESPLIEGUE({modoDespliegue}));
        setOpen(false)
    }
    const opciones = useSelector((state:CasoState)=>state.opciones)
    return <>
        <Button onClick={handleClick}>
            <ICON.Settings/>
        </Button>
        <Menu open={open} anchorEl={anchorEl} onClose={()=>setOpen(false)}>
            <MenuItem onClick={()=>cambiar("relevamiento")}>normal</MenuItem>
            <MenuItem onClick={()=>cambiar("PDF"         )}>PDF para relevamiento</MenuItem>
            <MenuItem onClick={()=>cambiar("metadatos"   )}>revisar metadatos</MenuItem>
            <Divider/>
            <MenuLetra tamannio={12} denominacion = "muy chica"/>
            <MenuLetra tamannio={14} denominacion = "chica"/>
            <MenuLetra tamannio={16} denominacion = "normal"/>
            <MenuLetra tamannio={19} denominacion = "grande"/>
            <MenuLetra tamannio={22} denominacion = "enorme"/>
            <Divider/>
            <MenuItem><label><Checkbox checked={opciones.conCampoOpciones} onChange={
                ()=>dispatch(dispatchers.SET_OPCION({opcion:'conCampoOpciones', valor:!opciones.conCampoOpciones}))
            } inputProps={{ 'aria-label': 'primary checkbox' }}/>campo opciones</label></MenuItem>
            <MenuItem><label><Checkbox checked={opciones.saltoAutomatico} onChange={
                ()=>dispatch(dispatchers.SET_OPCION({opcion:'saltoAutomatico', valor:!opciones.saltoAutomatico}))
            } inputProps={{ 'aria-label': 'primary checkbox' }}/>salto automático</label></MenuItem>
        </Menu>
    </>;
}

function BarraDeNavegacion(props:{forPk:ForPk, soloLectura:boolean, modoDirecto:boolean}){
    const dispatch = useDispatch();
    const forPk = props.forPk;
    const {opciones} = useSelectorVivienda(forPk);
    const [confirmaCerrar, setConfirmaCerrar] = useState<boolean|null>(false);
    var estructura = getEstructura();
    var dominio = getDatosByPass().informacionHdr[forPk[estructura.pkAgregadaUaPpal]].tem.dominio;
    var cerrarDirecto = async function(){
        removeCSSById(BOOTSTRAP_5_1_3_SRC);
        gotoConsistir(
            estructura.operativo as IdOperativo,
            getDatosByPass().informacionHdr[forPk[estructura.pkAgregadaUaPpal]].tarea.tarea,
            forPk[estructura.pkAgregadaUaPpal]
        );
        //var hash=new URLSearchParams(location.hash?.replace(/^\#/,'').split('&autoproced')[0]);
        ////hash.delete('autoproced')
        //close();
        //location.hash=hash.toString();
    }
    var botonesFormulario=[];
    if(!opciones.modoDirecto){
        botonesFormulario.push({que: 'hdr'    , abr:'HdR', id:ID_BOTON_VOLVER_HDR, label:'hoja de ruta', retroceso:0})
    }
    opciones.pilaForPk.forEach((forPk,i)=>
        botonesFormulario.push({que:'volver', abr:forPk.formulario.replace(/^F:/,''), label:forPk.formulario, retroceso:opciones.pilaForPk.length-i})
    )
    botonesFormulario.push({que:'', abr:forPk.formulario.replace(/^F:/,''), label:forPk.formulario, retroceso:0});
    registrarElemento({id:props.modoDirecto?ID_BOTON_CERRAR:ID_BOTON_VOLVER_HDR, direct:true,
        fun:(
            r:Respuestas, 
            _feedbackForm: FormStructureState<IdVariable, Valor, IdFin>, 
            elemento:HTMLDivElement, 
            feedbackAll:{[formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin>}, 
            _estructura:Estructura
        )=>{
            elemento.setAttribute('resumen-estado',calcularResumenVivienda(forPk, feedbackAll, r).resumenEstado);
        }
    })
    return <>
        <ButtonGroup key="formularios" className="barra-navegacion" solo-lectura={props.soloLectura?'si':'no'} >
            {botonesFormulario.map((b,i)=>
                <Button color={b.que==forPk.formulario?"primary":"inherit"} variant="outlined"
                    id={b.id}
                    key={`${i}-${b.que}-${b.retroceso}`}
                    disabled={!b.que}
                    onClick={()=>{
                        dispatch(
                            b.que=='hdr'?dispatchers.VOLVER_HDR({}):
                            dispatchers.VOLVER_DE_FORMULARIO({magnitudRetroceso:b.retroceso})
                        );
                        b.que=='hdr'?null:
                            dispatchByPass(accion_abrir_formulario,{forPk:opciones.pilaForPk[opciones.pilaForPk.length-b.retroceso]});
                    }}
                >
                    <span className="abr">{b.abr}</span>
                    <span className="label">{b.label}</span>
                </Button>
            )}
        </ButtonGroup>
        {props.soloLectura?<Typography component="span" style={{margin:'0 10px'}}> (Solo Lectura) </Typography>:null}
        {props.modoDirecto?
            <>
                <ButtonGroup key="volver_y_grabar" style={{margin:'0 0 0 30px'}}>
                    <Button
                        id={ID_BOTON_CERRAR}
                        color="inherit"
                        variant="outlined"
                        onClick={async ()=>{
                            if(props.soloLectura || !getDirty()){
                                cerrarDirecto();
                            }else{
                                setConfirmaCerrar(true)
                            }
                        }}
                    >
                        <ICON.ExitToApp/>
                    </Button>
                    <Dialog
                        open={!!confirmaCerrar}
                        //hace que no se cierre el mensaje
                        onClose={()=>setConfirmaCerrar(false)}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">Confirme cierre de encuesta</DialogTitle>
                        <DialogContent>
                            <DialogContentText id="alert-dialog-description">
                                Está por salir de la encuesta, se perderán los cambios no guardados.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button 
                                onClick={()=>{
                                    cerrarDirecto()
                                }} 
                                color="secondary" 
                                variant="outlined"
                            >
                                descartar cambios y cerrar
                            </Button>
                            <Button 
                                onClick={()=>{
                                    setConfirmaCerrar(false)
                                }} 
                                color="primary" 
                                variant="contained"
                            >
                                continuar editando encuesta
                            </Button>
                            
                        </DialogActions>
                    </Dialog>
                    {props.soloLectura?null:
                        <Button
                            id={"save-button"}
                            color="inherit"
                            variant="outlined"
                            disabled={true}
                            onClick={async ()=>true}
                        >
                            <ICON.Save/>
                        </Button>
                    }
                </ButtonGroup>
            </>
        :null}
        <Typography className="mostrar-forPk" component="span" style={{margin:'0 10px'}}> 
            {VER_DOMINIO?<div key={dominio}><span>dominio</span><span>{dominio}</span></div>:''}
            {likeAr(props.forPk).filter((_,k)=>k!='formulario').map((v,k)=>
                <div key={k}><span>{k}</span><span>{v}</span></div>
            ).array()} 
        </Typography>
        <FastSettup/>
    </>
}

function BotonVolverEnDiv({id}:{id:string}){
    var {opciones} = useSelector((state:CasoState)=>({opciones:state.opciones}));
    const dispatch = useDispatch();
    var esVolver = opciones.pilaForPk.length>0;
    return <div className="div-boton-volver">
        <Button id={id} className="boton-volver"
            onClick={()=>{
                if (esVolver) { 
                    dispatchByPass(accion_abrir_formulario,{forPk:opciones.pilaForPk[opciones.pilaForPk.length-1]});
                    dispatch(dispatchers.VOLVER_DE_FORMULARIO({magnitudRetroceso:1}))
                } else {
                    var botonCerrar = document.getElementById(ID_BOTON_CERRAR) || document.getElementById(ID_BOTON_VOLVER_HDR) 
                    if (botonCerrar) {
                        botonCerrar.click();
                    }
                }
            }}
        > <ICON.ChevronLeft/>{esVolver ? " Volver" : " Cerrar"}</Button>
    </div>
}

function FormularioDespliegue(props:{forPk:ForPk}){
    var forPk = props.forPk;
    var {formulario, modoDespliegue, modo, opciones} 
        = useSelectorVivienda(props.forPk);
    var soloLectura = getDatosByPass().soloLectura;
    const dispatch = useDispatch();
    var esVolver = opciones.pilaForPk.length>0;
    useEffect(()=>{
        var controlScroll=()=>{
            var arriba = document.getElementById('fab-activo-arriba');
            if(arriba){
                setValorDistinto(arriba.style, 'visibility',
                    // @ts-ignore
                    arriba.elTopVisibilizar !=null && arriba.elTopVisibilizar + 10 
                    < document.documentElement.scrollTop ? 'visible' : 'hidden'
                );
            }
            var abajo = document.getElementById('fab-activo-abajo');
            if(abajo){
                setValorDistinto(abajo.style, 'visibility', 
                    // @ts-ignore
                    abajo.elBottomVisibilizar != null && abajo.elBottomVisibilizar - 20
                    > document.documentElement.scrollTop + window.innerHeight * 0.7 ? 'visible' : 'hidden'
                );
            }
        }
        window.addEventListener('scroll', controlScroll);
        controlScroll();
        return ()=>{
            window.removeEventListener('scroll', controlScroll);
        }
    })
    // TODO Volver a poner el movimiento a la actual
    var actual:any
    var completo:any
    var onClickSaltarActual = ()=>{
        var {variableActual} = dispatchByPass(accion_registrar_respuesta, {respuesta:null, variable:NO_CAMBIAR__SOLO_TRAER_STATUS, forPk:props.forPk});
        if(variableActual){
            enfocarElementoDeVariable(variableActual)
        }
    }
    var listaModos:ModoDespliegue[]=['metadatos','relevamiento','PDF'];
    ['boton-volver-1', 'boton-volver-2'].forEach(id=>{
        registrarElemento({id, direct:true,
            fun:(
                r:Respuestas, 
                feedbackForm: FormStructureState<IdVariable, Valor, IdFin>, 
                elemento:HTMLDivElement, 
                feedbackAll:{[formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin>}, 
                _estructura:Estructura
            )=>{
                elemento.setAttribute('resumen-estado',esVolver?feedbackForm.resumen:calcularResumenVivienda(forPk, feedbackAll, r).resumenEstado);
            }
        })
    })
    // @ts-expect-error especial hay que leerlo en el parser de casilleros si esto termina quedando así
    var pantallaCompleta = formulario.especial?.pantallaCompleta;
    return (
        <>
            <AppBar position="fixed" color={soloLectura?'secondary':'primary'}>
                <Toolbar>
                    <BarraDeNavegacion forPk={forPk} soloLectura={soloLectura || false} modoDirecto={opciones.modoDirecto}/>
                </Toolbar>
                <div id="mini-console"></div>
            </AppBar>
            <main>
                <Paper className="formulario" modo-despliegue={modoDespliegue} ver-num-opciones={opciones.conCampoOpciones?'SI':'NO'}>
                    {modo.demo?<div>
                        <Typography component="span">Modo de despliegue:</Typography>
                        <ButtonGroup>
                        {listaModos.map(modo=>
                            <Button key={modo} variant={modo==modoDespliegue?"contained":"outlined"} onClick={
                                ()=>dispatch(dispatchers.MODO_DESPLIEGUE({modoDespliegue:modo}))
                            }>{modo}</Button>
                        )}
                        </ButtonGroup>
                    </div>:null}
                    {pantallaCompleta?null:<BotonVolverEnDiv id="boton-volver-1"/>}
                    {pantallaCompleta?null:<FormularioEncabezado casillero={formulario}/>}
                    <DesplegarContenidoInternoBloqueOFormulario bloqueOFormulario={formulario} formulario={formulario} forPk={forPk} multiple={false}/>
                    {pantallaCompleta?null:<BotonVolverEnDiv id="boton-volver-2"/>}
                </Paper>
                <Fab id='fab-activo-arriba' color="primary" aria-label="add" onClick={onClickSaltarActual}>
                    <ICON.KeyboardArrowUp />
                </Fab>
                <Fab id='fab-activo-abajo' color="primary" aria-label="add" onClick={onClickSaltarActual}>
                    <ICON.KeyboardArrowDown />
                </Fab>
                <Fab id='fab-error-arriba' variant="extended" color="secondary" aria-label="edit">
                    <ICON.Navigation />
                    Error
                </Fab>                
                <Fab id='fab-error-abajo' variant="extended" color="secondary" aria-label="edit">
                    <ICON.NavigationDown />
                    Error
                </Fab>                
                <div className='espacio-final-formulario'></div>
                {opciones.modoBorrarRespuesta && opciones.forPk?<DesplegarConfirmarBorrarRespuesta forPk={opciones.forPk} variableBorrar={opciones.modoBorrarRespuesta}/>:null}
            </main>
        </>
    );
}

export function Atributo(props:{nombre:string, valor:any}){
    return props.valor!=null && props.valor!=''?<span className="atributo-par">
        {props.nombre?<span className="atributo-nombre">{props.nombre}</span>:null}
         <span className="atributo-valor">{props.valor.toString()}</span>
    </span>:null
}

export const listaEstadosCarga:EstadoCarga[]=['resumen','relevamiento','recibo'];
export var resumidores = [
    {nombre:'REA'         , f:(rr:RespuestasRaiz)=>rr.resumenEstado=="ok"          },
    {nombre:'Cita pactada', f:(rr:RespuestasRaiz)=>rr.resumenEstado=="cita pactada"},
    {nombre:'Pendientes'  , f:(rr:RespuestasRaiz)=>rr.resumenEstado=="vacio"       },
];

resumidores.push(
    {nombre:'Otros', f:resumidores.reduce((g,r)=>(rr=>!r.f(rr) && g(rr) ),(_:RespuestasRaiz)=>true) }
)

export type DesplegarLineaResumenUAPrincipalType = (props:{
    numVivienda:IdEnc,
    formPrincipal:IdFormulario,
    tarea: string,
    respuestas:RespuestasRaiz,
})=>JSX.Element;

export var DesplegarLineaResumenUAPrincipal: DesplegarLineaResumenUAPrincipalType

export const setDesplegarLineaResumenUAPrincipal = (lineaResumenUAPrincipal:DesplegarLineaResumenUAPrincipalType)=>DesplegarLineaResumenUAPrincipal = lineaResumenUAPrincipal;

setDesplegarLineaResumenUAPrincipal((props:{
    numVivienda:IdEnc,
    formPrincipal:IdFormulario,
    tarea: string,
    respuestas:RespuestasRaiz,
})=>{
    const {numVivienda, respuestas, formPrincipal, tarea} = props;
    const id='viv-'+numVivienda;
    const estructura = getEstructura();
    const forPk:ForPk={formulario:formPrincipal, [estructura.pkAgregadaUaPpal]:Number(numVivienda) as IdEnc} as ForPk; //no quitar el casteo porque viene como texto y necesito que sea número
    var tem = getDatosByPass().informacionHdr[numVivienda].tem;
    const dispatch = useDispatch();
    useEffect(()=>{
        volcadoInicialElementosRegistrados(forPk);
        intentarBackup(forPk)
    })
    registrarElemento({id, direct:true,
        fun:(
            r:Respuestas, 
            _feedbackForm: FormStructureState<IdVariable, Valor, IdFin>, 
            elemento:HTMLDivElement, 
            feedbackAll:{[formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin>}, 
            _estructura:Estructura
        )=>{
            //pregunto si es la misma vivienda porque la funcion se dispara 
            //con todas las combinaciones de respuestas para cada forPk
            //@ts-ignore vivienda existe
            if(r[estructura.pkAgregadaUaPpal] == forPk[estructura.pkAgregadaUaPpal]){
                elemento.setAttribute('resumen-estado',calcularResumenVivienda(forPk, feedbackAll, r).resumenEstado);
            }
        }
            
    })
    return <TableRow key={numVivienda}>
        <TableCell>
            {tem?
                <>
                    <DesplegarTem tem={tem}/>
                    {respuestas['resumenEstado' as IdVariable]=="cita pactada"?
                        <DesplegarCitaPactada respuestas={respuestas}/>
                    :
                        <DesplegarCitaPactadaYSeleccionadoAnteriorTem tem={tem}/>
                    }
                </>
            :null}
        </TableCell>
        <TableCell>
            {tarea}
        </TableCell>
        <TableCell>
            <Button id={id} onClick={()=> 
                dispatch(dispatchers.CAMBIAR_FORMULARIO({forPk, apilarVuelta:false}))
            }>
                {numVivienda.toString()}
            </Button>
        </TableCell>
    </TableRow>
});

export type DesplegarCargaType = (props:{
    carga:Carga, 
    idCarga:IdCarga, 
    posicion:number,
    informacionHdr:InformacionHdr, 
    respuestas: RespuestaLasUA,
    feedbackRowValidator:{
        [formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin> 
    }
})=>JSX.Element;

export var DesplegarCarga: DesplegarCargaType

export const setDesplegarCarga = (despliegueCarga:DesplegarCargaType)=>DesplegarCarga = despliegueCarga;

setDesplegarCarga((props:{
    carga:Carga, 
    idCarga:IdCarga, 
    posicion:number,
    informacionHdr:InformacionHdr, 
    respuestas: RespuestaLasUA,
    feedbackRowValidator:{
        [formulario in PlainForPk]:FormStructureState<IdVariable, Valor, IdFin> 
    }
})=>{
    const [newSurvey, setNewSurvey] = useState(0);
    const {carga, idCarga, informacionHdr, respuestas} = props;
    var estructura = getEstructura();
    let cantLineasResumen = likeAr(informacionHdr).filter((informacion)=>informacion.tem.carga==idCarga).array().length;
    const dispatch = useDispatch();
    return <Paper className="carga" style={{marginBottom: '10px', padding: '10px'}}>
        <div className="informacion-carga">
            <div className="carga">Área: {idCarga}</div>
            <div className="observaciones">{carga.observaciones}</div>
        </div>
        <div className="informacion-carga">
            <div className="fecha">{carga.fecha}</div>
            {/*
            <ButtonGroup>
            {listaEstadosCarga.map(estado_carga=>
                <Button key={estado_carga} variant={estado_carga==carga.estado_carga?"contained":"outlined"} onClick={
                    ()=>dispatch(dispatchers.ESTADO_CARGA({idCarga, estado_carga}))
                }>{estado_carga}</Button>
            )}
            </ButtonGroup>
            */}
        </div>
        {carga.estado_carga==null && !props.posicion || carga.estado_carga=='relevamiento'?
        <Table className="tabla-carga-hoja-de-ruta">
            <colgroup>
                <col style={{width:"75%"}}/>
                <col style={{width:"10%"}}/>    
                <col style={{width:"15%"}}/>    
            </colgroup>
            {cantLineasResumen?
                <TableHead style={{fontSize: "1.2rem"}}>
                    <TableRow className="tr-carga">
                        <TableCell>domicilio</TableCell>
                        <TableCell>tarea</TableCell>
                        <TableCell>enc</TableCell>
                    </TableRow>
                </TableHead>
            :null}
            <TableBody>
                <>
                {likeAr(informacionHdr).filter((informacion)=>informacion.tem.carga==idCarga).map((informacion, numVivienda)=>
                    <DesplegarLineaResumenUAPrincipal 
                        key={numVivienda} 
                        numVivienda={numVivienda}
                        tarea={informacion.tarea.tarea}
                        formPrincipal={informacion.tarea.main_form}
                        respuestas={respuestas[estructura.uaPpal][numVivienda] as RespuestasRaiz}
                    />
                ).array()}
                {estructura.permiteGenerarMuestra?
                    <TableRow className="tr-carga-nuevo">
                        <TableCell colSpan={3}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={()=>
                                    crearEncuesta(idCarga,(forPkRaiz:ForPkRaiz)=>{
                                        dispatch(dispatchers.CAMBIAR_FORMULARIO({forPk:forPkRaiz, apilarVuelta:false}));
                                    })
                                }
                            >
                                <ICON.Add/>
                            </Button>
                        </TableCell>
                    </TableRow>
                :null}
                </>
            </TableBody>
        </Table>:
        <Table>
            <TableHead style={{fontSize: "1.2rem"}}>
                <TableRow className="tr-carga">
                    {resumidores.map((resumidor: typeof resumidores[0], i:number)=>
                        <TableCell key={i}>
                            {resumidor.nombre}
                        </TableCell>
                    )}
                </TableRow>
            </TableHead>
        </Table>
        }
    </Paper>
});

export function DesplegarCitaPactada(props:{respuestas:Respuestas}){
    const {respuestas} = props;
    return <div className="cita-pactada">
        <div><Atributo nombre="Cita pactada con " valor={respuestas[p12]}/></div>
        <div><Atributo nombre="Cel.:" valor={respuestas[sp2]}/></div>
        <div><Atributo nombre="Tel.:" valor={respuestas[sp3]}/></div>
        <div><Atributo nombre="Fecha:" valor={respuestas[sp4]}/></div>
        <div><Atributo nombre="Hora:" valor={respuestas[sp5]}/></div>
    </div>
}

export function DesplegarCitaPactadaYSeleccionadoAnteriorTem(props:{tem:TEM}){
    const {tem} = props;
    return <div>
        <div className="tem-cita">
            <Atributo nombre="Cita:" valor={tem.cita}/>
        </div>
    </div>
}

export function DesplegarTem(props:{tem:TEM}){
    const {tem} = props;
    return <div>
        <div className="tem-domicilio">{tem.nomcalle} {tem.nrocatastral} <Atributo nombre="piso" valor={tem.piso}/> <Atributo nombre="dpto" valor={tem.departamento}/> </div>
        <div>
            <Atributo nombre="sector" valor={tem.sector}/>
            <Atributo nombre="edificio" valor={tem.edificio}/>
            <Atributo nombre="casa" valor={tem.casa}/>
            <Atributo nombre="entrada" valor={tem.entrada}/>
            <Atributo nombre="habitacion" valor={tem.habitacion}/>
        </div>
        <div className="tem-observaciones">
            {tem.observaciones} 
        </div>
    </div>
}

export type HojaDeRutaDespliegueType = (props:{})=>JSX.Element;

export var HojaDeRutaDespliegue: HojaDeRutaDespliegueType

export const setHojaDeRutaDespliegue = (hojaDeRuta:HojaDeRutaDespliegueType)=>HojaDeRutaDespliegue = hojaDeRuta

setHojaDeRutaDespliegue((_props:{})=>{
    var {cargas, num_sincro, informacionHdr, respuestas} = getDatosByPass();
    var {modo} = useSelector((state:CasoState)=>({modo:state.modo}));
    var feedbackRowValidator = getFeedbackRowValidator()
    const dispatch = useDispatch();
    const updateOnlineStatus = function(){
        setOnline(window.navigator.onLine);
    }
    const appVersion = getCacheVersion();
    const [online, setOnline] = useState(window.navigator.onLine);
    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return (
        <>
            <AppBar position="fixed">
                <Toolbar>
                    <Typography variant="h6">
                        Hoja de ruta
                    </Typography>
                    {
                    //<IconButton style={{marginTop:'3px'}}
                    //    color="inherit"
                    //    //onClick={/*dispatch que lleva a pantalla opciones*/}
                    //>
                    //    <ICON.Settings/>
                    //</IconButton>
                    }
                    {online?
                        <>
                            <IconButton
                                color="inherit"
                                onClick={()=>{
                                    gotoSincronizar()
                                }}
                            >
                                <ICON.SyncAlt/>
                            </IconButton>
                        </>
                    :null}
                </Toolbar>
            </AppBar>
            <div className="hoja-de-ruta">
                {modo.demo?<div>
                    <Typography>Modo demo </Typography>
                    <Button variant="outlined" color="secondary"
                        onClick={()=>dispatch(dispatchers.REINICIAR_DEMO({}))}
                    >
                        reiniciar
                    </Button>
                </div>:null}
                <div className="nombre-version">
                    <div>Dirección General de Estadística y Censos - C.A.B.A.</div>
                    <div>{my.getLocalVar('app-version')} sincro {num_sincro} - versión {appVersion}</div>
                </div>
                {likeAr(cargas).map((carga, idCarga, _, posicion)=>
                    <DesplegarCarga key={idCarga} carga={carga} idCarga={idCarga} posicion={posicion} informacionHdr={informacionHdr} feedbackRowValidator={feedbackRowValidator} respuestas={respuestas}/>
                ).array()}
            </div>
        </>
    );
});

export function ListaTextos(props:{textos:string[]}){
    return <ul>
        {props.textos.map(t=><li><Typography>{t}</Typography></li>)}
    </ul>;
}

export function BienvenidaDespliegue(props:{modo:CasoState["modo"]}){
    const dispatch=useDispatch();
    return <Paper className="bienvenida">
        {props.modo.demo?
            <>
                <Typography>DEMO del sistema de relevamiento de DMENCU</Typography>
                <Typography>En esta demo:</Typography>
                <ListaTextos textos={[
                    "Algunas viviendas aparecen relevadas (el botón está de color) sirven de ejemplo",
                    "Lo que se carguen se guardan localmente pero no se trasmiten a la base de datos",
                    "Se puede volver a la versión inicial (o sea borrar lo que se guardó localmente) desde la hoja de ruta boton [reiniciar demo]",
                    "Todavía hay cosas que faltan o pueden cambiar",
                ]} />
            </>
            :<>
                <Typography>Encuesta de Seroprevalencia de COVID-19</Typography>
            </>
        }
        <Button
            variant="contained"
            color="secondary"
            onClick={()=>{ gotoSincronizar(); }}
        >
            <span>Sincronizar </span> <ICON.SyncAlt/>
        </Button>
        <Button
            variant="contained"
            color="primary"
            onClick={()=>dispatch(dispatchers.SET_OPCION({opcion:'bienvenido', valor:true}))}
        >
            <span>Continuar </span> <ICON.Send/>
        </Button>
    </Paper>
}

//CONTROL DE PESTAÑAS
var allOpenedTabs:{[x:string]:number}={};
var infoOpenedTabs={
    allOpenedTabs,
    myId:'calculando...',
    otherTabsNames:''
}

export function OpenedTabs(){
    const [tabs, setTabs] = useState(infoOpenedTabs.otherTabsNames);
    var {modoDirecto} = useSelector((state:CasoState)=>({modoDirecto:state.opciones.modoDirecto}));
    const updateTabsStatus = function(){
        setTabs(infoOpenedTabs.otherTabsNames);
    }
    useEffect(()=>{
        window.addEventListener('my-tabs',updateTabsStatus);
        return () => window.removeEventListener('my-tabs',updateTabsStatus);
    },[])
    return modoDirecto?null:(tabs)?
        <div className="tab-counter tab-error">¡ATENCIÓN! Hay más de una ventana abierta. Se pueden perder datos: {tabs}</div>
    :
        <div className="tab-counter">✔</div>
}

export function AppDmEncu(){
    var {forPk, bienvenido, modo} = useSelector((state:CasoState)=>({...state.opciones, ...state.modo, ...state}));
    if(!bienvenido){
        return <BienvenidaDespliegue modo={modo}/> 
    }else if(forPk==null){
        return <HojaDeRutaDespliegue /> 
    }else{
        return <FormularioDespliegue forPk={forPk}/>
    }
}

function PantallaInicialSinCarga(_props:{}){
    const updateOnlineStatus = function(){
        setOnline(window.navigator.onLine);
    }
    const [online, setOnline] = useState(window.navigator.onLine);
    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    const paragraphStyles={fontSize:"1.2rem", fontWeight:600, padding: "5px 10px"};
    return (
        <>
            <AppBar position="fixed">
                <Typography variant="h6" style={{margin:25}}>
                    Dispositivo sin carga
                </Typography>
            </AppBar>
            <main>
                <Paper style={{height:'600px', padding:"15px", marginTop:75}}>
                    <div>
                        {online?
                            <>
                                <Typography component="p" style={paragraphStyles}>
                                    Sincronizar dispositivo
                                    <span style={{padding:'5px'}}>
                                        <Button
                                            color="primary"
                                            variant="contained"
                                            onClick={()=>{
                                                gotoSincronizar()
                                            }}
                                        >
                                            <ICON.SyncAlt/>
                                        </Button>
                                    </span>
                                </Typography>
                            </>
                        :
                            <Typography component="p" style={paragraphStyles}>
                                No hay conexión a internet, por favor conécte el dispositivo a una red para sincronizar una hoja de ruta.
                            </Typography>
                        }
                    </div>
                </Paper>
            </main>
        </>
    );
}

export function PantallaInicial(){
    var {forPk, bienvenido, modo} = useSelector((state:CasoState)=>({...state.opciones, ...state.modo, ...state}));
    if(!bienvenido){
        return <BienvenidaDespliegue modo={modo}/> 
    }else if(forPk==null){
        return <HojaDeRutaDespliegue /> 
    }else{
        return <FormularioDespliegue forPk={forPk}/>
    }
}

export async function dmPantallaInicialSinCarga(){
    try{
        await loadCSS(BOOTSTRAP_5_1_3_SRC);
    }catch(err){
        throw(err)
    }
    ReactDOM.render(
        <PantallaInicialSinCarga/>,
        document.getElementById('main_layout')
    )
}

export async function desplegarFormularioActual(opts:{modoDemo:boolean, forPkRaiz?:ForPkRaiz, operativo:IdOperativo}){
    // traer los metadatos en una "estructura"
    // traer los datos de localStorage
    // verificar el main Layout
    const store = await dmTraerDatosFormulario(opts)
    try{
        await loadCSS(BOOTSTRAP_5_1_3_SRC);
    }catch(err){
        throw(err)
    }
    ReactDOM.render(
        <RenderPrincipal store={store} dispatchers={dispatchers} mensajeRetorno={opts.forPkRaiz?"Volver al formulario":"Volver a la hoja de ruta"}>
            <OpenedTabs/>
            <AppDmEncu/>
        </RenderPrincipal>,
        document.getElementById('main_layout')
    )
}

if(typeof window !== 'undefined'){
    // @ts-ignore para hacerlo
    window.desplegarFormularioActual = desplegarFormularioActual;
    // @ts-ignore para hacerlo
    window.dmPantallaInicialSinCarga = dmPantallaInicialSinCarga;
}


function loadInstance(){
    if(typeof BroadcastChannel === 'undefined'){
        return;
    }
    var bc = new BroadcastChannel('contador');
    var myId=String.fromCodePoint(100+Math.floor(Math.random()*1000))+Math.floor(Math.random()*100)//+'-'+new Date().getTime();
    allOpenedTabs[myId]=1;
    infoOpenedTabs.myId=myId;
    var event = new Event('my-tabs');
    bc.onmessage=function(ev){
        if(ev.data.que=='soy'){
            if(!allOpenedTabs[ev.data.id]){
                allOpenedTabs[ev.data.id]=0;
            }
            allOpenedTabs[ev.data.id]++;
        }
        if(ev.data.que=='unload'){
            delete allOpenedTabs[ev.data.id];
        }
        if(ev.data.que=='load'){
            allOpenedTabs[ev.data.id]=1;
            bc.postMessage({que:'soy',id:myId});
        }
        infoOpenedTabs.otherTabsNames=likeAr(allOpenedTabs).filter((_,id)=>id!=myId).join(',');
        window.dispatchEvent(event);
    };
    bc.postMessage({que:'load',id:myId});
    window.dispatchEvent(event);
    window.addEventListener('unload',function(){
        bc.postMessage({que:'unload',id:myId});
        window.dispatchEvent(event);
    })
    //mostrarQuienesSomos();
}

export const setLibreDespliegue = (libre:LibreDespliegueType)=>LibreDespliegue = libre

setLibreDespliegue((props:{
    key:string
    casillero:Libre
    formulario:Formulario
    forPk:ForPk
})=><div key={props.key} id={props.casillero.id_casillero}>este casillero debe redefinirse en la APP final y su uso es exclusivo del área informática</div>)

setCalcularVariables((respuestasRaiz:RespuestasRaiz, forPk:ForPk)=>{
    type ConfigPadre = {
        uaPersonas: IdUnidadAnalisis
        varSexoPersona: IdVariable
        varNombrePersona: IdVariable
        varLosNombres: IdVariable
    }
    var estructura = getEstructura();
    var autoCargarPersonas = (configPadre: ConfigPadre ,uaPadrePersonas:IdUnidadAnalisis, estructura:Estructura)=>{
        var leerNombres = (respuestasUAPadre:Respuestas, configPadre:ConfigPadre)=>{
            if(!respuestasUAPadre[configPadre.uaPersonas] || empty(respuestasUAPadre[configPadre.uaPersonas]) || respuestasUAPadre[configPadre.uaPersonas][0][configPadre.varSexoPersona] == null){
                var losNombres = respuestasUAPadre[configPadre.varLosNombres] as string
                if(losNombres != null){
                    if(!respuestasUAPadre[configPadre.uaPersonas]){
                        respuestasUAPadre[configPadre.uaPersonas]=[];
                    }
                    losNombres
                        .split(',')
                        .filter((nombre:string)=>nombre.trim().length > 0)
                        .forEach((nombre:string, i:number)=>{
                            respuestasUAPadre[configPadre.uaPersonas][i] = respuestasUAPadre[configPadre.uaPersonas][i] || {};
                            respuestasUAPadre[configPadre.uaPersonas][i][configPadre.varNombrePersona] = nombre.trim();
                        })
                }
            }
        }
        if(estructura.unidades_analisis[uaPadrePersonas]){
            if(uaPadrePersonas == 'viviendas'){
                leerNombres(respuestasRaiz,configPadre)
            }else{
                for(var respuestasUAPadre of iterator(respuestasRaiz[uaPadrePersonas]??[])){
                    leerNombres(respuestasUAPadre,configPadre)
                }   
            }
        }
    }
    var uasIterar: {
        [key in IdUnidadAnalisis]:ConfigPadre
    }; 
    var configEncu : ConfigPadre = { 
        uaPersonas: 'personas',
        varSexoPersona: 'sexo' as IdVariable,
        varNombrePersona: 'nombre' as IdVariable,
        varLosNombres: "los_nombres" as IdVariable
    };
    var configSupe : ConfigPadre = { 
        uaPersonas: 'personas_sup' as IdUnidadAnalisis,
        varSexoPersona: 'sexo_sup'  as IdVariable,
        varNombrePersona: 'nombre_sup'  as IdVariable,
        varLosNombres: "nombres_componentes_sup"  as IdVariable
    };

    if(estructura.conReaHogar){
        uasIterar = {
            hogares: configEncu,
            ["hogares_sup" as IdUnidadAnalisis] : configSupe
        }
        likeAr(uasIterar).forEach((configPadre,uaPadre)=>{
            autoCargarPersonas(configPadre,uaPadre, estructura)
            
        })
    }else{
        var configPadres: ConfigPadre[] = [configEncu,configSupe];
        configPadres.forEach((configPadre)=>{
            autoCargarPersonas(configPadre,'viviendas', estructura)
        })        
    }
    respuestasRaiz.vdominio=getDatosByPass().informacionHdr[forPk[estructura.pkAgregadaUaPpal]].tem.dominio;
    //TODO: MEJORAR EN ALGUN MOMENTO EL BOTON LISTO
    let totalH = respuestasRaiz['total_h' as IdVariable];
    respuestasRaiz['$B.F:S1' as IdVariable] = (respuestasRaiz['hogares'] || []).length == totalH?'ok':null;
    let totalHsup = respuestasRaiz['total_h_sup' as IdVariable];
    respuestasRaiz['$B.F:S1_SUP' as IdVariable] = (respuestasRaiz['hogares_sup' as IdUnidadAnalisis] || []).length == totalHsup?'ok':null;
})

window.addEventListener('load', function(){
    loadInstance()
})
//FIN CONTROL PESTAÑAS

function loadCSS(cssURL:string, id?:string):Promise<void>{
    return new Promise(( resolve, reject )=>{
        var link = document.createElement( 'link' );
        link.rel  = 'stylesheet';
        link.href = cssURL;
        link.id = id || cssURL;
        document.head.appendChild( link );
        link.onload = ()=>{ 
            resolve(); 
            console.log(`trae ${cssURL}`);
        };
        link.onerror=(err)=>{
            console.log('error cargando el estilo', err)
            reject(new Error(`problema cargando estilo ${cssURL}`))
        }
    });
}

function removeCSSById(id:string){
    var linkNode =  document.getElementById(id);
    linkNode?.parentNode?.removeChild(linkNode);
}

const BOOTSTRAP_5_1_3_SRC = 'css/bootstrap.min.css';