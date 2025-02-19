import * as React from "react";
import * as ReactDOM from "react-dom";
import {useState, useEffect, useRef} from "react";
import { Provider, useSelector, useDispatch } from "react-redux"; 
import * as memoizeBadTyped from "memoize-one";
import * as likeAr from "like-ar";

//@ts-ignore el módulo memoize-one no tiene bien puesto los tipos en su .d.ts
export var memoize:typeof memoizeBadTyped.default = memoizeBadTyped;

import {gotoSincronizar} from "./redux-formulario"

import {
    AppBar, Badge, Button, ButtonGroup, Card, Chip, CircularProgress, CssBaseline, 
    Dialog, DialogActions, DialogContent, DialogContentText, 
    DialogTitle, Divider, Fab, Grid, IconButton, InputBase, 
    List, ListItem, ListItemIcon, ListItemText, Drawer, 
    Menu, MenuItem, Paper, SvgIcon, Switch, 
    Table, TableBody, TableCell, TableHead, TableRow, TextField, ThemeProvider, Toolbar, Typography, Zoom,
    useScrollTrigger,
    // styles:
    createStyles, Theme, createTheme
} from "@mui/material";
import { Store, Action } from "redux";
import { TipoVariables } from "./tipos";

// https://material-ui.com/components/material-icons/
export const materialIoIconsSvgPath={
    Add:"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    ArrowBack:"M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
    Assignment: "M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
    Check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    CheckBoxOutlineBlankOutlined: "M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
    CheckBoxOutlined: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17.99 9l-1.41-1.42-6.59 6.59-2.58-2.57-1.42 1.41 4 3.99z",
    ChevronLeft: "M14.71 6.71a.9959.9959 0 00-1.41 0L8.71 11.3c-.39.39-.39 1.02 0 1.41l4.59 4.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L10.83 12l3.88-3.88c.39-.39.38-1.03 0-1.41z",
    ChevronRight: "M9.29 6.71c-.39.39-.39 1.02 0 1.41L13.17 12l-3.88 3.88c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l4.59-4.59c.39-.39.39-1.02 0-1.41L10.7 6.7c-.38-.38-1.02-.38-1.41.01z",
    Clear: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    Close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    Code: "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
    Create: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    Delete:"M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
    DeleteForever:"M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z",
    DeleteOutline:"M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4z",
    Description: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    EmojiObjects: "M12 3c-.46 0-.93.04-1.4.14-2.76.53-4.96 2.76-5.48 5.52-.48 2.61.48 5.01 2.22 6.56.43.38.66.91.66 1.47V19c0 1.1.9 2 2 2h.28c.35.6.98 1 1.72 1s1.38-.4 1.72-1H14c1.1 0 2-.9 2-2v-2.31c0-.55.22-1.09.64-1.46C18.09 13.95 19 12.08 19 10c0-3.87-3.13-7-7-7zm2 16h-4v-1h4v1zm0-2h-4v-1h4v1zm-1.5-5.59V14h-1v-2.59L9.67 9.59l.71-.71L12 10.5l1.62-1.62.71.71-1.83 1.82z",
    ExitToApp: "M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
    ExpandLess: "M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z",
    ExpandMore: "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z",
    FormatLineSpacing: "M6 7h2.5L5 3.5 1.5 7H4v10H1.5L5 20.5 8.5 17H6V7zm4-2v2h12V5H10zm0 14h12v-2H10v2zm0-6h12v-2H10v2z",
    Forward: "M12 8V4l8 8-8 8v-4H4V8z",
    ForwardOutlined: "M14 8.83L17.17 12 14 15.17V14H6v-4h8V8.83M12 4v4H4v8h8v4l8-8-8-8z",
    Info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
    KeyboardArrowUp: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
    KeyboardArrowDown: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z",
    Label: "M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z",
    LocalAtm: "M11 17h2v-1h1c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1h-3v-1h4V8h-2V7h-2v1h-1c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3v1H9v2h2v1zm9-13H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V6h16v12z",
    Location: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5",
    Menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
    Navigation: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
    NavigationDown: "M12 22L4.5 3.71l.71 -.71L12 6l6.79 -3 .71 .71z",
    RemoveShoppingCart: "M22.73 22.73L2.77 2.77 2 2l-.73-.73L0 2.54l4.39 4.39 2.21 4.66-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h7.46l1.38 1.38c-.5.36-.83.95-.83 1.62 0 1.1.89 2 1.99 2 .67 0 1.26-.33 1.62-.84L21.46 24l1.27-1.27zM7.42 15c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h2.36l2 2H7.42zm8.13-2c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H6.54l9.01 9zM7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2z",
    Save:"M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z",
    Search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    Send: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
    Settings: "M15.95 10.78c.03-.25.05-.51.05-.78s-.02-.53-.06-.78l1.69-1.32c.15-.12.19-.34.1-.51l-1.6-2.77c-.1-.18-.31-.24-.49-.18l-1.99.8c-.42-.32-.86-.58-1.35-.78L12 2.34c-.03-.2-.2-.34-.4-.34H8.4c-.2 0-.36.14-.39.34l-.3 2.12c-.49.2-.94.47-1.35.78l-1.99-.8c-.18-.07-.39 0-.49.18l-1.6 2.77c-.1.18-.06.39.1.51l1.69 1.32c-.04.25-.07.52-.07.78s.02.53.06.78L2.37 12.1c-.15.12-.19.34-.1.51l1.6 2.77c.1.18.31.24.49.18l1.99-.8c.42.32.86.58 1.35.78l.3 2.12c.04.2.2.34.4.34h3.2c.2 0 .37-.14.39-.34l.3-2.12c.49-.2.94-.47 1.35-.78l1.99.8c.18.07.39 0 .49-.18l1.6-2.77c.1-.18.06-.39-.1-.51l-1.67-1.32zM10 13c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z",
    SyncAlt:"M22 8l-4-4v3H3v2h15v3l4-4zM2 16l4 4v-3h15v-2H6v-3l-4 4z",
    TrendingFlat:"M22 12l-4-4v3H3v2h15v3z",
    Warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
}

