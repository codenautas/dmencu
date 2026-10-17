---
id: asignacion
titulo: Asignación
orden: 20
modo: GABINETE
permisos: [campo.editar]
menu: [asignacion, asignacion/general, asignacion/encuestador, asignacion/ingresador, asignacion/recuperador, asignacion/supervisor, asignacion/asignar_por_area, asignacion/asignar_por_tarea]
---
En **asignación** se decide quién hace cada tarea.

- **general**: una grilla por área con el recepcionista y la persona asignada en cada tarea.
- **encuestador**, **ingresador**, **recuperador**, **supervisor**: una grilla por tarea. Se elige la persona en la columna del asignado. Desplegando una fila se ven las encuestas del área.

Hay dos pantallas nuevas que hacen lo mismo de forma más cómoda:

- **general (nueva)**: elegís la tarea arriba y ves todas las áreas con su recepcionista, la persona asignada y cuántas encuestas quedan sin asignar. Podés cambiar una fila o seleccionar varias áreas y asignarlas juntas.
- **por tarea (nueva)**: elegís la tarea y ves sus encuestas con el estado, el recepcionista y la persona asignada. Se pueden filtrar por área, estado, persona o "sin asignar", buscar por número o dirección, y seleccionar varias para **asignar** o **desasignar** juntas.

Si alguna encuesta no se puede asignar (por ejemplo porque su estado no lo permite, está deshabilitada o le falta recepcionista), las demás se asignan igual y se muestra el motivo de cada una que no.

Para que una encuesta llegue al dispositivo de la persona hay que asignarla y después **cargarla** (queda *a cargar*). La persona la recibe la próxima vez que sincroniza.

Si sos **recepcionista**, sólo ves las áreas que tenés a cargo.
