---
id: metadatos
titulo: Textos del formulario (metadatos)
orden: 90
modo: GABINETE
permisos: [casilleros_texto.editar]
menu: [configurar/metadatos]
---
En **configurar → metadatos** se define el formulario: operativos, formularios, preguntas, opciones y variables (**plano** muestra todos los casilleros juntos).

- **rea/norea**: las reglas que deciden si una encuesta es realizada o no realizada, y el motivo. En **no_rea_grupo0** se marca qué significa cada grupo de no respuesta en los controles de campo: si cuenta como «otras causas», si es «no encuestable» (no entra en la tasa de efectividad) o si es «en curso».
- En los textos se pueden usar **comodines** entre arrobas, por ejemplo `@nombre@`, que en el formulario se reemplazan por la respuesta de esa variable.

Los cambios llegan a los dispositivos en la próxima sincronización.
