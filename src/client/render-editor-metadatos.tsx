// Editor visual de metadatos (configurar → metadatos → editor visual, ver docs/editor-metadatos.md):
// el formulario como árbol en una "cancha"; se arrastran tipos de casillero o plantillas desde la paleta, se mueven
// casilleros y se eligen saltos arrastrando, se editan en el panel de propiedades y se ve el resultado con el renderizador
// de la encuesta. Tiene deshacer / rehacer, versiones guardadas y un modo borrador que no guarda hasta publicar.

import * as React from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as ReactDOM from "react-dom";
import {
    Alert, Autocomplete, Badge, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, Drawer, FormControl, FormControlLabel, IconButton, InputLabel, List, ListItem, ListItemText, MenuItem, Paper,
    ScopedCssBaseline, Select, Snackbar, Stack, SvgIcon, Switch, Tab, Tabs, TextField, ThemeProvider, Tooltip, Typography, alpha
} from "@mui/material";
import type { Theme } from "@mui/material";

import {
    aplicarOperacionLocal, buscarTipo, inversaDeOperacion, operacionesInversas, CambiosDeCasillero, CampoEditable, CasilleroEditable, DatosEditorMetadatos, descendientes,
    FUNCIONES_DE_EXPRESIONES, hijosDe, idQueTendria, NuevoCasillero, OperacionMetadatos, PLANTILLAS, PlantillaCasillero, Problema,
    problemasDelOperativo, proximoCodigo, puedeIncluir, subarbol, validarOperacion, variablesDesconocidas, variablesDelOperativo
} from "../unlogged/editor-metadatos-comun";
import type { Cargas, CasoState, DatosByPassPersistibles, Estructura, ForPkRaiz, IdEnc, InformacionHdr } from "../unlogged/tipos";
import { createLocalStorageFormRenderer } from "../unlogged/render-init";
import { desplegarFormularioActual } from "../unlogged/render-formulario";
import { crearTema } from "./render-tablero";

/* colores e íconos */

// color de cada tipo de casillero en la cancha y en la paleta
export const COLOR_DEL_TIPO: { [tipoc: string]: string } = {
    F: '#455A64', B: '#5E35B1', CP: '#3949AB', P: '#1E88E5', O: '#00897B', OM: '#43A047', FILTRO: '#F4511E',
    CONS: '#E53935', TEXTO: '#757575', BF: '#8E24AA', FIN: '#6D4C41', MATRIZ: '#00ACC1', PMATRIZ: '#039BE5', LIBRE: '#9E9D24',
};
function colorDelTipo(tipoc: string): string {
    return COLOR_DEL_TIPO[tipoc] ?? '#607D8B';
}

// íconos de material design (paths de 24x24) de cada tipo de casillero y de cada plantilla
export const ICONO_DEL_TIPO: { [tipoc: string]: string } = {
    F: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
    B: "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z",
    CP: "M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z",
    P: "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z",
    O: "M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z",
    OM: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17.99 9l-1.41-1.42-6.59 6.59-2.58-2.57-1.42 1.41 4 3.99z",
    FILTRO: "M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39c.51-.66.04-1.61-.79-1.61H5.04c-.83 0-1.3.95-.79 1.61z",
    CONS: "M16.59 7.58L10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z",
    TEXTO: "M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z",
    BF: "M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
    FIN: "M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z",
    MATRIZ: "M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z",
    PMATRIZ: "M3 14h4v-4H3v4zm0 5h4v-4H3v4zM3 9h4V5H3v4zm5 5h13v-4H8v4zm0 5h13v-4H8v4zM8 5v4h13V5H8z",
    LIBRE: "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
};
const ICONO_GENERICO = "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z";

export const ICONO_DE_PLANTILLA: { [plantilla: string]: string } = {
    si_no: "M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z",
    opciones: "M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z",
    numero: "M20 10V8h-4V4h-2v4h-4V4H8v4H4v2h4v4H4v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4h4zm-6 4h-4v-4h4v4z",
    texto: "M4 9h16v2H4zm0 4h10v2H4z",
    fecha: "M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z",
};

const ICONOS = {
    expandir: "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z",
    contraer: "M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z",
    arrastrar: "M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
    error: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
    aviso: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
    falta: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    ojo: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    cerrar: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    deshacer: "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z",
    rehacer: "M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z",
    historial: "M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z",
    salto: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z",
    agregar: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
};

function Icono(props: { path: string, color?: string }) {
    return <SvgIcon fontSize="small" sx={{ color: props.color }}><path d={props.path} /></SvgIcon>;
}

