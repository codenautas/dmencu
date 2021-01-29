import * as React from "react";
import * as ReactDOM from "react-dom";
import {  
    FocusOpts, RenderPrincipal, 
    clsx, memoize, adaptarTipoVarCasillero,
    ICON,
    focusToId,
    scrollToTop,
    scrollToBottom,
    InputTypes
} from "./render-general";
import {Bloque, BotonFormulario, 
    CasilleroBase, CasoState, Consistencia, DatosVivienda,
    EstadoCarga, FeedbackVariable, Filtro, ForPk, Formulario, 
    IdCaso, IdFormulario, IdTarea, IdVariable, InfoFormulario,
    ModoDespliegue,
    Opcion, OpcionMultiple, OpcionNo, OpcionSi, 
    Pregunta, PreguntaConOpciones, PreguntaConOpcionesMultiples, PreguntaSimple, 
    Respuestas, Valor, TEM, IdCarga, Carga, VivendasHdR, PlainForPk, IdFin, InfoTarea, Tareas, Visita, IdUnidadAnalisis
} from "./tipos";
import { dmTraerDatosFormulario, dispatchers, 
    getFuncionHabilitar, 
    gotoSincronizar,
    gotoCampo,
    toPlainForPk,
    saveSurvey,
    consultarEtiqueta,
    gotoVer,
    respuestasForPk,
    defOperativo
} from "./redux-formulario";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux"; 
import * as likeAr from "like-ar";
import {serie} from "best-globals";

import {
    AppBar, Badge, Button, ButtonGroup, Card, Chip, CircularProgress, CssBaseline, 
    Dialog, DialogActions, DialogContent, DialogContentText, 
    DialogTitle, Divider, Fab, Grid, IconButton, InputBase, 
    Link, List, ListItem, ListItemIcon, ListItemText, Drawer, 
    Menu, MenuItem, Paper, Popover,
    Step, Stepper, StepContent, StepLabel, 
    SvgIcon, Switch, 
    Table, TableBody, TableCell, TableHead, TableRow, TextField, Theme, Toolbar, Typography, Zoom,
    useScrollTrigger,
    createStyles, makeStyles, Icon, Hidden, Grow
} from "@material-ui/core";
import { EstadoVariable, FormStructureState } from "row-validator";
import { controlarCodigoDV2 } from "./digitov";

// TODO: Generalizar
var c5 = 'c5' as IdVariable;
var e1 = 'e1' as IdVariable;
var e2 = 'e2' as IdVariable;
var e7 = 'e7' as IdVariable;

var p12 = 'p12' as IdVariable;
var sp2 = 'sp2' as IdVariable;
var sp3 = 'sp3' as IdVariable;
var sp4 = 'sp4' as IdVariable;
var sp5 = 'sp5' as IdVariable;

var useStyles = makeStyles((_theme: Theme) =>
    createStyles({
        root:{},
        errorCasillero:{
            backgroundColor:'#FDA'
        },
        F:{
            fontSize:'2rem'
        },
        aclaracion:{
            color:'gray'
        },
        idOpcionM:{
            fontWeight:'bold',
            margin:'4px',
            color:'gray'
        },
        textoOpcion:{
            margin:'6px'
        },
        buttonOpcion:{
            padding:'0px',
            paddingLeft:'3px',
            textTransform: 'none',
            color:'inherit'
        },

        itemOpciones:{
            border:'1px dashed red'
        },
        salto:{
            textAlign:'center',
            fontSize:'80%',
            '&::before':{
                content:'->'
            },
            '::before':{
                content:'=>'
            },
        }
    })
);

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

function DespliegueEncabezado(props:{casillero:CasilleroBase, leer?:boolean}){
    const {casillero} = props;
    var classes = useStyles();
    return <Grid container alignItems="center" debe-leer={props.leer?'SI':'NO'}>
        <Grid item>
            <Button variant="outlined" className={takeElementOrDefault(casillero.tipoc, classes, classes.root)}>{casillero.ver_id || casillero.casillero}</Button>
        </Grid>
        <Grid item>
            <Typography className={takeElementOrDefault(casillero.tipoc, classes, classes.root)}>{casillero.nombre}</Typography>
            {casillero.aclaracion?
                <Typography className={classes.aclaracion}>{casillero.aclaracion}</Typography>
            :null}
        </Grid>
    </Grid>
}

function OpcionDespliegue(props:{casillero:CasilleroBase, valorOpcion:number, variable:IdVariable, forPk:ForPk, elegida:boolean, leer:boolean}){
    const {casillero} = props;
    var classes = useStyles();
    var dispatch = useDispatch();
    return <Grid className="opcion"> 
        <Button 
            variant="outlined"
            opcion-seleccionada={props.elegida?"SI":"NO"}
            className={classes.buttonOpcion}
            onClick={()=>{
                dispatch(dispatchers.REGISTRAR_RESPUESTA({respuesta:props.valorOpcion, variable:props.variable, forPk:props.forPk}))
            }}
        >
            <Grid container wrap="nowrap">
                <Grid className="id">
                    {casillero.ver_id || casillero.casillero}
                </Grid>
                <Grid className={classes.textoOpcion} debe-leer={casillero.despliegue?.includes('si_leer')?'SI':casillero.despliegue?.includes('no_leer')?'NO':props.leer?'SI':'NO'}>
                    <Typography>{casillero.nombre}</Typography>
                    {casillero.aclaracion?
                        <Typography className={classes.aclaracion}>{casillero.aclaracion}</Typography>
                    :null}
                </Grid>
            </Grid>
        </Button>
        {casillero.salto?
            <Typography className={classes.salto}>{casillero.salto}</Typography>
        :null}
    </Grid>
}
interface IcasilleroConOpciones{
    var_name:IdVariable,
    casilleros:Opcion[]
}


function SiNoDespliegue(props:{casilleroConOpciones:IcasilleroConOpciones, forPk:ForPk, valorActual:Valor}){
    return <OpcionesDespliegue 
        casilleroConOpciones={props.casilleroConOpciones} 
        forPk={props.forPk} 
        valorActual={props.valorActual}
        leer={false}
        horizontal={true}
    />
}

function OpcionMultipleDespliegue(props:{opcionM:OpcionMultiple, forPk:ForPk, valorActual:Valor, feedback:FeedbackVariable}){
    const {opcionM} = props;
    var classes = useStyles();
    var tieneValor=props.valorActual!=null?(props.feedback.conProblema?'invalido':'valido'):'NO';
    return <div 
        className="multiple" 
        nuestro-validator={props.feedback.estado} 
        esta-inhabilitada={props.feedback?.inhabilitada?'SI':'NO'}
        tiene-valor={tieneValor} 
    >
        <EncabezadoDespliegue 
            casillero={opcionM} 
            verIdGuion={true} 
            leer={!opcionM.despliegue?.includes('no_leer')} 
            tieneValor={tieneValor}
            feedback={props.feedback}
            forPk={props.forPk}
        />
        <div className="casilleros">
            <Grid container>
                <SiNoDespliegue 
                    casilleroConOpciones={opcionM} 
                    forPk={props.forPk}
                    valorActual={props.valorActual}
                />
            </Grid>
        </div>
    </div>
}

