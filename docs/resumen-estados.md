# resumen estados

nombre        | color    | principal | interno | obs
--------------|----------|-----------|---------|-----
con problemas | rojo     | sí        | sí      |
incomplmeto   | amarillo | sí        | sí      |
ok            | verde    | sí        | sí      |
no rea        | gris     | sí        | no      |
vacio         | negro    | sí        | sí      | si todos son vacíos suma vacío si no suma incompleto (salvo que tenga con problemas y suma con problemas)
actual        | azul     | no        | sí      | es un _pseudo estado_ cuando todos los de abajo son vacíos y es el último que tiene algo o es el primero de la lista, reemplaza el ok pero no con problemas ni incompleto