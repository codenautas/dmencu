"use strict";

// Ayuda en línea para usuarios: temas en archivos .md con un encabezado YAML que dice a quién se muestran.
// Las apps finales agregan, reemplazan u ocultan temas con getAyudaFuentes (ver docs/ayuda-online.md).

import * as fs from "fs";
import * as path from "path";
import * as jsYaml from "js-yaml";
import MarkdownIt = require("markdown-it");

import type { AyudaOpcionMenu, ModoApp } from "../unlogged/tipos";
import type { AyudaFuente, AyudaTema, MenuInfoBase, Puede } from "./types-dmencu";

// quien consulta la ayuda: lo que hace falta del context para decidir qué temas ve
export type QuienConsultaAyuda = {
    rol: string | null
    superuser: boolean
    puede: Puede | undefined
    modo: ModoApp
}

const ENCABEZADO = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const CAMPOS_DEL_ENCABEZADO = ['id', 'titulo', 'orden', 'permisos', 'roles', 'modo', 'menu', 'ocultar'];
const ORDEN_PREDETERMINADO = 100;

// html: false porque el contenido es texto para usuarios, no páginas; los enlaces "ayuda:id" llevan a otro tema
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true });

function errorDeAyuda(archivo: string, mensaje: string): Error {
    return new Error(`ayuda ${archivo}: ${mensaje}`);
}

function texto(valor: unknown, campo: string, archivo: string): string {
    if (typeof valor != 'string' || valor.trim() == '') {
        throw errorDeAyuda(archivo, `${campo} debe ser un texto no vacío`);
    }
    return valor.trim();
}

function listaDeTextos(valor: unknown, campo: string, archivo: string): string[] {
    if (valor == null) {
        return [];
    }
    if (typeof valor == 'string') {
        return [texto(valor, campo, archivo)];
    }
    if (!Array.isArray(valor)) {
        throw errorDeAyuda(archivo, `${campo} debe ser una lista de textos`);
    }
    var elementos: unknown[] = valor;
    return elementos.map(elemento => texto(elemento, campo, archivo));
}

function modoApp(valor: unknown, archivo: string): ModoApp | null {
    if (valor == null) {
        return null;
    }
    if (valor === 'RELEVAMIENTO' || valor === 'GABINETE') {
        return valor;
    }
    throw errorDeAyuda(archivo, `modo debe ser RELEVAMIENTO o GABINETE`);
}

// lee el texto de un archivo de ayuda (encabezado + markdown)
export function parsearTemaDeAyuda(contenido: string, archivo: string, origen: string): AyudaTema {
    var sinBom = contenido.replace(/^﻿/, '');
    var partes = ENCABEZADO.exec(sinBom);
    if (partes == null) {
        throw errorDeAyuda(archivo, 'falta el encabezado entre líneas ---');
    }
    var yaml: unknown = jsYaml.load(partes[1]);
    if (yaml == null || typeof yaml != 'object' || Array.isArray(yaml)) {
        throw errorDeAyuda(archivo, 'el encabezado debe tener la forma "campo: valor"');
    }
    var encabezado: Map<string, unknown> = new Map();
    for (var campo of Object.keys(yaml)) {
        if (!CAMPOS_DEL_ENCABEZADO.includes(campo)) {
            throw errorDeAyuda(archivo, `campo desconocido "${campo}" (los válidos son: ${CAMPOS_DEL_ENCABEZADO.join(', ')})`);
        }
        encabezado.set(campo, Reflect.get(yaml, campo));
    }
    var id = texto(encabezado.get('id'), 'id', archivo);
    if (!/^[a-z0-9_-]+$/.test(id)) {
        throw errorDeAyuda(archivo, `el id "${id}" sólo puede tener minúsculas, números, "_" y "-"`);
    }
    var ocultar = encabezado.get('ocultar') ?? false;
    if (typeof ocultar != 'boolean') {
        throw errorDeAyuda(archivo, 'ocultar debe ser true o false');
    }
    var orden = encabezado.get('orden') ?? ORDEN_PREDETERMINADO;
    if (typeof orden != 'number') {
        throw errorDeAyuda(archivo, 'orden debe ser un número');
    }
    var permisos = listaDeTextos(encabezado.get('permisos'), 'permisos', archivo);
    permisos.forEach(permiso => {
        if (!/^\w+\.\w+$/.test(permiso)) {
            throw errorDeAyuda(archivo, `el permiso "${permiso}" debe tener la forma permiso.accion`);
        }
    });
    return {
        id,
        // un tema que sólo oculta otro no necesita título
        titulo: ocultar && encabezado.get('titulo') == null ? id : texto(encabezado.get('titulo'), 'titulo', archivo),
        orden,
        permisos,
        roles: listaDeTextos(encabezado.get('roles'), 'roles', archivo),
        modo: modoApp(encabezado.get('modo'), archivo),
        menu: listaDeTextos(encabezado.get('menu'), 'menu', archivo),
        ocultar,
        origen,
        archivo,
        html: ocultar ? '' : markdown.render(sinBom.slice(partes[0].length)),
    };
}

