// Pantallas de asignación (general por área y por tarea) y de recepción por persona (ver docs/asignacion-recepcion.md).
// Los datos y los cambios pasan por los procedimientos de src/server/asignacion.ts; las reglas las validan los triggers de la base.

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as ReactDOM from "react-dom";
import {
    Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, InputAdornment, InputLabel, List, ListItemButton, ListItemText, MenuItem, Paper, ScopedCssBaseline, Select,
    Snackbar, Stack, SvgIcon, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Tabs,
    TextField, ThemeProvider, Tooltip, Typography, alpha
} from "@mui/material";
import type { Theme } from "@mui/material";

import type {
    AccionDisponible, AreaAsignacion, CambioDeArea, CambioDeEncuestas, ContextoAsignacion, EncuestaAsignacion,
    EncuestaRecepcion, PersonaAsignable, PersonaRecepcion, ResultadoDeCambio, TareaAsignable
} from "../unlogged/tipos-asignacion";
import type { PerfilTablero } from "../unlogged/tipos-tablero";
import { temaDelPerfil } from "./render-tablero";

/* comunes */

const PERFIL_INICIAL: PerfilTablero = {
    perfil: 'general', nombre: 'Gabinete', descripcion: '', colores: { primario: '#3F51B5', secundario: '#009688' }
};

const ICONO_BUSCAR = "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z";
const ICONO_DISPOSITIVO = "M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z";

function Icono(props: { path: string, viewBox?: string }) {
    return <SvgIcon fontSize="small" viewBox={props.viewBox}><path d={props.path} /></SvgIcon>;
}

