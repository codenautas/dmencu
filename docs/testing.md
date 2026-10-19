# Testing

## Cómo correr los tests

```bash
npm run test
```

Compila `src/test` (`tsc -p src/test`) y ejecuta Mocha sobre `dist/test/test.js` con `--bail` y `--check-leaks`. Los tests **no necesitan base de datos ni servidor levantado**: todo lo que depende de la base se prueba con datos en memoria.

`src/test/test.ts` importa cada archivo de tests; al agregar uno nuevo hay que sumarlo ahí.

## Qué cubre cada archivo

| Archivo | Qué prueba |
| :-- | :-- |
| `test-rea-no-rea.ts` | `buscarReaNoReaEnRespuestas`: condiciones de `rea` / `rea_sup`, coincidencia variable/valor de `no_rea` / `no_rea_sup`, orden de evaluación, filtro por tarea, búsqueda recursiva en unidades hijas y regla de `es_positiva` en múltiples instancias (ver [rea-no-rea.md](rea-no-rea.md)) |
| `test-setters-rea-no-rea.ts` | `getSettersAndParametersForReaNoReaResumenEstado`: arma el `set` de resumen/REA/no REA para `tem` o `tareas_tem`, con columnas `_sup` para la tarea `supe` |
| `test-caches-rea.ts` | Caches de REA/no REA: `refreshCaches` (carga, orden, agrupamiento de no REA), `refrescarEstructuraAlModificarTabla` (cuándo se recargan las caches y cambia `timestampEstructura`) y `reasNoReasDelOperativo` (filtro por operativo y compilación de condiciones a JS) |
| `test-impacto-rea-no-rea-en-bd.ts` | Que el resultado (resumen, REA y no REA) llegue a la columna correcta de `tem` y de `tareas_tem` (`dm_*`), que use las columnas `_sup` para la tarea `supe`, que sólo toque la fila indicada y que la descarga sólo se aplique si el token del dispositivo sigue siendo el de la encuesta. Usa una tabla en memoria que ejecuta los `update` que arman `consultaUpdateTem` y `consultaUpdateTareasTemPorDescarga` |
| `test-menu-segun-rol.ts` | `getModoByPolicy`, `permisosSegunUsuario` y el menú que arma `getMenu` para cada rol, en RELEVAMIENTO y en GABINETE (ver [roles-y-permisos.md](roles-y-permisos.md)) |
| `test-helpers-casilleros.ts` | Funciones que se usan en las expresiones de los casilleros (`null2zero`, `div0err`, `blanco`, `informado`, `fecha_valida`, `mesanio_valido`, etc.) |
| `test-helpers-formulario.ts` | Extracción de comodines y variables de interés, `getBFVarNames`, `replaceSpecialWords` (ver [funcionamiento-comodines.md](funcionamiento-comodines.md)) |
| `test-ejemplo.ts` | Ejemplos mínimos de cómo escribir un test |
| `test-ayuda.ts` | Ayuda en línea: formato de los temas, combinación de fuentes (reemplazar/ocultar), qué temas ve cada rol en cada modo y que los temas de dmencu no mencionen permisos, roles ni opciones de menú inexistentes (ver [ayuda-online.md](ayuda-online.md)) |
| `test-tablero.ts` | Tablero de inicio: opción *inicio* en el menú de GABINETE, accesos armados desde el menú, qué secciones ve cada rol, que los links sólo queden si el usuario tiene la grilla, que una sección que falla no impida mostrar las demás y los cálculos de las secciones de dmencu con una base simulada (ver [tablero.md](tablero.md)) |
| `test-tem-edicion.ts` | Que en la grilla `tem` sólo sea editable `habilitada` y `casa` esté visible después de `nrolado`; los campos, el orden, la persistencia en `tem` (`table:'tem'`) y los permisos por rol de `tem_edicion`, y que esté al lado de TEM en el menú. El trigger de dominio 5 (`validar_manzana_casa_tem_trg.sql`) no se prueba acá |
| `app-para-tests.ts` | Utilidades (no contiene tests): app compuesta sin base, permisos leídos de `install/*.tab` y contexto de un usuario con cierto rol |

## Utilidades de `app-para-tests.ts`

- `crearAppParaTests(policy)`: instancia la misma app que `server-dmencu.ts` (con `emergeAppDmEncu` y los mixins de `meta-enc` y `procesamiento`) **sin llamar a `start()`**, de modo que no se conecta a la base. Asigna `be.db` (para citar identificadores) y `OperativoGenerator.mainTD`/`mainTDPK` como `server-dmencu.ts`, así se pueden armar definiciones de tablas. La policy `'web'` equivale al modo RELEVAMIENTO; cualquier otra, a GABINETE.
- `permisosDeInstalacion()`: construye `permisosRol`, `permisosSuperuser` y `permisosParaNadie` leyendo `install/roles.tab`, `roles_permisos.tab` y `permisos.tab`, con el mismo resultado que obtiene `postConfig` de la base. Así los tests de menú usan los permisos reales y fallan si alguien cambia la matriz sin revisar el menú.
- `contextoDelRol(be, rol, idper)`: contexto equivalente al de `getContext` para un usuario con ese rol.

Para las escrituras en `tem` y `tareas_tem`, las consultas se arman en funciones exportables (`consultaUpdateTem`, `consultaUpdateTareasTemPorDescarga`) que devuelven `{ sql, params }`, y `test-impacto-rea-no-rea-en-bd.ts` las ejecuta sobre una tabla falsa.

Para probar código que usa el cliente de base (como `refreshCaches`) se pasa un objeto que cumpla `ClienteDb` (un `query()` que devuelve `fetchAll` / `fetchUniqueRow`). `test-caches-rea.ts` tiene una base falsa en memoria que se puede reusar como modelo.

## Qué no cubren estos tests

Se prueban las reglas que están en TypeScript. La lógica de PostgreSQL (triggers y funciones de `install/*.sql`: validaciones de asignación, historial, condiciones de acciones, etc.) y los procedimientos que la usan (`dm_sincronizar`, `accion_tareas_tem_ejecutar`) **no tienen tests automáticos** y se verifican contra una base real. Es el principal hueco a cubrir.

## Convenciones

- Los nombres de `describe` empiezan con `dmencu - ` y se escriben en castellano, igual que el dominio.
- Tipos explícitos, sin `any` ni casts vía `unknown` (ver [CLAUDE.md](../CLAUDE.md)); para armar datos de prueba se usan los tipos de `src/unlogged/tipos.ts` y `src/server/types-dmencu.ts`.
- Cada funcionalidad crítica nueva o modificada debe llegar con su batería de tests.
- Un test que se agrega para proteger una regla conviene verificarlo "rompiendo" a propósito el código (por ejemplo, sacando una tabla de la lista que recarga las caches) para comprobar que realmente falla.
