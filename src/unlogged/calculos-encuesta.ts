import likeAr = require("like-ar");
import { IdVariable, MapeoTipoItem, NoRea, NoReaSup, Rea, ReaSup, Respuestas, TipoCondicion, UnidadAnalisis } from "./tipos";

export type EvaluadorExpresion = (condicionJs: string, respuestas: Respuestas) => boolean;

const estrategiasCondicion: {
    [K in TipoCondicion]: {
        getCondicion: (item: MapeoTipoItem[K]) => string | null;
        getVariable: (item: MapeoTipoItem[K]) => string | null;
        getValor: (item: MapeoTipoItem[K]) => string | null;
        getCodigo: (item: MapeoTipoItem[K]) => number;
        getResultado: (item: MapeoTipoItem[K]) => boolean;
        getTarea: (item: MapeoTipoItem[K]) => string | null;
    }
} = {
    'rea': {
        getCondicion: (item) => (item as Rea).condicion_js,
        getVariable: () => null,
        getValor: () => null,
        getCodigo: (item) => (item as Rea).rea,
        getResultado: (item) => (item as Rea).es_positiva,
        getTarea: (item) => (item as Rea).tarea ?? null,
    },
    'no_rea': {
        getCondicion: () => null,
        getVariable: (item) => (item as NoRea).variable,
        getValor: (item) => (item as NoRea).valor,
        getCodigo: (item) => (item as NoRea).no_rea,
        getResultado: () => true,
        getTarea: (_item) => null,
    },
    'rea_sup': {
        getCondicion: (item) => (item as ReaSup).condicion_js,
        getVariable: () => null,
        getValor: () => null,
        getCodigo: (item) => (item as ReaSup).rea_sup,
        getResultado: (item) => (item as ReaSup).es_positiva,
        getTarea: (item) => (item as ReaSup).tarea ?? null,
    },
    'no_rea_sup': {
        getCondicion: () => null,
        getVariable: (item) => (item as NoReaSup).variable_sup,
        getValor: (item) => (item as NoReaSup).valor_sup,
        getCodigo: (item) => (item as NoReaSup).no_rea_sup,
        getResultado: () => true,
        getTarea: (_item) => null,
    }
};

export type ResultadoBusqueda = {
    codigo: number | null;
    resultado: boolean;
};

function itemCumpleCondicion<T extends TipoCondicion>(
    item: MapeoTipoItem[T],
    respuestas: Respuestas,
    estrategia: typeof estrategiasCondicion[T],
    evaluarExpresion: EvaluadorExpresion | undefined
): boolean {
    const condicion = estrategia.getCondicion(item);
    if (condicion !== null) {
        if (!evaluarExpresion) {
            throw new Error('Se requiere evaluarExpresion para evaluar una condicion JS');
        }
        return evaluarExpresion(condicion, respuestas);
    }
    const variable = estrategia.getVariable(item);
    const valor = estrategia.getValor(item);
    return !!variable && variable in respuestas && respuestas[variable as IdVariable] == valor;
}

/**
 * Recorre la estructura completa desde la raíz y extrae el contexto combinado de
 * TODAS las instancias de la UA 'targetUaNombre' (hermanas, primas, etc.).
 */
function obtenerTodasLasInstanciasDeUa(
    unidadAnalisis: UnidadAnalisis,
    respuestas: Respuestas,
    targetUaNombre: string,
    contextoAcumulado = {} as Respuestas
): Respuestas[] {
    const resultados: Respuestas[] = [];

    const respuestasPlanas = {} as Respuestas;
    for (const [key, value] of Object.keys(respuestas)) {
        if (!Array.isArray(value)) {
            respuestasPlanas[key as IdVariable] = value;
        }
    }
    const contextoActual = { ...contextoAcumulado, ...respuestasPlanas };

    if (unidadAnalisis?.unidad_analisis === targetUaNombre) {
        return [contextoActual];
    }

    const hijas = likeAr(unidadAnalisis?.hijas).array();
    for (const uaHija of hijas) {
        const nombreUaHija = uaHija?.unidad_analisis;
        if (nombreUaHija && Array.isArray(respuestas[nombreUaHija])) {
            for (const respuestasHija of respuestas[nombreUaHija]) {
                const res = obtenerTodasLasInstanciasDeUa(
                    uaHija,
                    respuestasHija,
                    targetUaNombre,
                    contextoActual
                );
                resultados.push(...res);
            }
        }
    }

    return resultados;
}

function buscarRecursivo<T extends TipoCondicion>(
    uaRaiz: UnidadAnalisis,
    respuestasRaiz: Respuestas,
    unidadAnalisisActual: UnidadAnalisis,
    respuestasActuales: Respuestas,
    listaOrdenada: MapeoTipoItem[T][],
    tipo: T,
    tarea: string,
    evaluarExpresion: EvaluadorExpresion | undefined
): ResultadoBusqueda {

    const estrategia = estrategiasCondicion[tipo];

    for (const item of listaOrdenada) {
        const itemTarea = estrategia.getTarea(item);
        if (itemTarea && itemTarea !== tarea) {
            continue;
        }

        if (itemCumpleCondicion(item, respuestasActuales, estrategia, evaluarExpresion)) {
            const resultado = estrategia.getResultado(item);
            const esReaPositiva = (tipo === 'rea' || tipo === 'rea_sup') && resultado === true;

            if (esReaPositiva) {
                const nombreUaActual = unidadAnalisisActual?.unidad_analisis;
                if (nombreUaActual) {
                    // Obtener todas las personas/hogares de la encuesta (hermanas + primas)
                    const todasLasInstancias = obtenerTodasLasInstanciasDeUa(
                        uaRaiz,
                        respuestasRaiz,
                        nombreUaActual
                    );

                    if (todasLasInstancias.length > 1) {
                        const todasCumplen = todasLasInstancias.every((instanciaContexto) =>
                            itemCumpleCondicion(item, instanciaContexto, estrategia, evaluarExpresion)
                        );

                        if (!todasCumplen) {
                            continue; // Si alguna hermana o prima no cumple, se descarta este item
                        }
                    }
                }
            }

            return {
                codigo: estrategia.getCodigo(item),
                resultado,
            };
        }
    }

    const hijas = likeAr(unidadAnalisisActual?.hijas).array();
    for (const uaHija of hijas) {
        const nombreUaHija = uaHija?.unidad_analisis;
        if (nombreUaHija && Array.isArray(respuestasActuales[nombreUaHija])) {
            for (const respuestasHija of respuestasActuales[nombreUaHija]) {
                const res = buscarRecursivo(
                    uaRaiz,
                    respuestasRaiz,
                    uaHija,
                    { ...respuestasActuales, ...respuestasHija },
                    listaOrdenada,
                    tipo,
                    tarea,
                    evaluarExpresion
                );
                if (res.codigo !== null) {
                    return res;
                }
            }
        }
    }

    return { codigo: null, resultado: false };
}

export function buscarReaNoReaEnRespuestas<T extends TipoCondicion>(
    unidadAnalisis: UnidadAnalisis,
    respuestas: Respuestas,
    lista: MapeoTipoItem[T][],
    tipo: T,
    tarea: string,
    evaluarExpresion?: EvaluadorExpresion
): ResultadoBusqueda {

    if (!estrategiasCondicion[tipo]) {
        throw new Error(`Tipo de condición desconocido: ${tipo}`);
    }

    const listaOrdenada = [...lista].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    return buscarRecursivo(
        unidadAnalisis,
        respuestas,
        unidadAnalisis,
        respuestas,
        listaOrdenada,
        tipo,
        tarea,
        evaluarExpresion
    );
}