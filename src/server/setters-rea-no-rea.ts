import type { IdTarea, RespuestasRaiz } from "../unlogged/tipos";

export type FunParams = {
    tarea: IdTarea;
    respuestasUAPrincipal: RespuestasRaiz;
    setters: string[];
    params: any[];
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
