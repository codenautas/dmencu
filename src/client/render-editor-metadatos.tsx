// Editor visual de metadatos (configurar → metadatos → editor visual, ver docs/editor-metadatos.md):
// el formulario como árbol en una "cancha"; se arrastran tipos de casillero o plantillas desde la paleta, se mueven
// casilleros arrastrándolos, se editan en el panel de propiedades y se ve el resultado con el renderizador de la encuesta.

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as ReactDOM from "react-dom";
import {
    Alert, Badge, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    Divider, Drawer, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Paper, ScopedCssBaseline, Select,
    Snackbar, Stack, SvgIcon, Tab, Tabs, TextField, ThemeProvider, Tooltip, Typography, alpha
} from "@mui/material";
import type { Theme } from "@mui/material";

import {
    CambiosDeCasillero, CampoEditable, CasilleroEditable, DatosEditorMetadatos, descendientes, hijosDe, idQueTendria,
    NuevoCasillero, OperacionMetadatos, PLANTILLAS, PlantillaCasillero, Problema, problemasDelOperativo, proximoCodigo,
    puedeIncluir, buscarTipo, TipoCasillero, validarOperacion
} from "../unlogged/editor-metadatos-comun";
import type { Cargas, CasoState, DatosByPassPersistibles, Estructura, ForPkRaiz, IdEnc, InformacionHdr } from "../unlogged/tipos";
import type { PerfilTablero } from "../unlogged/tipos-tablero";
import { createLocalStorageFormRenderer } from "../unlogged/render-init";
import { desplegarFormularioActual } from "../unlogged/render-formulario";
import { temaDelPerfil } from "./render-tablero";

const PERFIL_INICIAL: PerfilTablero = {
    perfil: 'general', nombre: 'Gabinete', descripcion: '', colores: { primario: '#3F51B5', secundario: '#009688' }
};

// color de cada tipo de casillero en la cancha y en la paleta
export const COLOR_DEL_TIPO: { [tipoc: string]: string } = {
    F: '#455A64', B: '#5E35B1', CP: '#3949AB', P: '#1E88E5', O: '#00897B', OM: '#43A047', FILTRO: '#F4511E',
    CONS: '#E53935', TEXTO: '#757575', BF: '#8E24AA', FIN: '#6D4C41', MATRIZ: '#00ACC1', PMATRIZ: '#039BE5', LIBRE: '#9E9D24',
};
function colorDelTipo(tipoc: string): string {
    return COLOR_DEL_TIPO[tipoc] ?? '#607D8B';
}

const ICONOS = {
    expandir: "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z",
    contraer: "M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z",
    arrastrar: "M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
    error: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
    aviso: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
    ojo: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    cerrar: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
};

function Icono(props: { path: string, color?: string }) {
    return <SvgIcon fontSize="small" sx={{ color: props.color }}><path d={props.path} /></SvgIcon>;
}