export function mensajeDeError(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

function normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function coincide(texto: string, busqueda: string): boolean {
    return normalizar(texto).includes(normalizar(busqueda.trim()));
}

function nombreDe(personas: PersonaAsignable[], idper: string | null): string {
    if (idper == null) return '';
    return personas.find(p => p.idper == idper)?.nombre ?? idper;
}

function abrirEncuesta(operativo: string, tarea: string, enc: string) {
    var up = { operativo, tarea, enc: Number(enc) };
    window.open(location.origin + location.pathname + my.menuSeparator + `w=abrir_encuesta&up=${JSON.stringify(up)}&autoproced=true`, '_abrir');
}

// selector de persona: primero las del rol sugerido para la tarea, después las demás
function SelectorPersona(props: {
    etiqueta: string, personas: PersonaAsignable[], valor: string | null, rolSugerido?: string | null,
    onCambiar: (idper: string | null) => void, deshabilitado?: boolean, ancho?: number, compacto?: boolean
}) {
    var ordenadas = useMemo(() => props.rolSugerido
        ? [...props.personas.filter(p => p.rol == props.rolSugerido), ...props.personas.filter(p => p.rol != props.rolSugerido)]
        : props.personas, [props.personas, props.rolSugerido]);
    var valor = props.personas.find(p => p.idper == props.valor) ?? null;
    return <Autocomplete size="small" options={ordenadas} value={valor} disabled={props.deshabilitado}
        groupBy={props.rolSugerido ? (p => p.rol == props.rolSugerido ? `${props.rolSugerido}` : 'otros roles') : undefined}
        getOptionLabel={p => p.nombre} isOptionEqualToValue={(a, b) => a.idper == b.idper}
        filterOptions={(opciones, estado) => opciones.filter(p => coincide(`${p.nombre} ${p.usuario} ${p.idper}`, estado.inputValue))}
        renderOption={(atributos, p) => <li {...atributos} key={p.idper}>
            <Box><Typography variant="body2">{p.nombre}</Typography>
                <Typography variant="caption" color="text.secondary">{p.usuario}{p.dispositivo ? ` · dm ${p.dispositivo}` : ''}</Typography></Box>
        </li>}
        onChange={(_evento, persona) => props.onCambiar(persona?.idper ?? null)}
        renderInput={parametros => <TextField {...parametros} label={props.compacto ? undefined : props.etiqueta}
            placeholder={props.compacto ? props.etiqueta : undefined} inputProps={{ ...parametros.inputProps, 'aria-label': props.etiqueta }} />}
        sx={{ width: props.ancho ?? 240, bgcolor: 'background.paper' }} />;
}

function Encabezado(props: { titulo: string, descripcion: string, contexto: ContextoAsignacion | null }) {
    return <Paper elevation={0} sx={{
        p: { xs: 2, md: 2.5 }, mb: 2, borderRadius: 3, color: 'primary.contrastText',
        background: (theme: Theme) => `linear-gradient(115deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
    }}>
        <Typography variant="h5" component="h1" fontWeight={600}>{props.titulo}</Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>{props.descripcion}</Typography>
        {props.contexto?.soloComoRecepcionista ? <Chip size="small" label="sólo las encuestas que tenés a cargo como recepcionista"
            sx={{ mt: 1, bgcolor: alpha('#FFFFFF', 0.18), color: 'inherit' }} /> : null}
    </Paper>;
}

// resultado de un cambio masivo: cuántos se aplicaron y el motivo de cada uno que no (lo que dijo la base)
function DialogoResultado(props: { titulo: string, resultados: ResultadoDeCambio[] | null, nombreDeClave: string, onCerrar: () => void }) {
    var resultados = props.resultados ?? [];
    var errores = resultados.filter(r => !r.ok);
    return <Dialog open={props.resultados != null && errores.length > 0} onClose={props.onCerrar} maxWidth="sm" fullWidth>
        <DialogTitle>{props.titulo}</DialogTitle>
        <DialogContent>
            <Alert severity={errores.length == resultados.length ? 'error' : 'warning'} sx={{ mb: 2 }}>
                Se aplicó en {resultados.length - errores.length} de {resultados.length}. {errores.length == 1 ? 'Una no se pudo' : `${errores.length} no se pudieron`} cambiar:
            </Alert>
            <Table size="small">
                <TableHead><TableRow><TableCell>{props.nombreDeClave}</TableCell><TableCell>motivo</TableCell></TableRow></TableHead>
                <TableBody>
                    {errores.map(r => <TableRow key={r.clave}><TableCell>{r.clave}</TableCell><TableCell>{r.mensaje}</TableCell></TableRow>)}
                </TableBody>
            </Table>
        </DialogContent>
        <DialogActions><Button onClick={props.onCerrar}>cerrar</Button></DialogActions>
    </Dialog>;
}

type Aviso = { tipo: 'success' | 'error' | 'info', texto: string };

function useAviso(): [React.ReactElement, (aviso: Aviso) => void] {
    var [aviso, setAviso] = useState<Aviso | null>(null);
    var elemento = <Snackbar open={aviso != null} autoHideDuration={aviso?.tipo == 'error' ? 8000 : 4000} onClose={() => setAviso(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {aviso ? <Alert severity={aviso.tipo} variant="filled" onClose={() => setAviso(null)}>{aviso.texto}</Alert> : undefined}
    </Snackbar>;
    return [elemento, setAviso];
}

function avisoDeResultados(resultados: ResultadoDeCambio[], que: string): Aviso {
    var ok = resultados.filter(r => r.ok).length;
    return ok == resultados.length
        ? { tipo: 'success', texto: `${que}: ${ok} ${ok == 1 ? 'cambio aplicado' : 'cambios aplicados'}` }
        : { tipo: ok ? 'info' : 'error', texto: `${que}: se aplicó en ${ok} de ${resultados.length}` };
}

// marco común: trae el contexto, arma el tema del perfil y muestra el encabezado
function Pantalla(props: { titulo: string, descripcion: string, children: (contexto: ContextoAsignacion) => React.ReactNode }) {
    var [contexto, setContexto] = useState<ContextoAsignacion | null>(null);
    var [error, setError] = useState<string | null>(null);
    useEffect(() => {
        myOwn.ajax.asignacion_contexto_traer({}).then(
            (resultado: ContextoAsignacion) => setContexto(resultado),
            (err: unknown) => setError(mensajeDeError(err))
        );
    }, []);
    var perfil = contexto?.perfil ?? PERFIL_INICIAL;
    var tema = useMemo(() => temaDelPerfil(perfil), [perfil]);
    return <ThemeProvider theme={tema}>
        <ScopedCssBaseline sx={{ bgcolor: 'background.default', minHeight: '100%' }}>
            <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
                <Encabezado titulo={props.titulo} descripcion={props.descripcion} contexto={contexto} />
                {error ? <Alert severity="error">{error}</Alert> :
                    contexto == null ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box> :
                        contexto.tareas.length == 0 ? <Alert severity="info">El operativo no tiene tareas para asignar.</Alert> :
                            props.children(contexto)}
            </Box>
        </ScopedCssBaseline>
    </ThemeProvider>;
}

function SelectorDeTarea(props: { tareas: TareaAsignable[], tarea: string, onCambiar: (tarea: string) => void, conteos?: { [tarea: string]: number } }) {
    return <Tabs value={props.tarea} onChange={(_evento, tarea: string) => props.onCambiar(tarea)} variant="scrollable" sx={{ mb: 2 }}>
        {props.tareas.map(t => <Tab key={t.tarea} value={t.tarea} label={t.nombre} sx={{ textTransform: 'none', fontWeight: 600 }} />)}
    </Tabs>;
}

function Buscador(props: { valor: string, onCambiar: (valor: string) => void, etiqueta: string, ancho?: number }) {
    return <TextField size="small" placeholder={props.etiqueta} value={props.valor} onChange={evento => props.onCambiar(evento.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Icono path={ICONO_BUSCAR} /></InputAdornment> }}
        inputProps={{ 'aria-label': props.etiqueta }} sx={{ bgcolor: 'background.paper', width: props.ancho ?? 240 }} />;
}

// barra que aparece al seleccionar filas, para aplicar el mismo cambio a todas
function BarraDeSeleccion(props: { cantidad: string, children: React.ReactNode, onLimpiar: () => void }) {
    return <Paper elevation={0} sx={{
        p: 1.5, mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center',
        bgcolor: (theme: Theme) => alpha(theme.palette.primary.main, 0.08), border: '1px solid', borderColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.3)
    }}>
        <Typography variant="body2" fontWeight={600} sx={{ mr: 1 }}>{props.cantidad}</Typography>
        {props.children}
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={props.onLimpiar}>quitar selección</Button>
    </Paper>;
}

function useSeleccion(): { seleccionadas: Set<string>, alternar: (clave: string) => void, poner: (claves: string[]) => void, limpiar: () => void } {
    var [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
    return {
        seleccionadas,
        alternar: clave => setSeleccionadas(previo => { var nuevo = new Set(previo); if (nuevo.has(clave)) { nuevo.delete(clave); } else { nuevo.add(clave); } return nuevo; }),
        poner: claves => setSeleccionadas(new Set(claves)),
        limpiar: () => setSeleccionadas(new Set()),
    };
}

/* asignación general: áreas de una tarea */

function AsignacionGeneral(props: { contexto: ContextoAsignacion }) {
    var { contexto } = props;
    var [tarea, setTarea] = useState(contexto.tareas[0].tarea);
    var [areas, setAreas] = useState<AreaAsignacion[] | null>(null);
    var [busqueda, setBusqueda] = useState('');
    var [soloSinAsignar, setSoloSinAsignar] = useState(false);
    var [resultados, setResultados] = useState<ResultadoDeCambio[] | null>(null);
    var [guardando, setGuardando] = useState(false);
    var [recepcionistaMasivo, setRecepcionistaMasivo] = useState<string | null>(null);
    var [asignadoMasivo, setAsignadoMasivo] = useState<string | null>(null);
    var seleccion = useSeleccion();
    var [aviso, mostrarAviso] = useAviso();
    var datosTarea = contexto.tareas.find(t => t.tarea == tarea)!;

    var traer = useCallback(async () => {
        try {
            setAreas(await myOwn.ajax.asignacion_areas_traer({}));
        } catch (err) {
            mostrarAviso({ tipo: 'error', texto: mensajeDeError(err) });
        }
    }, []);
    useEffect(() => { traer(); }, [traer]);

    var cambiar = async (cambios: CambioDeArea[]) => {
        setGuardando(true);
        try {
            var resultado: ResultadoDeCambio[] = await myOwn.ajax.asignacion_areas_cambiar({ cambios });
            setResultados(resultado);
            mostrarAviso(avisoDeResultados(resultado, 'asignación'));
            await traer();
        } catch (err) {
            mostrarAviso({ tipo: 'error', texto: mensajeDeError(err) });
        } finally {
            setGuardando(false);
        }
    };

    var visibles = (areas ?? []).filter(area => {
        var asignacion = area.porTarea[tarea];
        return (!busqueda || coincide(`${area.area} ${area.comunas ?? ''} ${nombreDe(contexto.personas, asignacion?.asignado ?? null)}`, busqueda))
            && (!soloSinAsignar || asignacion?.asignado == null);
    });
    var todasSeleccionadas = visibles.length > 0 && visibles.every(area => seleccion.seleccionadas.has(String(area.area)));

    return <>
        <SelectorDeTarea tareas={contexto.tareas} tarea={tarea} onCambiar={nueva => { setTarea(nueva); seleccion.limpiar(); }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
            <Buscador valor={busqueda} onCambiar={setBusqueda} etiqueta="buscar área, comuna o persona" ancho={280} />
            <Chip label="sólo áreas sin asignar" color={soloSinAsignar ? 'primary' : 'default'} variant={soloSinAsignar ? 'filled' : 'outlined'}
                onClick={() => setSoloSinAsignar(!soloSinAsignar)} />
            <Box sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary">{visibles.length} áreas</Typography>
        </Stack>
        {seleccion.seleccionadas.size ? <BarraDeSeleccion cantidad={`${seleccion.seleccionadas.size} áreas seleccionadas`} onLimpiar={seleccion.limpiar}>
            <SelectorPersona etiqueta="recepcionista" personas={contexto.recepcionistas} valor={recepcionistaMasivo} onCambiar={setRecepcionistaMasivo} />
            <SelectorPersona etiqueta={datosTarea.nombre} personas={contexto.personas} valor={asignadoMasivo} rolSugerido={datosTarea.rolSugerido} onCambiar={setAsignadoMasivo} />
            <Button variant="contained" disabled={guardando || (recepcionistaMasivo == null && asignadoMasivo == null)} onClick={() => cambiar(
                Array.from(seleccion.seleccionadas).map(area => ({
                    area: Number(area), tarea,
                    ...(recepcionistaMasivo != null ? { recepcionista: recepcionistaMasivo } : {}),
                    ...(asignadoMasivo != null ? { asignado: asignadoMasivo } : {}),
                }))
            )}>{guardando ? 'asignando…' : 'asignar'}</Button>
        </BarraDeSeleccion> : null}
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {areas == null ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> :
                <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)', minHeight: 300 }}>
                    <Table stickyHeader size="small" aria-label={`asignación general de ${datosTarea.nombre}`}>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox size="small" checked={todasSeleccionadas} indeterminate={!todasSeleccionadas && seleccion.seleccionadas.size > 0}
                                        onChange={() => todasSeleccionadas ? seleccion.limpiar() : seleccion.poner(visibles.map(a => String(a.area)))}
                                        inputProps={{ 'aria-label': 'seleccionar todas las áreas' }} />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>área</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>comuna</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>encuestas</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>sin asignar</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>recepcionista</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{datosTarea.nombre}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibles.map(area => {
                                var asignacion = area.porTarea[tarea];
                                var clave = String(area.area);
                                return <TableRow key={area.area} hover selected={seleccion.seleccionadas.has(clave)}>
                                    <TableCell padding="checkbox">
                                        <Checkbox size="small" checked={seleccion.seleccionadas.has(clave)} onChange={() => seleccion.alternar(clave)}
                                            inputProps={{ 'aria-label': `seleccionar área ${area.area}` }} />
                                    </TableCell>
                                    <TableCell><Typography variant="body2" fontWeight={600}>{area.area}</Typography></TableCell>
                                    <TableCell>{area.comunas}</TableCell>
                                    <TableCell align="right">{area.encuestas}</TableCell>
                                    <TableCell align="right">{area.sinAsignar ? <Chip size="small" color="warning" variant="outlined" label={area.sinAsignar} /> : 0}</TableCell>
                                    <TableCell>
                                        <SelectorPersona compacto etiqueta="recepcionista" personas={contexto.recepcionistas} valor={asignacion?.recepcionista ?? null}
                                            deshabilitado={guardando} ancho={210} onCambiar={idper => cambiar([{ area: area.area, tarea, recepcionista: idper }])} />
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <SelectorPersona compacto etiqueta={datosTarea.nombre} personas={contexto.personas} valor={asignacion?.asignado ?? null}
                                                rolSugerido={datosTarea.rolSugerido} deshabilitado={guardando} ancho={230}
                                                onCambiar={idper => cambiar([{ area: area.area, tarea, asignado: idper }])} />
                                            {asignacion?.cargado ? <Tooltip title="hay encuestas del área en un dispositivo"><span><Icono path={ICONO_DISPOSITIVO} /></span></Tooltip> : null}
                                        </Stack>
                                    </TableCell>
                                </TableRow>;
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>}
        </Paper>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Asignar un área asigna sus encuestas que están en esta tarea (o todavía sin tarea). Quitar la persona de un área no desasigna sus encuestas: eso se hace en la asignación por tarea.
        </Typography>
        <DialogoResultado titulo="Asignación por área" resultados={resultados} nombreDeClave="área / tarea" onCerrar={() => setResultados(null)} />
        {aviso}
    </>;
}

/* asignación por tarea: encuestas de una tarea */

const SIN_ASIGNAR = '__sin_asignar__';
const TODOS = '__todos__';

function AsignacionPorTarea(props: { contexto: ContextoAsignacion }) {
    var { contexto } = props;
    var [tarea, setTarea] = useState(contexto.tareas[0].tarea);
    var [encuestas, setEncuestas] = useState<EncuestaAsignacion[] | null>(null);
    var [busqueda, setBusqueda] = useState('');
    var [filtroArea, setFiltroArea] = useState(TODOS);
    var [filtroEstado, setFiltroEstado] = useState(TODOS);
    var [filtroAsignado, setFiltroAsignado] = useState(TODOS);
    var [pagina, setPagina] = useState(0);
    var [porPagina, setPorPagina] = useState(100);
    var [recepcionistaMasivo, setRecepcionistaMasivo] = useState<string | null>(null);
    var [asignadoMasivo, setAsignadoMasivo] = useState<string | null>(null);
    var [guardando, setGuardando] = useState(false);
    var [resultados, setResultados] = useState<ResultadoDeCambio[] | null>(null);
    var seleccion = useSeleccion();
    var [aviso, mostrarAviso] = useAviso();
    var datosTarea = contexto.tareas.find(t => t.tarea == tarea)!;
    var estado = (codigo: string) => contexto.estados.find(e => e.estado == codigo);

    var traer = useCallback(async () => {
        setEncuestas(null);
        try {
            setEncuestas(await myOwn.ajax.asignacion_encuestas_traer({ tarea }));
        } catch (err) {
            mostrarAviso({ tipo: 'error', texto: mensajeDeError(err) });
            setEncuestas([]);
        }
    }, [tarea]);
    useEffect(() => { traer(); }, [traer]);

    var cambiar = async (cambio: Omit<CambioDeEncuestas, 'tarea'>) => {
        setGuardando(true);
        try {
            var resultado: ResultadoDeCambio[] = await myOwn.ajax.asignacion_encuestas_cambiar({ cambio: { ...cambio, tarea } });
            setResultados(resultado);
            mostrarAviso(avisoDeResultados(resultado, 'asignación'));
            seleccion.limpiar();
            var actualizadas: EncuestaAsignacion[] = await myOwn.ajax.asignacion_encuestas_traer({ tarea });
            setEncuestas(actualizadas);
        } catch (err) {
            mostrarAviso({ tipo: 'error', texto: mensajeDeError(err) });
        } finally {
            setGuardando(false);
        }
    };

    var todas = encuestas ?? [];
    var areas = Array.from(new Set(todas.map(e => e.area))).sort((a, b) => (a ?? 0) - (b ?? 0));
    var estadosPresentes = contexto.estados.filter(e => todas.some(enc => enc.estado == e.estado));
    var asignados = Array.from(new Set(todas.map(e => e.asignado).filter((a): a is string => a != null)))
        .sort((a, b) => nombreDe(contexto.personas, a).localeCompare(nombreDe(contexto.personas, b)));
    var visibles = todas.filter(e =>
        (filtroArea == TODOS || String(e.area) == filtroArea)
        && (filtroEstado == TODOS || e.estado == filtroEstado)
        && (filtroAsignado == TODOS || (filtroAsignado == SIN_ASIGNAR ? e.asignado == null : e.asignado == filtroAsignado))
        && (!busqueda || coincide(`${e.enc} ${e.direccion} ${nombreDe(contexto.personas, e.asignado)}`, busqueda))
    );
    var enPagina = visibles.slice(pagina * porPagina, (pagina + 1) * porPagina);
    var todasSeleccionadas = visibles.length > 0 && visibles.every(e => seleccion.seleccionadas.has(e.enc));
    var cambiarFiltro = (setter: (valor: string) => void) => (valor: string) => { setter(valor); setPagina(0); };

    return <>
        <SelectorDeTarea tareas={contexto.tareas} tarea={tarea} onCambiar={nueva => { setTarea(nueva); seleccion.limpiar(); setPagina(0); }} />
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <Buscador valor={busqueda} onCambiar={cambiarFiltro(setBusqueda)} etiqueta="buscar encuesta, dirección o persona" ancho={290} />
            <FormControl size="small" sx={{ minWidth: 130, bgcolor: 'background.paper' }}>
                <InputLabel id="filtro-area">área</InputLabel>
                <Select labelId="filtro-area" label="área" value={filtroArea} onChange={evento => cambiarFiltro(setFiltroArea)(String(evento.target.value))}>
                    <MenuItem value={TODOS}>todas</MenuItem>
                    {areas.map(area => <MenuItem key={String(area)} value={String(area)}>{area ?? 'sin área'}</MenuItem>)}
                </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170, bgcolor: 'background.paper' }}>
                <InputLabel id="filtro-estado">estado</InputLabel>
                <Select labelId="filtro-estado" label="estado" value={filtroEstado} onChange={evento => cambiarFiltro(setFiltroEstado)(String(evento.target.value))}>
                    <MenuItem value={TODOS}>todos</MenuItem>
                    {estadosPresentes.map(e => <MenuItem key={e.estado} value={e.estado}>{e.descripcion}</MenuItem>)}
                </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200, bgcolor: 'background.paper' }}>
                <InputLabel id="filtro-asignado">{datosTarea.nombre}</InputLabel>
                <Select labelId="filtro-asignado" label={datosTarea.nombre} value={filtroAsignado} onChange={evento => cambiarFiltro(setFiltroAsignado)(String(evento.target.value))}>
                    <MenuItem value={TODOS}>todos</MenuItem>
                    <MenuItem value={SIN_ASIGNAR}>sin asignar</MenuItem>
                    {asignados.map(idper => <MenuItem key={idper} value={idper}>{nombreDe(contexto.personas, idper)}</MenuItem>)}
                </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary">
                {visibles.length} de {todas.length} encuestas · {todas.filter(e => e.asignado == null).length} sin asignar
            </Typography>
        </Stack>
        {seleccion.seleccionadas.size && contexto.puedeEditar ?
            <BarraDeSeleccion cantidad={`${seleccion.seleccionadas.size} encuestas seleccionadas`} onLimpiar={seleccion.limpiar}>
                <SelectorPersona etiqueta="recepcionista" personas={contexto.recepcionistas} valor={recepcionistaMasivo} onCambiar={setRecepcionistaMasivo} />
                <SelectorPersona etiqueta={datosTarea.nombre} personas={contexto.personas} valor={asignadoMasivo} rolSugerido={datosTarea.rolSugerido} onCambiar={setAsignadoMasivo} />
                <Button variant="contained" disabled={guardando || (recepcionistaMasivo == null && asignadoMasivo == null)} onClick={() => cambiar({
                    encs: Array.from(seleccion.seleccionadas),
                    ...(recepcionistaMasivo != null ? { recepcionista: recepcionistaMasivo } : {}),
                    ...(asignadoMasivo != null ? { asignado: asignadoMasivo } : {}),
                })}>{guardando ? 'asignando…' : 'asignar'}</Button>
                <Button variant="outlined" color="warning" disabled={guardando}
                    onClick={() => cambiar({ encs: Array.from(seleccion.seleccionadas), asignado: null })}>desasignar</Button>
            </BarraDeSeleccion> : null}
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {encuestas == null ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> : <>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)', minHeight: 300 }}>
                    <Table stickyHeader size="small" aria-label={`encuestas de ${datosTarea.nombre}`}>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    {contexto.puedeEditar ? <Checkbox size="small" checked={todasSeleccionadas}
                                        indeterminate={!todasSeleccionadas && seleccion.seleccionadas.size > 0}
                                        onChange={() => todasSeleccionadas ? seleccion.limpiar() : seleccion.poner(visibles.map(e => e.enc))}
                                        inputProps={{ 'aria-label': 'seleccionar todas las encuestas filtradas' }} /> : null}
                                </TableCell>
                                {['encuesta', 'área', 'dirección', 'estado', 'recepcionista', datosTarea.nombre].map(titulo =>
                                    <TableCell key={titulo} sx={{ fontWeight: 600 }}>{titulo}</TableCell>)}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {enPagina.map(e => {
                                var datosEstado = estado(e.estado);
                                return <TableRow key={e.enc} hover selected={seleccion.seleccionadas.has(e.enc)}
                                    sx={{ opacity: e.habilitada ? 1 : 0.55 }}>
                                    <TableCell padding="checkbox">
                                        {contexto.puedeEditar ? <Checkbox size="small" checked={seleccion.seleccionadas.has(e.enc)} onChange={() => seleccion.alternar(e.enc)}
                                            inputProps={{ 'aria-label': `seleccionar encuesta ${e.enc}` }} /> : null}
                                    </TableCell>
                                    <TableCell><Typography variant="body2" fontWeight={600}>{e.enc}</Typography></TableCell>
                                    <TableCell>{e.area}</TableCell>
                                    <TableCell sx={{ maxWidth: 280 }}><Typography variant="body2" noWrap title={e.direccion}>{e.direccion}</Typography></TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                            <Chip size="small" label={datosEstado?.descripcion ?? e.estado}
                                                color={datosEstado?.permiteAsignar ? 'primary' : 'default'} variant={datosEstado?.permiteAsignar ? 'outlined' : 'filled'} />
                                            {e.cargado ? <Tooltip title="está en un dispositivo"><span><Icono path={ICONO_DISPOSITIVO} /></span></Tooltip> : null}
                                            {!e.habilitada ? <Chip size="small" label="deshabilitada" /> : null}
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{nombreDe(contexto.personas, e.recepcionista)}</TableCell>
                                    <TableCell>{e.asignado ? nombreDe(contexto.personas, e.asignado) : <Typography variant="body2" color="warning.main">sin asignar</Typography>}</TableCell>
                                </TableRow>;
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination component="div" count={visibles.length} page={Math.min(pagina, Math.max(0, Math.ceil(visibles.length / porPagina) - 1))}
                    onPageChange={(_evento, nueva) => setPagina(nueva)} rowsPerPage={porPagina}
                    onRowsPerPageChange={evento => { setPorPagina(Number(evento.target.value)); setPagina(0); }}
                    rowsPerPageOptions={[50, 100, 250, 500]} labelRowsPerPage="por página"
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />
            </>}
        </Paper>
        <DialogoResultado titulo={`Asignación de ${datosTarea.nombre}`} resultados={resultados} nombreDeClave="encuesta" onCerrar={() => setResultados(null)} />
        {aviso}
    </>;
}

/* recepción: personas de una tarea y sus encuestas con las acciones disponibles */

const COLOR_RESUMEN: { [resumen: string]: 'success' | 'warning' | 'error' | 'default' } = {
    'ok': 'success', 'incompleto': 'warning', 'con problemas': 'error', 'no rea': 'default', 'vacio': 'default',
};

function BotonAccion(props: { accion: AccionDisponible, onEjecutar: () => void, deshabilitado: boolean }) {
    var { accion } = props;
    var etiqueta = accion.eaccion.replace(/_/g, ' ');
    var color: 'primary' | 'warning' | 'error' = accion.eaccion_direccion == 'retroceso' ? 'warning' : accion.eaccion_direccion == 'blanqueo' ? 'error' : 'primary';
    var icono = accion.path_icono_svg ? <Icono path={accion.path_icono_svg} viewBox="0 0 50 50" /> : undefined;
    if (accion.desactiva_boton) {
        return <Chip size="small" icon={icono} label={etiqueta} />;
    }
    return <Tooltip title={accion.desc_eaccion ?? etiqueta}>
        <span>
            <Button size="small" variant={accion.eaccion_direccion == 'avance' ? 'contained' : 'outlined'} color={color} startIcon={icono}
                disabled={props.deshabilitado} onClick={props.onEjecutar} sx={{ py: 0.25, whiteSpace: 'nowrap' }}>{etiqueta}</Button>
        </span>
    </Tooltip>;
}

// acciones que se pueden hacer en todas las encuestas seleccionadas (para ejecutarlas juntas)
export function accionesEnComun(encuestas: EncuestaRecepcion[]): AccionDisponible[] {
    if (encuestas.length == 0) return [];
    return encuestas[0].acciones.filter(accion => !accion.desactiva_boton && !accion.nombre_wscreen
        && encuestas.every(e => e.acciones.some(a => a.eaccion == accion.eaccion)));
}

function Recepcion(props: { contexto: ContextoAsignacion }) {
    var { contexto } = props;
    var [tarea, setTarea] = useState(contexto.tareas[0].tarea);
    var [personas, setPersonas] = useState<PersonaRecepcion[] | null>(null);
    var [persona, setPersona] = useState<string | null>(null);
    var [encuestas, setEncuestas] = useState<EncuestaRecepcion[] | null>(null);
    var [busquedaPersona, setBusquedaPersona] = useState('');
    var [ejecutando, setEjecutando] = useState(false);
    var [confirmar, setConfirmar] = useState<{ accion: AccionDisponible, encs: string[] } | null>(null);
    var [resultados, setResultados] = useState<ResultadoDeCambio[] | null>(null);
    var seleccion = useSeleccion();
    var [aviso, mostrarAviso] = useAviso();
    var descEstado = (codigo: string) => contexto.estados.find(e => e.estado == codigo)?.descripcion ?? codigo;

    var traerPersonas = useCallback(async () => {
        try {
            setPersonas(await myOwn.ajax.recepcion_personas_traer({ tarea }));
        } catch (err) {
            mostrarAviso({ tipo: 'error', texto: mensajeDeError(err) });
            setPersonas([]);
        }
    }, [tarea]);
    var traerEncuestas = useCallback(async () => {
        if (persona == null) { setEncuestas(null); return; }
        try {
            setEncuestas(await myOwn.ajax.recepcion_encuestas_traer({ tarea, asignado: persona }));
        } catch (err) {
            mostrarAviso({ tipo: 'error', texto: mensajeDeError(err) });
            setEncuestas([]);
        }
    }, [tarea, persona]);
    useEffect(() => { setPersonas(null); setPersona(null); traerPersonas(); }, [traerPersonas]);
    useEffect(() => { setEncuestas(null); seleccion.limpiar(); traerEncuestas(); }, [traerEncuestas]);

    var ejecutar = async (accion: AccionDisponible, encs: string[]) => {
        setEjecutando(true);
        try {
            var resultado: ResultadoDeCambio[] = await myOwn.ajax.recepcion_acciones_ejecutar({ tarea, encs, eaccion: accion.eaccion });
            setResultados(resultado);
            mostrarAviso(avisoDeResultados(resultado, accion.eaccion.replace(/_/g, ' ')));
            if (accion.nombre_wscreen == 'abrir_encuesta' && encs.length == 1 && resultado[0]?.ok) {
                abrirEncuesta(contexto.operativo, tarea, encs[0]);
            }
            seleccion.limpiar();
            await Promise.all([traerEncuestas(), traerPersonas()]);
        } catch (err) {
            mostrarAviso({ tipo: 'error', texto: mensajeDeError(err) });
        } finally {
            setEjecutando(false);
        }
    };
    var pedirEjecutar = (accion: AccionDisponible, encs: string[]) => accion.confirma ? setConfirmar({ accion, encs }) : ejecutar(accion, encs);

    var personasVisibles = (personas ?? []).filter(p => !busquedaPersona || coincide(`${p.nombre} ${p.idper} ${p.dispositivo ?? ''}`, busquedaPersona));
    var datosPersona = personas?.find(p => p.idper == persona) ?? null;
    var seleccionadas = (encuestas ?? []).filter(e => seleccion.seleccionadas.has(e.enc));
    var enComun = accionesEnComun(seleccionadas);
    var todasSeleccionadas = (encuestas ?? []).length > 0 && (encuestas ?? []).every(e => seleccion.seleccionadas.has(e.enc));

    return <>
        <SelectorDeTarea tareas={contexto.tareas} tarea={tarea} onCambiar={setTarea} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px 1fr' }, gap: 2, alignItems: 'start' }}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Buscador valor={busquedaPersona} onCambiar={setBusquedaPersona} etiqueta="buscar persona" ancho={290} />
                </Box>
                {personas == null ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24} /></Box> :
                    personasVisibles.length == 0 ? <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No hay personas con encuestas en recepción en esta tarea.</Typography> :
                        <List dense disablePadding sx={{ maxHeight: { md: 'calc(100vh - 330px)' }, overflowY: 'auto' }}>
                            {personasVisibles.map(p =>
                                <ListItemButton key={p.idper} selected={p.idper == persona} onClick={() => setPersona(p.idper)} divider>
                                    <ListItemText
                                        primary={<Stack direction="row" justifyContent="space-between" spacing={1}>
                                            <Typography variant="body2" fontWeight={600} noWrap>{p.nombre}</Typography>
                                            <Typography variant="body2" color="text.secondary">{p.total}</Typography>
                                        </Stack>}
                                        secondary={<Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                            {p.porEstado.map(e => <Chip component="span" key={e.estado} size="small" variant="outlined" label={`${descEstado(e.estado)} ${e.cantidad}`} sx={{ height: 20, fontSize: 11 }} />)}
                                            {p.dispositivo ? <Chip component="span" size="small" label={`dm ${p.dispositivo}`} sx={{ height: 20, fontSize: 11 }} /> : null}
                                        </Box>}
                                        secondaryTypographyProps={{ component: 'div' }} />
                                </ListItemButton>
                            )}
                        </List>}
            </Paper>
            <Box sx={{ minWidth: 0 }}>
                {datosPersona == null ? <Alert severity="info">Elegí una persona para ver sus encuestas y recibirlas.</Alert> : <>
                    <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 1.5 }}>
                        <Typography variant="h6" component="h2">{datosPersona.nombre}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {datosPersona.total} encuestas · {datosPersona.cargadas} en el dispositivo{datosPersona.dispositivo ? ` (${datosPersona.dispositivo})` : ''}
                        </Typography>
                    </Stack>
                    {seleccionadas.length ? <BarraDeSeleccion cantidad={`${seleccionadas.length} seleccionadas`} onLimpiar={seleccion.limpiar}>
                        {enComun.length ? enComun.map(accion => <BotonAccion key={accion.eaccion} accion={accion} deshabilitado={ejecutando}
                            onEjecutar={() => pedirEjecutar(accion, seleccionadas.map(e => e.enc))} />)
                            : <Typography variant="body2" color="text.secondary">No hay acciones que se puedan hacer en todas a la vez.</Typography>}
                    </BarraDeSeleccion> : null}
                    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        {encuestas == null ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> :
                            <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)', minHeight: 240 }}>
                                <Table stickyHeader size="small" aria-label={`encuestas de ${datosPersona.nombre}`}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox size="small" checked={todasSeleccionadas} indeterminate={!todasSeleccionadas && seleccionadas.length > 0}
                                                    onChange={() => todasSeleccionadas ? seleccion.limpiar() : seleccion.poner((encuestas ?? []).map(e => e.enc))}
                                                    inputProps={{ 'aria-label': 'seleccionar todas' }} />
                                            </TableCell>
                                            {['encuesta', 'área', 'dirección', 'estado', 'resultado', 'acciones'].map(titulo =>
                                                <TableCell key={titulo} sx={{ fontWeight: 600 }}>{titulo}</TableCell>)}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {encuestas.map(e =>
                                            <TableRow key={e.enc} hover selected={seleccion.seleccionadas.has(e.enc)} sx={{ opacity: e.habilitada ? 1 : 0.55 }}>
                                                <TableCell padding="checkbox">
                                                    <Checkbox size="small" checked={seleccion.seleccionadas.has(e.enc)} onChange={() => seleccion.alternar(e.enc)}
                                                        inputProps={{ 'aria-label': `seleccionar encuesta ${e.enc}` }} />
                                                </TableCell>
                                                <TableCell>
                                                    <Button size="small" sx={{ minWidth: 0, p: 0, fontWeight: 600 }} title="abrir la encuesta"
                                                        onClick={() => abrirEncuesta(contexto.operativo, tarea, e.enc)}>{e.enc}</Button>
                                                </TableCell>
                                                <TableCell>{e.area}</TableCell>
                                                <TableCell sx={{ maxWidth: 240 }}><Typography variant="body2" noWrap title={e.direccion}>{e.direccion}</Typography></TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <Chip size="small" label={descEstado(e.estado)} />
                                                        {e.cargado ? <Tooltip title="está en el dispositivo"><span><Icono path={ICONO_DISPOSITIVO} /></span></Tooltip> : null}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    {e.resumenEstado ? <Chip size="small" variant="outlined" color={COLOR_RESUMEN[e.resumenEstado] ?? 'default'}
                                                        label={e.resumenEstado + (e.norea != null ? ` · no rea ${e.norea}` : '')} /> : null}
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                                        {e.acciones.map(accion => <BotonAccion key={accion.eaccion + accion.estado_destino} accion={accion} deshabilitado={ejecutando}
                                                            onEjecutar={() => pedirEjecutar(accion, [e.enc])} />)}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>}
                    </Paper>
                </>}
            </Box>
        </Box>
        <Dialog open={confirmar != null} onClose={() => setConfirmar(null)}>
            <DialogTitle>¿Confirma la acción "{confirmar?.accion.eaccion.replace(/_/g, ' ')}"?</DialogTitle>
            <DialogContent>
                <Typography variant="body2">{confirmar?.accion.desc_eaccion}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>Encuestas: {confirmar?.encs.join(', ')}</Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setConfirmar(null)}>no</Button>
                <Button variant="contained" onClick={() => { var pedido = confirmar; setConfirmar(null); if (pedido) ejecutar(pedido.accion, pedido.encs); }}>sí</Button>
            </DialogActions>
        </Dialog>
        <DialogoResultado titulo="Recepción" resultados={resultados} nombreDeClave="encuesta" onCerrar={() => setResultados(null)} />
        {aviso}
    </>;
}

/* pantallas del menú (ver getMenuAsignacion y getMenuRecepcion en app-dmencu.ts) */

function montar(elemento: React.ReactElement, clase: string) {
    var mainLayout = document.getElementById('main_layout')!;
    var contenedor = document.createElement('div');
    contenedor.className = clase;
    mainLayout.appendChild(contenedor);
    ReactDOM.render(elemento, contenedor);
}

myOwn.wScreens.asignacion_general = async function () {
    montar(<Pantalla titulo="Asignación general" descripcion="Recepcionista y persona asignada de cada área, por tarea. Seleccioná varias áreas para asignarlas juntas.">
        {contexto => <AsignacionGeneral contexto={contexto} />}
    </Pantalla>, 'asignacion-contenedor');
};

myOwn.wScreens.asignacion_tarea = async function () {
    montar(<Pantalla titulo="Asignación por tarea" descripcion="Las encuestas de cada tarea con su estado y su asignación. Filtrá, seleccioná y asigná en bloque.">
        {contexto => <AsignacionPorTarea contexto={contexto} />}
    </Pantalla>, 'asignacion-contenedor');
};

myOwn.wScreens.recepcion_tarea = async function () {
    montar(<Pantalla titulo="Recepción" descripcion="Las personas de cada tarea y sus encuestas, con las acciones que se pueden hacer según el estado de cada una.">
        {contexto => <Recepcion contexto={contexto} />}
    </Pantalla>, 'recepcion-contenedor');
};
