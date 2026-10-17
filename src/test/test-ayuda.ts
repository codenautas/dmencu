import { describe, it } from 'mocha';

import assert = require('node:assert');
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { quienConsultaAyuda } from '../server/app-dmencu';
import {
    cargarAyuda, carpetaDelPaquete, combinarTemasDeAyuda, leerFuenteDeAyuda, menuConAyuda, parsearTemaDeAyuda, temasVisibles
} from '../server/ayuda';
import type { AyudaTema, MenuInfoBase } from '../server/types-dmencu';
import { AppParaTests, contextoDelRol, crearAppParaTests } from './app-para-tests';

const GABINETE = '';
const RELEVAMIENTO = 'web';

function appConAyuda(policy: string): AppParaTests {
    var be = crearAppParaTests(policy);
    be.caches.ayuda = cargarAyuda(be.getAyudaFuentes());
    return be;
}

function idsVisibles(be: AppParaTests, rol: string): string[] {
    return temasVisibles(be.caches.ayuda, quienConsultaAyuda(contextoDelRol(be, rol))).map(tema => tema.id);
}

function tema(contenido: string, origen: string = 'test'): AyudaTema {
    return parsearTemaDeAyuda(contenido, 'tema.md', origen);
}

describe('dmencu - ayuda en línea', () => {

    describe('formato de los archivos', () => {
        it('lee el encabezado y convierte el markdown a html', () => {
            var leido = tema('---\nid: uno\ntitulo: Uno\npermisos: [campo.editar]\nmenu: asignacion\n---\nTexto **fuerte** y [otro](ayuda:dos)\n');
            assert.strictEqual(leido.id, 'uno');
            assert.strictEqual(leido.titulo, 'Uno');
            assert.deepStrictEqual(leido.permisos, ['campo.editar']);
            assert.deepStrictEqual(leido.menu, ['asignacion']);
            assert.deepStrictEqual(leido.roles, []);
            assert.strictEqual(leido.modo, null);
            assert.strictEqual(leido.html, '<p>Texto <strong>fuerte</strong> y <a href="ayuda:dos">otro</a></p>\n');
        });
        it('no deja pasar html crudo', () => {
            assert.ok(!tema('---\nid: uno\ntitulo: Uno\n---\n<script>alert(1)</script>\n').html.includes('<script>'));
        });
        it('acepta archivos con BOM y fin de línea de Windows', () => {
            assert.strictEqual(tema('﻿---\r\nid: uno\r\ntitulo: Uno\r\n---\r\nhola\r\n').html, '<p>hola</p>\n');
        });
        it('rechaza un archivo sin encabezado', () => {
            assert.throws(() => tema('# Hola\n'), /falta el encabezado/);
        });
        it('rechaza campos desconocidos (para detectar errores de tipeo)', () => {
            assert.throws(() => tema('---\nid: uno\ntitulo: Uno\npermiso: campo.editar\n---\n'), /campo desconocido "permiso"/);
        });
        it('rechaza un modo que no existe', () => {
            assert.throws(() => tema('---\nid: uno\ntitulo: Uno\nmodo: OFICINA\n---\n'), /modo debe ser/);
        });
        it('rechaza permisos sin acción', () => {
            assert.throws(() => tema('---\nid: uno\ntitulo: Uno\npermisos: [campo]\n---\n'), /permiso.accion/);
        });
        it('exige título salvo para ocultar', () => {
            assert.throws(() => tema('---\nid: uno\n---\n'), /titulo/);
            assert.strictEqual(tema('---\nid: uno\nocultar: true\n---\n').ocultar, true);
        });
    });

    describe('fuentes: cómo las apps finales agregan, reemplazan y ocultan temas', () => {
        var dmencu = [
            tema('---\nid: a\ntitulo: A de dmencu\norden: 1\n---\n', 'dmencu'),
            tema('---\nid: b\ntitulo: B\norden: 2\n---\n', 'dmencu'),
            tema('---\nid: c\ntitulo: C\norden: 3\n---\n', 'dmencu'),
        ];
        var app = [
            tema('---\nid: a\ntitulo: A de la app\norden: 1\n---\n', 'app'),
            tema('---\nid: b\nocultar: true\n---\n', 'app'),
            tema('---\nid: d\ntitulo: D\norden: 0\n---\n', 'app'),
        ];
        it('un id repetido reemplaza al anterior, ocultar lo quita y los nuevos se agregan según orden', () => {
            var combinados = combinarTemasDeAyuda([dmencu, app]);
            assert.deepStrictEqual(combinados.map(t => [t.id, t.origen]), [['d', 'app'], ['a', 'app'], ['c', 'dmencu']]);
        });
        it('rechaza ids repetidos dentro de una misma carpeta', () => {
            var carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'ayuda-'));
            try {
                fs.writeFileSync(path.join(carpeta, '1.md'), '---\nid: a\ntitulo: A\n---\n');
                fs.writeFileSync(path.join(carpeta, '2.md'), '---\nid: a\ntitulo: Otra A\n---\n');
                assert.throws(() => leerFuenteDeAyuda({ origen: 'test', carpeta }), /ya está en/);
            } finally {
                fs.rmSync(carpeta, { recursive: true });
            }
        });
        it('avisa si la carpeta no existe', () => {
            assert.throws(() => leerFuenteDeAyuda({ origen: 'test', carpeta: path.join(os.tmpdir(), 'no-existe-ayuda') }), /no existe la carpeta/);
        });
        it('la carpeta de dmencu se encuentra desde el js compilado', () => {
            assert.ok(fs.existsSync(path.join(carpetaDelPaquete(__dirname), 'ayuda')));
        });
    });

    describe('los temas de dmencu', () => {
        it('no tienen problemas en GABINETE (permisos, roles y opciones de menú existen)', () => {
            assert.deepStrictEqual(appConAyuda(GABINETE).problemasDeAyuda(), []);
        });
        it('no tienen problemas en RELEVAMIENTO', () => {
            assert.deepStrictEqual(appConAyuda(RELEVAMIENTO).problemasDeAyuda(), []);
        });
        it('cada opción del menú de admin en GABINETE tiene un tema que la explica, directa o a través de su menú padre', () => {
            var be = appConAyuda(GABINETE);
            var context = contextoDelRol(be, 'admin');
            var opciones = menuConAyuda(be.getMenu(context).menu, be.caches.ayuda);
            var sinAyuda = opciones.filter(opcion => opcion.tema == null && opcion.ruta != 'configurar' && opcion.ruta != 'carto').map(opcion => opcion.ruta);
            assert.deepStrictEqual(sinAyuda, []);
        });
    });

    describe('qué ve cada perfil', () => {
        it('en RELEVAMIENTO quien releva ve la ayuda del dispositivo', () => {
            var be = appConAyuda(RELEVAMIENTO);
            assert.deepStrictEqual(idsVisibles(be, 'encuestador'), ['dm-relevamiento', 'dm-sincronizar', 'dm-cambiar-modo']);
            assert.deepStrictEqual(idsVisibles(be, 'supervisor'), ['dm-relevamiento', 'dm-sincronizar', 'dm-cambiar-modo']);
        });
        it('en RELEVAMIENTO quien no releva no ve ayuda ni la opción del menú', () => {
            var be = appConAyuda(RELEVAMIENTO);
            assert.deepStrictEqual(idsVisibles(be, 'coor_campo'), []);
            assert.deepStrictEqual(be.getMenu(contextoDelRol(be, 'coor_campo')).menu, []);
        });
        it('en GABINETE el encuestador no ve la ayuda del dispositivo', () => {
            var be = appConAyuda(GABINETE);
            assert.deepStrictEqual(idsVisibles(be, 'encuestador'), []);
            assert.deepStrictEqual(be.getMenu(contextoDelRol(be, 'encuestador')).menu, []);
        });
        it('en GABINETE el ingresador ve lo de campo pero no lo de administración ni procesamiento', () => {
            var ids = idsVisibles(appConAyuda(GABINETE), 'ingresador');
            assert.deepStrictEqual(ids, ['tablero', 'circuito-encuesta', 'asignacion', 'recepcion', 'supervision', 'varios']);
        });
        it('diseño conceptual ve la ayuda de metadatos', () => {
            var ids = idsVisibles(appConAyuda(GABINETE), 'dis_conceptual');
            assert.deepStrictEqual(ids, ['tablero', 'circuito-encuesta', 'metadatos']);
        });
        it('admin (superuser) ve todos los temas del modo', () => {
            var be = appConAyuda(GABINETE);
            var deGabinete = be.caches.ayuda.filter(t => t.modo != 'RELEVAMIENTO').map(t => t.id);
            assert.deepStrictEqual(idsVisibles(be, 'admin'), deGabinete);
        });
        it('un tema por rol se muestra a ese rol aunque no tenga el permiso', () => {
            var porRol = tema('---\nid: x\ntitulo: X\nroles: [auxiliar]\n---\n');
            var be = crearAppParaTests(GABINETE);
            assert.deepStrictEqual(temasVisibles([porRol], quienConsultaAyuda(contextoDelRol(be, 'auxiliar'))).map(t => t.id), ['x']);
            assert.deepStrictEqual(temasVisibles([porRol], quienConsultaAyuda(contextoDelRol(be, 'ingresador'))), []);
        });
        it('la opción ayuda va al final del menú de quien tiene temas', () => {
            var be = appConAyuda(RELEVAMIENTO);
            var menu: MenuInfoBase[] = be.getMenu(contextoDelRol(be, 'encuestador')).menu;
            assert.deepStrictEqual(menu.map(opcion => opcion.name), ['relevamiento', 'sincronizar', 'cambiar_modo', 'ayuda']);
        });
    });

    describe('menú con ayuda (lo que muestra "Qué puedo hacer")', () => {
        it('liga cada opción del menú del usuario con su tema y no incluye la opción ayuda', () => {
            var be = appConAyuda(RELEVAMIENTO);
            var context = contextoDelRol(be, 'encuestador');
            var temas = temasVisibles(be.caches.ayuda, quienConsultaAyuda(context));
            assert.deepStrictEqual(menuConAyuda(be.getMenu(context).menu, temas), [
                { ruta: 'relevamiento', label: 'relevamiento', tema: 'dm-relevamiento', opciones: [] },
                { ruta: 'sincronizar', label: 'sincronizar', tema: 'dm-sincronizar', opciones: [] },
                { ruta: 'cambiar_modo', label: 'cambiar modo', tema: 'dm-cambiar-modo', opciones: [] },
            ]);
        });
        it('recorre los submenús con rutas separadas por /', () => {
            var be = appConAyuda(GABINETE);
            var context = contextoDelRol(be, 'ingresador');
            var temas = temasVisibles(be.caches.ayuda, quienConsultaAyuda(context));
            var asignacion = menuConAyuda(be.getMenu(context).menu, temas).find(opcion => opcion.ruta == 'asignacion');
            assert.ok(asignacion);
            assert.deepStrictEqual(asignacion.opciones.map(opcion => [opcion.ruta, opcion.tema]), [
                ['asignacion/encuestador', 'asignacion'],
                ['asignacion/ingresador', 'asignacion'],
                ['asignacion/recuperador', 'asignacion'],
            ]);
        });
    });
});