function mensajeDeError(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

/* arrastre */

// lo que se está arrastrando: un tipo o una plantilla de la paleta, o un casillero de la cancha
export type Arrastre =
    | { origen: 'paleta', tipoc: string, plantilla: PlantillaCasillero | null }
    | { origen: 'cancha', id_casillero: string, tipoc: string };

export type LugarDeSoltado = { padre: string, posicion: number };

// si lo que se arrastra se puede soltar en ese lugar (inclusiones válidas y no adentro de sí mismo)
export function sePuedeSoltar(datos: Pick<DatosEditorMetadatos, 'casilleros' | 'inclusiones'>, arrastre: Arrastre, padre: CasilleroEditable): boolean {
    if (!puedeIncluir(datos.inclusiones, padre.tipoc, arrastre.tipoc)) return false;
    if (arrastre.origen == 'cancha') {
        if (arrastre.id_casillero == padre.id_casillero) return false;
        if (descendientes(datos.casilleros, arrastre.id_casillero).includes(padre.id_casillero)) return false;
    }
    return true;
}

// la posición entre los hermanos sin el casillero que se mueve (como la usa el servidor)
export function posicionSinElMovido(hermanos: CasilleroEditable[], arrastre: Arrastre, posicion: number): number {
    if (arrastre.origen != 'cancha') return posicion;
    var actual = hermanos.findIndex(h => h.id_casillero == arrastre.id_casillero);
    return actual >= 0 && actual < posicion ? posicion - 1 : posicion;
}

/* cancha */

type PropsCancha = {
    datos: DatosEditorMetadatos
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

function NodoCasillero(props: PropsCancha & { casillero: CasilleroEditable, nivel: number }) {
    var { casillero, datos } = props;
    var hijos = hijosDe(datos.casilleros, casillero.id_casillero);
    var tipo = buscarTipo(datos.tipos, casillero.tipoc);
    var color = colorDelTipo(casillero.tipoc);
    var problemas = props.problemasPorId.get(casillero.id_casillero) ?? [];
    var errores = problemas.filter(p => p.gravedad == 'error');
    var contraido = props.contraidos.has(casillero.id_casillero);
    var seleccionado = props.seleccionado == casillero.id_casillero;
    var esOpcion = casillero.tipoc == 'O';
    var zonasActivas = props.arrastre != null && sePuedeSoltar(datos, props.arrastre, casillero);
    var arrastrable = props.puedeArrastrar && casillero.padre != null;
    return <Box sx={{ mb: esOpcion ? 0.25 : 0.75 }}>
        <Paper elevation={0} onClick={evento => { evento.stopPropagation(); props.onSeleccionar(casillero.id_casillero); }}
            draggable={arrastrable}
            onDragStart={evento => {
                evento.stopPropagation();
                evento.dataTransfer.effectAllowed = 'move';
                evento.dataTransfer.setData('text/plain', casillero.id_casillero);
                props.onEmpezarArrastre({ origen: 'cancha', id_casillero: casillero.id_casillero, tipoc: casillero.tipoc });
            }}
            onDragEnd={props.onTerminarArrastre}
            sx={{
                display: 'flex', alignItems: 'center', gap: 1, px: 1, py: esOpcion ? 0.25 : 0.75, cursor: 'pointer',
                border: '1px solid', borderColor: seleccionado ? color : 'divider', borderLeft: `4px solid ${color}`,
                bgcolor: seleccionado ? alpha(color, 0.08) : casillero.es_activo ? 'background.paper' : 'action.disabledBackground',
                boxShadow: seleccionado ? `0 0 0 2px ${alpha(color, 0.25)}` : 'none',
                opacity: props.arrastre?.origen == 'cancha' && props.arrastre.id_casillero == casillero.id_casillero ? 0.4 : 1,
                '&:hover': { borderColor: color },
            }}>
            {arrastrable ? <Box sx={{ cursor: 'grab', display: 'flex', color: 'text.disabled' }} title="arrastrar"><Icono path={ICONOS.arrastrar} /></Box> : null}
            <Tooltip title={tipo?.denominacion ?? casillero.tipoc}>
                <Chip size="small" label={casillero.tipoc} sx={{ bgcolor: color, color: '#FFF', fontWeight: 700, height: 20, minWidth: 34 }} />
            </Tooltip>
            <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>{casillero.casillero}</Typography>
            <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }} title={casillero.nombre ?? ''}>
                {casillero.nombre ?? <Typography component="span" variant="body2" color="text.disabled">(sin texto)</Typography>}
            </Typography>
            {casillero.tipovar ? <Chip size="small" variant="outlined" label={casillero.tipovar} sx={{ height: 20 }} /> : null}
            {casillero.salto ? <Chip size="small" variant="outlined" color="secondary" label={`→ ${casillero.salto}`} sx={{ height: 20 }} /> : null}
            {casillero.expresion_habilitar ? <Tooltip title={`se habilita si: ${casillero.expresion_habilitar}`}><Chip size="small" label="filtro" sx={{ height: 20 }} /></Tooltip> : null}
            {problemas.length ? <Tooltip title={problemas.map(p => p.mensaje).join(' · ')}>
                <Box sx={{ display: 'flex' }}><Icono path={errores.length ? ICONOS.error : ICONOS.aviso} color={errores.length ? '#D32F2F' : '#ED6C02'} /></Box>
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
                <NodoCasillero {...props} casillero={hijo} nivel={props.nivel + 1} />
            </React.Fragment>)}
            {hijos.length ? <ZonaDeSoltado activa={zonasActivas} lugar={{ padre: casillero.id_casillero, posicion: hijos.length }} onSoltar={props.onSoltar} /> : null}
        </Box> : null}
    </Box>;
}

