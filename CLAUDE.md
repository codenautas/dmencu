# CLAUDE.md — dmencu

App que corre sobre Backend-Plus y PostgreSQL para crear operativos de campo y definir encuestas a partir de metadatos. Funciona en dispositivos moviles mediante offline-first (PWA con service worker). Gestiona hoja de ruta (Hdr), asignación de cargas por encuestador y supervisor, y el motor de tareas y acciones. Las preguntas del formulario se definen por metadatos (basada en meta-enc).

---

## Nombres de operativos

- El número del operativo (por ejemplo `274`) identifica la onda: en `274`, `27` es el año y `4` es el trimestre.
- Al hablar del operativo en general (documentación, explicaciones, mensajes, nombres de funciones o textos de interfaz), **no usar el código numérico**. Usar la descripción, por ejemplo "la encuesta trimestral", "el operativo vigente" o "la onda actual".
- El código sólo aparece cuando es un identificador técnico que el sistema exige (por ejemplo, valores de la columna `operativo`) o cuando se habla de una onda concreta.
- Esta regla aplica a cualquier operativo, no sólo a una app en particular.

---

## Estructura de archivos

Las tablas están definidas siguiendo la convención de `backend-plus`: cada tabla tiene su propio archivo con el prefijo `table-`, ubicado en `src/server/`. El frontend en `src/client` y en `src/common` lo que sea común a ambos.


> 📝 Antes de trabajar con cualquier tabla, leer su archivo `table-*.ts` correspondiente. Ahí están los nombres exactos de columnas, labels, descripciones y cualquier lógica de validación definida a nivel de tabla.

---

### Stack

- **Backend**: Node.js + TypeScript, usando `backend-plus` como framework base (autenticación, tablas, procedimientos, API REST)
- **Frontend**: dos capas
  - Pantallas estándar generadas por backend-plus (HTML/JS "CRUDs con grillas edditables")
  - Pantalla de relevamiento y dm en **React**
- **Base de datos**: PostgreSQL, esquema `base` (dos usuarios de db: un owner con el que se crean las tablas y SP; y un admin que es el que usa el backend para acceder a los datos)
- **Deploy**: servicio systemd en Ubuntu. Los desarrolladores pueden usar Windows también. 

---

## Convenciones de código

- **Todos los tipos deben ser explícitos**. Prohibido usar `any`, casts vía `unknown`, o cualquier magia sin justificación. 
  - Si un callback recibe un parámetro sin tipo, tiparlo (por ejemplo `(item:MenuInfoBase) => ...`), no dejarlo implícito.
- Si existe código de bajo nivel inevitablemente sin tipado estricto, debe estar estrictamente encapsulado en ubicaciones muy delimitadas y tratado como excepción, no como norma.
- **Preservar el estilo existente** al modificar archivos: incluyendo el uso de `var` donde ya se usa.
- **No tocar el formato de lo que ya existe**: el diff de un cambio debe mostrar sólo las líneas que cambian de verdad.
  - No reindentar, no reformatear, no quitar ni agregar espacios al final de las líneas, y no agregar ni quitar el salto de línea final del archivo.
  - Respetar el fin de línea de cada archivo: hay archivos con CRLF y otros con LF. Las líneas nuevas van con el mismo fin de línea que el resto del archivo. Revisar con `git ls-files --eol <archivo>`.
  - En Windows no editar con `sed -i` ni herramientas que reescriban el archivo completo, porque pueden convertir CRLF a LF.
  - Antes de commitear, revisar `git diff --stat` contra `git diff --ignore-all-space --ignore-cr-at-eol --stat`. Si dan distinto, hay cambios de formato que hay que revertir.
- **Nunca repetir código**: antes de escribir una consulta, constante o función, buscar si ya existe (por ejemplo el sql de las tablas `control_*`, `TEM_DEL_USUARIO`) y, si existe, exportarla y reutilizarla. Lo mismo vale para cualquier parte del código.
- Los nombres de tablas, columnas y variables de dominio van **en castellano**, consistente con el esquema de base de datos.
- El código sigue las convenciones de `backend-plus` para definición de tablas, procedimientos y endpoints.
- **Los procedimientos (`ProcedureDef`) se definen en `src/server/procedures-dmencu.ts`**, no en `app-dmencu.ts`. Así los puede consumir cualquier frontend. La lógica que resuelve un procedimiento va en una función exportada de ese archivo; `app-dmencu.ts` sólo agrega los puntos de extensión de la app.

