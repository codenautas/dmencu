// Tablero de inicio del modo GABINETE (ver docs/tablero.md): pantalla "inicio" del menú, armada en React + MUI.
// Los datos los arma el servidor (procedimiento tablero_traer), según el rol y los permisos del usuario.
//
// Extensión desde las apps finales (en su código de cliente):
//   import { registrarComponenteTablero, setAjustarTemaTablero } from "dmencu/dist/client/client/render-tablero";
//   registrarComponenteTablero('mi_componente', MiComponente) // dibuja las secciones {tipo:'personalizado', componente:'mi_componente'}
//   setAjustarTemaTablero(tema => ({...tema, ...}))  // cambia el tema de MUI

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as ReactDOM from "react-dom";
import {
    Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress, Link, Paper, ScopedCssBaseline, Skeleton,
    Stack, SvgIcon, Table, TableBody, TableCell, TableHead, TableRow, TextField, ThemeProvider, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
    alpha, createTheme, useTheme
} from "@mui/material";
import type { Theme, ThemeOptions } from "@mui/material";

import type {
    AccesoTablero, ContenidoTablero, CorteDesglose, DatoJson, DetalleIndicador, FiltroTablero, FilaBarras, FilaTabla, ColumnaTabla, IndicadorTablero, ParteAvance,
    RutaMenu, SeccionTablero, TableroParaUsuario, TonoTablero
} from "../unlogged/tipos-tablero";

/* extensión */

export type PropsComponenteTablero = {
    seccion: SeccionTablero
    datos: DatoJson
    tablero: TableroParaUsuario
}

const componentesPersonalizados: Map<string, React.ComponentType<PropsComponenteTablero>> = new Map();

// registra el componente que dibuja las secciones de tipo "personalizado" con ese nombre
export function registrarComponenteTablero(nombre: string, componente: React.ComponentType<PropsComponenteTablero>): void {
    componentesPersonalizados.set(nombre, componente);
}

export type AjustarTemaTablero = (tema: ThemeOptions) => ThemeOptions;

var ajustarTema: AjustarTemaTablero = tema => tema;

// permite a la app final cambiar el tema de MUI del tablero
export function setAjustarTemaTablero(ajuste: AjustarTemaTablero): void {
    ajustarTema = ajuste;
}

/* navegación: los accesos llevan a opciones del menú de backend-plus (menu#i=menu,submenu) */

export function hrefDelMenu(ruta: RutaMenu, filtro?: FiltroTablero): string {
    // igual que los links del menú: i es la ruta y ff los campos fijos de la grilla (los codifica backend-plus)
    return my.menuName + my.menuSeparator + my.paramsToUriPart({ i: ruta.join(','), ...(filtro != null ? { ff: filtro } : {}) });
}

export function hrefDelAcceso(acceso: AccesoTablero): string {
    return hrefDelMenu(acceso.ruta, acceso.filtro);
}

export function irAlMenu(ruta: RutaMenu, filtro?: FiltroTablero): void {
    history.pushState(null, '', hrefDelMenu(ruta, filtro));
    my.showPage();
}

// con ctrl o con el botón del medio se abre en otra pestaña (como en los botones del menú)
function alHacerClickEnAcceso(acceso: AccesoTablero) {
    return (event: React.MouseEvent<HTMLElement>) => {
        if (!event.ctrlKey && !event.metaKey && event.button == 0) {
            event.preventDefault();
            irAlMenu(acceso.ruta, acceso.filtro);
        }
    };
}

/* tema y formatos */

export function crearTema(): Theme {
    var tema: ThemeOptions = {
        palette: {
            primary: { main: '#1565C0' },
            secondary: { main: '#009688' },
            background: { default: '#F3F5F8', paper: '#FFFFFF' },
        },
        shape: { borderRadius: 10 },
        typography: {
            fontFamily: 'Roboto, "Segoe UI", Arial, sans-serif',
            h4: { fontWeight: 600 },
            h6: { fontWeight: 600 },
        },
        components: {
            MuiCard: {
                defaultProps: { elevation: 0 },
                styleOverrides: { root: { border: '1px solid rgba(0, 0, 0, 0.08)' } },
            },
            MuiButton: {
                styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } },
            },
        },
    };
    return createTheme(ajustarTema(tema));
}

