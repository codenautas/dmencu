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

// Caché en memoria para no volver a analizar la estructura teórica en cada cambio de input
const cacheDiccionarioRutas = new WeakMap<UnidadAnalisis, Map<string, Set<string>>>();

/**
 * Mapea toda la estructura de UAs produciendo un diccionario O(1):
 * { "viviendas" -> Set("viviendas", "hogares", "personas", "visitas"), "hogares" -> Set("hogares", "personas") }
 */
function obtenerDiccionarioRutas(uaRaiz: UnidadAnalisis): Map<string, Set<string>> {
    let mapa = cacheDiccionarioRutas.get(uaRaiz);
    if (mapa) return mapa;

    mapa = new Map<string, Set<string>>();

    function mapearNodo(nodo: UnidadAnalisis): Set<string> {
        const descendientes = new Set<string>();
        if (nodo?.unidad_analisis) {
            descendientes.add(nodo.unidad_analisis);
        }
        const hijas = nodo?.hijas;
        if (hijas) {
            for (const key in hijas) {
                const descHija = mapearNodo(hijas[key as IdUnidadAnalisis]!);
                descHija.forEach((d) => descendientes.add(d));
            }
        }
        if (nodo?.unidad_analisis) {
            mapa!.set(nodo.unidad_analisis, descendientes);
        }
        return descendientes;
    }

    mapearNodo(uaRaiz);
    cacheDiccionarioRutas.set(uaRaiz, mapa);
    return mapa;
}

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
 * Recolecta el contexto completo de TODAS las instancias de targetUaNombre en la encuesta.
 * Usa el diccionario precalculado para filtrar ramas en O(1) sin hacer recursión innecesaria.
 */
function obtenerTodasLasInstanciasDeUa(
    unidadAnalisis: UnidadAnalisis,
    respuestas: Respuestas,
    targetUaNombre: string,
    diccionarioRutas: Map<string, Set<string>>,
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

        // CONSULTA DICCIONARIO O(1): ¿Esta rama contiene a la UA que buscamos?
        const descendientesDeHija = diccionarioRutas.get(nombreUaHija);
        if (!descendientesDeHija || !descendientesDeHija.has(targetUaNombre)) {
            continue; // Ignora ramas como 'visitas' instantáneamente
        }

        const arregloHijas = respuestas[nombreUaHija as IdVariable];

        // Integridad estructural: rama válida pero sin array o vacío
        if (!Array.isArray(arregloHijas) || arregloHijas.length === 0) {
            return { completa: false, instancias: [] };
        }

        for (let i = 0; i < arregloHijas.length; i++) {
            const respuestasHija = arregloHijas[i] as Respuestas;
            const res = obtenerTodasLasInstanciasDeUa(
                uaHija,
                respuestasHija,
                targetUaNombre,
                diccionarioRutas,
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
    evaluarExpresion: EvaluadorExpresion | undefined,
    diccionarioRutas: Map<string, Set<string>>
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
                        nombreUaActual,
                        diccionarioRutas
                    );

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
                        Object.assign({}, respuestasActuales, respuestasHija),
                        listaOrdenada,
                        tipo,
                        tarea,
                        evaluarExpresion,
                        diccionarioRutas
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

    // Obtiene o crea el diccionario de rutas para la estructura recibida
    const diccionarioRutas = obtenerDiccionarioRutas(unidadAnalisis);

    const listaOrdenada = [...lista].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
    return buscarRecursivo(
        unidadAnalisis,
        respuestas,
        unidadAnalisis,
        respuestas,
        listaOrdenada,
        tipo,
        tarea,
        evaluarExpresion,
        diccionarioRutas
    );
}