function EncabezadoDespliegue(props:{casillero:CasilleroBase, verIdGuion?:boolean, leer?:boolean, tieneValor?:string, feedback?:FeedbackVariable|null, forPk:ForPk}){
    var {casillero} = props;
    var dispatch = useDispatch()
    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
    var key=(casillero.ver_id!='-' || props.verIdGuion) && casillero.ver_id || casillero.casillero;
    const handleClose=()=>{
        setAnchorEl(null);
    }
    const open = Boolean(anchorEl);
    return <div 
        className="encabezado" 
        debe-leer={props.leer?'SI':'NO'} 
    >
        <div id={casillero.var_name || undefined} className="id-div"
            onClick={event=>{
                if(casillero.var_name!=null && props.tieneValor=='invalido'){
                    dispatch(dispatchers.REGISTRAR_RESPUESTA({forPk:props.forPk, variable:casillero.var_name, respuesta:null}))
                }else if(casillero.var_name!=null){
                    setAnchorEl(event.currentTarget);
                }
            }}
        >
            <div className="id">
                {key}
            </div>
        </div>
        <div className="nombre-div">
            <div className="nombre">{casillero.nombre}</div>
            {casillero.aclaracion?
                <div className="aclaracion">{casillero.aclaracion}</div>
            :null}
            <div los-metadatos="si">
                <span el-metadato="variable">{casillero.var_name}</span>
                {casillero.tipovar && casillero.tipovar!='opciones' && casillero.tipovar!='si_no'?
                    <span el-metadato="tipovar">{casillero.tipovar}</span>
                :null}
                {   //@ts-ignore una opción múltiple nunca lo a a ser, no tiene el campo, no importa
                    casillero.optativo?<span el-metadato="optativa">optativa</span>:null
                }
                {casillero.despliegue?.includes('calculada')?<span el-metadato="calculada">calculada</span>:null}
                {casillero.despliegue?.includes('oculta')?<span el-metadato="oculta">oculta</span>:null}
                {casillero.expresion_habilitar?<span el-metadato="expresion_habilitar">habilita: {casillero.expresion_habilitar}</span>:null}
            </div>
        </div>
        <Popover
            id={anchorEl && "popover-confirmar" || undefined}
            open={open}
            anchorEl={anchorEl}
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
            {props.tieneValor=="valido" && casillero.var_name?<div className="confirma-borrado">
                <Typography>La pregunta tiene registrada una respuesta</Typography>
                <div className="confirma-botones">
                    <Button color="primary"   variant="outlined" onClick={handleClose}>dejar así</Button>
                    <Button color="secondary" variant="outlined" onClick={()=>{
                        if(casillero.var_name){
                            dispatch(dispatchers.REGISTRAR_RESPUESTA({forPk:props.forPk, variable:casillero.var_name, respuesta:null}))
                        }
                        handleClose()
                    }}>Borrar respuesta</Button>
                </div>
            </div>:<div className="confirma-borrado">
                {props.feedback?.estado=="actual"?<>
                    <Typography>Esta es la pregunta actual {props.leer?"lea la respuesta y ":""} registre la respuesta </Typography>
                    <Typography>
                        {casillero.tipovar=="opciones"||casillero.tipovar=="si_no"?
                            "en el botón azul de la respuesta correspondiente "
                        :   "sobre la raya azul (pulse sobre ella para que aparezca el teclado)"}
                    </Typography>
                </>:props.feedback?.estado=="omitida"?<>
                    <Typography>Esta es la pregunta parece omitida.</Typography>
                    <Typography>Quizás falte ingresar la respuesta.</Typography>
                    <Typography>Quizás haya un error en una pregunta anterior.</Typography>
                </>:props.feedback?.estado=="fuera_de_rango"?<>
                    <Typography>La respuesta está fuera de rango</Typography>
                </>:props.feedback?.estado=="fuera_de_flujo_por_omitida"?<>
                    <Typography>Hay una respuesta omitida o un error más arriba.</Typography>
                    <Typography>Revise la pregunta marcada en amarillo.</Typography>
                </>:props.feedback?.estado=="todavia_no"?<>
                    <Typography>Todavía no hay que contestar esta pregunta.</Typography>
                    <Typography>Ingresar la respuesta a la pregunta de fondo blanco.</Typography>
                </>:props.feedback?.estado=="salteada"?<>
                    <Typography>Esta pregunta está salteada debido a una respuesta marcada más arriba.</Typography>
                    <Typography>Buscar la siguiente pregunta de fondo blanco.</Typography>
                </>:
                null}
                <div className="confirma-botones">
                    <Button color="primary"   variant="outlined" onClick={handleClose}>continuar</Button>
                </div>
            </div>}
        </Popover>
    </div>
}

function calcularNuestraLongitud(longitud:string |null){
    var value = parseInt(longitud||'9999');
    if(isNaN(value)){
        return 'full';
    }else{
        return value<=10?'small'
            :value<=20?'medium':'full'
    }
}

function Campo(props:{disabled:boolean, pregunta:PreguntaSimple, valor:Valor, onChange:(valor:Valor)=>void}){
    var {pregunta, disabled } = props;
    var [valor, setValor] = useState(props.valor);
    var [editando, setEditando] = useState(false);
    useEffect(() => {
        setValor(props.valor)
    }, [props.valor]);
    const inputProps = {
        maxLength: pregunta.longitud,
    };
    var nuestraLongitud = calcularNuestraLongitud(pregunta.longitud)
    return <div className="campo" nuestra-longitud={nuestraLongitud}>
        <div className="input-campo">
            <TextField 
                disabled={disabled}
                className="variable" 
                //var-length={pregunta.longitud} 
                fullWidth={true}
                inputProps={inputProps}
                value={valor?valor:''} 
                type={pregunta.despliegue?.includes('telefono')?'tel':adaptarTipoVarCasillero(pregunta.tipovar)}
                onChange={(event)=>{
                    let value = event.target.value || null;
                    value = pregunta.despliegue?.includes('entero') && value?value.replace('.',''):value
                    setValor(value)
                }}
                onFocus={(_event)=>setEditando(true)}
                onBlur={(_event)=>{
                    props.onChange(valor)
                    setEditando(false)
                }}
            />
        </div>
        {disabled?null:
            <div className="boton-confirmar-campo">
                <Button variant={editando?"contained":'outlined'} size="small" color={editando?'primary':'default'}><ICON.Check/></Button>
            </div>
        }
    </div>
}