export function colorDelTono(theme: Theme, tono: TonoTablero | undefined): string {
    switch (tono) {
        case 'bueno': return theme.palette.success.main;
        case 'atencion': return theme.palette.warning.main;
        case 'alerta': return theme.palette.error.main;
        case 'neutro': return theme.palette.grey[700];
        default: return theme.palette.primary.main;
    }
}

function severidadDelTono(tono: TonoTablero | undefined): 'success' | 'warning' | 'error' | 'info' {
    return tono == 'bueno' ? 'success' : tono == 'atencion' ? 'warning' : tono == 'alerta' ? 'error' : 'info';
}

const formatoNumero = new Intl.NumberFormat('es-AR');
const formatoPorcentaje = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

export function numeroATexto(valor: number | null | undefined): string {
    return valor == null ? '–' : formatoNumero.format(valor);
}

function porcentaje(parte: number, total: number): number {
    return total ? parte * 100 / total : 0;
}

function porcentajeATexto(valor: number | null): string {
    return valor == null ? '–' : formatoPorcentaje.format(valor) + '%';
}

/* íconos (paths de material icons) */

const ICONOS = {
    actualizar: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z",
    irA: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z",
};

function Icono(props: { path: string }) {
    return <SvgIcon fontSize="small"><path d={props.path} /></SvgIcon>;
}

/* contenidos */

