---
id: tablero
titulo: Inicio (tablero)
orden: 5
modo: GABINETE
permisos: [campo.editar, campo.administrar, encuestas.procesar, casilleros_texto.editar]
menu: [tablero]
---
**Inicio** es la pantalla que se abre al entrar al sistema. Muestra un panorama del operativo pensado para tu rol: las secciones que ves dependen de tu rol y tus permisos. El panorama general del operativo lo ven dirección, coordinación y procesamiento; recepción ve sus propias encuestas.

Vas a ver algunas de estas secciones:

| Sección | Qué muestra |
| :-- | :-- |
| Para asignar | tus encuestas que todavía no están asignadas (por ejemplo las disponibles), con acceso a la grilla de asignación |
| En recepción | tus encuestas que ya se ven en recepción, por tarea y estado, con acceso a la grilla de recepción |
| Asignación y recepción por recepcionista | (coordinación) una tabla por cada tarea de relevamiento (por ejemplo encuestador, recuperador y supervisor). Para cada recepcionista de la tarea (se muestra como "(idper) nombre"): cuántas encuestas faltan asignar, cuántas están en recepción, el total, el porcentaje asignado y cómo van en el campo (salieron a campo, efectivas, tasa de respuesta, en curso, no respuesta y no salieron a campo); también las que todavía no tienen recepcionista en esa tarea y el total. Cuenta las encuestas que pasaron por la tarea o están en ella: en la primera tarea el total es el de la muestra y en las demás es menor, y una encuesta cuenta en cada tarea por la que pasó. Tocando el nombre de una fila (o *sin recepcionista*) se abren las encuestas que siguen en esa tarea con ese recepcionista, para ver cuáles están sin asignar o demoradas |
| Avance de mis encuestas | en qué punto están tus encuestas |
| Mis encuestas en detalle | tus números: cuántas faltan asignar, cuántas están en recepción, el total, el porcentaje asignado y cómo van en el campo (salieron a campo, efectivas, tasa de respuesta, en curso, no respuesta y no salieron a campo) |
| Avance del campo | encuestas en la muestra, cuántas salieron a campo, efectivas, en curso, no respuesta, no salieron a campo y la tasa de respuesta, y debajo una barra con en qué punto está cada encuesta; los colores de las cifras son los de la barra |
| Motivos de no respuesta | cuántas no respuestas hay por cada grupo de motivos |
| Avance por dominio, zona, comuna y área | barras apiladas con el avance de cada corte (empieza en dominio y muestra las primeras 10 filas; los cortes que tienen una sola fila no aparecen); elegís el corte con los botones de arriba; el total de cada corte es el de todas las encuestas de la tabla de encuestas (tem). Si el corte tiene más de 10 filas (por ejemplo las áreas), muestra las primeras 10: podés buscar por nombre, tocar los botones de más filas (por ejemplo *ver 25* o *ver 50*, según el tamaño del corte) o *ver todas*; si tenés permiso para ver la tabla de encuestas (tem), tocando el nombre de una fila (por ejemplo "área 3") se abren las encuestas de esa área, dominio, zona o comuna |
| Dónde están las encuestas | cuántas encuestas hay en cada tarea (también las que tienen cero), con acceso a la grilla de la tarea si tenés permiso para verla. El botón **ver estados** de cada tarea abre una ventana con sus encuestas por estado (código y descripción); las que no tienen estado figuran como *Sin estado* |
| Calendario | la semana de carga en curso y los días que le quedan; en coordinación se ve a la derecha de la tabla de recepcionistas; si tenés encuestas para asignar o en recepción, se ve arriba, al lado de ellas |
| Dispositivos | las sincronizaciones de los dispositivos móviles de hoy y de la semana |
| Qué puedo hacer | accesos directos a las opciones del menú que tenés habilitadas |

Los números se calculan al abrir la pantalla y se actualizan solos cada 15 minutos; con el botón **actualizar** se vuelven a calcular en cualquier momento. Los números de campo son los mismos que muestran las grillas del menú *control*. Los botones de cada sección (por ejemplo *control de campo*) llevan a la grilla con el detalle, y sólo aparecen si tenés esa grilla en tu menú. Con ctrl + clic se abren en otra pestaña.
