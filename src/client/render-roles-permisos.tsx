// Pantalla de roles y permisos (configurar → usuarios → roles y permisos, ver docs/roles-y-permisos.md):
// matriz rol × permiso que el admin cambia con un clic, roles subordinados y el menú que ve cada rol.

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as ReactDOM from "react-dom";
import {
    Alert, Box, Checkbox, Chip, CircularProgress, Divider, Drawer, FormControlLabel, IconButton, InputAdornment, Paper,
    ScopedCssBaseline, Snackbar, Stack, SvgIcon, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, ThemeProvider, Tooltip, Typography, alpha
} from "@mui/material";
import type { Theme } from "@mui/material";

import type { AyudaOpcionMenu } from "../unlogged/tipos";
import type { MenuDelRol, PermisoAccion, PermisoDisponible, RolDisponible, RolesYPermisos } from "../unlogged/tipos-roles-permisos";
import { crearTema } from "./render-tablero";

const ICONOS = {
    buscar: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    cerrar: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    abrir: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
};

function Icono(props: { path: string }) {
    return <SvgIcon fontSize="small"><path d={props.path} /></SvgIcon>;
}

type Aviso = { tipo: 'success' | 'error', texto: string };

function mensajeDeError(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

// permisos agrupados por permiso (las columnas de la matriz), respetando el orden en que llegan
export function agruparPermisos(permisos: PermisoDisponible[]): { permiso: string, acciones: PermisoDisponible[] }[] {
    var grupos: { permiso: string, acciones: PermisoDisponible[] }[] = [];
    permisos.forEach(permiso => {
        var grupo = grupos.find(g => g.permiso == permiso.permiso);
        if (grupo == null) {
            grupo = { permiso: permiso.permiso, acciones: [] };
            grupos.push(grupo);
        }
        grupo.acciones.push(permiso);
    });
    return grupos;
}

/* panel de un rol */

function ArbolDelMenu(props: { opciones: AyudaOpcionMenu[], nivel?: number }) {
    var nivel = props.nivel ?? 0;
    return <Box component="ul" sx={{ listStyle: 'none', m: 0, pl: nivel ? 2 : 0 }}>
        {props.opciones.map(opcion =>
            <Box component="li" key={opcion.ruta} sx={{ py: 0.25 }}>
                <Typography variant="body2" fontWeight={nivel ? 400 : 600} color={nivel ? 'text.secondary' : 'text.primary'}>{opcion.label}</Typography>
                {opcion.opciones.length ? <ArbolDelMenu opciones={opcion.opciones} nivel={nivel + 1} /> : null}
            </Box>
        )}
    </Box>;
}

function PanelDelRol(props: {
    rol: RolDisponible, datos: RolesYPermisos, versionPermisos: number,
    onCambiarSubordinado: (rolSubordinado: string, incluido: boolean) => void, onCerrar: () => void
}) {
    var { rol, datos } = props;
    var [menu, setMenu] = useState<MenuDelRol | null>(null);
    var [errorMenu, setErrorMenu] = useState<string | null>(null);
    useEffect(() => {
        var vigente = true;
        setMenu(null);
        setErrorMenu(null);
        myOwn.ajax.rol_menu_previsualizar({ rol: rol.rol }).then(
            (resultado: MenuDelRol) => { if (vigente) setMenu(resultado); },
            (err: unknown) => { if (vigente) setErrorMenu(mensajeDeError(err)); }
        );
        return () => { vigente = false; };
    }, [rol.rol, props.versionPermisos]);
    var subordinados = datos.subordinados[rol.rol] ?? [];
    var habilitados = datos.habilitados[rol.rol] ?? [];
    return <Box sx={{ width: { xs: '100vw', sm: 420 }, p: 3 }} role="region" aria-label={`rol ${rol.nombre}`}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
                <Typography variant="overline" color="text.secondary">{rol.rol}</Typography>
                <Typography variant="h5" component="h2" fontWeight={600}>{rol.nombre}</Typography>
            </Box>
            <IconButton aria-label="cerrar" onClick={props.onCerrar}><Icono path={ICONOS.cerrar} /></IconButton>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ my: 1.5 }} flexWrap="wrap" useFlexGap>
            {rol.superuser ? <Chip size="small" color="secondary" label="superuser: tiene todos los permisos" /> : null}
            <Chip size="small" label={`${rol.usuariosActivos} usuarios activos`} />
            {rol.usuariosInactivos ? <Chip size="small" variant="outlined" label={`${rol.usuariosInactivos} inactivos`} /> : null}
        </Stack>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>Permisos</Typography>
        {rol.superuser ? <Typography variant="body2" color="text.secondary">Todos.</Typography> :
            habilitados.length ? <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {habilitados.map(permiso => <Chip key={permiso} size="small" variant="outlined" color="primary" label={permiso} />)}
            </Stack> : <Typography variant="body2" color="text.secondary">Ninguno.</Typography>}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2">Roles que administra</Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Puede cambiar la contraseña de los usuarios de estos roles.{datos.puedeEditar ? ' Hacé clic para agregar o quitar.' : ''}
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {datos.roles.map(otro => {
                var incluido = subordinados.includes(otro.rol);
                return datos.puedeEditar || incluido ?
                    <Chip key={otro.rol} size="small" label={otro.nombre}
                        color={incluido ? 'primary' : 'default'} variant={incluido ? 'filled' : 'outlined'}
                        onClick={datos.puedeEditar ? () => props.onCambiarSubordinado(otro.rol, !incluido) : undefined} />
                    : null;
            })}
            {!datos.puedeEditar && subordinados.length == 0 ? <Typography variant="body2" color="text.secondary">Ninguno.</Typography> : null}
        </Stack>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2">Qué ve en el menú{menu ? ` (modo ${menu.modo.toLowerCase()})` : ''}</Typography>
        <Box sx={{ mt: 1 }}>
            {errorMenu ? <Alert severity="error">{errorMenu}</Alert> :
                menu == null ? <CircularProgress size={20} /> :
                    menu.menu.length ? <ArbolDelMenu opciones={menu.menu} /> :
                        <Typography variant="body2" color="text.secondary">Nada: con estos permisos no tiene opciones en este modo.</Typography>}
        </Box>
    </Box>;
}

