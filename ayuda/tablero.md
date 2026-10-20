---
id: tablero
titulo: Inicio (tablero)
orden: 5
modo: GABINETE
permisos: [campo.editar, campo.administrar, encuestas.procesar, casilleros_texto.editar]
menu: [tablero]
---
**Inicio** es la pantalla que se abre al entrar al sistema. Muestra un panorama del operativo pensado para tu rol: las secciones que ves dependen de tu rol y tus permisos. El panorama general del operativo lo ven dirección, coordinación y procesamiento; recepción ve sus propias encuestas.

Si esta instalación define varios operativos (se usa para modelarlos), el inicio muestra la tabla **Operativos**: por cada uno, si su diseño está cerrado, cuántos formularios, preguntas, variables y consistencias tiene y los problemas que marca el editor de metadatos (errores, datos que faltan y avisos). El botón de la sección lleva al editor visual. En ese caso no se muestran las secciones de campo.

Si la instalación tiene un solo operativo vas a ver algunas de estas secciones:

| Sección | Qué muestra |
| :-- | :-- |
| Panorama del operativo | encuestas en la muestra, cuántas salieron a campo, efectivas, en curso y la tasa de respuesta |
| Para asignar | tus encuestas que todavía no están asignadas (por ejemplo las disponibles), con acceso a la grilla de asignación |
| En recepción | tus encuestas que ya se ven en recepción, por tarea y estado, con acceso a la grilla de recepción |
| Asignación y recepción por recepcionista | (coordinación) para cada recepcionista, cuántas encuestas faltan asignar y cuántas están en recepción, y las que todavía no tienen recepcionista |
| Avance de mis encuestas | en qué punto están tus encuestas |
| Avance del campo | en qué punto está cada encuesta: efectiva, en curso, no respuesta o sin salir a campo |
| Motivos de no respuesta | cuántas no respuestas hay por cada grupo de motivos |
| Avance por dominio, zona, comuna y área | barras apiladas con el avance de cada corte; elegís el corte con los botones de arriba |
| Dónde están las encuestas | cuántas encuestas hay en cada tarea (también las que tienen cero), con acceso a la grilla de la tarea si tenés permiso para verla |
| Estados por tarea | la tarea en la que está cada encuesta y su estado (código y descripción); las que no tienen estado figuran como *sin estado* |
| Calendario | la semana de carga en curso y los días que le quedan |
| Dispositivos | las sincronizaciones de los dispositivos móviles de hoy y de la semana |
| Qué puedo hacer | accesos directos a las opciones del menú que tenés habilitadas |

Los números se calculan al abrir la pantalla y se actualizan solos cada 15 minutos; con el botón **actualizar** se vuelven a calcular en cualquier momento. Los números de campo son los mismos que muestran las grillas del menú *control*. Los botones de cada sección (por ejemplo *control de campo*) llevan a la grilla con el detalle, y sólo aparecen si tenés esa grilla en tu menú. Con ctrl + clic se abren en otra pestaña.
