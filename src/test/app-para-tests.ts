import * as fs from 'node:fs';
import * as path from 'node:path';

import * as pg from 'pg-promise-strict';
import { AppBackend, emergeAppMetaEnc, emergeAppOperativos, emergeAppRelEnc } from 'meta-enc';
import { emergeAppConsistencias, emergeAppDatosExt, emergeAppProcesamiento, emergeAppVarCal, OperativoGenerator } from 'procesamiento';

import { emergeAppDmEncu, permisosSegunUsuario } from '../server/app-dmencu';
import type { Context, PermisosRol, Puede } from '../server/types-dmencu';

// La app compuesta igual que en server-dmencu.ts, pero sin llamar a start():
// no se conecta a la base ni levanta el servidor.
export const AppDmEncuParaTests = emergeAppDmEncu(
    emergeAppProcesamiento(
        emergeAppConsistencias(
            emergeAppDatosExt(
                emergeAppMetaEnc(
                    emergeAppRelEnc(
                        emergeAppVarCal(
                            emergeAppOperativos(AppBackend)
                        )
                    )
                )
            )
        )
    )
);

export type AppParaTests = InstanceType<typeof AppDmEncuParaTests>;

// policy 'web' es el modo RELEVAMIENTO (dispositivos), cualquier otra es GABINETE (ver getModoByPolicy)
export function crearAppParaTests(policy: string = ''): AppParaTests {
    var be = new AppDmEncuParaTests();
    // la configuración se carga en start(); se completa sólo la parte del servidor
    be.config.server = {
        'base-url': '',
        port: 3000,
        'session-store': 'memory',
        'ip-replacer': '',
        'silent-startup': true,
        'kill-9': '',
        bitacoraSchema: '',
        bitacoraTableName: '',
        useCors: false,
        allowedHosts: [],
        policy,
    };
    // start() asigna el motor de base; las definiciones de tablas lo usan para citar identificadores
    be.db = pg;
    // igual que en server-dmencu.ts
    OperativoGenerator.mainTD = 'viviendas';
    OperativoGenerator.mainTDPK = 'vivienda';
    var permisos = permisosDeInstalacion();
    be.caches.permisosRol = permisos.permisosRol;
    be.caches.permisosRolSoloTrue = permisos.permisosRol;
    be.caches.permisosSuperuser = permisos.permisosSuperuser;
    be.caches.permisosParaNadie = permisos.permisosParaNadie;
    return be;
}

type FilaTab = Record<string, string>;

function leerTab(nombreArchivo: string): FilaTab[] {
    // los tests corren desde dist/test
    var contenido = fs.readFileSync(path.join(__dirname, '../../install', nombreArchivo), 'utf8');
    var [encabezado, ...lineas] = contenido.split(/\r?\n/).filter(linea => linea.trim() != '');
    var columnas = encabezado.split('|').map(columna => columna.trim());
    return lineas.map(linea => {
        var valores = linea.split('|').map(valor => valor.trim());
        var fila: FilaTab = {};
        columnas.forEach((columna, i) => { fila[columna] = valores[i]; });
        return fila;
    });
}

function puedeDe(filas: FilaTab[], habilitado: (fila: FilaTab) => boolean): Puede {
    var puede: Record<string, Record<string, boolean>> = {};
    filas.forEach(fila => {
        puede[fila.permiso] = puede[fila.permiso] || {};
        puede[fila.permiso][fila.accion] = habilitado(fila);
    });
    return puede;
}

// Arma los permisos como lo hace postConfig en app-dmencu.ts (que los lee de la base),
// a partir de los .tab con que se instala la base
export function permisosDeInstalacion(): { permisosRol: PermisosRol, permisosSuperuser: Puede, permisosParaNadie: Puede } {
    var roles = leerTab('roles.tab');
    var rolesPermisos = leerTab('roles_permisos.tab');
    var permisos = leerTab('permisos.tab');
    var permisosRol: PermisosRol = {};
    roles.forEach(rol => {
        var filasDelRol = rolesPermisos.filter(rp => rp.rol == rol.rol);
        permisosRol[rol.rol] = {
            superuser: rol.superuser == 'true',
            puede: filasDelRol.length ? puedeDe(filasDelRol, rp => rp.habilitado == 'true') : undefined,
        };
    });
    return {
        permisosRol,
        permisosSuperuser: puedeDe(permisos, () => true),
        permisosParaNadie: puedeDe(permisos, () => false),
    };
}

// contexto como el que arma getContext para un usuario con ese rol
export function contextoDelRol(be: AppParaTests, rol: string, idper: string = 'PER1'): Context {
    var user = { rol, idper, usuario: 'usu_' + rol };
    return {
        ...permisosSegunUsuario(be.caches, user),
        be,
        user,
        session: {},
        username: user.usuario,
        machineId: 'test',
        navigator: 'test',
    };
}
