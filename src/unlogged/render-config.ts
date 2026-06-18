import { CasoState, DatosByPassPersistibles, ModoDM, Estructura } from './tipos';

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

    leerDatos(): Promise<DatosByPassPersistibles | null>;

    persistirDatos(
        datos: DatosByPassPersistibles
    ): Promise<void>;

    leerEstructura(): Promise<Estructura | null>;

    persistirEstructura(
        estructura: Estructura
    ): Promise<void>;


    sincronizar(persistentes: DatosByPassPersistibles | null, cambiaModoDM: boolean): Promise<DatosByPassPersistibles>;
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