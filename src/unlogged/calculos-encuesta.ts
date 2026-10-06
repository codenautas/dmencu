import likeAr = require("like-ar");
import { IdVariable, MapeoTipoItem, NoRea, NoReaSup, Rea, ReaSup, Respuestas, TipoCondicion, UnidadAnalisis } from "./tipos";

const estrategiasCondicion: {
    [K in TipoCondicion]: {
        getVariable: (item: MapeoTipoItem[K]) => string;
        getValor: (item: MapeoTipoItem[K]) => string;
        getCodigo: (item: MapeoTipoItem[K]) => number;
        getResultado: (item: MapeoTipoItem[K]) => boolean;
        getTarea: (item: MapeoTipoItem[K]) => string | null;
    }
} = {
    'rea': {
        getVariable: (item) => (item as Rea).variable,
        getValor: (item) => (item as Rea).valor,
        getCodigo: (item) => (item as Rea).rea,
        getResultado: (item) => (item as Rea).es_positiva,
        getTarea: (item) => (item as Rea).tarea ?? null,
    },
    'no_rea': {
        getVariable: (item) => (item as NoRea).variable,
        getValor: (item) => (item as NoRea).valor,
        getCodigo: (item) => (item as NoRea).no_rea,
        getResultado: () => true,
        getTarea: (_item) => null,
    },
    'rea_sup': {
        getVariable: (item) => (item as ReaSup).variable_sup,
        getValor: (item) => (item as ReaSup).valor_sup,
        getCodigo: (item) => (item as ReaSup).rea_sup,
        getResultado: (item) => (item as ReaSup).es_positiva,
        getTarea: (item) => (item as ReaSup).tarea ?? null,
    },
    'no_rea_sup': {
        getVariable: (item) => (item as NoReaSup).variable_sup,
        getValor: (item) => (item as NoReaSup).valor_sup,
        getCodigo: (item) => (item as NoReaSup).no_rea_sup,
        getResultado: () => true,
        getTarea: (_item) => null,
    }
};

type ResultadoBusqueda = {
    codigo: null;
    resultado: null;
    encontrado: false;
} | {
    codigo: number;
    resultado: boolean;
    encontrado: true;
};

function buscarRecursivo<T extends TipoCondicion>(
    unidadAnalisis: UnidadAnalisis,
    respuestas: Respuestas,
    listaOrdenada: MapeoTipoItem[T][],
    tipo: T,
    tarea: string
): ResultadoBusqueda {

    const estrategia = estrategiasCondicion[tipo];

    for (const item of listaOrdenada) {
        const itemTarea = estrategia.getTarea(item);
        if (itemTarea && itemTarea !== tarea) {
            continue;
        }
        const rvariable = estrategia.getVariable(item);
        const rvalor = estrategia.getValor(item);

        if (rvariable && rvariable in respuestas && respuestas[rvariable as IdVariable] == rvalor) {
            return {
                codigo: estrategia.getCodigo(item),
                resultado: estrategia.getResultado(item),
                encontrado: true
            };
        }
    }

    const hijas = likeAr(unidadAnalisis?.hijas).array();
    for (const uaHija of hijas) {
        const nombreUaHija = uaHija?.unidad_analisis;
        if (nombreUaHija && Array.isArray(respuestas[nombreUaHija])) {
            for (const respuestasHija of respuestas[nombreUaHija]) {
                const res = buscarRecursivo(uaHija, respuestasHija, listaOrdenada, tipo, tarea);
                if (res.encontrado) {
                    return res;
                }
            }
        }
    }

    return { codigo: null, resultado: null, encontrado: false };
}

export function buscarReaNoReaEnRespuestas<T extends TipoCondicion>(
    unidadAnalisis: UnidadAnalisis,
    respuestas: Respuestas,
    lista: MapeoTipoItem[T][],
    tipo: T,
    tarea: string
): ResultadoBusqueda {

    if (!estrategiasCondicion[tipo]) {
        throw new Error(`Tipo de condición desconocido: ${tipo}`);
    }

    const listaOrdenada = [...lista].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    return buscarRecursivo(unidadAnalisis, respuestas, listaOrdenada, tipo, tarea);
}