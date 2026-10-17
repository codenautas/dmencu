# Documentación de dmencu

Índice de la documentación técnica y funcional. Para una presentación general del sistema ver el [README](../README.md) / [LEEME](../LEEME.md) de la raíz y el [CLAUDE.md](../CLAUDE.md) (convenciones de código).

| Documento | De qué trata |
| :-- | :-- |
| [arquitectura.md](arquitectura.md) | Capas del sistema, modelo de datos principal, dónde vive cada regla de negocio |
| [tareas-estados-acciones.md](tareas-estados-acciones.md) | Motor de tareas, estados y acciones; el grafo de estados ([grafo_estados.png](grafo_estados.png)) |
| [sincronizacion-offline.md](sincronizacion-offline.md) | Funcionamiento offline-first: carga, descarga, backups, sincronización con el dispositivo (diagramas de secuencia) |
| [rea-no-rea.md](rea-no-rea.md) | Cómo se calculan REA / no REA y el resumen de estado de una encuesta |
| [roles-y-permisos.md](roles-y-permisos.md) | Roles, permisos y menús según rol y modo (policy) |
| [tablero.md](tablero.md) | Tablero de inicio del modo GABINETE: perfiles y colores, secciones según rol y permisos; cómo lo extienden las apps finales |
| [ayuda-online.md](ayuda-online.md) | Ayuda en línea para usuarios según rol, permisos y modo; cómo la extienden las apps finales |
| [testing.md](testing.md) | Cómo se prueba el proyecto y qué cubre cada archivo de tests |
| [resumen-estados.md](resumen-estados.md) | Colores y significado de los estados de resumen del formulario |
| [funcionamiento-comodines.md](funcionamiento-comodines.md) | Guía de comodines (`@...@`) para redactar textos del formulario |
| [casillero-libre.md](casillero-libre.md) | Casilleros de tipo `LIBRE` y cómo redefinir su despliegue |
| [publicacion.md](publicacion.md) | Cómo se publica en npm desde GitHub Actions (tags, disparo manual, Trusted publisher) y diagnóstico de errores |

## Glosario rápido

- **Operativo**: relevamiento definido por metadatos (formularios, variables, tareas, estados). Un operativo es el contexto de casi todas las tablas (`operativo` forma parte de la PK).
- **TEM**: tabla de estructura muestral; una fila por encuesta (`enc`) con su `tarea_actual`, `rea`, `norea`, `resumen_estado`, etc.
- **Hdr**: hoja de ruta, la lista de encuestas asignadas a un encuestador/supervisor/recuperador que se descarga al dispositivo.
- **DM**: dispositivo móvil.
- **Tarea**: etapa del circuito de una encuesta (`encu`, `recu`, `supe`, `ingr`, `finc`, `anac`, `proc`). Cada encuesta tiene una fila en `tareas_tem` por tarea.
- **Modo DM**: `produc` (producción) o `capa` (capacitación); separa las encuestas reales de las de capacitación.
