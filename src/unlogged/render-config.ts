import { CasoState, DatosByPassPersistibles, ModoDM, Estructura, ForPkRaiz } from './tipos';

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

// Función de carga en memoria, registrada desde render-formulario para evitar
// dependencia circular (bypass-formulario → render-config).
type CargarMotorFn = (opts: { forPkRaiz?: ForPkRaiz }) => Promise<void>;
let cargarMotorFn: CargarMotorFn | null = null;

export function registrarCargarMotor(fn: CargarMotorFn) {
    cargarMotorFn = fn;
}

export class FormRenderer {
    readonly config: FormularioConfig;

    constructor(config: FormularioConfig) {
        this.config = config;
        setFormularioConfig(config);
    }

    async cargarMotor(opts: { forPkRaiz?: ForPkRaiz } = {}): Promise<void> {
        if (!cargarMotorFn) {
            throw new Error('cargarMotor no registrado. Asegúrese de importar render-formulario antes de llamar a cargarMotor.');
        }
        return cargarMotorFn(opts);
    }
}

export function createFormRenderer(
    partialConfig: Partial<FormularioConfig>
): FormRenderer {
    return new FormRenderer({ ...defaultThrowConfig, ...partialConfig });
}

// Config base: todos los métodos lanzan error descriptivo.
// render-init.ts provee la implementación recomendada por defecto (localStorage/sessionStorage).
const defaultThrowConfig: FormularioConfig = {
    getCasoState(): CasoState {
        throw new Error('getCasoState no implementado');
    },
    setCasoState(_state: CasoState) {
        throw new Error('setCasoState no implementado');
    },
    getUltimoValorPkRaiz(): string {
        throw new Error('getUltimoValorPkRaiz no implementado');
    },
    setUltimoValorPkRaiz(_value: string) {
        throw new Error('setUltimoValorPkRaiz no implementado');
    },
    getAppCacheVersion(): string {
        throw new Error('getAppCacheVersion no implementado');
    },
    setAppCacheVersion(_value: string) {
        throw new Error('setAppCacheVersion no implementado');
    },
    getModoDM(): ModoDM {
        throw new Error('getModoDM no implementado');
    },
    setModoDM(_modo: ModoDM) {
        throw new Error('setModoDM no implementado');
    },
    getIdperLogueado(): string {
        throw new Error('getIdperLogueado no implementado');
    },
    getUsernameLogueado(): string {
        throw new Error('getUsernameLogueado no implementado');
    },
    leerDatos(): Promise<DatosByPassPersistibles | null> {
        throw new Error('leerDatos no implementado');
    },
    persistirDatos(_datos: DatosByPassPersistibles): Promise<void> {
        throw new Error('persistirDatos no implementado');
    },
    leerEstructura(): Promise<Estructura | null> {
        throw new Error('leerEstructura no implementado');
    },
    persistirEstructura(_estructura: Estructura): Promise<void> {
        throw new Error('persistirEstructura no implementado');
    },
    sincronizar(_persistentes: DatosByPassPersistibles | null, _cambiaModoDM: boolean): Promise<DatosByPassPersistibles> {
        throw new Error('sincronizar no implementado. Debe proveerse una implementación al llamar createFormRenderer({ sincronizar: ... })');
    },
};

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