/* paleta */

function ItemPaleta(props: { titulo: string, detalle: string, tipoc: string, habilitado: boolean, onEmpezar: () => void, onTerminar: () => void }) {
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
            <Chip size="small" label={props.tipoc} sx={{ bgcolor: color, color: '#FFF', fontWeight: 700, height: 20, minWidth: 34 }} />
            <Typography variant="body2" noWrap>{props.titulo}</Typography>
        </Paper>
    </Tooltip>;
}

function Paleta(props: { datos: DatosEditorMetadatos, onEmpezar: (arrastre: Arrastre) => void, onTerminar: () => void }) {
    var { datos } = props;
    var habilitado = datos.permisos.estructura && !datos.cerrado;
    return <Box>
        <Typography variant="overline" color="text.secondary">plantillas</Typography>
        {PLANTILLAS.filter(p => buscarTipo(datos.tipos, p.tipoc) != null).map(p =>
            <ItemPaleta key={p.id} titulo={p.titulo} detalle={p.descripcion} tipoc={p.tipoc} habilitado={habilitado}
                onEmpezar={() => props.onEmpezar({ origen: 'paleta', tipoc: p.tipoc, plantilla: p })} onTerminar={props.onTerminar} />)}
        <Typography variant="overline" color="text.secondary" display="block" sx={{ mt: 1 }}>tipos de casillero</Typography>
        {datos.tipos.filter(t => t.tipoc != 'F').map(t =>
            <ItemPaleta key={t.tipoc} titulo={t.denominacion} detalle={`dentro de: ${datos.inclusiones.filter(i => i.hijo == t.tipoc).map(i => i.padre).join(', ') || 'ninguno'}`}
                tipoc={t.tipoc} habilitado={habilitado}
                onEmpezar={() => props.onEmpezar({ origen: 'paleta', tipoc: t.tipoc, plantilla: null })} onTerminar={props.onTerminar} />)}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Arrastrá a la cancha: sólo se marcan los lugares donde ese tipo puede ir (inclusiones de tipos de celdas).
        </Typography>
    </Box>;
}

/* panel de propiedades */

type DefinicionCampo = { campo: CampoEditable, titulo: string, tipo: 'texto' | 'largo' | 'booleano' | 'tipovar' | 'numero' | 'ua' | 'json', ayuda?: string };

const CAMPOS_PRINCIPALES: DefinicionCampo[] = [
    { campo: 'casillero', titulo: 'código', tipo: 'texto', ayuda: 'cambia el id del casillero y de sus hijos si no es irrepetible' },
    { campo: 'nombre', titulo: 'texto', tipo: 'largo' },
    { campo: 'aclaracion', titulo: 'aclaración', tipo: 'largo' },
    { campo: 'tipovar', titulo: 'tipo de variable', tipo: 'tipovar' },
    { campo: 'salto', titulo: 'salto', tipo: 'texto', ayuda: 'casillero al que salta al responder' },
    { campo: 'expresion_habilitar', titulo: 'se habilita si', tipo: 'texto' },
    { campo: 'optativo', titulo: 'optativo', tipo: 'booleano' },
    { campo: 'es_activo', titulo: 'activo', tipo: 'booleano' },
];

