# CLAUDE.md — dmencu

App que corre sobre Backend-Plus y PostgreSQL para crear operativos de campo y definir encuestas a partir de metadatos. Funciona en dispositivos moviles mediante offline-first (PWA con service worker). Gestiona hoja de ruta (Hdr), asignación de cargas por encuestador y supervisor, y el motor de tareas y acciones. Las preguntas del formulario se definen por metadatos (basada en meta-enc).

---

## Estructura de archivos

Las tablas están definidas siguiendo la convención de `backend-plus`: cada tabla tiene su propio archivo con el prefijo `tabla-`, ubicado en `src/server/`. El frontend en `src/client` y en `src/common` lo que sea común a ambos.


> 📝 Antes de trabajar con cualquier tabla, leer su archivo `tabla-*.ts` correspondiente. Ahí están los nombres exactos de columnas, labels, descripciones y cualquier lógica de validación definida a nivel de tabla.

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
- Si existe código de bajo nivel inevitablemente sin tipado estricto, debe estar estrictamente encapsulado en ubicaciones muy delimitadas y tratado como excepción, no como norma.
- **Preservar el estilo existente** al modificar archivos: incluyendo el uso de `var` donde ya se usa.
- Los nombres de tablas, columnas y variables de dominio van **en castellano**, consistente con el esquema de base de datos.
- El código sigue las convenciones de `backend-plus` para definición de tablas, procedimientos y endpoints.

---

## Contexto de base de datos — esquema `base`

Todos los objetos pertenecen al esquema `base`. Los nombres están en castellano.

## Casos de prueba

Los tests cubren funcionalidades críticas del sistema. Es necesario definir una batería de tests para cada funcionalidad crítica que se implemente o extienda.

### Framework y comando

- **Framework**: Mocha
- **Comando**: `npm run test`
- **Archivo principal**: `test.ts`
### Helpers disponibles

### Lógica de negocio en PostgreSQL

Muchas reglas de negocio críticas están implementadas como **funciones almacenadas y triggers en PostgreSQL**, no en el backend Node.js. Esto es una decisión arquitectónica deliberada: garantiza que esas reglas no puedan saltearse aunque alguien modifique el backend.

Ejemplos de lógica que vive en la base de datos:

> ⚠️ Si Claude Code necesita entender o modificar una regla de negocio importante, debe buscar primero si existe una función o trigger en PostgreSQL que la implemente — no asumir que toda la lógica está en TypeScript. Reimplementar en el backend lógica que ya existe en la base de datos introduce duplicación y riesgo de inconsistencia.