// carpeta del paquete (la que tiene el package.json) que contiene a la carpeta "desde" (normalmente __dirname);
// así se ubica la carpeta ayuda/ sin importar si el js está en dist/server/server, en dist/server (tests) o en node_modules
export function carpetaDelPaquete(desde: string): string {
    var carpeta = path.resolve(desde);
    while (!fs.existsSync(path.join(carpeta, 'package.json'))) {
        var padre = path.dirname(carpeta);
        if (padre == carpeta) {
            throw new Error(`ayuda: no se encontró el package.json de ${desde}`);
        }
        carpeta = padre;
    }
    return carpeta;
}

// lee los .md de la carpeta de una fuente (sin subcarpetas)
export function leerFuenteDeAyuda(fuente: AyudaFuente): AyudaTema[] {
    if (!fs.existsSync(fuente.carpeta)) {
        throw new Error(`ayuda: no existe la carpeta ${fuente.carpeta} de ${fuente.origen}`);
    }
    var temas = fs.readdirSync(fuente.carpeta)
        .filter(nombre => nombre.endsWith('.md'))
        .sort()
        .map(nombre => {
            var archivo = path.join(fuente.carpeta, nombre);
            return parsearTemaDeAyuda(fs.readFileSync(archivo, 'utf8'), archivo, fuente.origen);
        });
    var vistos: Map<string, string> = new Map();
    temas.forEach(tema => {
        var anterior = vistos.get(tema.id);
        if (anterior != null) {
            throw errorDeAyuda(tema.archivo, `el id "${tema.id}" ya está en ${anterior}`);
        }
        vistos.set(tema.id, tema.archivo);
    });
    return temas;
}

// combina los temas de varias fuentes en orden: un id repetido reemplaza al anterior y "ocultar" lo quita
export function combinarTemasDeAyuda(temasPorFuente: AyudaTema[][]): AyudaTema[] {
    var temas: Map<string, AyudaTema> = new Map();
    temasPorFuente.forEach(temasDeLaFuente => temasDeLaFuente.forEach(tema => {
        if (tema.ocultar) {
            temas.delete(tema.id);
        } else {
            temas.set(tema.id, tema);
        }
    }));
    return Array.from(temas.values()).sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo));
}

export function cargarAyuda(fuentes: AyudaFuente[]): AyudaTema[] {
    return combinarTemasDeAyuda(fuentes.map(leerFuenteDeAyuda));
}

export function tienePermiso(puede: Puede | undefined, permisoAccion: string): boolean {
    var [permiso, accion] = permisoAccion.split('.');
    var acciones: { [permiso: string]: { [accion: string]: boolean | undefined } | undefined } = puede ?? {};
    return acciones[permiso]?.[accion] === true;
}

export function temaVisible(tema: AyudaTema, quien: QuienConsultaAyuda): boolean {
    if (tema.modo != null && tema.modo != quien.modo) {
        return false;
    }
    if (quien.superuser || tema.permisos.length == 0 && tema.roles.length == 0) {
        return true;
    }
    return quien.rol != null && tema.roles.includes(quien.rol)
        || tema.permisos.some(permiso => tienePermiso(quien.puede, permiso));
}

export function temasVisibles(temas: AyudaTema[], quien: QuienConsultaAyuda): AyudaTema[] {
    return temas.filter(tema => temaVisible(tema, quien));
}

// el menú del usuario (el que arma getMenu) con el tema de ayuda de cada opción
export function menuConAyuda(menu: MenuInfoBase[], temas: AyudaTema[], prefijo: string = ''): AyudaOpcionMenu[] {
    return menu.filter(opcion => opcion.menuType != 'ayuda').map(opcion => {
        var ruta = prefijo + opcion.name;
        var contenido: MenuInfoBase[] = opcion.menuType == 'menu' ? opcion.menuContent : [];
        var tema = temas.find(tema => tema.menu.includes(ruta));
        return {
            ruta,
            label: opcion.label ?? opcion.name.replace(/_/g, ' '),
            tema: tema?.id ?? null,
            opciones: menuConAyuda(contenido, temas, ruta + '/'),
        };
    });
}

// rutas de todas las opciones de un menú (para validar las que mencionan los temas)
export function rutasDelMenu(menu: MenuInfoBase[], prefijo: string = ''): string[] {
    return menu.reduce((rutas: string[], opcion) => {
        var contenido: MenuInfoBase[] = opcion.menuType == 'menu' ? opcion.menuContent : [];
        return rutas.concat(prefijo + opcion.name, rutasDelMenu(contenido, prefijo + opcion.name + '/'));
    }, []);
}

// problemas que no impiden mostrar la ayuda pero indican un error en los temas:
// permisos o roles que no existen y opciones de menú que nadie ve
export function problemasDeAyuda(temas: AyudaTema[], permisosExistentes: Puede, rolesExistentes: string[], rutasExistentes: string[]): string[] {
    var problemas: string[] = [];
    temas.forEach(tema => {
        tema.permisos.filter(permiso => !tienePermiso(permisosExistentes, permiso))
            .forEach(permiso => problemas.push(`ayuda ${tema.archivo}: no existe el permiso ${permiso}`));
        tema.roles.filter(rol => !rolesExistentes.includes(rol))
            .forEach(rol => problemas.push(`ayuda ${tema.archivo}: no existe el rol ${rol}`));
        tema.menu.filter(ruta => !rutasExistentes.includes(ruta))
            .forEach(ruta => problemas.push(`ayuda ${tema.archivo}: ningún rol tiene la opción de menú ${ruta}`));
    });
    return problemas;
}