/* matriz */

function CeldaPermiso(props: { rol: RolDisponible, permiso: PermisoDisponible, habilitado: boolean, editable: boolean, guardando: boolean, onCambiar: () => void }) {
    var { rol, permiso } = props;
    if (rol.superuser) {
        return <Tooltip title="superuser: tiene todos los permisos"><span><Checkbox size="small" checked disabled /></span></Tooltip>;
    }
    if (props.guardando) {
        return <Box sx={{ width: 38, height: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={18} /></Box>;
    }
    return <Checkbox size="small" checked={props.habilitado} disabled={!props.editable} onChange={props.onCambiar}
        inputProps={{ 'aria-label': `${rol.nombre}: ${permiso.permisoAccion}` }} />;
}

export function PantallaRolesYPermisos() {
    var [datos, setDatos] = useState<RolesYPermisos | null>(null);
    var [error, setError] = useState<string | null>(null);
    var [filtro, setFiltro] = useState('');
    var [soloConUsuarios, setSoloConUsuarios] = useState(false);
    var [rolAbierto, setRolAbierto] = useState<string | null>(null);
    var [guardando, setGuardando] = useState<Set<string>>(new Set());
    var [aviso, setAviso] = useState<Aviso | null>(null);
    var [versionPermisos, setVersionPermisos] = useState(0);

    var traer = useCallback(async () => {
        try {
            setDatos(await myOwn.ajax.roles_permisos_traer({}));
        } catch (err) {
            setError(mensajeDeError(err));
        }
    }, []);
    useEffect(() => { traer(); }, [traer]);

    var tema = useMemo(() => crearTema(), []);
    var grupos = useMemo(() => agruparPermisos(datos?.permisos ?? []), [datos?.permisos]);

    var cambiarPermiso = async (rol: RolDisponible, permiso: PermisoDisponible) => {
        if (datos == null) return;
        var clave = `${rol.rol}|${permiso.permisoAccion}`;
        var habilitado = !(datos.habilitados[rol.rol] ?? []).includes(permiso.permisoAccion);
        setGuardando(previo => new Set(previo).add(clave));
        try {
            var habilitadosDelRol: PermisoAccion[] = await myOwn.ajax.rol_permiso_cambiar({ rol: rol.rol, permiso: permiso.permiso, accion: permiso.accion, habilitado });
            setDatos(previo => previo && { ...previo, habilitados: { ...previo.habilitados, [rol.rol]: habilitadosDelRol } });
            setVersionPermisos(v => v + 1);
            setAviso({ tipo: 'success', texto: `${rol.nombre}: ${habilitado ? 'se habilitó' : 'se quitó'} ${permiso.permisoAccion}. Los usuarios lo ven al recargar la página.` });
        } catch (err) {
            setAviso({ tipo: 'error', texto: mensajeDeError(err) });
        } finally {
            setGuardando(previo => { var nuevo = new Set(previo); nuevo.delete(clave); return nuevo; });
        }
    };

    var cambiarSubordinado = async (rol: string, rolSubordinado: string, incluido: boolean) => {
        try {
            var subordinadosDelRol: string[] = await myOwn.ajax.rol_subordinado_cambiar({ rol, rol_subordinado: rolSubordinado, incluido });
            setDatos(previo => previo && { ...previo, subordinados: { ...previo.subordinados, [rol]: subordinadosDelRol } });
        } catch (err) {
            setAviso({ tipo: 'error', texto: mensajeDeError(err) });
        }
    };

    var texto = filtro.trim().toLowerCase();
    var roles = (datos?.roles ?? []).filter(rol =>
        (!texto || rol.rol.toLowerCase().includes(texto) || rol.nombre.toLowerCase().includes(texto))
        && (!soloConUsuarios || rol.usuariosActivos > 0)
    );
    var rolDelPanel = datos?.roles.find(rol => rol.rol == rolAbierto) ?? null;

    return <ThemeProvider theme={tema}>
        <ScopedCssBaseline sx={{ bgcolor: 'background.default', minHeight: '100%' }}>
            <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
                <Paper elevation={0} sx={{
                    p: { xs: 2, md: 2.5 }, mb: 2, borderRadius: 3, color: 'primary.contrastText',
                    background: (theme: Theme) => `linear-gradient(115deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                }}>
                    <Typography variant="h5" component="h1" fontWeight={600}>Roles y permisos</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Qué puede hacer cada rol. Hacé clic en el nombre de un rol para ver qué menú le queda y a qué roles administra.
                    </Typography>
                </Paper>
                {error ? <Alert severity="error" sx={{ mb: 2 }}>No se pudieron traer los roles y permisos: {error}</Alert> : null}
                {datos && !datos.puedeEditar ? <Alert severity="info" sx={{ mb: 2 }}>Sólo el administrador puede cambiar permisos y roles administrados.</Alert> : null}
                {datos == null ? (error ? null : <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>) : <>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                        <TextField size="small" placeholder="buscar rol" value={filtro} onChange={event => setFiltro(event.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><Icono path={ICONOS.buscar} /></InputAdornment> }}
                            sx={{ bgcolor: 'background.paper', minWidth: 240 }} inputProps={{ 'aria-label': 'buscar rol' }} />
                        <FormControlLabel control={<Switch checked={soloConUsuarios} onChange={event => setSoloConUsuarios(event.target.checked)} />}
                            label="sólo roles con usuarios activos" />
                        <Box sx={{ flex: 1 }} />
                        <Typography variant="body2" color="text.secondary">{roles.length} de {datos.roles.length} roles · {datos.permisos.length} permisos</Typography>
                    </Stack>
                    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <TableContainer sx={{ maxHeight: 'calc(100vh - 260px)', minHeight: 300 }}>
                            <Table stickyHeader size="small" aria-label="matriz de roles y permisos">
                                <TableHead>
                                    <TableRow>
                                        <TableCell rowSpan={2} sx={{ minWidth: 220, position: 'sticky', left: 0, zIndex: 4, bgcolor: 'background.paper', fontWeight: 600 }}>rol</TableCell>
                                        {grupos.map(grupo =>
                                            <TableCell key={grupo.permiso} colSpan={grupo.acciones.length} align="center"
                                                sx={{ fontWeight: 600, color: 'primary.main', borderLeft: '1px solid', borderLeftColor: 'divider', whiteSpace: 'nowrap' }}>
                                                {grupo.permiso.replace(/_/g, ' ')}
                                            </TableCell>
                                        )}
                                        <TableCell rowSpan={2} align="right" sx={{ fontWeight: 600 }}>total</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        {grupos.map(grupo => grupo.acciones.map((permiso, i) =>
                                            <TableCell key={permiso.permisoAccion} align="center"
                                                sx={{ top: 37, color: 'text.secondary', whiteSpace: 'nowrap', ...(i == 0 ? { borderLeft: '1px solid', borderLeftColor: 'divider' } : {}) }}>
                                                <Tooltip title={permiso.descripcion ?? permiso.permisoAccion} arrow><span>{permiso.accion}</span></Tooltip>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {roles.map(rol => {
                                        var habilitados = datos!.habilitados[rol.rol] ?? [];
                                        return <TableRow key={rol.rol} hover selected={rol.rol == rolAbierto}>
                                            <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', cursor: 'pointer' }}
                                                onClick={() => setRolAbierto(rol.rol)}>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body2" fontWeight={600} noWrap>{rol.nombre}</Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {rol.rol} · {rol.usuariosActivos} {rol.usuariosActivos == 1 ? 'usuario' : 'usuarios'}
                                                        </Typography>
                                                    </Box>
                                                    {rol.superuser ? <Chip size="small" color="secondary" label="superuser" /> : null}
                                                    <Icono path={ICONOS.abrir} />
                                                </Stack>
                                            </TableCell>
                                            {grupos.map(grupo => grupo.acciones.map((permiso, i) =>
                                                <TableCell key={permiso.permisoAccion} align="center" padding="none"
                                                    sx={{
                                                        ...(i == 0 ? { borderLeft: '1px solid', borderLeftColor: 'divider' } : {}),
                                                        bgcolor: (theme: Theme) => !rol.superuser && habilitados.includes(permiso.permisoAccion) ? alpha(theme.palette.primary.main, 0.06) : 'transparent'
                                                    }}>
                                                    <CeldaPermiso rol={rol} permiso={permiso} habilitado={habilitados.includes(permiso.permisoAccion)}
                                                        editable={datos!.puedeEditar} guardando={guardando.has(`${rol.rol}|${permiso.permisoAccion}`)}
                                                        onCambiar={() => cambiarPermiso(rol, permiso)} />
                                                </TableCell>
                                            ))}
                                            <TableCell align="right">{rol.superuser ? 'todos' : habilitados.length}</TableCell>
                                        </TableRow>;
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </>}
                <Drawer anchor="right" open={rolDelPanel != null} onClose={() => setRolAbierto(null)}>
                    {rolDelPanel && datos ? <PanelDelRol rol={rolDelPanel} datos={datos} versionPermisos={versionPermisos}
                        onCambiarSubordinado={(subordinado, incluido) => cambiarSubordinado(rolDelPanel!.rol, subordinado, incluido)}
                        onCerrar={() => setRolAbierto(null)} /> : null}
                </Drawer>
                <Snackbar open={aviso != null} autoHideDuration={aviso?.tipo == 'error' ? 8000 : 4000} onClose={() => setAviso(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                    {aviso ? <Alert severity={aviso.tipo} variant="filled" onClose={() => setAviso(null)}>{aviso.texto}</Alert> : undefined}
                </Snackbar>
            </Box>
        </ScopedCssBaseline>
    </ThemeProvider>;
}

myOwn.wScreens.roles_permisos = async function () {
    var mainLayout = document.getElementById('main_layout')!;
    var contenedor = document.createElement('div');
    contenedor.className = 'roles-permisos-contenedor';
    mainLayout.appendChild(contenedor);
    ReactDOM.render(<PantallaRolesYPermisos />, contenedor);
};
