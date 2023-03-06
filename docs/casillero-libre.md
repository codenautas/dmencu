# casillero LIBRE

dmencu ahora tiene casilleros de tipoc LIBRE (por ahora no tienen var_name). Los mismos pueden definirse como hijos de formularios y bloques (tipoc F y B respectivamente)

Dmencu permite redefinir en cada app el despliegue de este casillero, ya que si se usa tal cual está sin refefinir (por ejemplo si lo pone DC por error, y que ellos usan una instancia de dmencu) aparece un div diciendo que es de uso exclusivo informático.

El casillero se redefine en cada operativo en el archivo my-render-formulario.tsx con la función setLibreDespliegue (la misma está al final del archivo). El componente recibe estos parámetros key:string, casillero:Libre,  formulario:Formulario,  forPk:ForPk.

Si se definen muchos casilleros de tipoc LIBRE los mismos se pueden tratar en esa misma función distinquiendolos por id_casillero 