const CAMPOS_AVANZADOS: DefinicionCampo[] = [
    { campo: 'unidad_analisis', titulo: 'unidad de análisis', tipo: 'ua' },
    { campo: 'formulario_principal', titulo: 'formulario principal', tipo: 'booleano' },
    { campo: 'salto_ns_nc', titulo: 'salto si ns/nc', tipo: 'texto' },
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

function vacioANull(valor: string): string | null {
    return valor.trim() == '' ? null : valor;
}

function CampoDePropiedad(props: { definicion: DefinicionCampo, borrador: CasilleroEditable, datos: DatosEditorMetadatos, editable: boolean, onCambiar: (cambio: CambiosDeCasillero) => void }) {
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
            return <FormControl size="small" fullWidth disabled={!props.editable}>
                <InputLabel>{definicion.titulo}</InputLabel>
                <Select label={definicion.titulo} value={typeof valor == 'string' ? valor : ''} onChange={evento => cambiar(vacioANull(String(evento.target.value)))}>
                    <MenuItem value=""><em>(ninguno)</em></MenuItem>
                    {opciones.map(opcion => <MenuItem key={opcion} value={opcion}>{opcion}</MenuItem>)}
                </Select>
            </FormControl>;
        }
        case 'numero':
            return <TextField size="small" fullWidth label={definicion.titulo} type="number" disabled={!props.editable}
                value={typeof valor == 'number' ? valor : ''} onChange={evento => cambiar(evento.target.value == '' ? null : Number(evento.target.value))} />;
        default:
            return <TextField size="small" fullWidth label={definicion.titulo} disabled={!props.editable} helperText={definicion.ayuda}
                multiline={definicion.tipo == 'largo' || definicion.tipo == 'json'} minRows={definicion.tipo == 'json' ? 2 : 1}
                value={typeof valor == 'string' ? valor : ''}
                onChange={evento => cambiar(campo == 'casillero' ? evento.target.value : vacioANull(evento.target.value))}
                inputProps={{ style: definicion.tipo == 'json' ? { fontFamily: 'monospace', fontSize: 12 } : undefined }} />;
    }
}

function PanelPropiedades(props: {
    casillero: CasilleroEditable, datos: DatosEditorMetadatos, problemas: Problema[], guardando: boolean,
    onGuardar: (cambios: CambiosDeCasillero) => void, onEliminar: () => void
}) {
    var { casillero, datos } = props;
    var [borrador, setBorrador] = useState<CasilleroEditable>(casillero);
    var [avanzados, setAvanzados] = useState(false);
    useEffect(() => setBorrador(casillero), [casillero]);
    var tipo = buscarTipo(datos.tipos, casillero.tipoc);
    var cambios = cambiosDelBorrador(casillero, borrador);
    var hayCambios = Object.keys(cambios).length > 0;
    var editableCampo = (campo: CampoEditable) => !datos.cerrado && (datos.permisos.estructura || datos.permisos.textos && (campo == 'nombre' || campo == 'aclaracion'));
    var cantidadDescendientes = descendientes(datos.casilleros, casillero.id_casillero).length;
    return <Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Chip size="small" label={casillero.tipoc} sx={{ bgcolor: colorDelTipo(casillero.tipoc), color: '#FFF', fontWeight: 700 }} />
            <Typography variant="subtitle1" fontWeight={600}>{tipo?.denominacion ?? casillero.tipoc}</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block">id: {casillero.id_casillero}{casillero.var_name ? ` · variable: ${casillero.var_name}` : ''}</Typography>
        {props.problemas.map((p, i) => <Alert key={i} severity={p.gravedad == 'error' ? 'error' : 'warning'} sx={{ mt: 1, py: 0 }}>{p.mensaje}</Alert>)}
        <Stack spacing={1.5} sx={{ mt: 2 }}>
            {CAMPOS_PRINCIPALES.filter(d => d.campo != 'tipovar' || tipo?.puedeSerVar !== false).map(d =>
                <CampoDePropiedad key={d.campo} definicion={d} borrador={borrador} datos={datos} editable={editableCampo(d.campo)}
                    onCambiar={cambio => setBorrador(previo => ({ ...previo, ...cambio }))} />)}
            <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => setAvanzados(!avanzados)}>{avanzados ? 'menos campos' : 'más campos'}</Button>
            {avanzados ? CAMPOS_AVANZADOS.filter(d => (d.campo != 'unidad_analisis' && d.campo != 'formulario_principal') || casillero.tipoc == 'F').map(d =>
                <CampoDePropiedad key={d.campo} definicion={d} borrador={borrador} datos={datos} editable={editableCampo(d.campo)}
                    onCambiar={cambio => setBorrador(previo => ({ ...previo, ...cambio }))} />) : null}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" disabled={!hayCambios || props.guardando} onClick={() => props.onGuardar(cambios)}>
                {props.guardando ? 'guardando…' : 'guardar'}
            </Button>
            <Button disabled={!hayCambios || props.guardando} onClick={() => setBorrador(casillero)}>descartar</Button>
            <Box sx={{ flex: 1 }} />
            {datos.permisos.estructura && casillero.padre != null ?
                <Button color="error" disabled={datos.cerrado || props.guardando} onClick={props.onEliminar}>
                    borrar{cantidadDescendientes ? ` (+${cantidadDescendientes})` : ''}
                </Button> : null}
        </Stack>
    </Box>;
}

