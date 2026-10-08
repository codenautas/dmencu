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

function buscarRecursivo<T extends TipoCondicion>(
    unidadAnalisis: UnidadAnalisis,
    respuestas: Respuestas,
    listaOrdenada: MapeoTipoItem[T][],
    tipo: T,
    tarea: string,
    evaluarExpresion: EvaluadorExpresion | undefined,
    respuestasPadre?: Respuestas,
    hermanasRespuestas?: Respuestas[]
): ResultadoBusqueda {

    const estrategia = estrategiasCondicion[tipo];

    for (const item of listaOrdenada) {
        const itemTarea = estrategia.getTarea(item);
        if (itemTarea && itemTarea !== tarea) {
            continue;
        }

        if (itemCumpleCondicion(item, respuestas, estrategia, evaluarExpresion)) {
            const resultado = estrategia.getResultado(item);
            const esReaPositiva = (tipo === 'rea' || tipo === 'rea_sup') && resultado === true;

            // Si es una REA/REA_SUP positiva y la UA actual posee hermanas, 
            // validamos que la condición se cumpla en la totalidad de las hermanas.
            if (esReaPositiva && respuestasPadre && hermanasRespuestas && hermanasRespuestas.length > 1) {
                const todasLasHermanasCumplen = hermanasRespuestas.every((respuestasHermana) =>
                    itemCumpleCondicion(
                        item,
                        { ...respuestasPadre, ...respuestasHermana },
                        estrategia,
                        evaluarExpresion
                    )
                );

                if (!todasLasHermanasCumplen) {
                    continue; // Si falla en alguna hermana, se descarta este item y se sigue buscando
                }
            }

            return {
                codigo: estrategia.getCodigo(item),
                resultado,
            };
        }
    }

    const hijas = likeAr(unidadAnalisis?.hijas).array();
    for (const uaHija of hijas) {
        const nombreUaHija = uaHija?.unidad_analisis;
        if (nombreUaHija && Array.isArray(respuestas[nombreUaHija])) {
            const arregloHijas: Respuestas[] = respuestas[nombreUaHija];
            for (const respuestasHija of arregloHijas) {
                const res = buscarRecursivo(
                    uaHija,
                    { ...respuestas, ...respuestasHija },
                    listaOrdenada,
                    tipo,
                    tarea,
                    evaluarExpresion,
                    respuestas,    // Se pasa el objeto respuestas del padre
                    arregloHijas  // Se pasa el arreglo de todas las hermanas
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
    return buscarRecursivo(unidadAnalisis, respuestas, listaOrdenada, tipo, tarea, evaluarExpresion);
}