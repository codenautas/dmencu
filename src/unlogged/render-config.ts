import { CasoState, DatosByPassPersistibles, ModoDM } from './tipos';

export interface FormularioConfig {
    getCasoState(): CasoState;
    setCasoState(state: CasoState): void;

    getUltimoValorPkRaiz(): string;
    setUltimoValorPkRaiz(value: string): void;

    getAppCacheVersion(): string;
    setAppCacheVersion(value: string): void;

    getModoDM(): ModoDM;
    setModoDM(modo: ModoDM): void;
        
    getIdperLogueado(): string;
    getUsernameLogueado(): string;

    sincronizar(persistentes: DatosByPassPersistibles, modoDM: ModoDM, cambiaModoDM: boolean, idPerLogueado: string): Promise<DatosByPassPersistibles>;
}

let formularioConfig: FormularioConfig | null = null;

export function setFormularioConfig(
    config: FormularioConfig
) {
    formularioConfig = config;

}

export function getFormularioConfig(): FormularioConfig {
    if (!formularioConfig) {
        throw new Error('FormularioConfig no inicializada');
    }
    return formularioConfig;
}