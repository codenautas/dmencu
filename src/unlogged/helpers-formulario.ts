// Funciones puras del formulario, sin dependencias de React, Redux ni del navegador
// (para poder testearlas en node)

import type { IdComodin, IdFormulario, IdVariable } from "./tipos";

// RegEx principal para dividir el texto conservando los tokens delimitados por @...@
export const REGEX_SPLIT_COMODINES = /(@(?:#?[\w-]+|\$[tT][eE][mM][^@]*)@)/g;

// Sub-RegExs para identificar el tipo de comodín
export const IS_TEM_PATTERN = /^@\$(tem[^@]*)@$/i;
export const IS_VARIABLE_HASH_PATTERN = /^@#([\w-]+)@$/;
export const IS_COMODIN_REDUX_PATTERN = /^@([\w-]+)@$/;

/** Extrae nombres de comodines estándar (@comodin@) */
export function extraerComodinesRedux(text: string): IdComodin[] {
    if (!text || !text.includes('@')) return [];
    const matches = text.match(/@([a-zA-Z0-9_-]+)@/g);
    if (!matches) return [];

    const ids: IdComodin[] = [];
    for (const m of matches) {
        if (!m.startsWith('@#') && !m.startsWith('@$')) {
            const id = m.slice(1, -1) as IdComodin;
            if (!ids.includes(id)) ids.push(id);
        }
    }
    return ids;
}

/** Extrae nombres de variables dinámicas (@#variable@) */
export function extraerVariablesInteres(text: string): string[] {
    if (!text) return [];
    const matches = text.match(/@#([\w-]+)@/g);
    if (!matches) return [];

    const vars: string[] = [];
    for (const m of matches) {
        const varName = m.slice(2, -1); // Remueve '@#' y '@'
        if (!vars.includes(varName)) vars.push(varName);
    }
    return vars;
}

export function getBFVarNames(salto: string | null) {
    const armoNomSalto = salto?.substring(0, 2) == 'F:' ? salto.slice(2) : salto;
    return {
        listo: '$B.F:' + armoNomSalto as IdVariable,
        agregar: '$B.F:' + armoNomSalto + '_agregar' as IdVariable,
        idFormulario: 'F:' + armoNomSalto as IdFormulario
    };
}

export function replaceSpecialWords(text: string, nombre: string, apellido: string, resultado: string): string {
    function capitalizeFirstLetter(text: string) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
    var simplificatedChars: { [k: string]: string } = {
        "#nombre": capitalizeFirstLetter(nombre),
        "#apellido": capitalizeFirstLetter(apellido),
        "#resultado": resultado,
    };
    var re = new RegExp(Object.keys(simplificatedChars).join("|"), "gi");

    return text.replace(re, function (matched) {
        return simplificatedChars[matched.toLowerCase()];
    });
}

export function numberOrStringIncIfArray(numberOrString: number | string, object: object | any[]): (number | string) {
    // @ts-expect-error estoy usando isNaN para ver si es o no un número sumable
    if (isNaN(numberOrString)) {
        return numberOrString;
    }
    return Number(numberOrString) + (object instanceof Array ? 1 : 0);
}