interface IcasilleroConOpciones{
    var_name:IdVariable,
    casilleros:Opcion[]
}

function OpcionesDespliegue(
    {casilleroConOpciones, forPk, valorActual, leer, horizontal}:
    {casilleroConOpciones:IcasilleroConOpciones, forPk:ForPk, valorActual:Valor, leer:boolean, horizontal:boolean}
    // {casilleroConOpciones:PreguntaConOpciones|OpcionMultiple, forPk:ForPk, valorActual:Valor, leer:boolean, horizontal:boolean}
){
    return <Grid container direction={horizontal?"row":"column"} wrap={horizontal?"nowrap":"wrap"}>{
        casilleroConOpciones.casilleros.map((opcion:Opcion)=>
            <Grid key={opcion.casillero} item
                ocultar-salteada={opcion.despliegue?.includes('ocultar')?(opcion.expresion_habilitar_js?'INHABILITAR':'SI'):'NO'}
            >
                <OpcionDespliegue 
                    casillero={opcion} 
                    valorOpcion={opcion.casillero} 
                    variable={casilleroConOpciones.var_name} 
                    forPk={forPk} 
                    elegida={valorActual==opcion.casillero}
                    leer={leer}
                />
                {opcion.casilleros.map(casilleroHijo=>
                    <div className="casillerHijo">
                        <Typography>{casilleroHijo.nombre}</Typography>
                        <TextField/>
                    </div>
                )}
            </Grid>
        )
    }</Grid>
}

function PreguntaDespliegue(props:{
    pregunta:Pregunta, 
    forPk:ForPk, 
    valorActual:Valor, 
    respuestas:Respuestas|null, 
    feedback:FeedbackVariable|null,
    feedbackRow:{[v in IdVariable]:FeedbackVariable}|null
}){
    var {pregunta, feedbackRow} = props;
    var dispatch=useDispatch();
    var estado:EstadoVariable;
    var tieneValor=props.valorActual!=null && props.feedback!=null?(props.feedback.conProblema?'invalido':'valido'):'NO';
    if(pregunta.tipovar){
        estado=props.feedback?.estado!;
    }else{
        var feedback = pregunta.casilleros.reduce((pv, om)=>{
            var fb=feedbackRow?.[om.var_name!]!
            return {
                tieneActual: pv.tieneActual || fb.estado=='actual',
                estaSalteada: pv.estaSalteada && (fb.estado=='salteada' || fb.estado=='fuera_de_flujo_por_salto')
            }
        }, {tieneActual:false, estaSalteada:true});
        estado=feedback.tieneActual?'actual':feedback.estaSalteada?'salteada':'todavia_no'
    }
    return <div 
        className="pregunta"
        nuestro-casillero={pregunta.casillero}
        nuestro-tipovar={pregunta.tipovar||"multiple"} 
        nuestro-validator={estado}
        tiene-valor={tieneValor} 
        ocultar-salteada={pregunta.despliegue?.includes('ocultar')?(pregunta.expresion_habilitar_js?'INHABILITAR':'SI'):'NO'}
        esta-inhabilitada={props.feedback?.inhabilitada?'SI':'NO'}
    >
        <EncabezadoDespliegue 
            casillero={pregunta} 
            leer={!pregunta.despliegue?.includes('no_leer')}  
            tieneValor={tieneValor}
            feedback={props.feedback}
            forPk={props.forPk}
        />
        <div className="casilleros">{
            pregunta.tipovar=="si_no"?<Grid container>
                <SiNoDespliegue 
                    casilleroConOpciones={pregunta} 
                    forPk={props.forPk} 
                    valorActual={props.valorActual}
                />
            </Grid>:
            pregunta.tipovar=="opciones" ?
                <OpcionesDespliegue 
                    casilleroConOpciones={pregunta} 
                    forPk={props.forPk} 
                    valorActual={props.valorActual}
                    leer={!!pregunta.despliegue?.includes('si_leer')}
                    horizontal={!!pregunta.despliegue?.includes('horizontal')}
                />:
            pregunta.tipovar==null?
                (pregunta.casilleros as OpcionMultiple[]).map((opcionMultiple)=>
                    <OpcionMultipleDespliegue
                        key={opcionMultiple.casillero} 
                        opcionM={opcionMultiple} 
                        forPk={props.forPk} 
                        valorActual={props.respuestas?.[opcionMultiple.var_name]!}
                        feedback={props.feedbackRow?.[opcionMultiple.var_name]!}
                    />
                )
            :
            ((preguntaSimple:PreguntaSimple)=>
                <Campo
                    disabled={preguntaSimple.despliegue?.includes('calculada')?true:false}
                    pregunta={preguntaSimple}
                    valor={props.valorActual}
                    onChange={(nuevoValor)=>
                        dispatch(dispatchers.REGISTRAR_RESPUESTA({forPk:props.forPk, variable:preguntaSimple.var_name, respuesta:nuevoValor}))
                    }
                />
            )(pregunta)
        }</div>
    </div>
}

function FiltroDespliegue(props:{filtro:Filtro, forPk:ForPk}){
    var {filtro} = props;
    return <Paper>
        <DespliegueEncabezado casillero={filtro}/>
    </Paper>
}

function ConsistenciaDespliegue(props:{casillero:Consistencia, forPk:ForPk}){
    var {casillero, forPk} = props;
    var habilitador = casillero.expresion_habilitar_js?getFuncionHabilitar(casillero.expresion_habilitar_js):()=>true;
    var {respuestas, modoDespliegue} = useSelectorVivienda(forPk);
    var habilitado = habilitador(respuestas);
    return habilitado || modoDespliegue=='metadatos'?<div 
        className="consistencia" 
    >
        <EncabezadoDespliegue casillero={casillero} leer={false} forPk={forPk}/>
    </div>:null
}

