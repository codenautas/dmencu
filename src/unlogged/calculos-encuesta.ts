import likeAr = require("like-ar");
import { IdUnidadAnalisis, IdVariable, MapeoTipoItem, NoRea, NoReaSup, Rea, ReaSup, Respuestas, TipoCondicion, UnidadAnalisis, Valor } from "./tipos";

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
 * Determina de forma directa si un nodo o subárbol de UA conduce a la UA objetivo.
 * Optimizado sin llamadas a wrapper de librerías para alto rendimiento en dispositivos móviles.
 */
function rutaLlevaAUa(uaNodo: UnidadAnalisis | undefined, targetUaNombre: string): boolean {
    if (!uaNodo) return false;
    if (uaNodo.unidad_analisis === targetUaNombre) return true;
    if (!uaNodo.hijas) return false;

    for (const key in uaNodo.hijas) {
        if (rutaLlevaAUa(uaNodo.hijas[key as IdUnidadAnalisis], targetUaNombre)) {
            return true;
        }
    }
    return false;
}

/**
 * Fusiona solo los campos planos (no listas de hijas) evitando la instanciación masiva de objetos efímeros
 * para prevenir pausas de Garbage Collection en tablets.
 */
function fusionarRespuestasPlanas(contextoAcumulado: Respuestas, respuestas: Respuestas): Respuestas {
    const res: Respuestas = Object.assign({}, contextoAcumulado);
    for (const key in respuestas) {
        const val = respuestas[key as IdVariable];
        if (!Array.isArray(val)) {
            res[key as IdVariable] = val as Valor;
        }
    }
    return res;
}

type ResultadoInstancias = {
    completa: boolean;
    instancias: Respuestas[];
};

/**
 * Recolecta el contexto completo de TODAS las instancias de targetUaNombre en la encuesta
 * (hermanas, primas, etc.). Si en la rama hacia la UA se encuentra un contenedor intermedio
 * sin hijas cargadas (ej: un hogar sin personas), retorna `completa = false` para garantizar
 * la integridad de la condición REA positiva.
 */
function obtenerTodasLasInstanciasDeUa(
    unidadAnalisis: UnidadAnalisis,
    respuestas: Respuestas,
    targetUaNombre: string,
    contextoAcumulado = {} as Respuestas
): ResultadoInstancias {
    const contextoActual = fusionarRespuestasPlanas(contextoAcumulado, respuestas);

    if (unidadAnalisis?.unidad_analisis === targetUaNombre) {
        return { completa: true, instancias: [contextoActual] };
    }

    const hijas = unidadAnalisis?.hijas;
    if (!hijas) {
        return { completa: false, instancias: [] };
    }

    const instanciasResultantes: Respuestas[] = [];

    for (const key in hijas) {
        const uaHija = hijas[key as IdUnidadAnalisis];
        const nombreUaHija = uaHija?.unidad_analisis;
        if (!nombreUaHija) continue;

        if (!rutaLlevaAUa(uaHija, targetUaNombre)) continue;

        const arregloHijas = respuestas[nombreUaHija as IdVariable];

        // Integridad estructural: si la rama conduce a la UA objetivo pero el array de hijas no existe o está vacío
        if (!Array.isArray(arregloHijas) || arregloHijas.length === 0) {
            return { completa: false, instancias: [] };
        }

        for (let i = 0; i < arregloHijas.length; i++) {
            const respuestasHija = arregloHijas[i] as Respuestas;
            const res = obtenerTodasLasInstanciasDeUa(
                uaHija,
                respuestasHija,
                targetUaNombre,
                contextoActual
            );
            if (!res.completa) {
                return { completa: false, instancias: [] };
            }
            for (let j = 0; j < res.instancias.length; j++) {
                instanciasResultantes.push(res.instancias[j]);
            }
        }
    }

    return {
        completa: instanciasResultantes.length > 0,
        instancias: instanciasResultantes,
    };
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

    for (let i = 0; i < listaOrdenada.length; i++) {
        const item = listaOrdenada[i];
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
                    const resInstancias = obtenerTodasLasInstanciasDeUa(
                        uaRaiz,
                        respuestasRaiz,
                        nombreUaActual
                    );

                    // Si la estructura no está completa (ej: falta cargar personas en algún hogar), se ignora la REA positiva
                    if (!resInstancias.completa) {
                        continue;
                    }

                    if (resInstancias.instancias.length > 1) {
                        let todasCumplen = true;
                        for (let k = 0; k < resInstancias.instancias.length; k++) {
                            if (!itemCumpleCondicion(item, resInstancias.instancias[k], estrategia, evaluarExpresion)) {
                                todasCumplen = false;
                                break;
                            }
                        }

                        if (!todasCumplen) {
                            continue;
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

    const hijas = unidadAnalisisActual?.hijas;
    if (hijas) {
        for (const key in hijas) {
            const uaHija = hijas[key as IdUnidadAnalisis];
            const nombreUaHija = uaHija?.unidad_analisis;
            if (nombreUaHija && Array.isArray(respuestasActuales[nombreUaHija as IdVariable])) {
                const arregloHijas = respuestasActuales[nombreUaHija as IdVariable] as unknown as Respuestas[];
                for (let i = 0; i < arregloHijas.length; i++) {
                    const respuestasHija = arregloHijas[i];
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