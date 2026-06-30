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

    onSincronizar(persistentes: DatosByPassPersistibles | null, cambiaModoDM: boolean): Promise<DatosByPassPersistibles>;
    
    onLogout(): Promise<void>;
}

// Función de carga en memoria, registrada desde render-formulario para evitar
// dependencia circular (bypass-formulario → render-config).
type CargarMotorFn = (opts: { forPkRaiz?: ForPkRaiz }) => Promise<void>;
let cargarMotorFn: CargarMotorFn | null = null;

export function registrarCargarMotor(fn: CargarMotorFn) {
    cargarMotorFn = fn;
}

export class FormRenderer implements FormularioConfig {
    private static instance: FormRenderer;
    private config: FormularioConfig;

    private constructor(config: FormularioConfig) {
        this.config = config;
    }

    public static initialize(config: FormularioConfig): FormRenderer {
        FormRenderer.instance = new FormRenderer(config);
        return FormRenderer.instance;
    }

    public updateConfig(partialConfig: Partial<FormularioConfig>): void {
        this.config = { ...this.config, ...partialConfig };
    }

    async cargarMotor(opts: { forPkRaiz?: ForPkRaiz } = {}): Promise<void> {
        if (!cargarMotorFn) {
            throw new Error('cargarMotor no registrado. Asegúrese de importar render-formulario antes de llamar a cargarMotor.');
        }
        return cargarMotorFn(opts);
    }

    getCasoState(): CasoState {
        return this.config.getCasoState();
    }

    setCasoState(state: CasoState): void {
        this.config.setCasoState(state);
    }

    getUltimoValorPkRaiz(): string {
        return this.config.getUltimoValorPkRaiz();
    }

    setUltimoValorPkRaiz(value: string): void {
        this.config.setUltimoValorPkRaiz(value);
    }

    getAppCacheVersion(): string {
        return this.config.getAppCacheVersion();
    }

    setAppCacheVersion(value: string): void {
        this.config.setAppCacheVersion(value);
    }

    getModoDM(): ModoDM {
        return this.config.getModoDM();
    }

    setModoDM(modo: ModoDM): void {
        this.config.setModoDM(modo);
    }

    getIdperLogueado(): string {
        return this.config.getIdperLogueado();
    }

    getUsernameLogueado(): string {
        return this.config.getUsernameLogueado();
    }

    leerDatos(): Promise<DatosByPassPersistibles | null> {
        return this.config.leerDatos();
    }

    persistirDatos(datos: DatosByPassPersistibles): Promise<void> {
        return this.config.persistirDatos(datos);
    }

    leerEstructura(): Promise<Estructura | null> {
        return this.config.leerEstructura();
    }

    persistirEstructura(estructura: Estructura): Promise<void> {
        return this.config.persistirEstructura(estructura);
    }

    onSincronizar(persistentes: DatosByPassPersistibles | null, cambiaModoDM: boolean): Promise<DatosByPassPersistibles> {
        return this.config.onSincronizar(persistentes, cambiaModoDM);
    }

    onLogout(): Promise<void> {
        return this.config.onLogout();
    }
}

export function createFormRenderer(
    partialConfig: Partial<FormularioConfig>
): FormRenderer {
    return FormRenderer.initialize({ ...defaultThrowConfig, ...partialConfig });
}

export function getFormRenderer(): FormRenderer {
    // @ts-ignore accedemos a private static desde la función exportada para mantener simplicidad o simplemente usamos una propiedad en la clase.
    if (!FormRenderer['instance']) {
        throw new Error('FormRenderer no inicializada');
    }
    return FormRenderer['instance'];
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
    onSincronizar(_persistentes: DatosByPassPersistibles | null, _cambiaModoDM: boolean): Promise<DatosByPassPersistibles> {
        throw new Error('onSincronizar no implementado. Debe proveerse una implementación al llamar createFormRenderer({ sincronizar: ... })');
    },
    onLogout(): Promise<void> {
        throw new Error('onLogout no implementado');
    },
};