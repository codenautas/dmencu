# REA, no REA y resumen de estado

Cada encuesta tiene un **resultado** que se calcula en el dispositivo (y en gabinete) mientras se la completa: si fue realizada (REA), si es un caso de no respuesta (no REA) y en qué estado de completitud está. Estos datos se guardan en la TEM y alimentan la hoja de ruta, la supervisión y los controles de campo.

Hay dos juegos de reglas paralelos: el de la encuesta (`rea`, `no_rea`) y el de **supervisión** (`rea_sup`, `no_rea_sup`), que se usa cuando la tarea es `supe`.

## Dónde se definen

Son tablas de metadatos del operativo, editables desde *configurar → metadatos → rea/norea* por quien tiene permiso para editar metadatos (ver [roles-y-permisos.md](roles-y-permisos.md)).

| Tabla | Columnas relevantes | Cómo se evalúa |
| :-- | :-- | :-- |
| `rea` | `rea` (código), `orden`, `condicion`, `es_positiva`, `tarea` | `condicion` es una expresión sobre las variables de la encuesta. Se compila a JavaScript (`condicion_js`) en el servidor al armar la estructura |
| `no_rea` | `no_rea` (código), `orden`, `variable`, `valor`, `grupo`, `grupo0`, `pasa_a_recuperacion`, `pasa_a_supervision` | Se cumple si `respuestas[variable] == valor` |
| `rea_sup` | igual que `rea` | Igual que `rea`, para la supervisión |
| `no_rea_sup` | `no_rea_sup`, `orden`, `variable_sup`, `valor_sup`, `grupo_sup`, `grupo0_sup` | Igual que `no_rea` |

Todas tienen `operativo` en la clave: cada operativo define sus propias reglas (pueden no existir en alguno).

## Cómo se determina el resultado

```mermaid
flowchart TD
    A[Cambia una respuesta] --> B[calcularResumenVivienda]
    B --> C["esRealizada → codRea / esRea"]
    B --> D["esNoRea → codNoRea / esNoRea"]
    B --> E["esRealizadaSup / esNoReaSup"]
    B --> F[Resumen de cada formulario<br/>feedback del row-validator]
    F --> G["Prioridad: no rea > con problemas > incompleto > vacío > cita pactada > ok"]
    G --> H{Tarea}
    D --> H
    E --> H
    H -- "supe" --> I["resumenEstadoSup = no rea si esNoReaSup, si no el mínimo"]
    H -- "otra" --> J["resumenEstado = no rea si esNoRea, si no el mínimo"]
```

`buscarReaNoReaEnRespuestas` (`src/unlogged/calculos-encuesta.ts`) recorre la lista ordenada por `orden` y devuelve el **primer** ítem que se cumple:

1. Se ignoran los ítems cuya `tarea` esté definida y no coincida con la tarea actual.
2. Un ítem se cumple si su condición JS da verdadero (REA) o si la variable tiene el valor indicado (no REA).
3. Se busca primero a nivel de la unidad de análisis raíz (la vivienda) y, si no hay coincidencia, se desciende por las unidades hijas (hogares, personas...) evaluando cada elemento con el contexto acumulado de sus padres.
4. **REA positiva en un nivel inferior:** si el ítem es una REA positiva (`es_positiva = true`) y se cumplió en una unidad hija, debe cumplirse en **todas** las instancias de esa unidad (por ejemplo, todos los hogares) y esa rama debe estar completa; si no, se descarta el ítem y se sigue con el siguiente. Una REA negativa (`es_positiva = false`) alcanza con que se cumpla en una instancia.
5. El resultado es el `codigo` del ítem y si es positivo (`esRea` / `esNoRea`).

> Por eso importa el `orden`: las reglas más específicas o más fuertes deben ir primero, y la base se consulta `order by operativo, orden, código`.

### Estados de resumen

El resumen de cada formulario de la encuesta se combina tomando el de **menor prioridad numérica** (el peor). Colores y significado en [resumen-estados.md](resumen-estados.md).

| Prioridad | Estado |
| :-- | :-- |
| 1 | `no rea` |
| 2 | `con problemas` |
| 3 | `incompleto` |
| 4 | `vacio` |
| 5 | `cita pactada` |
| 6 | `ok` |

Regla especial: si el mínimo es `vacio` pero hay formularios `ok`, el resumen pasa a `incompleto` (la encuesta ya empezó). Si la encuesta es no REA, el resumen es `no rea` sin importar el resto.

Sólo se tienen en cuenta los formularios habilitados de la encuesta (por ejemplo, el individual sólo cuenta para la persona sorteada).

## Dónde se guarda

| Origen | Campos |
| :-- | :-- |
| Dispositivo (en `tareas_tem`, prefijo `dm_`) | `dm_resumen_estado`, `dm_rea`, `dm_norea` y las `_sup` |
| TEM (valor vigente) | `resumen_estado`, `rea`, `norea` y las `_sup` |

- Al sincronizar, `getSettersAndParametersForReaNoReaResumenEstado` (`src/server/setters-rea-no-rea.ts`) arma los `set` del update: para la tarea `supe` usa las columnas `_sup`; para las demás, las comunes.
- Los grupos de no REA (`grupo`, `grupo0`) se usan para decidir pases: la grilla marca como a recuperar (`a_recuperacion`) las encuestas de la tarea `recu` cuyo grupo0 sea ausentes o rechazos, y `modalidad = presencial` cuando el grupo0 es no encuestable o hay supervisión presencial.

## Cómo llegan las reglas al dispositivo

1. Al iniciar el servidor, y cada vez que se guarda o borra un registro en `rea`, `no_rea`, `rea_sup` o `no_rea_sup`, se recargan las caches (`be.caches.tableContent`) y se actualiza `timestampEstructura`.
2. `operativo_estructura_completa` entrega la estructura del operativo; `reasNoReasDelOperativo` filtra las reglas del operativo y compila las condiciones de `rea` y `rea_sup` a JS (`condicion_js`).
3. El dispositivo guarda la estructura en `localStorage` y la usa para evaluar sin conexión.

Cobertura de tests de esta lógica: ver [testing.md](testing.md).