// ventana con cómo se reparte el valor de un indicador (por ejemplo las encuestas de una tarea por estado)
function VentanaDetalle(props: { titulo: string, detalle: DetalleIndicador, onCerrar: () => void }) {
    var { detalle } = props;
    return <Dialog open onClose={props.onCerrar} fullWidth maxWidth="xs" aria-labelledby="tablero-detalle-titulo">
        <DialogTitle id="tablero-detalle-titulo">{props.titulo}</DialogTitle>
        <DialogContent>
            <Table size="small">
                <TableBody>
                    {detalle.filas.map((fila, i) =>
                        <TableRow key={i} hover>
                            <TableCell>
                                {fila.acceso ?
                                    <Link underline="hover" title={fila.acceso.titulo} href={hrefDelAcceso(fila.acceso)}
                                        onClick={(event: React.MouseEvent<HTMLElement>) => { alHacerClickEnAcceso(fila.acceso!)(event); props.onCerrar(); }}>{fila.etiqueta}</Link>
                                    : fila.etiqueta}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>{numeroATexto(fila.valor)}</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </DialogContent>
        <DialogActions><Button onClick={props.onCerrar}>cerrar</Button></DialogActions>
    </Dialog>;
}

function TarjetaIndicador(props: { indicador: IndicadorTablero, compacto?: boolean }) {
    var { indicador } = props;
    var theme = useTheme();
    var [verDetalle, setVerDetalle] = useState(false);
    var color = colorDelTono(theme, indicador.tono);
    var valorTexto = indicador.formato == 'porcentaje' ? porcentajeATexto(indicador.valor) : numeroATexto(indicador.valor);
    var conTotal = indicador.total != null && indicador.valor != null;
    var avance = conTotal ? porcentaje(indicador.valor ?? 0, indicador.total ?? 0) : 0;
    return <Box sx={{ p: props.compacto ? 1.25 : 2, borderRadius: 2, bgcolor: alpha(color, 0.06), border: `1px solid ${alpha(color, 0.2)}`, minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>{indicador.titulo}</Typography>
        <Typography variant={props.compacto ? 'h5' : 'h4'} component="div" sx={{ color, fontWeight: 700, my: props.compacto ? 0.25 : 0.5, lineHeight: 1.2 }}>{valorTexto}</Typography>
        {conTotal ? <>
            <LinearProgress variant="determinate" value={Math.min(avance, 100)} aria-label={indicador.titulo}
                sx={{ height: 6, borderRadius: 3, bgcolor: alpha(color, 0.15), '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                de {numeroATexto(indicador.total)} · {porcentajeATexto(avance)}
            </Typography>
        </> : null}
        {indicador.detalle ? <Typography variant="caption" color="text.secondary" display="block">{indicador.detalle}</Typography> : null}
        {indicador.acceso ? <Button size="small" sx={{ mt: 0.5, px: 0 }} endIcon={<Icono path={ICONOS.irA} />}
            href={hrefDelAcceso(indicador.acceso)} onClick={alHacerClickEnAcceso(indicador.acceso)}>{indicador.acceso.titulo}</Button> : null}
        {indicador.desagregado ? <>
            <Button size="small" sx={{ mt: 0.5, display: 'block' }} onClick={() => setVerDetalle(true)}>{indicador.desagregado.boton}</Button>
            {verDetalle ? <VentanaDetalle titulo={indicador.titulo} detalle={indicador.desagregado} onCerrar={() => setVerDetalle(false)} /> : null}
        </> : null}
    </Box>;
}

export function Indicadores(props: { indicadores: IndicadorTablero[], compacto?: boolean }) {
    return <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(' + (props.compacto ? 120 : 135) + 'px, 1fr))', gap: props.compacto ? 1 : { xs: 1.5, sm: 2 } }}>
        {props.indicadores.map(indicador => <TarjetaIndicador key={indicador.id} indicador={indicador} compacto={props.compacto} />)}
    </Box>;
}

const FILAS_VISIBLES = 10;

// barra grande apilada: cada parte muestra su cantidad; los porcentajes están en las referencias de abajo
export function Avance(props: { partes: ParteAvance[], indicadores?: IndicadorTablero[] }) {
    var theme = useTheme();
    var total = props.partes.reduce((suma, parte) => suma + parte.valor, 0);
    return <Box>
        {props.indicadores?.length ? <Box sx={{ mb: 2 }}><Indicadores indicadores={props.indicadores} compacto /></Box> : null}
        <Box role="img" aria-label={props.partes.map(parte => `${parte.titulo}: ${parte.valor}`).join(', ')}
            sx={{ display: 'flex', height: { xs: 56, md: 72 }, borderRadius: 2, overflow: 'hidden', bgcolor: 'grey.100' }}>
            {props.partes.filter(parte => parte.valor > 0).map(parte => {
                var color = colorDelTono(theme, parte.tono);
                return <Tooltip key={parte.id} arrow title={`${parte.titulo}: ${numeroATexto(parte.valor)} (${porcentajeATexto(porcentaje(parte.valor, total))})`}>
                    <Box sx={{
                        width: `${porcentaje(parte.valor, total)}%`, bgcolor: color, color: theme.palette.getContrastText(color),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        transition: 'width .6s ease'
                    }}>
                        <Typography component="span" fontWeight={700} lineHeight={1.2} sx={{ fontSize: { xs: 14, md: 18 } }}>{numeroATexto(parte.valor)}</Typography>
                    </Box>
                </Tooltip>;
            })}
        </Box>
        <Box sx={{ mt: 2 }}><Leyenda partes={props.partes} total={total} /></Box>
        <TotalEncuestas total={total} />
    </Box>;
}

function Leyenda(props: { partes: ParteAvance[], total?: number }) {
    var theme = useTheme();
    return <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1.5 }}>
        {props.partes.map(parte =>
            <Stack key={parte.id} direction="row" spacing={1} alignItems="flex-start">
                <Box sx={{ width: 12, height: 12, mt: 0.6, flexShrink: 0, borderRadius: '3px', bgcolor: colorDelTono(theme, parte.tono) }} />
                <Box>
                    <Typography variant="body2" color="text.secondary">{parte.titulo}</Typography>
                    {props.total != null ? <Typography variant="subtitle1" fontWeight={600} lineHeight={1.3}>
                        {numeroATexto(parte.valor)}{' '}
                        <Typography component="span" variant="caption" color="text.secondary">{porcentajeATexto(porcentaje(parte.valor, props.total))}</Typography>
                    </Typography> : null}
                </Box>
            </Stack>
        )}
    </Box>;
}

const ANCHO_TOTAL_DESGLOSE = 64;

// a partir de cuántas filas un corte ofrece buscar y empieza mostrando sólo las primeras
const FILAS_INICIALES_DESGLOSE = 50;

// barras apiladas por fila, con un selector entre los cortes; empieza en el primero.
// Los cortes de más de FILAS_INICIALES_DESGLOSE filas muestran las primeras, con un buscador y la opción de ver todas;
// la leyenda y el total son siempre los de todo el corte
export function Desglose(props: { cortes: CorteDesglose[] }) {
    var theme = useTheme();
    var [corteId, setCorteId] = useState(props.cortes[0]?.id ?? '');
    var [filtro, setFiltro] = useState('');
    var [verTodas, setVerTodas] = useState(false);
    var corte = props.cortes.find(c => c.id == corteId) ?? props.cortes[0];
    if (corte == null) {
        return null;
    }
    var totalDe = (partes: ParteAvance[]) => partes.reduce((suma, parte) => suma + parte.valor, 0);
    var maximo = Math.max(1, ...corte.filas.map(fila => totalDe(fila.partes)));
    // la leyenda suma todas las filas del corte, con el porcentaje de cada parte
    var partesDelCorte: ParteAvance[] = corte.filas[0].partes.map((parte, i) => ({ ...parte, valor: corte!.filas.reduce((suma, fila) => suma + (fila.partes[i]?.valor ?? 0), 0) }));
    var totalDelCorte = totalDe(partesDelCorte);
    var hayMuchas = corte.filas.length > FILAS_INICIALES_DESGLOSE;
    var buscado = filtro.trim().toLowerCase();
    var coincidentes = buscado ? corte.filas.filter(fila => fila.etiqueta.toLowerCase().includes(buscado)) : corte.filas;
    var visibles = hayMuchas && !buscado && !verTodas ? coincidentes.slice(0, FILAS_INICIALES_DESGLOSE) : coincidentes;
    return <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ gap: 1, mb: 2 }}>
            <ToggleButtonGroup size="small" exclusive color="primary" value={corte.id} aria-label="corte del desglose"
                onChange={(_event, nuevo: string | null) => { if (nuevo != null) { setCorteId(nuevo); setFiltro(''); setVerTodas(false); } }}>
                {props.cortes.map(c => <ToggleButton key={c.id} value={c.id} sx={{ textTransform: 'none', px: 2 }}>{c.titulo}</ToggleButton>)}
            </ToggleButtonGroup>
            {corte.acceso ? <Button size="small" endIcon={<Icono path={ICONOS.irA} />}
                href={hrefDelAcceso(corte.acceso)} onClick={alHacerClickEnAcceso(corte.acceso)}>{corte.acceso.titulo}</Button> : null}
        </Stack>
        <Box sx={{ mb: 2 }}><Leyenda partes={partesDelCorte} total={totalDelCorte} /></Box>
        {hayMuchas ? <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 1.5, mb: 2 }}>
            <TextField size="small" value={filtro} placeholder={`buscar ${corte.titulo}`} onChange={event => setFiltro(event.target.value)} />
            <Typography variant="body2" color="text.secondary">Mostrando {numeroATexto(visibles.length)} de {numeroATexto(corte.filas.length)}</Typography>
            {buscado ? null : <Button size="small" onClick={() => setVerTodas(!verTodas)}>{verTodas ? 'ver menos' : `ver todas (${numeroATexto(corte.filas.length)})`}</Button>}
        </Stack> : null}
        {visibles.map((fila, i) => {
            var total = totalDe(fila.partes);
            return <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.75 }}>
                {fila.acceso ?
                    <Link variant="body2" noWrap underline="hover" title={`${fila.acceso.titulo}: ${fila.etiqueta}`} sx={{ width: { xs: 90, sm: 130 }, flexShrink: 0 }}
                        href={hrefDelAcceso(fila.acceso)} onClick={alHacerClickEnAcceso(fila.acceso)}>{fila.etiqueta}</Link>
                    : <Typography variant="body2" noWrap title={fila.etiqueta} sx={{ width: { xs: 90, sm: 130 }, flexShrink: 0 }}>{fila.etiqueta}</Typography>}
                {/* la barra mide, como mucho, el ancho disponible menos lo que ocupa el total que va pegado a su final */}
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box role="img" aria-label={fila.partes.map(parte => `${parte.titulo}: ${parte.valor}`).join(', ')}
                        sx={{ display: 'flex', height: 24, width: `calc((100% - ${ANCHO_TOTAL_DESGLOSE}px) * ${total / maximo})`, minWidth: total ? 2 : 0, borderRadius: 1, overflow: 'hidden' }}>
                        {fila.partes.filter(parte => parte.valor > 0).map(parte => {
                            var color = colorDelTono(theme, parte.tono);
                            return <Tooltip key={parte.id} arrow title={`${fila.etiqueta} · ${parte.titulo}: ${numeroATexto(parte.valor)} (${porcentajeATexto(porcentaje(parte.valor, total))})`}>
                                <Box sx={{
                                    width: `${porcentaje(parte.valor, total)}%`, bgcolor: color, color: theme.palette.getContrastText(color),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 11, fontWeight: 600
                                }}>
                                    {numeroATexto(parte.valor)}
                                </Box>
                            </Tooltip>;
                        })}
                    </Box>
                    <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>{numeroATexto(total)}</Typography>
                </Box>
            </Stack>;
        })}
        <TotalEncuestas total={totalDelCorte} />
    </Box>;
}

