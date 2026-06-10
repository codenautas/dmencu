import { CasoState, ModoDM } from './tipos';

export interface FormularioConfig {
    getCasoState(): CasoState | null;
    setCasoState(state: CasoState): void;

    getUltimoValorPkRaiz(): string | null;
    setUltimoValorPkRaiz(value: string): void;

    getAppCacheVersion(): string | null;
    setAppCacheVersion(value: string): void;

    getModoDM(): ModoDM | null;
    setModoDM(modo: ModoDM): void;
        
    getIdperLogueado(): string | null;
    getUsernameLogueado(): string | null;

    ambienteDemo: boolean;
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