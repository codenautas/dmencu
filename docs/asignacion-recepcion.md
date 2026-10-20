# Asignación y recepción (pantallas nuevas)

Tres pantallas en React + MUI, con el mismo tema que el tablero (ver [tablero.md](tablero.md)), que conviven con las grillas de siempre. Están al final de los menús:

| Opción de menú | Pantalla (`menuType`) | Quién la ve |
| :-- | :-- | :-- |
| asignación → **general (nueva)** | `asignacion_general` | `campo.administrar` (como *asignación → general*) |
| asignación → **por tarea (nueva)** | `asignacion_tarea` | `campo.editar` |
| recepción → **por persona (nueva)** | `recepcion_tarea` | `campo.editar` |

## Qué hace cada una

- **General**: se elige la tarea y se ve una fila por área con el recepcionista, la persona asignada, cuántas encuestas tiene y cuántas quedan sin asignar (en su tarea actual). Se cambia una fila con los selectores o se seleccionan varias áreas y se asignan juntas. Escribe en `tareas_areas`; el trigger `sincro_tareas_areas_tareas_tem_trg` lo pasa a las encuestas del área que están en esa tarea (o todavía sin tarea). Igual que en la grilla, quitar la persona del área no desasigna sus encuestas.
- **Por tarea**: se elige la tarea y se ven sus encuestas asignables: las que la tienen como tarea actual y, en la tarea inicial, también las que todavía no tienen tarea (lo mismo que permite `validar_tareas_tem_trg`). Filtros por área, estado y persona (o *sin asignar*), búsqueda por número, dirección o persona, paginado, y selección para **asignar** (persona y/o recepcionista) o **desasignar** en bloque. Escribe en `tareas_tem`.
- **Recepción**: se elige la tarea; a la izquierda las personas con encuestas en recepción (las de estados `visible_en_recepcion` cuya tarea actual es esa), con cuántas tienen en cada estado y si están en el dispositivo. Al elegir una persona se ven sus encuestas con el resultado y los botones de las acciones disponibles (las de `estados_acciones` con `acciones.recepciona` cuya condición se cumple, como la grilla `tareas_tem_recepcion`). Seleccionando varias encuestas aparecen las acciones disponibles en todas (sin las que abren una pantalla, como *abrir*). El número de encuesta abre el formulario.

## Reglas

- **Las reglas siguen en la base.** Las pantallas escriben en las mismas tablas que las grillas, así que los triggers validan igual: estado que no permite asignar, encuesta deshabilitada, falta de recepcionista, tarea que no es la actual, etc.
- **Cambios masivos con un savepoint por encuesta (o área).** Si una no se puede cambiar, se vuelve a su savepoint y se siguen las demás; la pantalla muestra cuántas se aplicaron y el motivo de cada una que no (el mensaje del trigger).
- **Acciones**: `recepcion_acciones_ejecutar` vuelve a calcular las acciones disponibles de cada encuesta en el servidor y ejecuta la pedida sólo si está disponible en su estado actual, con el mismo `accion_tareas_tem_ejecutar` que los botones de las grillas (mismo procedimiento asociado y mismo pase de tarea).
- **Permisos**, los mismos que las grillas: asignan quienes tienen `campo.administrar` o el rol `recepcionista`; el recepcionista sólo ve y cambia las encuestas que tiene a cargo (`tareas_tem.recepcionista`). Los demás con `campo.editar` (por ejemplo el ingresador) ven y ejecutan acciones de recepción, pero no asignan.
- Respetan producción / capacitación del usuario (`TEM_DEL_USUARIO`, igual que la TEM).

## Dónde está cada cosa

| Qué | Dónde |
| :-- | :-- |
| Consultas, cambios, permisos (`quienAsigna`) y procedimientos `asignacion_*` y `recepcion_*` | `src/server/asignacion.ts` |
| Registro de los procedimientos y opciones de menú (`getMenuAsignacion`, `getMenuRecepcion`) | `src/server/app-dmencu.ts` |
| Tipos | `src/unlogged/tipos-asignacion.ts` |
| Pantallas (`myOwn.wScreens.asignacion_general`, `asignacion_tarea`, `recepcion_tarea`) | `src/client/render-asignacion.tsx` |
| Tests | `src/test/test-asignacion.ts` |

## Procedimientos

| Procedimiento | Parámetros | Devuelve |
| :-- | :-- | :-- |
| `asignacion_contexto_traer` | | operativo, permisos, tareas, estados, personas y recepcionistas |
| `asignacion_areas_traer` | | áreas con conteos y asignación por tarea |
| `asignacion_areas_cambiar` | `cambios`: `[{area, tarea, recepcionista?, asignado?}]` | resultado por área/tarea |
| `asignacion_encuestas_traer` | `tarea` | encuestas asignables de la tarea |
| `asignacion_encuestas_cambiar` | `cambio`: `{tarea, encs, recepcionista?, asignado?}` | resultado por encuesta |
| `recepcion_personas_traer` | `tarea` | personas con sus conteos por estado |
| `recepcion_encuestas_traer` | `tarea`, `asignado` | encuestas de la persona con sus acciones disponibles |
| `recepcion_acciones_ejecutar` | `tarea`, `encs`, `eaccion` | resultado por encuesta |

En los cambios, un campo que no viene no se toca y `null` lo vacía (`asignado: null` desasigna).

## Pendiente

Las grillas anteriores siguen en el menú. Cuando las pantallas nuevas estén probadas en campo, se puede decidir reemplazarlas (y sacar el "(nueva)" de las etiquetas).