function BotonFormularioDespliegue(props:{casillero:BotonFormulario, formulario:Formulario, forPk:ForPk}){
    var {casillero, forPk} = props;
    var habilitador = casillero.expresion_habilitar_js?getFuncionHabilitar(casillero.expresion_habilitar_js):()=>true;
    var {respuestas, opciones} = useSelectorVivienda(forPk);
    var idFormularioDestino = 'F:'+casillero.salto! as IdFormulario;
    var {soloLectura, formularioAAbrir,feedbackRowValidator} = useSelector((state:CasoState)=>({
        soloLectura:state.datos.soloLectura, 
        formularioAAbrir:state.estructura.formularios[idFormularioDestino].casilleros,
        feedbackRowValidator: state.feedbackRowValidator
    }));
    var habilitado = habilitador(respuestas);
    var dispatch = useDispatch();
    var [confirmarForzarIr, setConfirmarForzarIr] = useState<number|boolean|null>(null);
    var multipleFormularios=formularioAAbrir.unidad_analisis != props.formulario.unidad_analisis;
    type DefinicionFormularioAbrir={num:number, actual:boolean, previo:boolean} | {num:number, actual:boolean, previo:false, esAgregar:true} | {num:false, actual:boolean, previo:true, unico:true};
    var listaDeBotonesAbrir:DefinicionFormularioAbrir[]
    var nuevoCampoPk = defOperativo.defUA[formularioAAbrir.unidad_analisis].pk;
    var numActual:number|null = null;
    if(multipleFormularios){
        let cantForm = respuestas[formularioAAbrir.unidad_analisis].length;
        listaDeBotonesAbrir = serie({from:1, to:cantForm}).map(num=>{
            let forPk={...props.forPk, formulario:idFormularioDestino, [nuevoCampoPk]:num};
            let resumen = feedbackRowValidator[toPlainForPk(forPk)]?.resumen || 'vacio';
            if(numActual == null && (resumen == 'vacio' || resumen == 'incompleto')){
                numActual = num;
            }
            return {resumen, num, actual: numActual == num, previo: numActual == null}
        });
        if("puede agregar //TODO VER ESTO"){
            listaDeBotonesAbrir.push({num:cantForm+1, esAgregar:true, actual:numActual == null, previo: false});
        }
    }else{
        let resumen = feedbackRowValidator[toPlainForPk(props.forPk)]?.resumen || 'vacio';
        listaDeBotonesAbrir = [{num:false, unico:true, actual:resumen == 'vacio' || resumen == 'incompleto', previo:true}]
    }
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
                if('esAgregar' in defBoton){
                    dispatch(dispatchers.AGREGAR_FORMULARIO({forPk:nuevaForPk}));        
                }
            }
            dispatch(dispatchers.CAMBIAR_FORMULARIO({forPk:nuevaForPk, apilarVuelta:true}));
        }
        if(confirmarForzarIr){setConfirmarForzarIr(false)}
    };

    return listaDeBotonesAbrir.map((defBoton:DefinicionFormularioAbrir)=>(
        <div 
            className="seccion-boton-formulario" 
            nuestro-validator={defBoton.actual?'actual':defBoton.previo?'valida':'todavia_no'}
            esta-inhabilitada={!habilitado && !defBoton.previo && !defBoton.actual?'SI':'NO'}
            ocultar-salteada={casillero.despliegue?.includes('ocultar')?(casillero.expresion_habilitar_js?'INHABILITAR':'SI'):'NO'}
            tiene-valor="NO"
        >
            <div className="aclaracion">{casillero.aclaracion}</div>
            <div key={defBoton.num.toString()}>
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={()=>{
                        if(habilitado && (defBoton.actual || defBoton.previo)) ir(defBoton); 
                        else setConfirmarForzarIr(defBoton.num);
                    }}
                >   {'esAgregar' in defBoton?'':casillero.nombre + ' ' + defBoton.num||''}
                    {'esAgregar' in defBoton?<ICON.Add/>:casillero.salto?<ICON.Forward/>:<ICON.ExitToApp/>}
                </Button>
                {'esAgregar' in defBoton?<> <span>  </span> <Button
                    variant="outlined"
                    color="inherit"
                    onClick={()=>{
                    }}
                ><ICON.Check/></Button></>:null}
                <Dialog 
                    className="nuestro-dialogo"
                    open={confirmarForzarIr == defBoton.num}
                    onClose={()=>setConfirmarForzarIr(null)}
                >
                    <div className="nuestro-dialogo">
                        <Typography>No se puede avanzar al siguiente formulario.</Typography>
                        <Typography>Quizás no terminó de contestar las preguntas correspondientes</Typography>
                        <Typography>Quizás no corresponde en base a las respuestas obtenidas</Typography>
                    </div>
                    <Button color="secondary" onClick={()=>ir(defBoton)}>forzar</Button>
                    <Button color="primary" variant="contained" onClick={()=>setConfirmarForzarIr(null)}>Entendido</Button>
                </Dialog>
            </div>
        </div>
    ))
}

function CasilleroDesconocido(props:{casillero:CasilleroBase}){
    var classes = useStyles();
    return <Paper className={classes.errorCasillero}>
        <Typography>Tipo de casillero no implementado: "{props.casillero.tipoc}" para "{props.casillero.casillero}"</Typography>
        <DespliegueEncabezado casillero={props.casillero}/>
    </Paper>
}

function useSelectorVivienda(forPk:ForPk){
    return useSelector((state:CasoState)=>{
        var respuestasVivienda=state.datos.hdr[forPk.vivienda].respuestas;
        var dirty=state.datos.hdr[forPk.vivienda].dirty;
        var {respuestas} = respuestasForPk(state, forPk)
        return {
            dirty,
            respuestas,
            feedbackRow: state.feedbackRowValidator[toPlainForPk(forPk)].feedback,
            actual: state.feedbackRowValidator[toPlainForPk(forPk)].actual,
            completo: !state.feedbackRowValidator[toPlainForPk(forPk)].feedbackResumen.pendiente,
            resumen: state.feedbackRowValidator[toPlainForPk(forPk)].resumen,
            formulario: state.estructura.formularios[forPk.formulario].casilleros,
            modoDespliegue: state.modo.demo?state.opciones.modoDespliegue:'relevamiento',
            modo: state.modo,
            opciones: state.opciones,
        }
    })
}

function DesplegarContenidoInternoBloqueOFormulario(props:{bloqueOFormulario:Bloque|Formulario, formulario:Formulario, forPk:ForPk, multiple:boolean}){
    var {respuestas, feedbackRow} = useSelectorVivienda(props.forPk);
    return <div className="casilleros">{
        props.bloqueOFormulario.casilleros.map((casillero)=>
            <Grid key={casillero.casillero} item>
                {
                    casillero.tipoc == "P"?
                        <PreguntaDespliegue 
                            pregunta={casillero} 
                            forPk={props.forPk} 
                            valorActual={casillero.var_name && respuestas[casillero.var_name] || null} 
                            respuestas={(!casillero.var_name || null) && respuestas}
                            feedback={casillero.var_name && feedbackRow[casillero.var_name] || null}
                            feedbackRow={!casillero.var_name && feedbackRow || null}
                        />:
                    casillero.tipoc == "B"?<BloqueDespliegue bloque={casillero} formulario={props.formulario} forPk={props.forPk}/>:
                    casillero.tipoc == "FILTRO"?<FiltroDespliegue filtro={casillero} forPk={props.forPk}/>:
                    casillero.tipoc == "BF"?<BotonFormularioDespliegue casillero={casillero} formulario={props.formulario} forPk={props.forPk}/>:
                    casillero.tipoc == "CONS"?<ConsistenciaDespliegue casillero={casillero} forPk={props.forPk}/>:
                    <CasilleroDesconocido casillero={casillero}/>
                }
            </Grid>
        )
    }</div>
}

