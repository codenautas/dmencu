---
id: circuito-encuesta
titulo: El recorrido de una encuesta
orden: 10
modo: GABINETE
permisos: [campo.ver, campo.editar, encuestas.procesar]
---
Cada encuesta pasa por una serie de **tareas** (etapas). Las más comunes son:

| Tarea | Quién la hace |
| :-- | :-- |
| encuesta (`encu`) | el encuestador, en el dispositivo móvil |
| recuperación (`recu`) | el recuperador, cuando hay que volver a visitar el hogar |
| supervisión (`supe`) | el supervisor, que vuelve a contactar una parte de los hogares |
| ingreso (`ingr`) | el ingresador, que carga en gabinete una encuesta hecha en papel |
| fin de campo y análisis de campo | la coordinación, antes de pasar a procesamiento |

En cada tarea la encuesta tiene un **estado**. El circuito habitual es:

1. **Disponible**: todavía no tiene a nadie asignado.
2. **Asignado**: se le asignó una persona (ver [Asignación](ayuda:asignacion)).
3. **A cargar** → **Cargado**: se marca para cargar y, cuando la persona sincroniza su dispositivo, la encuesta queda en el dispositivo.
4. **A descargar** → **Descargado**: se marca para descargar y vuelve en la próxima sincronización.
5. **Pendiente** → **Verificado**: en recepción se revisa la encuesta y, si no tiene inconsistencias sin justificar, se verifica (ver [Recepción](ayuda:recepcion)).
6. Una vez verificada pasa a la tarea siguiente.

Los estados y los pasos exactos pueden variar según el operativo.