---

## Compilación

- **Compilación sin fallbacks**: el build no tolera errores. No agregar `|| echo "continue w/error"` a los scripts de `package.json`. Un error de compilación se corrige en el código.
- Si `mixin-patch` se cuelga sin salida, casi seguro hay un `.d.ts` viejo en `dist/` que dispara la regex de `mixin-patch` (catastrophic backtracking). Solución: borrar `dist/` y volver a compilar.

---

## Contexto de base de datos — esquema `base`

Todos los objetos pertenecen al esquema `base`. Los nombres están en castellano.

### Scripts de actualización

- Los SQL de `install/` (listados en `def-config.ts`) sólo se aplican al instalar la base con el dump.
- En `install/` va **sólo lo que hace falta de entrada para crear la base y no está contemplado en el dump**: funciones, triggers y datos iniciales (como roles y permisos). La estructura de las tablas **no** va en `install/`: sale de la definición `table-*.ts` y queda en el dump. Una tabla nueva se define en su `table-*.ts` (y se agrega a la lista de tablas de la app), no con un `create table` en `install/`.
- Todo cambio de estructura, función o trigger que tenga que llegar a bases ya instaladas lleva además un script en `operaciones/`, con el nombre `AAAA-MM-DD-actualizar_descripcion_con_snake_case.sql` (por ejemplo `2026-10-15-actualizar_validar_manzana_casa_tem.sql`).
- El script empieza con `--set role <app>_owner;` comentado y `set search_path = base;`. Si hacen falta permisos para el usuario admin, se usa un nombre ficticio (`<app>_admin`) y se deja comentado, para que cada instalación ponga el suyo.
- Tiene que poder correrse más de una vez sin romper nada (`create or replace`, `drop ... if exists`, `add column if not exists`).

## Casos de prueba

Los tests cubren funcionalidades críticas del sistema. Es necesario definir una batería de tests para cada funcionalidad crítica que se implemente o extienda.

### Framework y comando

- **Framework**: Mocha
- **Comando**: `npm run test`
- **Archivo principal**: `test.ts`

### Lógica de negocio en PostgreSQL

Muchas reglas de negocio críticas están implementadas como **funciones almacenadas y triggers en PostgreSQL**, no en el backend Node.js. Esto es una decisión arquitectónica deliberada: garantiza que esas reglas no puedan saltearse aunque alguien modifique el backend.

Ejemplos de lógica que vive en la base de datos:

> ⚠️ Si Claude Code necesita entender o modificar una regla de negocio importante, debe buscar primero si existe una función o trigger en PostgreSQL que la implemente — no asumir que toda la lógica está en TypeScript. Reimplementar en el backend lógica que ya existe en la base de datos introduce duplicación y riesgo de inconsistencia.

---

## Tablero de inicio

- **Todo control que se agregue debe aparecer en el tablero de inicio** (`src/server/tablero.ts`, ver `docs/tablero.md`). Un control es una grilla de control del menú (como las `control_*`) o cualquier otro indicador de seguimiento del operativo. Se agrega como sección nueva o como un corte de una existente (por ejemplo `CORTES_DESGLOSE`), reutilizando el sql de la propia tabla de control, con link a su grilla y visible según los permisos de la grilla.
- Al agregarlo, actualizar `docs/tablero.md` y `ayuda/tablero.md`, y sumar su caso a `src/test/test-tablero.ts`.

---

## Documentación

Mantener actualizada la documentación en la medida que se agreguen o modifiquen las funcionalidades.

- `docs/` es la documentación para desarrolladores.
- `ayuda/` es la ayuda en línea para usuarios que se ve en el menú según rol, permisos y modo (ver `docs/ayuda-online.md`). Al agregar o cambiar una opción de menú o una funcionalidad que usan las personas, agregar o actualizar su tema en `ayuda/`.

---

## Publicación

- `dmencu` se publica en npm **sólo desde GitHub Actions** (`.github/workflows/publish.yml`). No hacer `npm publish` local.
- Para publicar: `npm version patch` (o `minor`/`major`), que sube `package.json`, hace el commit y crea el tag `vX.Y.Z`; después `git push --follow-tags`. El push del tag dispara el workflow.
- Un tag por versión. No crear ni pushear el tag antes de subir la versión en `package.json`.
- Detalle, requisitos (Trusted publisher) y diagnóstico de errores: `docs/publicacion.md`.