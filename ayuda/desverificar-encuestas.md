---
id: desverificar-encuestas
titulo: Desverificar encuestas
orden: 65
modo: GABINETE
roles: [subcoor_campo, coor_campo, coor_proc, procesamiento]
menu: [varios/desverificables]
---
La opción **desverificar encuestas** (en *varios*) lista las encuestas cuya última tarea quedó verificada y que ya pasaron a otra tarea que todavía no está verificada. Sirve para corregir una verificación hecha por error cuando ya no alcanza el botón de la grilla de recepción.

Para cada encuesta se ve la tarea verificada, su estado, el estado al que va a volver y la tarea en la que está hoy, con su estado.

Al apretar **desverificar**:

1. Se pide el **motivo** (es obligatorio). Queda registrado junto con tu usuario.
2. La tarea en la que estaba la encuesta se deja **sin asignar** y la encuesta vuelve a la tarea verificada, que queda sin verificar.
3. La tarea vuelve al estado que se muestra en la grilla y en la confirmación (por ejemplo *P - Pendiente*): el que corresponde a deshacer la verificación.

En el historial de la encuesta queda guardado cómo estaba la tarea que se dejó (estado y persona asignada), quién desverificó y el motivo.

No se puede desverificar si la tarea actual ya está verificada: en ese caso hay que desverificar primero la tarea actual.
