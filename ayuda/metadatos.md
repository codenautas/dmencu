---
id: metadatos
titulo: Textos del formulario (metadatos)
orden: 90
modo: GABINETE
permisos: [casilleros_texto.editar]
menu: [configurar/metadatos]
---
En **configurar → metadatos** se define el formulario: operativos, formularios, preguntas, opciones y variables (**plano** muestra todos los casilleros juntos).

- **rea/norea**: las reglas que deciden si una encuesta es realizada o no realizada, y el motivo.
- **editor visual**: el formulario se ve como un árbol (la "cancha"). Desde la paleta de la izquierda se arrastran casilleros (o plantillas armadas, como una pregunta sí/no con sus opciones) al lugar donde van; sólo se marcan en verde los lugares donde ese tipo de casillero puede ir. Los casilleros de la cancha también se arrastran para cambiarlos de lugar. Al elegir uno, a la derecha se cambian sus propiedades. Arriba se ven los problemas del formulario (por ejemplo una pregunta con opciones sin el tipo de variable que corresponde) y **vista previa** muestra el formulario tal como lo ve el encuestador. Los cambios se guardan al instante. Con permiso de textos se cambian los textos; agregar, mover o borrar casilleros lo hace el administrador.
  - Cada tipo de casillero tiene su ícono y color. Los **datos que faltan** según el tipo (el texto de una pregunta, el salto de un filtro, la unidad de análisis de un formulario...) se marcan en naranja y, al elegir el casillero, el campo a completar aparece en rojo.
  - Los **saltos** se eligen arrastrando la flecha de un casillero hasta el casillero al que tiene que saltar; se dibujan sobre el formulario.
  - Al escribir una condición (*se habilita si*) se pueden insertar variables del operativo y funciones, y avisa si usa una variable que no existe.
  - Con **deshacer** y **rehacer** (o Ctrl+Z y Ctrl+Y) se vuelve atrás un cambio. El modo **borrador** junta los cambios sin guardarlos hasta que los publicás, y la vista previa muestra cómo quedaría. **Versiones** guarda copias del formulario para restaurarlas más tarde, y **+ formulario** crea uno nuevo.
- En los textos se pueden usar **comodines** entre arrobas, por ejemplo `@nombre@`, que en el formulario se reemplazan por la respuesta de esa variable.

Los cambios llegan a los dispositivos en la próxima sincronización.
