import likeAr = require("like-ar");
import {IdVariable, MapeoTipoItem, NoRea, NoReaSup, Rea, ReaSup, Respuestas, TipoCondicion, UnidadAnalisis } from "./tipos";

const estrategiasCondicion: {
    [K in TipoCondicion]: {
        getVariable: (item: MapeoTipoItem[K]) => string;
        getValor: (item: MapeoTipoItem[K]) => string;
        getCodigo: (item: MapeoTipoItem[K]) => string;
    }
} = {
    'rea': {
        getVariable: (item) => (item as Rea).variable,
        getValor: (item) => (item as Rea).valor,
        getCodigo: (item) => (item as Rea).rea
    },
    'no_rea': {
        getVariable: (item) => (item as NoRea).variable,
        getValor: (item) => (item as NoRea).valor,
        getCodigo: (item) => (item as NoRea).no_rea
    },
    'rea_sup': {
        getVariable: (item) => (item as ReaSup).variable_sup,
        getValor: (item) => (item as ReaSup).valor_sup,
        getCodigo: (item) => (item as ReaSup).rea_sup
    },
    'no_rea_sup': {
        getVariable: (item) => (item as NoReaSup).variable_sup,
        getValor: (item) => (item as NoReaSup).valor_sup,
        getCodigo: (item) => (item as NoReaSup).no_rea_sup
    }
};

// Una única función genérica que reemplaza todas las sobrecargas
export function buscarReaNoReaEnRespuestas<T extends TipoCondicion>(
    unidadAnalisis: UnidadAnalisis,
    respuestas: Respuestas,
    lista: MapeoTipoItem[T][],
    tipo: T
): { codigo: string | null; esResultado: boolean } {

    const estrategia = estrategiasCondicion[tipo];
    if (!estrategia) {
        throw new Error(`Tipo de condición desconocido: ${tipo}`);
    }

    for (const item of lista) {
        const rvariable = estrategia.getVariable(item);
        const rvalor = estrategia.getValor(item);

        if (rvariable && rvariable in respuestas && respuestas[rvariable as IdVariable] == rvalor) {
            return {
                codigo: estrategia.getCodigo(item),
                esResultado: true
            };
        }
    }

    // Búsqueda recursiva en unidades hijas de forma nativa
    const hijas = likeAr(unidadAnalisis?.hijas).array();
    for (const uaHija of hijas) {
        const nombreUaHija = uaHija?.unidad_analisis;
        if (nombreUaHija && Array.isArray(respuestas[nombreUaHija])) {
            for (const respuestasHija of respuestas[nombreUaHija]) {
                const result = buscarReaNoReaEnRespuestas(uaHija, respuestasHija, lista, tipo);
                if (result.esResultado || result.codigo !== null) {
                    return result;
                }
            }
        }
    }

    return { codigo: null, esResultado: false };
}