// cuadradito de color con el ícono del tipo (paleta, tarjetas de la cancha y panel)
function IconoDeTipo(props: { tipoc: string, path?: string, tamanio?: number }) {
    var tamanio = props.tamanio ?? 26;
    return <Box sx={{
        width: tamanio, height: tamanio, flexShrink: 0, borderRadius: '7px', bgcolor: colorDelTipo(props.tipoc), color: '#FFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
        <SvgIcon sx={{ fontSize: tamanio * 0.68 }}><path d={props.path ?? ICONO_DEL_TIPO[props.tipoc] ?? ICONO_GENERICO} /></SvgIcon>
    </Box>;
}

const COLOR_DE_GRAVEDAD: { [gravedad in Problema['gravedad']]: string } = { error: '#D32F2F', falta: '#ED6C02', aviso: '#F9A825' };
const ICONO_DE_GRAVEDAD: { [gravedad in Problema['gravedad']]: string } = { error: ICONOS.error, falta: ICONOS.falta, aviso: ICONOS.aviso };

function IconoDeProblema(props: { gravedad: Problema['gravedad'] }) {
    return <Icono path={ICONO_DE_GRAVEDAD[props.gravedad]} color={COLOR_DE_GRAVEDAD[props.gravedad]} />;
}

function peorGravedad(problemas: Problema[]): Problema['gravedad'] | null {
    return problemas.some(p => p.gravedad == 'error') ? 'error' : problemas.some(p => p.gravedad == 'falta') ? 'falta' : problemas.length ? 'aviso' : null;
}

// "3 errores · 5 datos faltantes · 1 aviso"
export function resumenDeProblemas(problemas: Problema[]): string {
    var partes: string[] = [];
    var agregar = (gravedad: Problema['gravedad'], uno: string, varios: string) => {
        var n = problemas.filter(p => p.gravedad == gravedad).length;
        if (n) partes.push(`${n} ${n == 1 ? uno : varios}`);
    };
    agregar('error', 'error', 'errores');
    agregar('falta', 'dato faltante', 'datos faltantes');
    agregar('aviso', 'aviso', 'avisos');
    return partes.length ? partes.join(' · ') : 'sin problemas';
}

function mensajeDeError(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

function vacioANull(valor: string): string | null {
    return valor.trim() == '' ? null : valor;
}

/* arrastre */

// lo que se está arrastrando: un tipo o una plantilla de la paleta, un casillero de la cancha o el salto de un casillero
export type Arrastre =
    | { origen: 'paleta', tipoc: string, plantilla: PlantillaCasillero | null }
    | { origen: 'cancha', id_casillero: string, tipoc: string }
    | { origen: 'salto', id_casillero: string, tipoc: string };

export type LugarDeSoltado = { padre: string, posicion: number };

// si lo que se arrastra se puede soltar adentro de ese casillero (inclusiones válidas y no adentro de sí mismo)
export function sePuedeSoltar(casilleros: CasilleroEditable[], inclusiones: DatosEditorMetadatos['inclusiones'], arrastre: Arrastre, padre: CasilleroEditable): boolean {
    if (arrastre.origen == 'salto') return false;
    if (!puedeIncluir(inclusiones, padre.tipoc, arrastre.tipoc)) return false;
    if (arrastre.origen == 'cancha') {
        if (arrastre.id_casillero == padre.id_casillero) return false;
        if (descendientes(casilleros, arrastre.id_casillero).includes(padre.id_casillero)) return false;
    }
    return true;
}

// la posición entre los hermanos sin el casillero que se mueve (como la usa el servidor)
export function posicionSinElMovido(hermanos: CasilleroEditable[], arrastre: Arrastre, posicion: number): number {
    if (arrastre.origen != 'cancha') return posicion;
    var actual = hermanos.findIndex(h => h.id_casillero == arrastre.id_casillero);
    return actual >= 0 && actual < posicion ? posicion - 1 : posicion;
}

// el casillero al que apunta un salto (por id o por código)
export function destinoDelSalto(casilleros: CasilleroEditable[], salto: string | null): CasilleroEditable | null {
    if (salto == null || salto == '') return null;
    return casilleros.find(c => c.id_casillero == salto) ?? casilleros.find(c => c.casillero == salto) ?? null;
}

/* cancha */

type PropsCancha = {
    datos: DatosEditorMetadatos
    casilleros: CasilleroEditable[]
    problemasPorId: Map<string, Problema[]>
    arrastre: Arrastre | null
    seleccionado: string | null
    contraidos: Set<string>
    puedeArrastrar: boolean
    onSeleccionar: (id: string) => void
    onAlternarContraido: (id: string) => void
    onEmpezarArrastre: (arrastre: Arrastre) => void
    onTerminarArrastre: () => void
    onSoltar: (lugar: LugarDeSoltado) => void
    onSoltarSalto: (destino: CasilleroEditable) => void
}

function ZonaDeSoltado(props: { activa: boolean, lugar: LugarDeSoltado, vacia?: boolean, onSoltar: (lugar: LugarDeSoltado) => void }) {
    var [encima, setEncima] = useState(false);
    if (!props.activa) {
        return props.vacia ? null : <Box sx={{ height: 4 }} />;
    }
    return <Box
        onDragOver={evento => { evento.preventDefault(); evento.dataTransfer.dropEffect = 'move'; setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={evento => { evento.preventDefault(); setEncima(false); props.onSoltar(props.lugar); }}
        sx={{
            height: encima ? 34 : props.vacia ? 30 : 12, my: 0.25, borderRadius: 1, transition: 'height .12s',
            border: '2px dashed', borderColor: (theme: Theme) => encima ? theme.palette.success.main : alpha(theme.palette.success.main, 0.45),
            bgcolor: (theme: Theme) => alpha(theme.palette.success.main, encima ? 0.15 : 0.05),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {encima || props.vacia ? <Typography variant="caption" color="success.main">soltá acá</Typography> : null}
    </Box>;
}

function NodoCasillero(props: PropsCancha & { casillero: CasilleroEditable }) {
    var { casillero, datos, arrastre } = props;
    var [destinoEncima, setDestinoEncima] = useState(false);
    var hijos = hijosDe(props.casilleros, casillero.id_casillero);
    var tipo = buscarTipo(datos.tipos, casillero.tipoc);
    var color = colorDelTipo(casillero.tipoc);
    var problemas = props.problemasPorId.get(casillero.id_casillero) ?? [];
    var gravedad = peorGravedad(problemas);
    var contraido = props.contraidos.has(casillero.id_casillero);
    var seleccionado = props.seleccionado == casillero.id_casillero;
    var esOpcion = casillero.tipoc == 'O';
    var zonasActivas = arrastre != null && sePuedeSoltar(props.casilleros, datos.inclusiones, arrastre, casillero);
    var arrastrable = props.puedeArrastrar && casillero.padre != null;
    // destino de un salto que se está arrastrando: cualquier casillero salvo el que salta y los formularios
    var esDestinoDeSalto = arrastre?.origen == 'salto' && arrastre.id_casillero != casillero.id_casillero && casillero.padre != null;
    var destino = destinoDelSalto(props.casilleros, casillero.salto);
    return <Box sx={{ mb: esOpcion ? 0.25 : 0.75 }}>
        <Paper elevation={0} data-casillero={casillero.id_casillero}
            onClick={evento => { evento.stopPropagation(); props.onSeleccionar(casillero.id_casillero); }}
            draggable={arrastrable}
            onDragStart={evento => {
                evento.stopPropagation();
                evento.dataTransfer.effectAllowed = 'move';
                evento.dataTransfer.setData('text/plain', casillero.id_casillero);
                props.onEmpezarArrastre({ origen: 'cancha', id_casillero: casillero.id_casillero, tipoc: casillero.tipoc });
            }}
            onDragEnd={props.onTerminarArrastre}
            onDragOver={esDestinoDeSalto ? evento => { evento.preventDefault(); evento.stopPropagation(); setDestinoEncima(true); } : undefined}
            onDragLeave={esDestinoDeSalto ? () => setDestinoEncima(false) : undefined}
            onDrop={esDestinoDeSalto ? evento => { evento.preventDefault(); evento.stopPropagation(); setDestinoEncima(false); props.onSoltarSalto(casillero); } : undefined}
            sx={{
                display: 'flex', alignItems: 'center', gap: 1, px: 1, py: esOpcion ? 0.25 : 0.6, cursor: 'pointer',
                border: '1px solid', borderColor: seleccionado ? color : 'divider', borderLeft: `4px solid ${color}`,
                bgcolor: destinoEncima ? (theme: Theme) => alpha(theme.palette.secondary.main, 0.18)
                    : seleccionado ? alpha(color, 0.08) : casillero.es_activo ? 'background.paper' : 'action.disabledBackground',
                boxShadow: seleccionado ? `0 0 0 2px ${alpha(color, 0.25)}` : esDestinoDeSalto ? (theme: Theme) => `0 0 0 1px ${alpha(theme.palette.secondary.main, 0.4)}` : 'none',
                opacity: arrastre?.origen == 'cancha' && arrastre.id_casillero == casillero.id_casillero ? 0.4 : 1,
                '&:hover': { borderColor: color },
            }}>
            {arrastrable ? <Box sx={{ cursor: 'grab', display: 'flex', color: 'text.disabled' }} title="arrastrar para mover"><Icono path={ICONOS.arrastrar} /></Box> : null}
            <Tooltip title={tipo?.denominacion ?? casillero.tipoc}><Box><IconoDeTipo tipoc={casillero.tipoc} tamanio={esOpcion ? 20 : 24} /></Box></Tooltip>
            <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>{casillero.casillero}</Typography>
            <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }} title={casillero.nombre ?? ''}>
                {casillero.nombre ?? <Typography component="span" variant="body2" color="text.disabled">(sin texto)</Typography>}
            </Typography>
            {casillero.tipovar ? <Chip size="small" variant="outlined" label={casillero.tipovar} sx={{ height: 20 }} /> : null}
            {casillero.salto ? <Chip size="small" variant="outlined" color={destino || casillero.salto.toLowerCase() == 'fin' || casillero.tipoc == 'BF' ? 'secondary' : 'warning'}
                label={`→ ${casillero.salto}`} sx={{ height: 20 }} /> : null}
            {casillero.expresion_habilitar ? <Tooltip title={`se habilita si: ${casillero.expresion_habilitar}`}><Chip size="small" label="condición" sx={{ height: 20 }} /></Tooltip> : null}
            {gravedad ? <Tooltip title={problemas.map(p => p.mensaje).join(' · ')}><Box sx={{ display: 'flex' }}><IconoDeProblema gravedad={gravedad} /></Box></Tooltip> : null}
            {props.puedeArrastrar && casillero.padre != null && casillero.tipoc != 'BF' ?
                <Tooltip title="arrastrá esta flecha hasta el casillero al que tiene que saltar">
                    <Box draggable onClick={evento => evento.stopPropagation()}
                        onDragStart={evento => {
                            evento.stopPropagation();
                            evento.dataTransfer.effectAllowed = 'link';
                            evento.dataTransfer.setData('text/plain', 'salto:' + casillero.id_casillero);
                            props.onEmpezarArrastre({ origen: 'salto', id_casillero: casillero.id_casillero, tipoc: casillero.tipoc });
                        }}
                        onDragEnd={props.onTerminarArrastre}
                        sx={{ display: 'flex', cursor: 'crosshair', color: casillero.salto ? 'secondary.main' : 'text.disabled', '&:hover': { color: 'secondary.main' } }}>
                        <Icono path={ICONOS.salto} />
                    </Box>
                </Tooltip> : null}
            {hijos.length ? <IconButton size="small" aria-label={contraido ? 'expandir' : 'contraer'}
                onClick={evento => { evento.stopPropagation(); props.onAlternarContraido(casillero.id_casillero); }}>
                <Badge badgeContent={contraido ? hijos.length : 0} color="primary"><Icono path={contraido ? ICONOS.expandir : ICONOS.contraer} /></Badge>
            </IconButton> : null}
        </Paper>
        {!contraido && (hijos.length || zonasActivas) ? <Box sx={{ pl: esOpcion ? 2 : 2.5, pt: 0.5, borderLeft: `2px solid ${alpha(color, 0.25)}`, ml: 1.25 }}>
            {hijos.length == 0 ? <ZonaDeSoltado activa={zonasActivas} vacia lugar={{ padre: casillero.id_casillero, posicion: 0 }} onSoltar={props.onSoltar} /> : null}
            {hijos.map((hijo, i) => <React.Fragment key={hijo.id_casillero}>
                <ZonaDeSoltado activa={zonasActivas} lugar={{ padre: casillero.id_casillero, posicion: i }} onSoltar={props.onSoltar} />
                <NodoCasillero {...props} casillero={hijo} />
            </React.Fragment>)}
            {hijos.length ? <ZonaDeSoltado activa={zonasActivas} lugar={{ padre: casillero.id_casillero, posicion: hijos.length }} onSoltar={props.onSoltar} /> : null}
        </Box> : null}
    </Box>;
}

// flechas de los saltos dibujadas sobre la cancha (del borde derecho del casillero que salta al borde derecho del destino)
function FlechasDeSaltos(props: { contenedor: React.RefObject<HTMLDivElement>, casilleros: CasilleroEditable[], version: string }) {
    var [dibujo, setDibujo] = useState<{ ancho: number, alto: number, flechas: { id: string, d: string, adelante: boolean }[] }>({ ancho: 0, alto: 0, flechas: [] });
    var medir = useCallback(() => {
        const contenedor = props.contenedor.current;
        if (contenedor == null) return;
        var base = contenedor.getBoundingClientRect();
        var punto = (id: string) => {
            var elemento = contenedor.querySelector(`[data-casillero="${id.replace(/"/g, '\\"')}"]`);
            if (elemento == null) return null;
            var r = elemento.getBoundingClientRect();
            return { x: r.right - base.left, y: r.top + r.height / 2 - base.top };
        };
        var flechas: { id: string, d: string, adelante: boolean }[] = [];
        props.casilleros.filter(c => c.salto && c.tipoc != 'BF').forEach((c, i) => {
            var destino = destinoDelSalto(props.casilleros, c.salto);
            var desde = punto(c.id_casillero);
            var hasta = destino ? punto(destino.id_casillero) : null;
            if (desde && hasta) {
                var curva = Math.max(desde.x, hasta.x) + 18 + (i % 5) * 7;
                flechas.push({ id: c.id_casillero, d: `M ${desde.x} ${desde.y} C ${curva} ${desde.y}, ${curva} ${hasta.y}, ${hasta.x + 4} ${hasta.y}`, adelante: hasta.y > desde.y });
            }
        });
        setDibujo({ ancho: contenedor.clientWidth, alto: contenedor.clientHeight, flechas });
    }, [props.contenedor, props.casilleros]);
    useLayoutEffect(() => { medir(); }, [medir, props.version]);
    useEffect(() => {
        var contenedor = props.contenedor.current;
        if (contenedor == null || typeof ResizeObserver == 'undefined') return;
        var observador = new ResizeObserver(() => medir());
        observador.observe(contenedor);
        return () => observador.disconnect();
    }, [medir, props.contenedor]);
    return <svg width={dibujo.ancho} height={dibujo.alto} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', overflow: 'visible' }} aria-hidden>
        <defs>
            <marker id="punta-salto" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8E24AA" /></marker>
            <marker id="punta-salto-atras" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ED6C02" /></marker>
        </defs>
        {dibujo.flechas.map(f => <path key={f.id} d={f.d} fill="none" stroke={f.adelante ? '#8E24AA' : '#ED6C02'} strokeWidth={1.6}
            strokeDasharray={f.adelante ? undefined : '4 3'} markerEnd={`url(#${f.adelante ? 'punta-salto' : 'punta-salto-atras'})`} opacity={0.75} />)}
    </svg>;
}

/* paleta */

function ItemPaleta(props: { titulo: string, detalle: string, tipoc: string, icono?: string, habilitado: boolean, onEmpezar: () => void, onTerminar: () => void }) {
    var color = colorDelTipo(props.tipoc);
    return <Tooltip title={props.habilitado ? props.detalle : 'no tiene permiso para agregar casilleros'} placement="right">
        <Paper elevation={0} draggable={props.habilitado}
            onDragStart={evento => { evento.dataTransfer.effectAllowed = 'copy'; evento.dataTransfer.setData('text/plain', props.tipoc); props.onEmpezar(); }}
            onDragEnd={props.onTerminar}
            sx={{
                display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.6, mb: 0.75, border: '1px solid', borderColor: 'divider',
                cursor: props.habilitado ? 'grab' : 'not-allowed', opacity: props.habilitado ? 1 : 0.5,
                '&:hover': props.habilitado ? { borderColor: color, bgcolor: alpha(color, 0.06) } : {},
            }}>
            <IconoDeTipo tipoc={props.tipoc} path={props.icono} />
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" lineHeight={1.2}>{props.titulo}</Typography>
                <Typography variant="caption" color="text.secondary" lineHeight={1}>{props.tipoc}</Typography>
            </Box>
        </Paper>
    </Tooltip>;
}

function Paleta(props: { datos: DatosEditorMetadatos, onEmpezar: (arrastre: Arrastre) => void, onTerminar: () => void }) {
    var { datos } = props;
    var habilitado = datos.permisos.estructura && !datos.cerrado;
    return <Box>
        <Typography variant="overline" color="text.secondary">plantillas</Typography>
        {PLANTILLAS.filter(p => buscarTipo(datos.tipos, p.tipoc) != null).map(p =>
            <ItemPaleta key={p.id} titulo={p.titulo} detalle={p.descripcion} tipoc={p.tipoc} icono={ICONO_DE_PLANTILLA[p.id]} habilitado={habilitado}
                onEmpezar={() => props.onEmpezar({ origen: 'paleta', tipoc: p.tipoc, plantilla: p })} onTerminar={props.onTerminar} />)}
        <Typography variant="overline" color="text.secondary" display="block" sx={{ mt: 1 }}>tipos de casillero</Typography>
        {datos.tipos.filter(t => t.tipoc != 'F').map(t =>
            <ItemPaleta key={t.tipoc} titulo={t.denominacion} detalle={`va dentro de: ${datos.inclusiones.filter(i => i.hijo == t.tipoc).map(i => i.padre).join(', ') || 'ninguno'}`}
                tipoc={t.tipoc} habilitado={habilitado}
                onEmpezar={() => props.onEmpezar({ origen: 'paleta', tipoc: t.tipoc, plantilla: null })} onTerminar={props.onTerminar} />)}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Arrastrá a la cancha: sólo se marcan los lugares donde ese tipo puede ir. Para elegir un salto, arrastrá la flecha de un casillero hasta su destino.
        </Typography>
    </Box>;
}

/* panel de propiedades */

type DefinicionCampo = { campo: CampoEditable, titulo: string, tipo: 'texto' | 'largo' | 'booleano' | 'tipovar' | 'numero' | 'ua' | 'json' | 'expresion' | 'salto', ayuda?: string };

const CAMPOS_PRINCIPALES: DefinicionCampo[] = [
    { campo: 'casillero', titulo: 'código', tipo: 'texto', ayuda: 'cambia el id del casillero y de sus hijos si no es irrepetible' },
    { campo: 'nombre', titulo: 'texto', tipo: 'largo' },
    { campo: 'aclaracion', titulo: 'aclaración', tipo: 'largo' },
    { campo: 'tipovar', titulo: 'tipo de variable', tipo: 'tipovar' },
    { campo: 'salto', titulo: 'salto', tipo: 'salto', ayuda: 'casillero al que salta (también se elige arrastrando la flecha)' },
    { campo: 'expresion_habilitar', titulo: 'se habilita si', tipo: 'expresion' },
    { campo: 'unidad_analisis', titulo: 'unidad de análisis', tipo: 'ua' },
    { campo: 'optativo', titulo: 'optativo', tipo: 'booleano' },
    { campo: 'es_activo', titulo: 'activo', tipo: 'booleano' },
];

const CAMPOS_AVANZADOS: DefinicionCampo[] = [
    { campo: 'formulario_principal', titulo: 'formulario principal', tipo: 'booleano' },
    { campo: 'salto_ns_nc', titulo: 'salto si ns/nc', tipo: 'salto' },
    { campo: 'despliegue', titulo: 'despliegue', tipo: 'texto' },
    { campo: 'ver_id', titulo: 'id que se muestra', tipo: 'texto' },
    { campo: 'var_name_especial', titulo: 'nombre de variable especial', tipo: 'texto' },
    { campo: 'valor_ns_nc', titulo: 'valor ns/nc', tipo: 'texto' },
    { campo: 'valor_sin_dato', titulo: 'valor sin dato', tipo: 'texto' },
    { campo: 'longitud', titulo: 'longitud', tipo: 'texto' },
    { campo: 'tipoe', titulo: 'tipo de entrada', tipo: 'texto' },
    { campo: 'cantidad_resumen', titulo: 'cantidad resumen', tipo: 'numero' },
    { campo: 'leer', titulo: 'leer', tipo: 'booleano' },
    { campo: 'calculada', titulo: 'calculada', tipo: 'booleano' },
    { campo: 'libre', titulo: 'libre', tipo: 'booleano' },
    { campo: 'especial', titulo: 'especial (json)', tipo: 'json' },
];

// los campos que aplican a cada tipo (los de formulario sólo en los formularios)
function campoAplica(definicion: DefinicionCampo, casillero: CasilleroEditable, puedeSerVar: boolean | null | undefined): boolean {
    if (definicion.campo == 'tipovar') return puedeSerVar !== false;
    if (definicion.campo == 'unidad_analisis' || definicion.campo == 'formulario_principal') return casillero.tipoc == 'F';
    return true;
}

// los campos cambiados respecto del original (lo que se manda en la operación modificar)
export function cambiosDelBorrador(original: CasilleroEditable, borrador: CasilleroEditable): CambiosDeCasillero {
    var cambios: CambiosDeCasillero = {};
    [...CAMPOS_PRINCIPALES, ...CAMPOS_AVANZADOS].forEach(({ campo }) => {
        if (original[campo] !== borrador[campo]) {
            Object.assign(cambios, { [campo]: borrador[campo] });
        }
    });
    return cambios;
}

// expresión con ayuda: variables del operativo para insertar, funciones disponibles y aviso de variables desconocidas
function CampoExpresion(props: { titulo: string, valor: string | null, editable: boolean, error?: string, casilleros: CasilleroEditable[], onCambiar: (valor: string | null) => void }) {
    var entrada = useRef<HTMLTextAreaElement | null>(null);
    var variables = useMemo(() => props.casilleros.filter(c => c.var_name != null)
        .sort((a, b) => (a.var_name ?? '').localeCompare(b.var_name ?? '', 'es', { numeric: true })), [props.casilleros]);
    var desconocidas = props.valor ? variablesDesconocidas(props.valor, variablesDelOperativo(props.casilleros)) : [];
    var insertar = (texto: string) => {
        var actual = props.valor ?? '';
        var elemento = entrada.current;
        var inicio = elemento?.selectionStart ?? actual.length;
        var fin = elemento?.selectionEnd ?? actual.length;
        props.onCambiar(actual.slice(0, inicio) + texto + actual.slice(fin));
        setTimeout(() => { elemento?.focus(); elemento?.setSelectionRange(inicio + texto.length, inicio + texto.length); }, 0);
    };
    return <Box>
        <TextField size="small" fullWidth multiline minRows={2} label={props.titulo} disabled={!props.editable} inputRef={entrada}
            value={props.valor ?? ''} onChange={e => props.onCambiar(vacioANull(e.target.value))}
            error={props.error != null || desconocidas.length > 0}
            helperText={props.error ?? (desconocidas.length ? `variables que no están en el operativo: ${desconocidas.join(', ')}` : 'por ejemplo: p5 = 1 and not blanco(p6)')}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }} />
        {props.editable ? <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
            <Autocomplete size="small" options={variables} sx={{ flex: 1 }} value={null} blurOnSelect
                getOptionLabel={c => c.var_name ?? ''} isOptionEqualToValue={(a, b) => a.id_casillero == b.id_casillero}
                filterOptions={(opciones, estado) => opciones.filter(c => `${c.var_name} ${c.nombre ?? ''}`.toLowerCase().includes(estado.inputValue.toLowerCase())).slice(0, 50)}
                renderOption={(atributos, c) => <li {...atributos} key={c.id_casillero}>
                    <Box><Typography variant="body2" fontFamily="monospace">{c.var_name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ maxWidth: 260 }}>{c.nombre}</Typography></Box>
                </li>}
                onChange={(_e, c) => { if (c?.var_name) insertar(c.var_name); }}
                renderInput={parametros => <TextField {...parametros} placeholder="insertar variable" />} />
            <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select displayEmpty value="" onChange={e => { var f = String(e.target.value); if (f) insertar(`${f}()`); }} inputProps={{ 'aria-label': 'insertar función' }}>
                    <MenuItem value=""><em>función…</em></MenuItem>
                    {FUNCIONES_DE_EXPRESIONES.map(f => <MenuItem key={f} value={f}>{f}()</MenuItem>)}
                </Select>
            </FormControl>
        </Stack> : null}
    </Box>;
}

// salto: elegir un casillero del formulario (o fin)
function CampoSalto(props: { titulo: string, ayuda?: string, valor: string | null, editable: boolean, error?: string, opciones: CasilleroEditable[], onCambiar: (valor: string | null) => void }) {
    var ids = ['fin', ...props.opciones.map(c => c.id_casillero)];
    var etiqueta = (id: string) => {
        if (id == 'fin') return 'fin del formulario';
        var c = props.opciones.find(o => o.id_casillero == id);
        return c ? `${c.id_casillero} · ${c.nombre ?? ''}` : id;
    };
    return <Autocomplete size="small" freeSolo options={ids} value={props.valor} disabled={!props.editable}
        getOptionLabel={id => id} renderOption={(atributos, id) => <li {...atributos} key={id}><Typography variant="body2" noWrap>{etiqueta(id)}</Typography></li>}
        onChange={(_e, valor) => props.onCambiar(valor ? String(valor) : null)}
        onInputChange={(_e, valor, motivo) => { if (motivo == 'input') props.onCambiar(vacioANull(valor)); }}
        renderInput={parametros => <TextField {...parametros} label={props.titulo} error={props.error != null} helperText={props.error ?? props.ayuda}
            InputLabelProps={{ ...parametros.InputLabelProps, shrink: true }} placeholder="elegí o escribí un casillero" />} />;
}

function CampoDePropiedad(props: { definicion: DefinicionCampo, borrador: CasilleroEditable, datos: DatosEditorMetadatos, casilleros: CasilleroEditable[], formulario: CasilleroEditable[], editable: boolean, error?: string, onCambiar: (cambio: CambiosDeCasillero) => void }) {
    var { definicion, borrador, datos } = props;
    var { campo } = definicion;
    var valor = borrador[campo];
    var cambiar = (nuevo: CasilleroEditable[CampoEditable]) => props.onCambiar({ [campo]: nuevo });
    switch (definicion.tipo) {
        case 'booleano':
            return <FormControlLabel disabled={!props.editable} label={definicion.titulo}
                control={<Checkbox size="small" checked={valor === true} indeterminate={valor == null && campo != 'es_activo'}
                    onChange={evento => cambiar(campo == 'optativo' && !evento.target.checked ? null : evento.target.checked)} />} />;
        case 'tipovar':
        case 'ua': {
            var opciones = definicion.tipo == 'tipovar' ? datos.tipovars : datos.unidadesAnalisis;
            return <FormControl size="small" fullWidth disabled={!props.editable} error={props.error != null}>
                <InputLabel>{definicion.titulo}</InputLabel>
                <Select label={definicion.titulo} value={typeof valor == 'string' ? valor : ''} onChange={evento => cambiar(vacioANull(String(evento.target.value)))}>
                    <MenuItem value=""><em>(ninguno)</em></MenuItem>
                    {opciones.map(opcion => <MenuItem key={opcion} value={opcion}>{opcion}</MenuItem>)}
                </Select>
                {props.error ? <Typography variant="caption" color="error" sx={{ ml: 1.75, mt: 0.5 }}>{props.error}</Typography> : null}
            </FormControl>;
        }
        case 'numero':
            return <TextField size="small" fullWidth label={definicion.titulo} type="number" disabled={!props.editable}
                value={typeof valor == 'number' ? valor : ''} onChange={evento => cambiar(evento.target.value == '' ? null : Number(evento.target.value))} />;
        case 'expresion':
            return <CampoExpresion titulo={definicion.titulo} valor={typeof valor == 'string' ? valor : null} editable={props.editable} error={props.error}
                casilleros={props.casilleros} onCambiar={cambiar} />;
        case 'salto': {
            // un botón de formulario salta a un formulario; los demás, a un casillero del mismo formulario
            var opcionesSalto = borrador.tipoc == 'BF'
                ? props.casilleros.filter(c => c.tipoc == 'F').map(f => ({ ...f, id_casillero: f.casillero }))
                : props.formulario.filter(c => c.id_casillero != borrador.id_casillero && c.padre != null && c.irrepetible);
            return <CampoSalto titulo={definicion.titulo} ayuda={borrador.tipoc == 'BF' ? 'formulario que abre el botón' : definicion.ayuda} valor={typeof valor == 'string' ? valor : null}
                editable={props.editable} error={props.error} opciones={opcionesSalto} onCambiar={cambiar} />;
        }
        default:
            return <TextField size="small" fullWidth label={definicion.titulo} disabled={!props.editable}
                error={props.error != null} helperText={props.error ?? definicion.ayuda}
                multiline={definicion.tipo == 'largo' || definicion.tipo == 'json'} minRows={definicion.tipo == 'json' ? 2 : 1}
                value={typeof valor == 'string' ? valor : ''}
                onChange={evento => cambiar(campo == 'casillero' ? evento.target.value : vacioANull(evento.target.value))}
                inputProps={{ style: definicion.tipo == 'json' ? { fontFamily: 'monospace', fontSize: 12 } : undefined }} />;
    }
}

function PanelPropiedades(props: {
    casillero: CasilleroEditable, datos: DatosEditorMetadatos, casilleros: CasilleroEditable[], formulario: CasilleroEditable[],
    problemas: Problema[], guardando: boolean, onGuardar: (cambios: CambiosDeCasillero) => void, onEliminar: () => void
}) {
    var { casillero, datos } = props;
    var [borrador, setBorrador] = useState<CasilleroEditable>(casillero);
    var camposConProblema = new Map(props.problemas.filter(p => p.campo).map(p => [p.campo!, p.mensaje]));
    var [avanzados, setAvanzados] = useState(false);
    useEffect(() => {
        setBorrador(casillero);
        if (CAMPOS_AVANZADOS.some(d => camposConProblema.has(d.campo))) setAvanzados(true);
    }, [casillero]);
    var tipo = buscarTipo(datos.tipos, casillero.tipoc);
    var cambios = cambiosDelBorrador(casillero, borrador);
    var hayCambios = Object.keys(cambios).length > 0;
    var editableCampo = (campo: CampoEditable) => !datos.cerrado && (datos.permisos.estructura || datos.permisos.textos && (campo == 'nombre' || campo == 'aclaracion'));
    var cantidadDescendientes = descendientes(props.casilleros, casillero.id_casillero).length;
    var campo = (d: DefinicionCampo) => <CampoDePropiedad key={d.campo} definicion={d} borrador={borrador} datos={datos} casilleros={props.casilleros}
        formulario={props.formulario} editable={editableCampo(d.campo)} error={camposConProblema.get(d.campo)}
        onCambiar={cambio => setBorrador(previo => ({ ...previo, ...cambio }))} />;
    var sinCampo = props.problemas.filter(p => !p.campo);
    return <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <IconoDeTipo tipoc={casillero.tipoc} />
            <Typography variant="subtitle1" fontWeight={600}>{tipo?.denominacion ?? casillero.tipoc}</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block">id: {casillero.id_casillero}{casillero.var_name ? ` · variable: ${casillero.var_name}` : ''}</Typography>
        {sinCampo.map((p, i) => <Alert key={i} severity={p.gravedad == 'error' ? 'error' : 'warning'} sx={{ mt: 1, py: 0 }}>{p.mensaje}</Alert>)}
        <Stack spacing={1.5} sx={{ mt: 2 }}>
            {CAMPOS_PRINCIPALES.filter(d => campoAplica(d, casillero, tipo?.puedeSerVar)).map(campo)}
            <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => setAvanzados(!avanzados)}>{avanzados ? 'menos campos' : 'más campos'}</Button>
            {avanzados ? CAMPOS_AVANZADOS.filter(d => campoAplica(d, casillero, tipo?.puedeSerVar)).map(campo) : null}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" disabled={!hayCambios || props.guardando} onClick={() => props.onGuardar(cambios)}>
                {props.guardando ? 'guardando…' : 'guardar'}
            </Button>
            <Button disabled={!hayCambios || props.guardando} onClick={() => setBorrador(casillero)}>descartar</Button>
            <Box sx={{ flex: 1 }} />
            {datos.permisos.estructura ?
                <Button color="error" disabled={datos.cerrado || props.guardando} onClick={props.onEliminar}>
                    borrar{cantidadDescendientes ? ` (+${cantidadDescendientes})` : ''}
                </Button> : null}
        </Stack>
    </Box>;
}

/* diálogos de alta */

type PedidoDeAlta = { arrastre: Extract<Arrastre, { origen: 'paleta' }>, lugar: LugarDeSoltado };

function DialogoAlta(props: { pedido: PedidoDeAlta | null, datos: DatosEditorMetadatos, casilleros: CasilleroEditable[], onCancelar: () => void, onCrear: (nuevo: NuevoCasillero, posicion: number) => void }) {
    var { pedido, datos } = props;
    var [codigo, setCodigo] = useState('');
    var [nombre, setNombre] = useState('');
    var [tipovar, setTipovar] = useState('');
    useEffect(() => {
        if (pedido) {
            setCodigo(proximoCodigo(props.casilleros, pedido.arrastre.tipoc, pedido.lugar.padre));
            setNombre(pedido.arrastre.plantilla?.nombre ?? '');
            setTipovar(pedido.arrastre.plantilla?.tipovar ?? '');
        }
    }, [pedido]);
    if (pedido == null) return null;
    var tipo = buscarTipo(datos.tipos, pedido.arrastre.tipoc);
    var nuevo: NuevoCasillero = {
        padre: pedido.lugar.padre, tipoc: pedido.arrastre.tipoc, casillero: codigo.trim(), nombre: vacioANull(nombre),
        tipovar: vacioANull(tipovar), ...(pedido.arrastre.plantilla?.opciones ? { opciones: pedido.arrastre.plantilla.opciones } : {}),
    };
    var posicionPedida = pedido.lugar.posicion;
    var motivo = validarOperacion({ ...datos, casilleros: props.casilleros }, { tipo: 'crear', nuevo, posicion: posicionPedida });
    return <Dialog open onClose={props.onCancelar} maxWidth="xs" fullWidth>
        <DialogTitle><Stack direction="row" spacing={1} alignItems="center">
            <IconoDeTipo tipoc={nuevo.tipoc} path={pedido.arrastre.plantilla ? ICONO_DE_PLANTILLA[pedido.arrastre.plantilla.id] : undefined} />
            <span>Nuevo/a {pedido.arrastre.plantilla?.titulo ?? tipo?.denominacion}</span>
        </Stack></DialogTitle>
        <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField size="small" label="código" value={codigo} onChange={e => setCodigo(e.target.value)} autoFocus
                    helperText={`id: ${idQueTendria(tipo, pedido.lugar.padre, codigo.trim() || '?')}`} />
                <TextField size="small" label="texto" value={nombre} onChange={e => setNombre(e.target.value)} multiline />
                {tipo?.puedeSerVar !== false ? <FormControl size="small">
                    <InputLabel>tipo de variable</InputLabel>
                    <Select label="tipo de variable" value={tipovar} onChange={e => setTipovar(String(e.target.value))}>
                        <MenuItem value=""><em>(ninguno)</em></MenuItem>
                        {datos.tipovars.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                </FormControl> : null}
                {nuevo.opciones ? <Typography variant="body2" color="text.secondary">Se crean también las opciones: {nuevo.opciones.map(o => `${o.casillero} ${o.nombre}`).join(', ')}.</Typography> : null}
                {motivo ? <Alert severity="error">{motivo}</Alert> : null}
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={props.onCancelar}>cancelar</Button>
            <Button variant="contained" disabled={motivo != null} onClick={() => props.onCrear(nuevo, posicionPedida)}>crear</Button>
        </DialogActions>
    </Dialog>;
}

function DialogoFormularioNuevo(props: { abierto: boolean, datos: DatosEditorMetadatos, casilleros: CasilleroEditable[], onCancelar: () => void, onCrear: (nuevo: NuevoCasillero) => void }) {
    var { datos } = props;
    var [codigo, setCodigo] = useState('');
    var [nombre, setNombre] = useState('');
    var [unidad, setUnidad] = useState('');
    var [principal, setPrincipal] = useState(false);
    useEffect(() => {
        if (props.abierto) {
            setCodigo(proximoCodigo(props.casilleros, 'F', null));
            setNombre('');
            setUnidad(datos.unidadesAnalisis[0] ?? '');
            setPrincipal(!props.casilleros.some(c => c.formulario_principal));
        }
    }, [props.abierto]);
    if (!props.abierto) return null;
    var nuevo: NuevoCasillero = { padre: null, tipoc: 'F', casillero: codigo.trim(), nombre: vacioANull(nombre), tipovar: null, unidad_analisis: vacioANull(unidad), formulario_principal: principal || null };
    var motivo = validarOperacion({ ...datos, casilleros: props.casilleros }, { tipo: 'crear', nuevo, posicion: null });
    return <Dialog open onClose={props.onCancelar} maxWidth="xs" fullWidth>
        <DialogTitle><Stack direction="row" spacing={1} alignItems="center"><IconoDeTipo tipoc="F" /><span>Nuevo formulario</span></Stack></DialogTitle>
        <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField size="small" label="código" value={codigo} onChange={e => setCodigo(e.target.value)} autoFocus helperText={`id: F:${codigo.trim() || '?'}`} />
                <TextField size="small" label="título" value={nombre} onChange={e => setNombre(e.target.value)} />
                <FormControl size="small">
                    <InputLabel>unidad de análisis</InputLabel>
                    <Select label="unidad de análisis" value={unidad} onChange={e => setUnidad(String(e.target.value))}>
                        {datos.unidadesAnalisis.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControlLabel control={<Checkbox checked={principal} onChange={e => setPrincipal(e.target.checked)} />} label="formulario principal" />
                {motivo ? <Alert severity="error">{motivo}</Alert> : null}
            </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={props.onCancelar}>cancelar</Button>
            <Button variant="contained" disabled={motivo != null} onClick={() => props.onCrear(nuevo)}>crear</Button>
        </DialogActions>
    </Dialog>;
}

/* versiones */

type VersionFormulario = { version: number, cuando: string, usuario: string | null, descripcion: string | null, cantidad: number };

function PanelVersiones(props: { datos: DatosEditorMetadatos, formulario: CasilleroEditable, hayBorrador: boolean, onRestaurada: (casilleros: CasilleroEditable[]) => void, onAviso: (aviso: Aviso) => void }) {
    var { datos, formulario } = props;
    var [versiones, setVersiones] = useState<VersionFormulario[] | null>(null);
    var [descripcion, setDescripcion] = useState('');
    var [ocupado, setOcupado] = useState(false);
    var [aRestaurar, setARestaurar] = useState<VersionFormulario | null>(null);
    var traer = useCallback(async () => {
        try {
            setVersiones(await myOwn.ajax.editor_metadatos_versiones_traer({ operativo: datos.operativo, id_formulario: formulario.id_casillero }));
        } catch (err) {
            props.onAviso({ tipo: 'error', texto: mensajeDeError(err) });
            setVersiones([]);
        }
    }, [datos.operativo, formulario.id_casillero]);
    useEffect(() => { traer(); }, [traer]);
    var guardar = async () => {
        setOcupado(true);
        try {
            var version: number = await myOwn.ajax.editor_metadatos_version_guardar({ operativo: datos.operativo, id_formulario: formulario.id_casillero, descripcion: vacioANull(descripcion) });
            setDescripcion('');
            props.onAviso({ tipo: 'success', texto: `se guardó la versión ${version}` });
            await traer();
        } catch (err) {
            props.onAviso({ tipo: 'error', texto: mensajeDeError(err) });
        } finally {
            setOcupado(false);
        }
    };
    var restaurar = async (version: VersionFormulario) => {
        setOcupado(true);
        try {
            var casilleros: CasilleroEditable[] = await myOwn.ajax.editor_metadatos_version_restaurar({ operativo: datos.operativo, version: version.version });
            props.onRestaurada(casilleros);
            props.onAviso({ tipo: 'success', texto: `se restauró la versión ${version.version}` });
            await traer();
        } catch (err) {
            props.onAviso({ tipo: 'error', texto: mensajeDeError(err) });
        } finally {
            setOcupado(false);
        }
    };
    return <Box sx={{ p: 2, width: { xs: '100vw', sm: 420 } }}>
        <Typography variant="h6">Versiones de {formulario.casillero}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Una versión es una copia del formulario con todo lo que tiene adentro. Al restaurar se guarda antes cómo está.</Typography>
        {props.hayBorrador ? <Alert severity="info" sx={{ mb: 2 }}>Publicá o descartá el borrador para guardar o restaurar versiones.</Alert> : null}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField size="small" fullWidth placeholder="descripción (opcional)" value={descripcion} onChange={e => setDescripcion(e.target.value)} disabled={props.hayBorrador} />
            <Button variant="contained" disabled={ocupado || props.hayBorrador} onClick={guardar}>guardar</Button>
        </Stack>
        <Divider />
        {versiones == null ? <CircularProgress size={24} sx={{ m: 2 }} /> : versiones.length == 0 ? <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Todavía no hay versiones guardadas.</Typography> :
            <List dense>
                {versiones.map(v => <ListItem key={v.version} divider secondaryAction={datos.permisos.estructura && !datos.cerrado ?
                    <Button size="small" disabled={ocupado || props.hayBorrador} onClick={() => setARestaurar(v)}>restaurar</Button> : undefined}>
                    <ListItemText primary={`${v.version} · ${v.descripcion ?? 'sin descripción'}`} secondary={`${v.cuando}${v.usuario ? ` · ${v.usuario}` : ''} · ${v.cantidad} casilleros`} />
                </ListItem>)}
            </List>}
        <Dialog open={aRestaurar != null} onClose={() => setARestaurar(null)}>
            <DialogTitle>¿Restaurar la versión {aRestaurar?.version}?</DialogTitle>
            <DialogContent><Typography variant="body2">El formulario {formulario.casillero} vuelve a como estaba en esa versión ({aRestaurar?.cuando}). Antes se guarda una versión con cómo está ahora.</Typography></DialogContent>
            <DialogActions>
                <Button onClick={() => setARestaurar(null)}>cancelar</Button>
                <Button variant="contained" onClick={() => { var v = aRestaurar; setARestaurar(null); if (v) restaurar(v); }}>restaurar</Button>
            </DialogActions>
        </Dialog>
    </Box>;
}

/* pantalla */

type Aviso = { tipo: 'success' | 'error' | 'info', texto: string };

// un paso del historial para deshacer / rehacer
type PasoDeHistorial = {
    descripcion: string
    enBorrador: boolean
    antes: CasilleroEditable[] // en borrador se vuelve a esto; guardado, se usa para armar la operación inversa
    despues: CasilleroEditable[]
    pendientesAntes: number
    deshacer: OperacionMetadatos[]
    rehacer: OperacionMetadatos[]
}

function formularioDe(casilleros: CasilleroEditable[], id: string | null): string | null {
    var actual = casilleros.find(c => c.id_casillero == id);
    while (actual?.padre) {
        var padre: string = actual.padre;
        actual = casilleros.find(c => c.id_casillero == padre);
    }
    return actual?.id_casillero ?? null;
}

export function EditorMetadatos() {
    var [datos, setDatos] = useState<DatosEditorMetadatos | null>(null);
    var [error, setError] = useState<string | null>(null);
    var [formulario, setFormulario] = useState<string | null>(null);
    var [seleccionado, setSeleccionado] = useState<string | null>(null);
    var [arrastre, setArrastre] = useState<Arrastre | null>(null);
    var [contraidos, setContraidos] = useState<Set<string>>(new Set());
    var [guardando, setGuardando] = useState(false);
    var [aviso, setAviso] = useState<Aviso | null>(null);
    var [pedidoDeAlta, setPedidoDeAlta] = useState<PedidoDeAlta | null>(null);
    var [formularioNuevo, setFormularioNuevo] = useState(false);
    var [aBorrar, setABorrar] = useState<CasilleroEditable | null>(null);
    var [vistaPrevia, setVistaPrevia] = useState(false);
    var [versionPrevia, setVersionPrevia] = useState(0);
    var [verProblemas, setVerProblemas] = useState(false);
    var [verVersiones, setVerVersiones] = useState(false);
    var [verSaltos, setVerSaltos] = useState(true);
    // modo borrador: los cambios se aplican en el navegador y se mandan todos juntos al publicar
    var [borrador, setBorrador] = useState<{ casilleros: CasilleroEditable[], pendientes: OperacionMetadatos[] } | null>(null);
    var [historial, setHistorial] = useState<PasoDeHistorial[]>([]);
    var [rehechos, setRehechos] = useState<PasoDeHistorial[]>([]);
    var cancha = useRef<HTMLDivElement>(null);
    var iframe = useRef<HTMLIFrameElement>(null);

    var traer = useCallback(async (operativo: string | null) => {
        try {
            var nuevos: DatosEditorMetadatos = await myOwn.ajax.editor_metadatos_traer({ operativo });
            setDatos(nuevos);
            setBorrador(null);
            setHistorial([]);
            setRehechos([]);
            var raices = nuevos.casilleros.filter(c => c.padre == null);
            setFormulario(previo => raices.some(f => f.id_casillero == previo) ? previo : (raices.find(f => f.formulario_principal)?.id_casillero ?? raices[0]?.id_casillero ?? null));
        } catch (err) {
            setError(mensajeDeError(err));
        }
    }, []);
    useEffect(() => { traer(null); }, [traer]);

    var casilleros = borrador?.casilleros ?? datos?.casilleros ?? [];
    var tema = useMemo(() => crearTema(), []);
    var problemas = useMemo(() => datos ? problemasDelOperativo(casilleros, datos.tipos, datos.inclusiones, datos.clavesUA) : [], [datos, casilleros]);
    var problemasPorId = useMemo(() => {
        var mapa: Map<string, Problema[]> = new Map();
        problemas.forEach(p => mapa.set(p.id_casillero, [...(mapa.get(p.id_casillero) ?? []), p]));
        return mapa;
    }, [problemas]);

    // aplica operaciones (validadas) en el borrador o en la base; registra el paso para deshacer
    var aplicar = async (operaciones: OperacionMetadatos[], descripcion: string, seleccionar?: string | null, opciones: { historial?: 'nuevo' | 'ninguno', raizDespues?: string | null } = {}) => {
        if (datos == null || operaciones.length == 0) return false;
        var simulados = casilleros;
        for (var operacion of operaciones) {
            var motivo = validarOperacion({ ...datos, casilleros: simulados }, operacion);
            if (motivo) { setAviso({ tipo: 'error', texto: motivo }); return false; }
            simulados = aplicarOperacionLocal(simulados, datos.tipos, datos.operativo, operacion);
        }
        var raizAntes = formulario;
        var raizDespues = opciones.raizDespues !== undefined ? opciones.raizDespues : formularioDe(simulados, seleccionar ?? formulario) ?? formulario;
        var antes = casilleros;
        var despues: CasilleroEditable[];
        if (borrador) {
            despues = simulados;
            setBorrador({ casilleros: despues, pendientes: [...borrador.pendientes, ...operaciones] });
        } else {
            setGuardando(true);
            try {
                despues = await myOwn.ajax.editor_metadatos_aplicar({ operativo: datos.operativo, operaciones });
                setDatos({ ...datos, casilleros: despues });
            } catch (err) {
                setAviso({ tipo: 'error', texto: mensajeDeError(err) });
                return false;
            } finally {
                setGuardando(false);
            }
        }
        if (opciones.historial != 'ninguno') {
            // una operación sola tiene inversa precisa; si no, se vuelve el formulario a su copia anterior
            var inversas = (operaciones.length == 1 ? inversaDeOperacion(antes, datos.tipos, operaciones[0]) : null) ?? operacionesInversas(antes, despues, raizAntes, raizDespues);
            setHistorial(previo => [...previo, { descripcion, enBorrador: borrador != null, antes, despues, pendientesAntes: borrador?.pendientes.length ?? 0, ...inversas }].slice(-50));
            setRehechos([]);
        }
        if (raizDespues && raizDespues != formulario) setFormulario(raizDespues);
        if (seleccionar !== undefined) setSeleccionado(seleccionar);
        setVersionPrevia(v => v + 1);
        setAviso({ tipo: 'success', texto: borrador ? `${descripcion} (en el borrador)` : descripcion });
        return true;
    };

    var deshacer = async () => {
        var paso = historial[historial.length - 1];
        if (paso == null || guardando) return;
        if (paso.enBorrador) {
            if (borrador == null) return;
            setBorrador({ casilleros: paso.antes, pendientes: borrador.pendientes.slice(0, paso.pendientesAntes) });
        } else {
            if (!await aplicar(paso.deshacer, `se deshizo: ${paso.descripcion}`, null, { historial: 'ninguno' })) return;
        }
        setHistorial(previo => previo.slice(0, -1));
        setRehechos(previo => [...previo, paso]);
        setVersionPrevia(v => v + 1);
    };
    var rehacer = async () => {
        var paso = rehechos[rehechos.length - 1];
        if (paso == null || guardando) return;
        if (paso.enBorrador) {
            if (borrador == null) return;
            setBorrador({ casilleros: paso.despues, pendientes: [...borrador.pendientes, ...paso.rehacer] });
        } else {
            if (!await aplicar(paso.rehacer, `se rehizo: ${paso.descripcion}`, null, { historial: 'ninguno' })) return;
        }
        setRehechos(previo => previo.slice(0, -1));
        setHistorial(previo => [...previo, paso]);
        setVersionPrevia(v => v + 1);
    };
    useEffect(() => {
        var teclas = (evento: KeyboardEvent) => {
            var enCampo = evento.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(evento.target.tagName);
            if (enCampo || !(evento.ctrlKey || evento.metaKey)) return;
            if (evento.key.toLowerCase() == 'z' && !evento.shiftKey) { evento.preventDefault(); deshacer(); }
            if (evento.key.toLowerCase() == 'y' || evento.key.toLowerCase() == 'z' && evento.shiftKey) { evento.preventDefault(); rehacer(); }
        };
        window.addEventListener('keydown', teclas);
        return () => window.removeEventListener('keydown', teclas);
    });

    var publicar = async () => {
        if (datos == null || borrador == null) return;
        setGuardando(true);
        try {
            var guardados: CasilleroEditable[] = await myOwn.ajax.editor_metadatos_aplicar({ operativo: datos.operativo, operaciones: borrador.pendientes });
            setDatos({ ...datos, casilleros: guardados });
            setAviso({ tipo: 'success', texto: `se publicaron ${borrador.pendientes.length} cambios` });
            setBorrador(null);
            setHistorial([]);
            setRehechos([]);
            setVersionPrevia(v => v + 1);
        } catch (err) {
            setAviso({ tipo: 'error', texto: `no se publicó nada: ${mensajeDeError(err)}` });
        } finally {
            setGuardando(false);
        }
    };

    // la vista previa del borrador pide la estructura con los cambios pendientes aplicados en una transacción que se descarta
    useEffect(() => {
        var alMensaje = async (evento: MessageEvent) => {
            if (evento.origin != location.origin || evento.source != iframe.current?.contentWindow) return;
            if (evento.data?.tipo != 'previa-lista' || datos == null) return;
            try {
                var estructura: Estructura = await myOwn.ajax.editor_metadatos_previsualizar({ operativo: datos.operativo, operaciones: borrador?.pendientes ?? [] });
                iframe.current?.contentWindow?.postMessage({ tipo: 'estructura-previa', estructura }, location.origin);
            } catch (err) {
                iframe.current?.contentWindow?.postMessage({ tipo: 'estructura-previa-error', mensaje: mensajeDeError(err) }, location.origin);
            }
        };
        window.addEventListener('message', alMensaje);
        return () => window.removeEventListener('message', alMensaje);
    }, [datos, borrador]);

    var soltar = (lugar: LugarDeSoltado) => {
        if (datos == null || arrastre == null) return;
        var actual = arrastre;
        setArrastre(null);
        if (actual.origen == 'paleta') {
            setPedidoDeAlta({ arrastre: actual, lugar });
            return;
        }
        if (actual.origen != 'cancha') return;
        var idArrastrado = actual.id_casillero;
        var movido = casilleros.find(c => c.id_casillero == idArrastrado);
        if (movido == null) return;
        var hermanos = hijosDe(casilleros, lugar.padre);
        var posicion = posicionSinElMovido(hermanos, actual, lugar.posicion);
        if (movido.padre == lugar.padre && hermanos.findIndex(h => h.id_casillero == idArrastrado) == posicion) return;
        aplicar([{ tipo: 'mover', id_casillero: movido.id_casillero, padre: lugar.padre, posicion }], `se movió ${movido.casillero}`,
            idQueTendria(buscarTipo(datos.tipos, movido.tipoc), lugar.padre, movido.casillero));
    };

    var soltarSalto = (destino: CasilleroEditable) => {
        if (arrastre?.origen != 'salto') return;
        var origen = arrastre.id_casillero;
        setArrastre(null);
        var salta = casilleros.find(c => c.id_casillero == origen);
        if (salta == null) return;
        aplicar([{ tipo: 'modificar', id_casillero: origen, cambios: { salto: destino.id_casillero } }], `${salta.casillero} salta a ${destino.id_casillero}`, origen);
    };

    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    if (datos == null) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;

    var formularios = casilleros.filter(c => c.padre == null).sort((a, b) => a.casillero.localeCompare(b.casillero, 'es', { numeric: true }));
    var raiz = casilleros.find(c => c.id_casillero == formulario) ?? null;
    var delFormulario = raiz ? subarbol(casilleros, raiz.id_casillero) : [];
    var casilleroSeleccionado = casilleros.find(c => c.id_casillero == seleccionado) ?? null;
    var gravedadGeneral = peorGravedad(problemas);
    var propsCancha: PropsCancha = {
        datos, casilleros, problemasPorId, arrastre, seleccionado, contraidos, puedeArrastrar: datos.permisos.estructura && !datos.cerrado,
        onSeleccionar: setSeleccionado,
        onAlternarContraido: id => setContraidos(previo => { var nuevo = new Set(previo); if (nuevo.has(id)) { nuevo.delete(id); } else { nuevo.add(id); } return nuevo; }),
        onEmpezarArrastre: setArrastre, onTerminarArrastre: () => setArrastre(null), onSoltar: soltar, onSoltarSalto: soltarSalto,
    };
    var hayPendientes = (borrador?.pendientes.length ?? 0) > 0;
    var urlPrevia = raiz ? location.pathname + my.menuSeparator
        + `w=formulario_previsualizar&up=${encodeURIComponent(JSON.stringify({ operativo: datos.operativo, formulario: raiz.id_casillero, borrador: hayPendientes }))}&autoproced=true` : '';

    return <ThemeProvider theme={tema}>
        <ScopedCssBaseline sx={{ bgcolor: 'background.default', minHeight: '100%' }}>
            <Box sx={{ p: { xs: 1, md: 2 } }}>
                <Paper elevation={0} sx={{
                    p: 2, mb: 1.5, borderRadius: 3, color: 'primary.contrastText',
                    background: (theme: Theme) => borrador ? `repeating-linear-gradient(135deg, ${theme.palette.primary.dark} 0 18px, ${alpha(theme.palette.primary.dark, 0.85)} 18px 36px)`
                        : `linear-gradient(115deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                }}>
                    <Stack direction={{ xs: 'column', lg: borrador ? 'column' : 'row' }} spacing={1.5} alignItems={{ lg: borrador ? 'flex-start' : 'center' }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h5" component="h1" fontWeight={600}>Editor de formularios{borrador ? ' · borrador' : ''}</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>{borrador
                                ? `Los cambios quedan en el borrador hasta que los publiques${hayPendientes ? ` (${borrador.pendientes.length} pendientes)` : ''}.`
                                : 'Arrastrá casilleros a la cancha, ordenalos y editá sus propiedades. Los cambios se guardan al instante.'}</Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <FormControl size="small" sx={{ minWidth: 140, bgcolor: alpha('#FFFFFF', 0.95), borderRadius: 1 }}>
                                <Select value={datos.operativo} disabled={hayPendientes} onChange={e => { setSeleccionado(null); traer(String(e.target.value)); }} inputProps={{ 'aria-label': 'operativo' }}>
                                    {datos.operativos.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <Tooltip title={historial.length ? `deshacer: ${historial[historial.length - 1].descripcion} (Ctrl+Z)` : 'nada para deshacer'}>
                                <span><IconButton sx={{ color: 'inherit' }} disabled={!historial.length || guardando} onClick={deshacer} aria-label="deshacer"><Icono path={ICONOS.deshacer} /></IconButton></span>
                            </Tooltip>
                            <Tooltip title={rehechos.length ? `rehacer: ${rehechos[rehechos.length - 1].descripcion} (Ctrl+Y)` : 'nada para rehacer'}>
                                <span><IconButton sx={{ color: 'inherit' }} disabled={!rehechos.length || guardando} onClick={rehacer} aria-label="rehacer"><Icono path={ICONOS.rehacer} /></IconButton></span>
                            </Tooltip>
                            {datos.permisos.estructura && !datos.cerrado ? <FormControlLabel sx={{ mr: 0, '& .MuiFormControlLabel-label': { color: 'inherit' }, '& .Mui-disabled': { color: 'inherit !important', opacity: 0.8 } }} label="borrador"
                                control={<Switch color="default" checked={borrador != null} disabled={hayPendientes || guardando}
                                    onChange={e => { setBorrador(e.target.checked ? { casilleros: datos!.casilleros, pendientes: [] } : null); setHistorial([]); setRehechos([]); }} />} /> : null}
                            {borrador ? <>
                                <Button variant="contained" color="inherit" sx={{ color: 'primary.main', bgcolor: '#FFF' }} disabled={!hayPendientes || guardando} onClick={publicar}>
                                    publicar{hayPendientes ? ` (${borrador.pendientes.length})` : ''}
                                </Button>
                                <Button color="inherit" disabled={!hayPendientes || guardando} onClick={() => { setBorrador({ casilleros: datos!.casilleros, pendientes: [] }); setHistorial([]); setRehechos([]); setVersionPrevia(v => v + 1); }}>descartar</Button>
                            </> : null}
                            <Chip clickable onClick={() => setVerProblemas(true)} label={resumenDeProblemas(problemas)}
                                sx={{ bgcolor: gravedadGeneral == 'error' ? COLOR_DE_GRAVEDAD.error : gravedadGeneral == 'falta' ? COLOR_DE_GRAVEDAD.falta : alpha('#FFFFFF', 0.2), color: '#FFF' }} />
                            <Tooltip title="versiones guardadas del formulario"><span>
                                <IconButton sx={{ color: 'inherit' }} disabled={raiz == null} onClick={() => setVerVersiones(true)} aria-label="versiones"><Icono path={ICONOS.historial} /></IconButton>
                            </span></Tooltip>
                            <Button variant="contained" color="inherit" startIcon={<Icono path={ICONOS.ojo} />} onClick={() => setVistaPrevia(true)}
                                sx={{ color: 'primary.main', bgcolor: '#FFF' }} disabled={raiz == null}>vista previa</Button>
                        </Stack>
                    </Stack>
                </Paper>
                {datos.cerrado ? <Alert severity="warning" sx={{ mb: 1.5 }}>El diseño de formularios de este operativo está cerrado (operativos.disform_cerrado): sólo se puede mirar.</Alert> : null}
                {!datos.permisos.estructura ? <Alert severity="info" sx={{ mb: 1.5 }}>Podés cambiar los textos de los casilleros. Agregar, mover o borrar casilleros lo hace el administrador.</Alert> : null}
                <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
                    <Tabs value={formulario ?? false} onChange={(_e, f: string) => { setFormulario(f); setSeleccionado(null); }} variant="scrollable" sx={{ flex: 1, minWidth: 0 }}>
                        {formularios.map(f => <Tab key={f.id_casillero} value={f.id_casillero} sx={{ textTransform: 'none' }}
                            label={<span><b>{f.casillero}</b> {f.nombre ? `· ${f.nombre}` : ''}{f.formulario_principal ? ' ★' : ''}</span>} />)}
                    </Tabs>
                    {datos.permisos.estructura && !datos.cerrado ? <Button size="small" startIcon={<Icono path={ICONOS.agregar} />} onClick={() => setFormularioNuevo(true)}>formulario</Button> : null}
                    <FormControlLabel sx={{ ml: 1 }} control={<Switch size="small" checked={verSaltos} onChange={e => setVerSaltos(e.target.checked)} />} label="saltos" />
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr) 360px' }, gap: 1.5, alignItems: 'start' }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, position: { md: 'sticky' }, top: 8, maxHeight: { md: 'calc(100vh - 230px)' }, overflowY: 'auto' }}>
                        <Paleta datos={datos} onEmpezar={setArrastre} onTerminar={() => setArrastre(null)} />
                    </Paper>
                    <Paper variant="outlined" onClick={() => setSeleccionado(null)}
                        sx={{ borderRadius: 2, minHeight: 400, maxHeight: { md: 'calc(100vh - 230px)' }, overflowY: 'auto', bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.02) }}>
                        <Box ref={cancha} sx={{ position: 'relative', p: 1.5, pr: verSaltos ? 6 : 1.5 }}>
                            {raiz ? <NodoCasillero {...propsCancha} casillero={raiz} /> : <Alert severity="info">El operativo no tiene formularios.</Alert>}
                            {verSaltos && raiz ? <FlechasDeSaltos contenedor={cancha} casilleros={delFormulario} version={`${versionPrevia}|${contraidos.size}|${formulario}|${arrastre?.origen ?? ''}`} /> : null}
                        </Box>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, position: { md: 'sticky' }, top: 8, maxHeight: { md: 'calc(100vh - 230px)' }, overflowY: 'auto' }}>
                        {casilleroSeleccionado ? <PanelPropiedades key={casilleroSeleccionado.id_casillero} casillero={casilleroSeleccionado} datos={datos} casilleros={casilleros} formulario={delFormulario} guardando={guardando}
                            problemas={problemasPorId.get(casilleroSeleccionado.id_casillero) ?? []}
                            onGuardar={cambios => {
                                var actual = casilleroSeleccionado!;
                                var idNuevo = cambios.casillero != null ? idQueTendria(buscarTipo(datos!.tipos, actual.tipoc), actual.padre, cambios.casillero) : actual.id_casillero;
                                aplicar([{ tipo: 'modificar', id_casillero: actual.id_casillero, cambios }], `se guardó ${actual.casillero}`, idNuevo,
                                    actual.padre == null ? { raizDespues: idNuevo } : {});
                            }}
                            onEliminar={() => setABorrar(casilleroSeleccionado)} />
                            : <Typography variant="body2" color="text.secondary">Elegí un casillero de la cancha para ver y cambiar sus propiedades.</Typography>}
                    </Paper>
                </Box>
            </Box>
            <DialogoAlta pedido={pedidoDeAlta} datos={datos} casilleros={casilleros} onCancelar={() => setPedidoDeAlta(null)} onCrear={(nuevo, posicion) => {
                setPedidoDeAlta(null);
                aplicar([{ tipo: 'crear', nuevo, posicion }], `se agregó ${nuevo.casillero}`, idQueTendria(buscarTipo(datos!.tipos, nuevo.tipoc), nuevo.padre, nuevo.casillero));
            }} />
            <DialogoFormularioNuevo abierto={formularioNuevo} datos={datos} casilleros={casilleros} onCancelar={() => setFormularioNuevo(false)} onCrear={nuevo => {
                setFormularioNuevo(false);
                var id = idQueTendria(buscarTipo(datos!.tipos, 'F'), null, nuevo.casillero);
                setFormulario(null);
                aplicar([{ tipo: 'crear', nuevo, posicion: null }], `se creó el formulario ${nuevo.casillero}`, id, { raizDespues: id });
            }} />
            <Dialog open={aBorrar != null} onClose={() => setABorrar(null)}>
                <DialogTitle>¿Borrar {aBorrar?.casillero}?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">Se borra el casillero {aBorrar?.id_casillero}
                        {aBorrar && descendientes(casilleros, aBorrar.id_casillero).length ? ` y los ${descendientes(casilleros, aBorrar.id_casillero).length} casilleros que tiene adentro` : ''}.
                        Las respuestas ya cargadas en esas variables no se borran, pero dejan de verse en el formulario. Se puede deshacer.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setABorrar(null)}>cancelar</Button>
                    <Button color="error" variant="contained" onClick={() => {
                        var borrado = aBorrar; setABorrar(null);
                        if (borrado) aplicar([{ tipo: 'eliminar', id_casillero: borrado.id_casillero }], `se borró ${borrado.casillero}`, null,
                            borrado.padre == null ? { raizDespues: null } : {});
                    }}>borrar</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={verProblemas} onClose={() => setVerProblemas(false)} maxWidth="md" fullWidth>
                <DialogTitle>Problemas del operativo {datos.operativo} · {resumenDeProblemas(problemas)}</DialogTitle>
                <DialogContent>
                    {problemas.length == 0 ? <Alert severity="success">No hay problemas.</Alert> : (['error', 'falta', 'aviso'] as Problema['gravedad'][]).map(gravedad => {
                        var deEsta = problemas.filter(p => p.gravedad == gravedad);
                        return deEsta.length ? <Box key={gravedad} sx={{ mb: 2 }}>
                            <Typography variant="overline" sx={{ color: COLOR_DE_GRAVEDAD[gravedad] }}>{gravedad == 'error' ? 'errores' : gravedad == 'falta' ? 'datos faltantes' : 'avisos'}</Typography>
                            {deEsta.map((p, i) => <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ py: 0.4, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                onClick={() => { setFormulario(formularioDe(casilleros, p.id_casillero)); setSeleccionado(p.id_casillero); setVerProblemas(false); }}>
                                <IconoDeProblema gravedad={p.gravedad} />
                                <Typography variant="body2" fontWeight={600} sx={{ minWidth: 160 }}>{p.id_casillero}</Typography>
                                <Typography variant="body2">{p.mensaje}</Typography>
                            </Stack>)}
                        </Box> : null;
                    })}
                </DialogContent>
                <DialogActions><Button onClick={() => setVerProblemas(false)}>cerrar</Button></DialogActions>
            </Dialog>
            <Drawer anchor="right" open={verVersiones} onClose={() => setVerVersiones(false)}>
                {verVersiones && raiz ? <PanelVersiones datos={datos} formulario={raiz} hayBorrador={hayPendientes} onAviso={setAviso}
                    onRestaurada={restaurados => { setDatos({ ...datos!, casilleros: restaurados }); setHistorial([]); setRehechos([]); setVersionPrevia(v => v + 1); }} /> : null}
            </Drawer>
            <Drawer anchor="right" open={vistaPrevia} onClose={() => setVistaPrevia(false)} PaperProps={{ sx: { width: { xs: '100vw', md: 520 } } }}>
                <Stack direction="row" alignItems="center" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, pl: 1 }}>Vista previa · {raiz?.casillero}{hayPendientes ? ' (borrador)' : ''}</Typography>
                    <Button size="small" onClick={() => setVersionPrevia(v => v + 1)}>recargar</Button>
                    <IconButton aria-label="cerrar" onClick={() => setVistaPrevia(false)}><Icono path={ICONOS.cerrar} /></IconButton>
                </Stack>
                {vistaPrevia && raiz ? <iframe ref={iframe} key={versionPrevia} title="vista previa del formulario" style={{ border: 0, flex: 1, width: '100%' }} src={urlPrevia} /> : null}
                <Divider />
                <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>{hayPendientes
                    ? 'Es la encuesta real con los cambios del borrador (sin guardarlos), sobre una encuesta vacía de prueba.'
                    : 'Es la encuesta real con el formulario guardado, sobre una encuesta vacía de prueba: lo que se responda acá no se guarda.'}</Typography>
            </Drawer>
            <Snackbar open={aviso != null} autoHideDuration={aviso?.tipo == 'error' ? 8000 : 2500} onClose={() => setAviso(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                {aviso ? <Alert severity={aviso.tipo} variant="filled" onClose={() => setAviso(null)}>{aviso.texto}</Alert> : undefined}
            </Snackbar>
        </ScopedCssBaseline>
    </ThemeProvider>;
}

myOwn.wScreens.editor_metadatos = async function () {
    var mainLayout = document.getElementById('main_layout')!;
    var contenedor = document.createElement('div');
    contenedor.className = 'editor-metadatos-contenedor';
    mainLayout.appendChild(contenedor);
    ReactDOM.render(<EditorMetadatos />, contenedor);
};

/* vista previa: la encuesta real sobre una encuesta vacía que vive sólo en memoria */

const IDPER_PREVISUALIZACION = 'previsualizacion';

// datos de una encuesta vacía para desplegar el formulario sin tocar la base ni el almacenamiento local
export function datosDePrevisualizacion(estructura: Estructura, enc: IdEnc, formulario: string): DatosByPassPersistibles {
    var hdr = estructura.defaultInformacionHdr;
    var datos: DatosByPassPersistibles = {
        respuestas: { [estructura.uaPpal]: { [enc]: {} } } as DatosByPassPersistibles['respuestas'],
        modoAlmacenamiento: 'session',
        persona: '',
        tarea: hdr.tarea.tarea,
        idper: IDPER_PREVISUALIZACION,
        cargas: {} as Cargas,
        informacionHdr: { [enc]: { tem: hdr.tem, tarea: { ...hdr.tarea, main_form: formulario } } } as InformacionHdr,
        soloLectura: false,
        timestampEstructura: estructura.timestamp,
    };
    return datos;
}

// en modo borrador la estructura la manda el editor (con los cambios pendientes aplicados y descartados en el servidor)
function estructuraDelEditor(): Promise<Estructura> {
    return new Promise((resolver, rechazar) => {
        var alMensaje = (evento: MessageEvent) => {
            if (evento.origin != location.origin || evento.source != window.parent) return;
            if (evento.data?.tipo == 'estructura-previa') { window.removeEventListener('message', alMensaje); resolver(evento.data.estructura); }
            if (evento.data?.tipo == 'estructura-previa-error') { window.removeEventListener('message', alMensaje); rechazar(new Error(evento.data.mensaje)); }
        };
        window.addEventListener('message', alMensaje);
        window.parent.postMessage({ tipo: 'previa-lista' }, location.origin);
    });
}

myOwn.wScreens.formulario_previsualizar = async function (addrParams) {
    var embebida = window.top != window;
    if (embebida) {
        // embebida en el editor: sin la barra del menú
        var barra = document.getElementById('main-top-bar');
        if (barra) barra.style.display = 'none';
    }
    var up: Record<string, string | boolean> = addrParams.up ?? {};
    var operativo = String(up.operativo);
    var estructura: Estructura = up.borrador === true && embebida ? await estructuraDelEditor() : await myOwn.ajax.operativo_estructura_completa({ operativo });
    // sólo los formularios de la unidad de análisis principal se abren directo; los demás se navegan desde él
    var idPedido = String(up.formulario);
    var pedido = estructura.formularios[idPedido as keyof Estructura['formularios']];
    var formulario = pedido != null && pedido.casilleros.unidad_analisis == estructura.uaPpal ? idPedido : estructura.defaultInformacionHdr.tarea.main_form;
    var encPrevia: IdEnc = 130031; // número cualquiera: la encuesta vive sólo en memoria
    var datos = datosDePrevisualizacion(estructura, encPrevia, formulario);
    var estadoCaso: CasoState | null = null;
    var formRenderer = createLocalStorageFormRenderer({
        getCasoState: () => estadoCaso!,
        setCasoState: (estado: CasoState) => { estadoCaso = estado; },
        getIdperLogueado: () => IDPER_PREVISUALIZACION,
        leerEstructura: async () => estructura,
        persistirEstructura: async (nueva: Estructura) => { estructura = nueva; },
        leerDatos: async () => datos,
        persistirDatos: async (nuevos: DatosByPassPersistibles) => { datos = nuevos; },
    });
    var forPkRaiz = { formulario, [estructura.pkAgregadaUaPpal]: encPrevia } as ForPkRaiz;
    await desplegarFormularioActual(formRenderer, { forPkRaiz });
};
