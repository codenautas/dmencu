---
id: recepcion
titulo: Recepción
orden: 30
modo: GABINETE
permisos: [campo.editar]
menu: [recepcion, recepcion/encuestador, recepcion/recuperador, recepcion/ingresador, recepcion/supervisor, recepcion/mis_supervisores, recepcion/recibir_por_persona]
---
En **recepción** se sigue el trabajo de cada persona y se reciben sus encuestas. Hay una grilla por tarea, con las personas asignadas. Desplegando una persona se ven sus encuestas y el estado de cada una.

En **por persona (nueva)** elegís la tarea, ves la lista de personas con cuántas encuestas tienen en cada estado y, al elegir una, sus encuestas con los botones de las acciones que se pueden hacer. Seleccionando varias encuestas se puede hacer la misma acción en todas a la vez (sólo las acciones disponibles en todas las seleccionadas). El número de encuesta abre el formulario.

Las acciones que se pueden hacer sobre una encuesta dependen de su estado. Las más comunes son:

| Acción | Para qué |
| :-- | :-- |
| cargar / no cargar | marcar la encuesta para que baje (o no) al dispositivo en la próxima sincronización |
| descargar / no descargar | pedir que el dispositivo devuelva la encuesta en la próxima sincronización |
| analizar | revisar las consistencias de una encuesta que ya volvió |
| verificar / no verificar | dar por buena la encuesta; no se puede si quedan inconsistencias sin justificar |

Después de verificar, la encuesta pasa a la tarea siguiente. Ver [El recorrido de una encuesta](ayuda:circuito-encuesta).