function BloqueDespliegue(props:{bloque:Bloque, formulario:Formulario, forPk:ForPk}){
    var {bloque, forPk} = props;
    var key=bloque.ver_id!='-' && bloque.ver_id || bloque.casillero;
    var activeStep=0;
    var multiple = !!bloque.unidad_analisis;
    var lista = [{forPk, key:0, multiple:false}];
    var habilitador = bloque.expresion_habilitar_js?getFuncionHabilitar(bloque.expresion_habilitar_js):()=>true;
    var {respuestas, modoDespliegue} = useSelectorVivienda(forPk);
    if(multiple){
        // TODO: GENERALIZAR
        // @ts-ignore 
        lista=respuestas.personas.map((_persona, i)=>(
            {forPk:{...forPk, persona:i+1}, key:i+1, multiple:true}
        ))
    }
    var habilitado = habilitador(respuestas);
    return habilitado || modoDespliegue=='metadatos'?<div className="bloque" nuestro-bloque={bloque.casillero} es-multiple={multiple?'SI':'NO'}>
        <EncabezadoDespliegue casillero={bloque} forPk={forPk}/>
        {lista.map(({key, forPk, multiple})=>
            <DesplegarContenidoInternoBloqueOFormulario key={key} bloqueOFormulario={bloque} formulario={props.formulario} forPk={forPk} multiple={multiple}/>
        )}
    </div>:null;
}

const FormularioEncabezado = DespliegueEncabezado;