/* alta de un casillero al soltar desde la paleta */

type PedidoDeAlta = { arrastre: Extract<Arrastre, { origen: 'paleta' }>, lugar: LugarDeSoltado };

function DialogoAlta(props: { pedido: PedidoDeAlta | null, datos: DatosEditorMetadatos, onCancelar: () => void, onCrear: (nuevo: NuevoCasillero, posicion: number) => void }) {
    var { pedido, datos } = props;
    var [codigo, setCodigo] = useState('');
    var [nombre, setNombre] = useState('');
    var [tipovar, setTipovar] = useState('');
    useEffect(() => {
        if (pedido) {
            setCodigo(proximoCodigo(datos.casilleros, pedido.arrastre.tipoc, pedido.lugar.padre));
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
    var motivo = validarOperacion(datos, { tipo: 'crear', nuevo, posicion: posicionPedida });
    return <Dialog open onClose={props.onCancelar} maxWidth="xs" fullWidth>
        <DialogTitle>Nuevo/a {pedido.arrastre.plantilla?.titulo ?? tipo?.denominacion}</DialogTitle>
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

/* pantalla */

export function EditorMetadatos() {
    var [datos, setDatos] = useState<DatosEditorMetadatos | null>(null);
    var [error, setError] = useState<string | null>(null);
    var [formulario, setFormulario] = useState<string | null>(null);
    var [seleccionado, setSeleccionado] = useState<string | null>(null);
    var [arrastre, setArrastre] = useState<Arrastre | null>(null);
    var [contraidos, setContraidos] = useState<Set<string>>(new Set());
    var [guardando, setGuardando] = useState(false);
    var [aviso, setAviso] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null);
    var [pedidoDeAlta, setPedidoDeAlta] = useState<PedidoDeAlta | null>(null);
    var [aBorrar, setABorrar] = useState<CasilleroEditable | null>(null);
    var [vistaPrevia, setVistaPrevia] = useState(false);
    var [versionPrevia, setVersionPrevia] = useState(0);
    var [verProblemas, setVerProblemas] = useState(false);

    var traer = useCallback(async (operativo: string | null) => {
        try {
            var nuevos: DatosEditorMetadatos = await myOwn.ajax.editor_metadatos_traer({ operativo });
            setDatos(nuevos);
            var formularios = nuevos.casilleros.filter(c => c.padre == null);
            setFormulario(previo => formularios.some(f => f.id_casillero == previo) ? previo : (formularios.find(f => f.formulario_principal)?.id_casillero ?? formularios[0]?.id_casillero ?? null));
        } catch (err) {
            setError(mensajeDeError(err));
        }
    }, []);
    useEffect(() => { traer(null); }, [traer]);

    var perfil = datos?.perfil ?? PERFIL_INICIAL;
    var tema = useMemo(() => temaDelPerfil(perfil), [perfil]);
    var problemas = useMemo(() => datos ? problemasDelOperativo(datos.casilleros, datos.tipos, datos.inclusiones) : [], [datos]);
    var problemasPorId = useMemo(() => {
        var mapa: Map<string, Problema[]> = new Map();
        problemas.forEach(p => mapa.set(p.id_casillero, [...(mapa.get(p.id_casillero) ?? []), p]));
        return mapa;
    }, [problemas]);

    var aplicar = async (operaciones: OperacionMetadatos[], textoOk: string, seleccionar?: string | null) => {
        if (datos == null) return;
        for (var operacion of operaciones) {
            var motivo = validarOperacion(datos, operacion);
            if (motivo) { setAviso({ tipo: 'error', texto: motivo }); return; }
        }
        setGuardando(true);
        try {
            var casilleros: CasilleroEditable[] = await myOwn.ajax.editor_metadatos_aplicar({ operativo: datos.operativo, operaciones });
            setDatos({ ...datos, casilleros });
            if (seleccionar !== undefined) setSeleccionado(seleccionar);
            setVersionPrevia(v => v + 1);
            setAviso({ tipo: 'success', texto: textoOk });
        } catch (err) {
            setAviso({ tipo: 'error', texto: mensajeDeError(err) });
        } finally {
            setGuardando(false);
        }
    };

    var soltar = (lugar: LugarDeSoltado) => {
        if (datos == null || arrastre == null) return;
        var actual = arrastre;
        setArrastre(null);
        if (actual.origen == 'paleta') {
            setPedidoDeAlta({ arrastre: actual, lugar });
            return;
        }
        var idArrastrado = actual.id_casillero;
        var movido = datos.casilleros.find(c => c.id_casillero == idArrastrado);
        if (movido == null) return;
        var hermanos = hijosDe(datos.casilleros, lugar.padre);
        var posicion = posicionSinElMovido(hermanos, actual, lugar.posicion);
        if (movido.padre == lugar.padre && hermanos.findIndex(h => h.id_casillero == movido!.id_casillero) == posicion) return;
        var tipo = buscarTipo(datos.tipos, movido.tipoc);
        aplicar([{ tipo: 'mover', id_casillero: movido.id_casillero, padre: lugar.padre, posicion }], `se movió ${movido.casillero}`,
            idQueTendria(tipo, lugar.padre, movido.casillero));
    };

    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    if (datos == null) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;

    var formularios = datos.casilleros.filter(c => c.padre == null).sort((a, b) => a.casillero.localeCompare(b.casillero, 'es', { numeric: true }));
    var raiz = datos.casilleros.find(c => c.id_casillero == formulario) ?? null;
    var casilleroSeleccionado = datos.casilleros.find(c => c.id_casillero == seleccionado) ?? null;
    var errores = problemas.filter(p => p.gravedad == 'error').length;
    var propsCancha: PropsCancha = {
        datos, problemasPorId, arrastre, seleccionado, contraidos, puedeArrastrar: datos.permisos.estructura && !datos.cerrado,
        onSeleccionar: setSeleccionado,
        onAlternarContraido: id => setContraidos(previo => { var nuevo = new Set(previo); if (nuevo.has(id)) { nuevo.delete(id); } else { nuevo.add(id); } return nuevo; }),
        onEmpezarArrastre: setArrastre, onTerminarArrastre: () => setArrastre(null), onSoltar: soltar,
    };

    return <ThemeProvider theme={tema}>
        <ScopedCssBaseline sx={{ bgcolor: 'background.default', minHeight: '100%' }}>
            <Box sx={{ p: { xs: 1, md: 2 } }}>
                <Paper elevation={0} sx={{
                    p: 2, mb: 1.5, borderRadius: 3, color: 'primary.contrastText',
                    background: (theme: Theme) => `linear-gradient(115deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h5" component="h1" fontWeight={600}>Editor de formularios</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>Arrastrá casilleros a la cancha, ordenalos y editá sus propiedades. Los cambios se guardan al instante.</Typography>
                        </Box>
                        <FormControl size="small" sx={{ minWidth: 160, bgcolor: alpha('#FFFFFF', 0.95), borderRadius: 1 }}>
                            <Select value={datos.operativo} onChange={e => { setSeleccionado(null); traer(String(e.target.value)); }} inputProps={{ 'aria-label': 'operativo' }}>
                                {datos.operativos.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Chip clickable onClick={() => setVerProblemas(true)} label={errores ? `${errores} errores · ${problemas.length - errores} avisos` : problemas.length ? `${problemas.length} avisos` : 'sin problemas'}
                            sx={{ bgcolor: errores ? '#D32F2F' : alpha('#FFFFFF', 0.2), color: '#FFF' }} />
                        <Button variant="contained" color="inherit" startIcon={<Icono path={ICONOS.ojo} />} onClick={() => setVistaPrevia(true)}
                            sx={{ color: 'primary.main', bgcolor: '#FFF' }} disabled={raiz == null}>vista previa</Button>
                    </Stack>
                </Paper>
                {datos.cerrado ? <Alert severity="warning" sx={{ mb: 1.5 }}>El diseño de formularios de este operativo está cerrado (operativos.disform_cerrado): sólo se puede mirar.</Alert> : null}
                {!datos.permisos.estructura ? <Alert severity="info" sx={{ mb: 1.5 }}>Podés cambiar los textos de los casilleros. Agregar, mover o borrar casilleros lo hace el administrador.</Alert> : null}
                <Tabs value={formulario ?? false} onChange={(_e, f: string) => { setFormulario(f); setSeleccionado(null); }} variant="scrollable" sx={{ mb: 1 }}>
                    {formularios.map(f => <Tab key={f.id_casillero} value={f.id_casillero} sx={{ textTransform: 'none' }}
                        label={<span><b>{f.casillero}</b> {f.nombre ? `· ${f.nombre}` : ''}{f.formulario_principal ? ' ★' : ''}</span>} />)}
                </Tabs>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '210px minmax(0, 1fr) 340px' }, gap: 1.5, alignItems: 'start' }}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, position: { md: 'sticky' }, top: 8, maxHeight: { md: 'calc(100vh - 230px)' }, overflowY: 'auto' }}>
                        <Paleta datos={datos} onEmpezar={setArrastre} onTerminar={() => setArrastre(null)} />
                    </Paper>
                    <Paper variant="outlined" onClick={() => setSeleccionado(null)}
                        sx={{ p: 1.5, borderRadius: 2, minHeight: 400, maxHeight: { md: 'calc(100vh - 230px)' }, overflowY: 'auto', bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.02) }}>
                        {raiz ? <NodoCasillero {...propsCancha} casillero={raiz} nivel={0} /> : <Alert severity="info">El operativo no tiene formularios.</Alert>}
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, position: { md: 'sticky' }, top: 8, maxHeight: { md: 'calc(100vh - 230px)' }, overflowY: 'auto' }}>
                        {casilleroSeleccionado ? <PanelPropiedades casillero={casilleroSeleccionado} datos={datos} guardando={guardando}
                            problemas={problemasPorId.get(casilleroSeleccionado.id_casillero) ?? []}
                            onGuardar={cambios => {
                                var tipo = buscarTipo(datos!.tipos, casilleroSeleccionado!.tipoc);
                                var idNuevo = cambios.casillero != null ? idQueTendria(tipo, casilleroSeleccionado!.padre, cambios.casillero) : casilleroSeleccionado!.id_casillero;
                                aplicar([{ tipo: 'modificar', id_casillero: casilleroSeleccionado!.id_casillero, cambios }], `se guardó ${casilleroSeleccionado!.casillero}`,
                                    casilleroSeleccionado!.padre == null && cambios.casillero != null ? null : idNuevo);
                            }}
                            onEliminar={() => setABorrar(casilleroSeleccionado)} />
                            : <Typography variant="body2" color="text.secondary">Elegí un casillero de la cancha para ver y cambiar sus propiedades.</Typography>}
                    </Paper>
                </Box>
            </Box>
            <DialogoAlta pedido={pedidoDeAlta} datos={datos} onCancelar={() => setPedidoDeAlta(null)} onCrear={(nuevo, posicion) => {
                setPedidoDeAlta(null);
                aplicar([{ tipo: 'crear', nuevo, posicion }], `se agregó ${nuevo.casillero}`, idQueTendria(buscarTipo(datos!.tipos, nuevo.tipoc), nuevo.padre, nuevo.casillero));
            }} />
            <Dialog open={aBorrar != null} onClose={() => setABorrar(null)}>
                <DialogTitle>¿Borrar {aBorrar?.casillero}?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">Se borra el casillero {aBorrar?.id_casillero}
                        {aBorrar && descendientes(datos.casilleros, aBorrar.id_casillero).length ? ` y los ${descendientes(datos.casilleros, aBorrar.id_casillero).length} casilleros que tiene adentro` : ''}.
                        Las respuestas ya cargadas en esas variables no se borran, pero dejan de verse en el formulario.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setABorrar(null)}>cancelar</Button>
                    <Button color="error" variant="contained" onClick={() => {
                        var borrado = aBorrar; setABorrar(null);
                        if (borrado) aplicar([{ tipo: 'eliminar', id_casillero: borrado.id_casillero }], `se borró ${borrado.casillero}`, null);
                    }}>borrar</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={verProblemas} onClose={() => setVerProblemas(false)} maxWidth="md" fullWidth>
                <DialogTitle>Problemas del operativo {datos.operativo}</DialogTitle>
                <DialogContent>
                    {problemas.length == 0 ? <Alert severity="success">No hay problemas.</Alert> : problemas.map((p, i) =>
                        <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ py: 0.5, cursor: 'pointer' }}
                            onClick={() => {
                                var raizDelProblema = p.id_casillero;
                                var actual = datos!.casilleros.find(c => c.id_casillero == raizDelProblema);
                                while (actual?.padre) { raizDelProblema = actual.padre; actual = datos!.casilleros.find(c => c.id_casillero == raizDelProblema); }
                                setFormulario(raizDelProblema); setSeleccionado(p.id_casillero); setVerProblemas(false);
                            }}>
                            <Icono path={p.gravedad == 'error' ? ICONOS.error : ICONOS.aviso} color={p.gravedad == 'error' ? '#D32F2F' : '#ED6C02'} />
                            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 160 }}>{p.id_casillero}</Typography>
                            <Typography variant="body2">{p.mensaje}</Typography>
                        </Stack>)}
                </DialogContent>
                <DialogActions><Button onClick={() => setVerProblemas(false)}>cerrar</Button></DialogActions>
            </Dialog>
            <Drawer anchor="right" open={vistaPrevia} onClose={() => setVistaPrevia(false)} PaperProps={{ sx: { width: { xs: '100vw', md: 520 } } }}>
                <Stack direction="row" alignItems="center" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, pl: 1 }}>Vista previa · {raiz?.casillero}</Typography>
                    <Button size="small" onClick={() => setVersionPrevia(v => v + 1)}>recargar</Button>
                    <IconButton aria-label="cerrar" onClick={() => setVistaPrevia(false)}><Icono path={ICONOS.cerrar} /></IconButton>
                </Stack>
                {vistaPrevia && raiz ? <iframe key={versionPrevia} title="vista previa del formulario" style={{ border: 0, flex: 1, width: '100%' }}
                    src={location.pathname + my.menuSeparator + `w=formulario_previsualizar&up=${encodeURIComponent(JSON.stringify({ operativo: datos.operativo, formulario: raiz.id_casillero }))}&autoproced=true`} /> : null}
                <Divider />
                <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>Es la encuesta real con el formulario guardado, sobre una encuesta vacía de prueba: lo que se responda acá no se guarda.</Typography>
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

/* vista previa: la encuesta real con el formulario guardado, sobre una encuesta vacía que vive sólo en memoria */

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

myOwn.wScreens.formulario_previsualizar = async function (addrParams) {
    if (window.top != window) {
        // embebida en el editor: sin la barra del menú
        var barra = document.getElementById('main-top-bar');
        if (barra) barra.style.display = 'none';
    }
    var up: Record<string, string> = addrParams.up ?? {};
    var estructura: Estructura = await myOwn.ajax.operativo_estructura_completa({ operativo: up.operativo });
    // sólo los formularios de la unidad de análisis principal se abren directo; los demás se navegan desde él
    var pedido = estructura.formularios[up.formulario as keyof Estructura['formularios']];
    var formulario = pedido != null && pedido.casilleros.unidad_analisis == estructura.uaPpal ? up.formulario : estructura.defaultInformacionHdr.tarea.main_form;
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