export function Barras(props: { filas: FilaBarras[], formato?: 'numero' | 'porcentaje' }) {
    var theme = useTheme();
    var [todas, setTodas] = useState(false);
    var maximo = Math.max(1, ...props.filas.map(fila => fila.total ?? fila.valor));
    var filas = todas ? props.filas : props.filas.slice(0, FILAS_VISIBLES);
    return <Box>
        {filas.map((fila, i) => {
            var base = fila.total ?? maximo;
            var avance = porcentaje(fila.valor, base);
            var color = colorDelTono(theme, fila.tono);
            return <Box key={i} sx={{ mb: 1.25 }}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                    {fila.acceso ?
                        <Link variant="body2" noWrap underline="hover" title={`${fila.acceso.titulo}: ${fila.etiqueta}`}
                            href={hrefDelAcceso(fila.acceso)} onClick={alHacerClickEnAcceso(fila.acceso)}>{fila.etiqueta}</Link>
                        : <Typography variant="body2" noWrap title={fila.etiqueta}>{fila.etiqueta}</Typography>}
                    <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                        {props.formato == 'porcentaje' && fila.total != null ? porcentajeATexto(avance) : numeroATexto(fila.valor)}
                        {fila.total != null ? <Typography component="span" variant="caption" color="text.secondary"> · {numeroATexto(fila.valor)} de {numeroATexto(fila.total)}</Typography> : null}
                    </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={Math.min(avance, 100)} aria-label={fila.etiqueta}
                    sx={{ height: 8, borderRadius: 4, bgcolor: alpha(color, 0.12), '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }} />
                {fila.detalle ? <Typography variant="caption" color="text.secondary">{fila.detalle}</Typography> : null}
            </Box>;
        })}
        {props.filas.length > FILAS_VISIBLES ?
            <Button size="small" onClick={() => setTodas(!todas)}>{todas ? 'ver menos' : `ver las ${props.filas.length}`}</Button>
            : null}
    </Box>;
}

export function Tabla(props: { columnas: ColumnaTabla[], filas: FilaTabla[], ultimaFilaTotal?: boolean }) {
    return <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
            <TableHead>
                <TableRow>
                    {props.columnas.map(columna => <TableCell key={columna.campo} align={columna.numerica ? 'right' : 'left'} sx={{ fontWeight: 600, color: 'text.secondary' }}>{columna.titulo}</TableCell>)}
                </TableRow>
            </TableHead>
            <TableBody>
                {props.filas.map((fila, i) =>
                    <TableRow key={i} hover sx={props.ultimaFilaTotal && i == props.filas.length - 1 ? { '& td': { fontWeight: 700 } } : undefined}>
                        {props.columnas.map(columna => {
                            var valor = fila[columna.campo];
                            return <TableCell key={columna.campo} align={columna.numerica ? 'right' : 'left'}>
                                {typeof valor == 'number' ? (columna.formato == 'porcentaje' ? porcentajeATexto(valor) : numeroATexto(valor)) : valor ?? ''}
                            </TableCell>;
                        })}
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </Box>;
}

export function Accesos(props: { accesos: AccesoTablero[] }) {
    var grupos: { grupo: string | null, accesos: AccesoTablero[] }[] = [];
    props.accesos.forEach(acceso => {
        var grupo = acceso.grupo ?? null;
        var existente = grupos.find(g => g.grupo == grupo);
        if (existente == null) {
            existente = { grupo, accesos: [] };
            grupos.push(existente);
        }
        existente.accesos.push(acceso);
    });
    return <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 2 }}>
        {grupos.map(grupo =>
            <Box key={grupo.grupo ?? ''}>
                <Typography variant="overline" color="primary" fontWeight={600}>{grupo.grupo ?? 'otras opciones'}</Typography>
                <Stack spacing={0.25}>
                    {grupo.accesos.map(acceso =>
                        <Button key={acceso.ruta.join('/')} size="small" color="inherit" title={acceso.descripcion}
                            sx={{ justifyContent: 'flex-start', color: 'text.primary', '&:hover': { color: 'primary.main' } }}
                            startIcon={<Icono path={ICONOS.irA} />}
                            href={hrefDelAcceso(acceso)} onClick={alHacerClickEnAcceso(acceso)}>
                            {acceso.titulo}
                        </Button>
                    )}
                </Stack>
            </Box>
        )}
    </Box>;
}

// el total al pie de una sección que reparte las encuestas (debe coincidir con el total de la muestra)
function TotalEncuestas(props: { total?: number }) {
    return props.total == null ? null : <Typography variant="body2" fontWeight={600} sx={{ mt: 1.5, textAlign: 'right' }}>Total: {numeroATexto(props.total)} encuestas</Typography>;
}

export function ContenidoSeccion(props: { seccion: SeccionTablero, tablero: TableroParaUsuario }) {
    var contenido: ContenidoTablero = props.seccion.contenido;
    switch (contenido.tipo) {
        case 'indicadores': return <>
            <Indicadores indicadores={contenido.indicadores} />
            <TotalEncuestas total={contenido.total} />
        </>;
        case 'avance': return <Avance partes={contenido.partes} indicadores={contenido.indicadores} />;
        case 'desglose': return <Desglose cortes={contenido.cortes} />;
        case 'barras': return <>
            <Barras filas={contenido.filas} formato={contenido.formato} />
            <TotalEncuestas total={contenido.total} />
        </>;
        case 'tabla': return <Tabla columnas={contenido.columnas} filas={contenido.filas} ultimaFilaTotal={contenido.ultimaFilaTotal} />;
        case 'accesos': return <Accesos accesos={contenido.accesos} />;
        case 'titulo': return null;
        case 'mensaje': return <Alert severity={severidadDelTono(contenido.tono)}>{contenido.texto}</Alert>;
        case 'personalizado': {
            var Componente = componentesPersonalizados.get(contenido.componente);
            return Componente != null
                ? <Componente seccion={props.seccion} datos={contenido.datos} tablero={props.tablero} />
                : <Alert severity="warning">Falta registrar el componente "{contenido.componente}" (registrarComponenteTablero).</Alert>;
        }
    }
}

/* estructura de la pantalla */

function TarjetaSeccion(props: { seccion: SeccionTablero, tablero: TableroParaUsuario }) {
    var { seccion } = props;
    return <Card component="section" aria-labelledby={`tablero-${seccion.id}`} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 2.5, pt: 2, pb: 1, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Box sx={{ width: 4, alignSelf: 'stretch', borderRadius: 2, bgcolor: 'primary.main', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography id={`tablero-${seccion.id}`} variant="h6" component="h2" sx={{ fontSize: '1.05rem' }}>{seccion.titulo}</Typography>
                {seccion.descripcion ? <Typography variant="body2" color="text.secondary">{seccion.descripcion}</Typography> : null}
            </Box>
            {seccion.acceso ? <Button size="small" endIcon={<Icono path={ICONOS.irA} />} sx={{ flexShrink: 0 }}
                href={hrefDelAcceso(seccion.acceso)} onClick={alHacerClickEnAcceso(seccion.acceso)}>{seccion.acceso.titulo}</Button> : null}
        </Box>
        <CardContent sx={{ pt: 1, flex: 1, '&:last-child': { pb: 2.5 } }}>
            <ContenidoSeccion seccion={seccion} tablero={props.tablero} />
        </CardContent>
    </Card>;
}

function saludo(fecha: Date): string {
    var hora = fecha.getHours();
    return hora < 6 ? 'Buenas noches' : hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
}

function iniciales(texto: string): string {
    return texto.split(/\s+/).filter(parte => parte != '').slice(0, 2).map(parte => parte[0].toUpperCase()).join('');
}

function Encabezado(props: { tablero: TableroParaUsuario | null, cargando: boolean, onActualizar: () => void }) {
    var { tablero } = props;
    var nombre = tablero?.nombre ?? tablero?.usuario ?? '';
    var generado = tablero ? new Date(tablero.generado) : null;
    return <Paper elevation={0} sx={{
        p: { xs: 2, md: 3 }, mb: 3, borderRadius: 3, color: 'primary.contrastText',
        // el secundario sólo como acento arriba a la derecha, para que el texto blanco siempre tenga contraste
        background: (theme: Theme) => `radial-gradient(circle at 100% 0%, ${alpha(theme.palette.secondary.main, 0.35)} 0%, transparent 45%), linear-gradient(115deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
    }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                <Avatar sx={{ width: 56, height: 56, fontSize: 22, bgcolor: alpha('#FFFFFF', 0.2), color: 'inherit' }}>{iniciales(nombre) || '·'}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" sx={{ opacity: 0.85, lineHeight: 1.6 }}>
                        Gabinete{tablero?.operativo ? ` · operativo ${tablero.operativo}` : ''}
                    </Typography>
                    <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2.1rem' } }}>
                        {saludo(new Date())}{nombre ? `, ${nombre.split(/\s+/)[0]}` : ''}
                    </Typography>
                </Box>
            </Stack>
            <Stack spacing={1} alignItems={{ xs: 'flex-start', sm: 'flex-end' }} sx={{ flexShrink: 0 }}>
                {tablero?.rol ? <Chip size="small" label={tablero.nombreRol ?? tablero.rol} sx={{ bgcolor: alpha('#FFFFFF', 0.18), color: 'inherit' }} /> : null}
                {generado ? <Typography variant="caption" sx={{ opacity: 0.85 }}>
                    actualizado {generado.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </Typography> : null}
                <Button size="small" variant="outlined" color="inherit" disabled={props.cargando} onClick={props.onActualizar}
                    startIcon={<Icono path={ICONOS.actualizar} />}
                    sx={{ borderColor: alpha('#FFFFFF', 0.6), bgcolor: alpha('#FFFFFF', 0.12), '&:hover': { bgcolor: alpha('#FFFFFF', 0.22) }, '&.Mui-disabled': { color: alpha('#FFFFFF', 0.7), borderColor: alpha('#FFFFFF', 0.3) } }}>
                    {props.cargando ? 'actualizando…' : 'actualizar'}
                </Button>
            </Stack>
        </Stack>
    </Paper>;
}

type Columnas = { xs: number, sm: number, md: number };

// columnas de cada sección en la grilla de 12: las secciones seguidas del mismo ancho comparten la fila
// y las que quedan solas al final de una tanda ocupan el lugar que sobra (para no dejar huecos)
export function columnasDeLasSecciones(secciones: SeccionTablero[]): Columnas[] {
    var porFila = (seccion: SeccionTablero) => seccion.ancho == 'tercio' ? 3 : seccion.ancho == 'mitad' ? 2 : 1;
    var resultado: Columnas[] = [];
    var i = 0;
    while (i < secciones.length) {
        // una sección de tres cuartos y, a continuación, una de un cuarto comparten la fila; solas ocupan todo el ancho
        if (secciones[i].ancho == 'tresCuartos' && secciones[i + 1]?.ancho == 'cuarto') {
            resultado.push({ xs: 12, sm: 12, md: 9 }, { xs: 12, sm: 12, md: 3 });
            i += 2;
            continue;
        }
        if (secciones[i].ancho == 'tresCuartos' || secciones[i].ancho == 'cuarto') {
            resultado.push({ xs: 12, sm: 12, md: 12 });
            i++;
            continue;
        }
        var cuantasPorFila = porFila(secciones[i]);
        var fin = i;
        while (fin < secciones.length && secciones[fin].ancho == secciones[i].ancho) {
            fin++;
        }
        for (var j = i; j < fin; j++) {
            var enLaUltimaFila = (fin - i) % cuantasPorFila;
            var esDeLaUltimaFila = enLaUltimaFila != 0 && j >= fin - enLaUltimaFila;
            var md = 12 / (esDeLaUltimaFila ? enLaUltimaFila : cuantasPorFila);
            resultado.push({ xs: 12, sm: md == 4 ? 6 : 12, md });
        }
        i = fin;
    }
    return resultado;
}

function Esqueleto() {
    return <Grid container spacing={2.5}>
        {[12, 6, 6, 4, 4, 4].map((md, i) =>
            <Grid item key={i} xs={12} md={md}>
                <Card sx={{ p: 2.5 }}>
                    <Skeleton width="40%" height={28} />
                    <Skeleton variant="rounded" height={md == 12 ? 96 : 140} sx={{ mt: 1.5 }} />
                </Card>
            </Grid>
        )}
    </Grid>;
}

export const INTERVALO_ACTUALIZACION_MS = 15 * 60 * 1000;

export function Tablero(props: { traer: () => Promise<TableroParaUsuario> }) {
    var { traer } = props;
    var [tablero, setTablero] = useState<TableroParaUsuario | null>(null);
    var [error, setError] = useState<string | null>(null);
    var [cargando, setCargando] = useState(true);
    var actualizar = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            setTablero(await traer());
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setCargando(false);
        }
    }, [traer]);
    useEffect(() => { actualizar(); }, [actualizar]);
    // se actualiza solo cada 15 minutos (si la pestaña está oculta espera al próximo ciclo); mientras tanto sigue mostrando lo anterior
    useEffect(() => {
        var intervalo = setInterval(() => { if (!document.hidden) { actualizar(); } }, INTERVALO_ACTUALIZACION_MS);
        return () => clearInterval(intervalo);
    }, [actualizar]);
    var tema = useMemo(() => crearTema(), []);
    var columnasPorSeccion = tablero ? columnasDeLasSecciones(tablero.secciones) : [];
    return <ThemeProvider theme={tema}>
        <ScopedCssBaseline sx={{ bgcolor: 'background.default', minHeight: '100%' }}>
            <Box className="tablero" sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1440, mx: 'auto' }}>
                <Encabezado tablero={tablero} cargando={cargando} onActualizar={actualizar} />
                {error ? <Alert severity="error" sx={{ mb: 2 }}>No se pudo traer el tablero: {error}</Alert> : null}
                {tablero && tablero.errores.length ?
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {tablero.errores.length == 1 ? 'Una sección no se pudo mostrar' : `${tablero.errores.length} secciones no se pudieron mostrar`}
                        {': '}{tablero.errores.map(e => `${e.seccion} (${e.mensaje})`).join('; ')}
                    </Alert> : null}
                {tablero == null ? (error ? null : <Esqueleto />) :
                    tablero.secciones.length == 0 ? <Alert severity="info">No hay información del operativo para mostrar con su rol.</Alert> :
                        <Grid container spacing={2.5}>
                            {tablero.secciones.map((seccion, i) =>
                                <Grid item key={seccion.id} {...columnasPorSeccion[i]}>
                                    {seccion.contenido.tipo == 'titulo' ?
                                        <Typography variant="h5" component="h2" color="text.secondary" sx={{ mt: 1, fontWeight: 600 }}>{seccion.titulo}</Typography>
                                        : <TarjetaSeccion seccion={seccion} tablero={tablero!} />}
                                </Grid>
                            )}
                        </Grid>
                }
            </Box>
        </ScopedCssBaseline>
    </ThemeProvider>;
}

/* pantalla del menú (menuType 'tablero', ver getMenu en app-dmencu.ts) */

export const traerTablero = async (): Promise<TableroParaUsuario> => await myOwn.ajax.tablero_traer({});

myOwn.wScreens.tablero = async function () {
    var mainLayout = document.getElementById('main_layout')!;
    var contenedor = document.createElement('div');
    contenedor.className = 'tablero-contenedor';
    mainLayout.appendChild(contenedor);
    ReactDOM.render(<Tablero traer={traerTablero} />, contenedor);
};