function BarraDeNavegacion(props:{forPk:ForPk, soloLectura:boolean}){
    const dispatch = useDispatch();
    const forPk = props.forPk;
    const {respuestas, dirty, opciones} = useSelectorVivienda(forPk);
    const [confirmaCerrar, setConfirmaCerrar] = useState<boolean|null>(false);
    const [mensajeDescarga, setMensajeDescarga] = useState<string|null>(null);
    const [descargaCompleta, setDescargaCompleta] = useState<boolean|null>(false);
    const [descargando, setDescargando] = useState<boolean|null>(false);
    var botonesFormulario=[
        {que: 'hdr'    , abr:'HdR', label:'hoja de ruta'},
    ]
    if(opciones.pilaForPk.length && !opciones.modoDirecto){
        botonesFormulario.push({que: 'volver' , abr:'<=',  label:'<='          })
    }
    return <>
        <ButtonGroup className="barra-navegacion" solo-lectura={props.soloLectura?'si':'no'} >
            {botonesFormulario.map(b=>
                <Button color={b.que==forPk.formulario?"primary":"inherit"} variant="outlined"
                    disabled={false}
                    onClick={()=>
                        dispatch(
                            b.que=='hdr'?dispatchers.VOLVER_HDR({}):
                            dispatchers.VOLVER_DE_FORMULARIO({})
                        )
                    }
                >
                    <span className="abr">{b.abr}</span>
                    <span className="label">{b.label}</span>
                </Button>
            )}
        </ButtonGroup>
        {props.soloLectura?<Typography component="span" style={{margin:'0 10px'}}> (Solo Lectura) </Typography>:null}
        {props.modoDirecto?
            <>
                <ButtonGroup style={{margin:'0 0 0 30px'}}>
                    <Button
                        color="inherit"
                        variant="outlined"
                        onClick={async ()=>{
                            if(props.soloLectura || !dirty){
                                close();
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
                                    close()
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
                    {!props.soloLectura?
                        <>
                            <Button
                                color="inherit"
                                variant="outlined"
                                onClick={async ()=>{
                                    setMensajeDescarga('descargando, por favor espere...');
                                    setDescargando(true);
                                    var message = await saveSurvey();
                                    setDescargando(false);
                                    if(message=='encuesta guardada'){
                                        setDescargaCompleta(true);
                                        message+=', cerrando pestaña...';
                                        setTimeout(function(){
                                            close()
                                        }, 2000)
                                    }
                                    setMensajeDescarga(message)
                                }}
                            >
                                <ICON.Save/>
                            </Button>
                            <Dialog
                                open={!!mensajeDescarga}
                                //hace que no se cierre el mensaje
                                onClose={()=>setMensajeDescarga(mensajeDescarga)}
                                aria-labelledby="alert-dialog-title"
                                aria-describedby="alert-dialog-description"
                            >
                                <DialogTitle id="alert-dialog-title">Información de descarga</DialogTitle>
                                <DialogContent>
                                    <DialogContentText id="alert-dialog-description">
                                        {mensajeDescarga}{descargando?<CircularProgress />:null}
                                    </DialogContentText>
                                </DialogContent>
                                <DialogActions>
                                    {descargando?
                                        null
                                    :
                                        <Button 
                                            onClick={()=>{
                                                if(descargaCompleta){
                                                    close()
                                                }else{
                                                    setMensajeDescarga(null)
                                                }
                                            }} 
                                            color="primary" 
                                            variant="contained"
                                        >
                                            Cerrar
                                        </Button>
                                    }
                                </DialogActions>
                            </Dialog>
                        </>
                    :null}
                </ButtonGroup>
                <Typography component="span" style={{margin:'0 10px'}}> vivienda {props.forPk.vivienda} </Typography>
            </>
        :null}        
        
    </>
}

function FormularioDespliegue(props:{forPk:ForPk}){
    var forPk = props.forPk;
    var {formulario, modoDespliegue, modo, actual, completo, opciones, g1, tipo_seleccion, tipo_relevamiento} 
        = useSelectorVivienda(props.forPk);
    var {soloLectura} = useSelector((state:CasoState)=>({soloLectura:state.datos.soloLectura}));
    const dispatch = useDispatch();
    useEffect(() => {
        if(actual){
            focusToId(actual, {moveToElement:true, moveBehavior:'smooth'});            
        }else if(completo && forPk.formulario!=('F:F2' as IdFormulario)){ // TODO generalizar los que van siempre arriba
            scrollToBottom()
        }else{
            scrollToTop()
        }
    }, [formulario]);
    var listaModos:ModoDespliegue[]=['metadatos','relevamiento','PDF'];
    return (
        <>
            <AppBar position="fixed" color={soloLectura?'secondary':'primary'}>
                <Toolbar>
                    <BarraDeNavegacion forPk={forPk} soloLectura={soloLectura || false}/>
                </Toolbar>
            </AppBar>
            <main nuestro-g1={g1} nuestro-seleccion={tipo_seleccion} nuestro-relevamiento={tipo_relevamiento}>
                <Paper className="formulario" modo-despliegue={modoDespliegue}>
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
                    <FormularioEncabezado casillero={formulario}/>
                    <DesplegarContenidoInternoBloqueOFormulario bloqueOFormulario={formulario} formulario={formulario} forPk={forPk} multiple={false}/>
                </Paper>
                <div className='espacio-final-formulario'></div>
            </main>
        </>
    );
}

export function Atributo(props:{nombre:string, valor:string|null}){
    return props.valor!=null && props.valor!=''?<span className="atributo-par">
        {props.nombre?<span className="atributo-nombre">{props.nombre}</span>:null}
         <span className="atributo-valor">{props.valor}</span>
    </span>:null
}

const listaEstadosCarga:EstadoCarga[]=['resumen','relevamiento','recibo'];
var resumidores = [
    {nombre:'REA'         , f:(dv:DatosVivienda)=>dv.resumenEstado=="ok"          },
    {nombre:'Cita pactada', f:(dv:DatosVivienda)=>dv.resumenEstado=="cita pactada"},
    {nombre:'Pendientes'  , f:(dv:DatosVivienda)=>dv.resumenEstado=="vacio"       },
];

resumidores.push(
    {nombre:'Otros', f:resumidores.reduce((g,r)=>(dv=>!r.f(dv) && g(dv) ),(_:DatosVivienda)=>true) }
)


export function DesplegarCarga(props:{
    carga:Carga, 
    idCarga:IdCarga, 
    posicion:number,
    hdr:VivendasHdR, 
    mainForm:IdFormulario, 
    feedbackRowValidator:{
        [formulario in PlainForPk]:FormStructureState<IdVariable,IdFin> 
    }
}){
    const {carga, idCarga, hdr, mainForm, feedbackRowValidator} = props;
    const etiquetas = likeAr(hdr).map((datosVivienda:DatosVivienda)=>datosVivienda.respuestas[c5]).array() as (string|null)[];
    const dispatch = useDispatch();
    const [desplegarEtiquetasRepetidas, setDesplegarEtiquetasRepetidas] = useState<boolean>(false);
    const etiquetaRepetida = (etiquetas:(string|null)[], etiqueta:string)=>{
        return etiquetas.filter((e)=>e==etiqueta).length > 1
    }
    const buscarCasosEnHdrParaEtiqueta = (hdr:VivendasHdR, etiqueta:string, etiquetaVarname:IdVariable, casoActual:IdCaso)=>{
        return likeAr(hdr)
            .filter((datosVivienda:DatosVivienda, idCaso:IdCaso)=>datosVivienda.respuestas[etiquetaVarname]==etiqueta)
            .map((_datosVivienda:DatosVivienda,idCaso:IdCaso)=>idCaso)
            .array()
    }
    return <Paper className="carga">
        <div className="informacion-carga">
            <div className="carga">Área: {idCarga}</div>
            <div className="observaciones">{carga.observaciones}</div>
        </div>
        <div className="informacion-carga">
            <div className="fecha">{carga.fecha}</div>
            <ButtonGroup>
            {listaEstadosCarga.map(estado_carga=>
                <Button key={estado_carga} variant={estado_carga==carga.estado_carga?"contained":"outlined"} onClick={
                    ()=>dispatch(dispatchers.ESTADO_CARGA({idCarga, estado_carga}))
                }>{estado_carga}</Button>
            )}
            </ButtonGroup>
        </div>
        {carga.estado_carga==null && !props.posicion || carga.estado_carga=='relevamiento'?
        <Table className="tabla-carga-hoja-de-ruta">
            <colgroup>
                <col style={{width:"15%"}}/>
                <col style={{width:"70%"}}/>
                <col style={{width:"15%"}}/>
            </colgroup>
            <TableHead style={{fontSize: "1.2rem"}}>
                <TableRow className="tr-carga">
                    <TableCell>enc</TableCell>
                    <TableCell>domicilio</TableCell>
                    <TableCell>form</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {likeAr(hdr).filter((datosVivienda:DatosVivienda, idCaso:IdCaso)=>datosVivienda.tem.carga==idCarga).map((datosVivienda: DatosVivienda, idCaso: IdCaso)=>
                    <TableRow key={idCaso}>
                        <TableCell>
                            {idCaso}
                        </TableCell>
                        <TableCell>
                            <DesplegarTem tem={datosVivienda.tem}/>
                            {datosVivienda.resumenEstado=="cita pactada"?
                                <DesplegarCitaPactada respuestas={datosVivienda.respuestas}/>
                            :
                                <DesplegarCitaPactadaYSeleccionadoAnteriorTem tem={datosVivienda.tem}/>
                            }
                            <DesplegarNotasYVisitas tareas={datosVivienda.tareas} visitas={datosVivienda.visitas} idCaso={idCaso}/>
                        </TableCell>
                        <TableCell>
                            {likeAr(datosVivienda.tareas).map((tarea, idTarea)=>
                                <Button
                                    key={idTarea}
                                    size="small"
                                    resumen-vivienda={datosVivienda.resumenEstado}
                                    variant="outlined"
                                    onClick={()=>{
                                        ////////////////// OJOJOJOJO sacar el formulario de la tabla de tareas GENERALIZAR TODO
                                        dispatch(dispatchers.CAMBIAR_FORMULARIO({forPk:{vivienda:idCaso, formulario:'F:RE' as IdFormulario}, apilarVuelta:false}))
                                    }}
                                >
                                    {'RE'}
                                </Button>
                            ).array()}
                        </TableCell>
                    </TableRow>
                ).array()}
            </TableBody>
        </Table>:carga.estado_carga=='recibo'?
        <Table className="tabla-carga-hoja-de-ruta">
            <colgroup>
                <col style={{width:"15%"}}/>
                <col style={{width:"15%"}}/>
                <col style={{width:"70%"}}/>
            </colgroup>
            <TableHead style={{fontSize: "1.2rem"}}>
                <TableRow className="tr-carga">
                    <TableCell>muestra</TableCell>
                    <TableCell>documento</TableCell>
                    <TableCell>apellido y nombre</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {likeAr(hdr).filter((datosVivienda:DatosVivienda)=>datosVivienda.tem.carga==idCarga).map((datosVivienda: DatosVivienda, idCaso: IdCaso)=>
                    <TableRow key={idCaso}>
                        <TableCell>
                            {datosVivienda.respuestas[c5]}
                        </TableCell>
                        <TableCell>
                            {datosVivienda.respuestas[e7]}
                        </TableCell>
                        <TableCell>
                            {datosVivienda.respuestas[e1]}, 
                            {datosVivienda.respuestas[e2]}
                        </TableCell>
                    </TableRow>
                ).array()}
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
            <TableBody>
                <TableRow>
                    {resumidores.map((resumidor: typeof resumidores[0], i:number)=>
                        <TableCell key={i}>
                            {likeAr(hdr).array()
                                .filter((datosVivienda:DatosVivienda)=>datosVivienda.tem.carga==idCarga)
                                .reduce((count, datosVivienda: DatosVivienda)=>count+(resumidor.f(datosVivienda)?1:0),0)
                            }
                        </TableCell>
                    )}
                </TableRow>
            </TableBody>
        </Table>
        }
    </Paper>
}
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
            <Atributo nombre="suplente" valor={tem.prioridad==2?'!':tem.prioridad>2?tem.prioridad-1+'':null}/>
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

export function DesplegarNotasYVisitas(props:{tareas:Tareas, idCaso:IdCaso, visitas:Visita[]}){
    const {tareas, visitas, idCaso} = props;
    const {miIdPer} = useSelector((state:CasoState)=>({miIdPer:state.datos.idper}));
    const [dialogoNotas, setDialogoNotas] = useState<boolean>(false);
    const [nota, setNota] = useState<string|null>(null);
    const [editando, setEditando] = useState<number|null>(null);
    const [adding, setAdding] = useState<number|null>(null);
    const [miTarea, setMiTarea] = useState<IdTarea|null>(null);
    const [titulo, setTitulo] = useState<string|null>(null);
    const handleCloseDialogNotas = ()=>{
        setDialogoNotas(false);
        setAdding(null);
    }
    var dispatch = useDispatch();
    var obsTitle = <Grid item xs={2} sm={4} >
        observaciones
    </Grid>
    return <div className="tareas-notas">
        <div className="notas"><h4>Notas y visitas</h4></div>
        {likeAr(tareas).map((tarea)=>
            <div className="nota">
                <span>{tarea.tarea + ":"}</span><span>{tarea.notas?tarea.notas:'-'}</span>
                <Button
                    size="small"
                    variant="outlined"
                    onClick={()=>{
                        setNota(tarea.notas)
                        setMiTarea(tarea.tarea)
                        setDialogoNotas(true)
                        setTitulo(`Vivienda  ${idCaso} - tarea "${tarea.tarea}"`)
                    }}
                >
                    <ICON.Create/>
                </Button>
                <Dialog
                    open={dialogoNotas}
                    onClose={handleCloseDialogNotas}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                    className="dialogo-notas"
                >
                    <DialogTitle id="alert-dialog-title-obs">{titulo}</DialogTitle>
                    <DialogContent>
                        <div className="notas">
                            <TextField 
                                fullWidth={true}
                                value={nota || ''} 
                                label="Notas"
                                type="text"
                                onChange={(event)=>{
                                    let value = event.target.value || null;
                                    setNota(value)
                                    miTarea!=null && dispatch(dispatchers.REGISTRAR_NOTA({
                                        vivienda:idCaso,
                                        tarea: miTarea,
                                        nota: value
                                    }));
                                }}
                            />
                        </div>
                        <Grid container spacing={1} className="visitas" style={{marginTop:"20px"}}>
                            <Grid item xs={2} sm={1}>
                                vis
                            </Grid>
                            <Grid item xs={5} sm={3}>
                                fecha
                            </Grid>
                            <Grid item xs={3} sm={2}>
                                hora
                            </Grid>
                            <Hidden only="xs">
                                {obsTitle}
                            </Hidden>
                            <Grid item xs={2} sm={2}>
                                <Button disabled={editando!=null} onClick={()=>{
                                    dispatch(dispatchers.AGREGAR_VISITA({
                                        vivienda:idCaso,
                                        observaciones: null
                                    }));
                                    setAdding(visitas.length-1);
                                }} color="primary" variant="outlined">
                                    <ICON.Add/>
                                </Button>
                            </Grid>
                            {visitas? //por si ya hay algo sincronizado
                                visitas.map((visita, index)=>
                                    <Grow in={true}>
                                        <Grid container spacing={1} key={"visita_" + index.toString()} style={{marginTop:"20px"}}>
                                            <Grid item xs={2} sm={1}>
                                                {(index + 1).toString()}
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                {miIdPer==visita.idper?
                                                    <TextField
                                                        value={visita.fecha || ''} 
                                                        fullWidth={true}
                                                        type="date"
                                                        onFocus={()=>setEditando(index)}
                                                        onBlur={()=>setEditando(null)}
                                                        onChange={(event)=>{
                                                            let value = event.target.value || null;
                                                            dispatch(dispatchers.MODIFICAR_VISITA({
                                                                vivienda:idCaso,
                                                                index,
                                                                opcion:"fecha",
                                                                valor: value
                                                            }));
                                                        }}
                                                    />
                                                :
                                                    visita.fecha
                                                }
                                            </Grid>
                                            <Grid item xs={4} sm={2}>
                                                {miIdPer==visita.idper?
                                                    <TextField 
                                                        fullWidth={true}
                                                        value={visita.hora || ''} 
                                                        type="time"
                                                        onFocus={()=>setEditando(index)}
                                                        onBlur={()=>setEditando(null)}
                                                        onChange={(event)=>{
                                                            let value = event.target.value || null;
                                                            dispatch(dispatchers.MODIFICAR_VISITA({
                                                                vivienda:idCaso,
                                                                index,
                                                                opcion:"hora",
                                                                valor: value
                                                            }));
                                                        }}
                                                    />
                                                :
                                                    visita.hora
                                                }
                                            </Grid>
                                            <Grid item xs={10} sm={4}>
                                                {miIdPer==visita.idper?
                                                    <div className="campo" nuestra-longitud="full">
                                                        <div className="input-campo">
                                                            <TextField 
                                                                fullWidth={true}
                                                                autoFocus={adding==index}
                                                                value={visita.observaciones || ''} 
                                                                type="text"
                                                                multiline
                                                                onFocus={()=>setEditando(index)}
                                                                onBlur={()=>setEditando(null)}
                                                                onChange={(event)=>{
                                                                    let value = event.target.value || null;
                                                                    dispatch(dispatchers.MODIFICAR_VISITA({
                                                                        vivienda:idCaso,
                                                                        index,
                                                                        opcion:"observaciones",
                                                                        valor: value
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="boton-confirmar-campo">
                                                            <Button 
                                                                variant={editando==index?"contained":'outlined'}
                                                                size="small" 
                                                                color={editando==index?'primary':'default'}>
                                                                <ICON.Check/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                :
                                                    visita.observaciones
                                                }
                                            </Grid>
                                            <Grid item xs={2} sm={2}>
                                                {miIdPer==visita.idper?
                                                    <Button
                                                        disabled={editando!=null}
                                                        size="small"
                                                        variant="outlined"
                                                        color="secondary"
                                                        onClick={()=>{
                                                            dispatch(dispatchers.BORRAR_VISITA({vivienda:idCaso, index: index}))
                                                        }}
                                                    >
                                                        <ICON.DeleteOutline/>
                                                    </Button>
                                                :
                                                    null
                                                }
                                                
                                            </Grid>
                                        </Grid>
                                    </Grow>
                                )
                            :
                                null
                            }
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialogNotas} color="primary" variant="contained" disabled={editando!=null}>
                            OK
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        ).array()}
        
        

        
    </div>
}

export function HojaDeRutaDespliegue(){
    var {hdr, cargas, mainForm, modo, feedbackRowValidator, num_sincro} = useSelector((state:CasoState)=>({hdr:state.datos.hdr, cargas: state.datos.cargas, mainForm:state.estructura.mainForm, modo:state.modo, feedbackRowValidator:state.feedbackRowValidator, num_sincro:state.datos.num_sincro}));
    var dispatch = useDispatch();
    const updateOnlineStatus = function(){
        setOnline(window.navigator.onLine);
    }
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
                    <IconButton style={{marginTop:'3px'}}
                        color="inherit"
                        //onClick={/*dispatch que lleva a pantalla opciones*/}
                    >
                        <ICON.Settings/>
                    </IconButton>
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
                    <div>{my.getLocalVar('app-version')} - sincro {num_sincro}</div>
                </div>
                {likeAr(cargas).map((carga: Carga, idCarga: IdCarga, _, posicion:number)=>
                    <DesplegarCarga key={idCarga} carga={carga} idCarga={idCarga} posicion={posicion} hdr={hdr} mainForm={mainForm} feedbackRowValidator={feedbackRowValidator}/>
                ).array()}
            </div>
        </>
    );
}

export function ListaTextos(props:{textos:string[]}){
    return <ul>
        {props.textos.map(t=><li><Typography>{t}</Typography></li>)}
    </ul>;
}

export function BienvenidaDespliegue(props:{modo:CasoState["modo"]}){
    var dispatch=useDispatch();
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

export function ConsultaResultados(){
    var [etiqueta, setEtiqueta] = useState<string|null>(null);
    var [etiquetaValida, setEtiquetaValida] = useState<boolean>(false);
    var [documento, setDocumento] = useState<string|null>(null);
    var [resultadoConsulta, setResultadoConsulta] = useState<string|null>(null);
    var imageStyles = {
        height: '32px',
        verticalAlign: 'bottom',
        marginRight: '10px'
    }
    return <>
        <AppBar position="fixed" color='primary'>
            <Toolbar>
                <img style={imageStyles}src="./img/logos-gcbs-blanco-150x57.png"/>
                <img style={imageStyles}src="./img/img-logo-dgeyc_blanco.png"/>
                <Typography variant="h6">
                    Ver resultado
                </Typography>
            </Toolbar>
        </AppBar>
        <main>
            <Paper className="formulario-consulta-resultados">
                <Typography variant="h6">
                    Ingrese etiqueta y numero de documento
                </Typography>
                <Grid container className="fields-container">
                    <TextField 
                        autoFocus={true}
                        error={!!etiqueta && !etiquetaValida}
                        helperText={!!etiqueta && !etiquetaValida?"Numero de etiqueta incorrecto":null}
                        fullWidth={true}
                        value={etiqueta || ''} 
                        label="Etiqueta"
                        type="text"
                        onChange={(event)=>{
                            setEtiquetaValida(true);
                            let value = event.target.value || null;
                            if(value){
                                value = value.replace(/[\+\*\.# _\/,]/g,'-');
                                if(!/-/.test(value) && value.length>4){
                                    value=value.substr(0,4)+'-'+value.substr(4);
                                }
                            }
                            setEtiqueta(value)
                        }}
                        onBlur={(_event)=>{
                            setEtiquetaValida(controlarCodigoDV2(etiqueta||''));
                        }}
                    />
                    <TextField 
                        fullWidth={true}
                        label="N° documento"
                        type="tel"
                        value={documento || null}
                        onChange={(event)=>{
                            let value = event.target.value || null;
                            setDocumento(value)
                            
                        }}
                    />
                 </Grid>
                <Button 
                    variant="contained"
                    color="primary"
                    disabled={!(etiqueta && documento)}
                    onClick={async ()=>{
                        //ts-ignore Si el botón está habilitado existen la etiqueta y el documento
                        setResultadoConsulta('buscando...')
                        let result = await consultarEtiqueta(etiqueta!, documento!);
                        setResultadoConsulta(result)
                    }}
                >
                    Consultar
                </Button>
                <div className='espacio-final-formulario'>
                    {resultadoConsulta?.split(/\r?\n|%0A/).map(parrafo=>
                        <p>{parrafo}</p>
                    )}
                </div>
            </Paper>
            
        </main>
    </>
}

export async function desplegarFormularioActual(opts:{modoDemo:boolean, useSessionStorage?:boolean}){
    // traer los metadatos en una "estructura"
    // traer los datos de localStorage
    // verificar el main Layout
    const store = await dmTraerDatosFormulario(opts)
    ReactDOM.render(
        <RenderPrincipal store={store} dispatchers={dispatchers} mensajeRetorno="Volver a la hoja de ruta">
            <OpenedTabs/>
            <AppDmEncu/>
        </RenderPrincipal>,
        document.getElementById('main_layout')
    )
}

export async function desplegarFormularioConsultaResultados(){
    ReactDOM.render(
        <ConsultaResultados/>,
        document.getElementById('main_layout')
    )
}

if(typeof window !== 'undefined'){
    // @ts-ignore para hacerlo
    window.desplegarFormularioActual = desplegarFormularioActual;
    // @ts-ignore para hacerlo
    window.desplegarFormularioConsultaResultados = desplegarFormularioConsultaResultados;
    // window.desplegarHojaDeRuta = desplegarHojaDeRuta;
}

//CONTROL DE PESTAÑAS
var allOpenedTabs:{[x:string]:number}={};
var infoOpenedTabs={
    allOpenedTabs,
    myId:'calculando...',
    otherTabsNames:''
}

function loadInstance(){
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

window.addEventListener('load', function(){
    loadInstance()
})
//FIN CONTROL PESTAÑAS