export const ICON = likeAr(materialIoIconsSvgPath).map(svgText=> () =>
    <SvgIcon><path d={svgText}/></SvgIcon>
).plain();

export type Styles = React.CSSProperties;

export type OnUpdate<T> = (data:T)=>void

export type InputTypes = 'date'|'number'|'tel'|'text';

export function adaptarTipoVarCasillero(casilleroDataType:TipoVariables|'opciones'|'si_no'):InputTypes{
    const adapter:{[key in TipoVariables|'opciones'|'si_no']:InputTypes} = {
        'opciones':'number',
        'si_no': 'number',
        'numero': 'number',
        'hora': 'tel',
        'horas': 'number',
        'texto': 'text',
        'fecha': 'text'
    }
    return adapter[casilleroDataType]
}

export const scrollToTop = () => {
    window.scroll({behavior:'smooth', top:0, left:0})
};

export const scrollToBottom = () => {
    window.scroll({behavior:'smooth', top:document.body.clientHeight-window.innerHeight, left:0})
};


export function ScrollTop(props: any) {
    const { children } = props;
    //const classes = useStylesScrollTop();
    // Note that you normally won't need to set the window ref as useScrollTrigger
    // will default to window.
    // This is only being set here because the demo is in an iframe.
    const trigger = useScrollTrigger({
        disableHysteresis: true,
        threshold: 100,
    });
    return (
        <Zoom in={trigger}>
            <div onClick={scrollToTop} role="presentation" /*className={classes.root}*/>
                {children}
            </div>
        </Zoom>
    );
}

export type FocusOpts={
    moveToElement: boolean
    moveBehavior?: 'auto' | 'smooth'
}

export function focusToId(id:string, opts:FocusOpts, cb?:(e:HTMLElement)=>void){
    var element=document.getElementById(id);
    var padre=element;
    while(padre && padre.className!='pregunta' && padre!=document.body) padre = padre.parentElement;
    if(padre && padre.className=='pregunta') element=padre;
    if(element){
        if(cb){
            cb(element);
        }else{
            element.focus();
            if(opts.moveToElement){
                element.scrollIntoView();
                window.scroll({behavior:opts.moveBehavior||'auto', top:window.scrollY-100, left:0})
            }
        }
    }
}

export type IDispatchers = {RESET_OPCIONES:Function};

export function ReseterForm(props:{onTryAgain:()=>void, dispatchers:IDispatchers, mensaje:string}){
    const dispatch = useDispatch();
    return <>
        <Button variant="outlined"
            onClick={()=>{
                dispatch(props.dispatchers.RESET_OPCIONES({}));
                props.onTryAgain();
            }}
        >{props.mensaje}</Button>
    </>;
}

export class RenderAndCaptureError extends React.Component<
    {dispatchers:IDispatchers, mensajeRetorno:string},
    {hasError:boolean, error:Error|{}, info?:any}
>{
    constructor(props:any) {
        super(props);
        this.state = { hasError: false, error:{}};
    }
    componentDidCatch(error:Error, info:any){
        this.setState({ hasError: true , error, info });
    }
    render(){
        if(this.state.hasError){
            return <>
                <Typography>Hubo un problema en la programación de la pantalla.</Typography>
                <ReseterForm dispatchers={this.props.dispatchers} mensaje={this.props.mensajeRetorno} onTryAgain={()=>
                    this.setState({ hasError: false, error:{}})
                }/>
                <Button variant="outlined" color="secondary"
                    onClick={()=>{
                        gotoSincronizar();
                    }}
                >ir a la pantalla de sincronización</Button>
                <Typography>Error detectado:</Typography>
                <Typography>{this.state.error instanceof Error ? this.state.error.message : 'unknown error'}</Typography>
                <Typography>{JSON.stringify(this.state.info)}</Typography>
            </>;
        }
        return this.props.children;
    }
}

const theme = createTheme({
  overrides: {
    MuiCssBaseline: {
      '@global': {
        html: {
          WebkitFontSmoothing: 'auto',
        },
      },
    },
  },
});

export function RenderPrincipal<T,T2 extends Action>(props:{store:Store<T,T2>, dispatchers:IDispatchers, mensajeRetorno:string, children:React.ReactNode}){
    return <React.StrictMode>
        <Provider store={props.store}>
            <ThemeProvider theme={theme}>
                <RenderAndCaptureError dispatchers={props.dispatchers} mensajeRetorno={props.mensajeRetorno}>
                    <CssBaseline />
                    {props.children}
                </RenderAndCaptureError>
            </ThemeProvider>        
        </Provider>
    </React.StrictMode>
}

