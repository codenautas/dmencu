import type { IdTarea, ResultadoResumen } from "../unlogged/tipos";

// valor que se pasa como parámetro $n a una consulta (los objetos van como json)
export type ParametroSql = string | number | boolean | null | object;

export type FunParams = {
    tarea: IdTarea;
    respuestasUAPrincipal: ResultadoResumen; // de las respuestas sólo se usan el resumen y los códigos de rea/no rea
    setters: string[];
    params: ParametroSql[];
    destino: 'tem' | 'tareas_tem';
};

// agrega a un update los setters (con sus parámetros $n numerados a continuación de los recibidos)
// de resumen_estado, norea y rea, o sus versiones _sup si la tarea es supe
export const getSettersAndParametersForReaNoReaResumenEstado = ({
    tarea,
    respuestasUAPrincipal: r,
    setters: settersEntrada,
    params: paramsEntrada,
    destino
}: FunParams) => {
    const isSupe = tarea === 'supe';
    const sufijoSupe = isSupe ? '_sup' : '';
    const prefijoDm = destino === 'tareas_tem' ? 'dm_' : '';

    const offset = paramsEntrada.length + 1;

    const nuevosValores = isSupe
        ? [r.resumenEstadoSup, r.codNoReaSup, r.codReaSup]
        : [r.resumenEstado, r.codNoRea, r.codRea];

    const campos = [
        `${prefijoDm}resumen_estado${sufijoSupe}`,
        `${prefijoDm}norea${sufijoSupe}`,
        `${prefijoDm}rea${sufijoSupe}`
    ];

    const nuevosSetters = campos.map((campo, i) => `${campo}=$${offset + i}`);

    const setters = [...settersEntrada, ...nuevosSetters];
    const params = [...paramsEntrada, ...nuevosValores];

    return { setters, params };
};
