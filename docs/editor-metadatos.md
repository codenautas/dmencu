# Editor visual de metadatos

En *configurar → metadatos → **editor visual*** (`menuType: 'editor_metadatos'`) se arma el formulario arrastrando casilleros en lugar de cargarlos fila por fila en la grilla `casilleros`. Es una pantalla React + MUI con el tema del perfil (ver [tablero.md](tablero.md)) que escribe en la misma tabla `casilleros`, así que la grilla sigue funcionando igual y los triggers siguen validando.

## Qué tiene la pantalla

| Parte | Qué hace |
| :-- | :-- |
| **Paleta** (izquierda) | Plantillas (`PLANTILLAS`: pregunta sí/no con sus opciones, de opciones, numérica, de texto, de fecha) y cada tipo de `tipoc` suelto. Se arrastran a la cancha |
| **Cancha** (centro) | El formulario elegido como árbol de tarjetas, con el color de su tipo, el código, el texto, el tipo de variable, el salto y los problemas. Al arrastrar, sólo aparecen zonas para soltar (en verde) donde `tipoc_tipoc` permite ese tipo; nunca adentro del propio casillero. Los casilleros se arrastran para cambiarlos de lugar |
| **Propiedades** (derecha) | Los campos del casillero elegido (los principales y "más campos"), sus problemas, guardar / descartar y borrar (con todo lo que tiene adentro) |
| **Problemas** (arriba) | Las reglas de la columna `ok` de la grilla, para todo el operativo; un clic lleva al casillero |
| **Vista previa** | La encuesta real (el mismo renderizador del dispositivo, `desplegarFormularioActual`) con el formulario guardado, en un iframe, sobre una encuesta vacía que vive sólo en memoria. Se recarga después de cada cambio |

Al soltar algo de la paleta se pide el código (se sugiere el siguiente con `proximoCodigo`), el texto y el tipo de variable; se muestra el `id_casillero` que va a tener y si la operación no es válida, el motivo.

## Íconos y colores

Cada tipo de casillero tiene su color e ícono (`COLOR_DEL_TIPO`, `ICONO_DEL_TIPO` en `render-editor-metadatos.tsx`) en la paleta, en las tarjetas de la cancha y en los diálogos; las plantillas tienen el suyo (`ICONO_DE_PLANTILLA`). Un tipo nuevo (de la tabla `tipoc`) sin ícono propio usa uno genérico.

## Datos que faltan según el tipo

Aunque la base los deje vacíos, cada tipo necesita ciertos datos para desplegarse bien (`DATOS_REQUERIDOS`, `datosFaltantes`). Se marcan como **datos faltantes** (naranja, lápiz) distintos de los **errores** (rojo) y los **avisos** (amarillo); en el panel el campo a completar se pinta en rojo con el mensaje:

| Tipo | Necesita |
| :-- | :-- |
| `F` | título, unidad de análisis y contenido |
| `B`, `CP`, `MATRIZ`, `PMATRIZ` | título y contenido (que no estén vacíos) |
| `P`, `PMATRIZ` | texto; la pregunta además necesita tipo de variable o preguntas adentro |
| `O`, `OM` | texto; `OM` además necesita opciones |
| `TEXTO` | texto o aclaración |
| `FILTRO` | texto (o aclaración) y a dónde salta |
| `CONS` | mensaje y condición |
| `BF` | el formulario que abre (`salto`); si no es un formulario del operativo, error |

Para sumar o cambiar lo que pide un tipo se edita `DATOS_REQUERIDOS` (también sirve para tipos de la app final, por ejemplo `LIBRE`).

## Saltos

Cada casillero (menos el botón de formulario) tiene una flecha a la derecha: se arrastra hasta el casillero destino y queda guardado en `salto`. Los saltos se dibujan sobre la cancha (violeta si van hacia adelante, naranja punteado si vuelven; se pueden ocultar con el interruptor *saltos*). En el panel, el campo `salto` es un buscador de casilleros del formulario (o `fin`); un salto a algo que no existe es un aviso.

## Expresiones

El campo *se habilita si* tiene ayuda: un buscador para insertar variables del operativo (`var_name` con su texto), un selector de funciones (`FUNCIONES_DE_EXPRESIONES`, las de `helpers-casilleros`) y un aviso si la expresión usa variables que no están en el operativo (`variablesDesconocidas`; las que empiezan con `$` son internas y se aceptan).

## Formularios nuevos

El botón **+ formulario** crea la raíz (`F`) con código, título, unidad de análisis y si es el principal; después se llena arrastrando.

## Deshacer, rehacer y borrador

- **Deshacer / rehacer** (botones o Ctrl+Z / Ctrl+Y, hasta 50 pasos). Cada operación tiene una inversa precisa (`inversaDeOperacion`): crear ↔ eliminar, modificar ↔ valores anteriores, mover ↔ mover de vuelta, eliminar ↔ restaurar lo que se borró (`reemplazar` sólo de ese subárbol). Si no hay una inversa precisa se vuelve el formulario a su copia anterior (`operacionesInversas`).
- **Borrador**: el interruptor deja los cambios en el navegador (se simulan con `aplicarOperacionLocal`, que repite lo que hacen el servidor y los triggers) hasta **publicar**, que los manda todos juntos en una transacción (todos o ninguno). La **vista previa** del borrador le pide al servidor la estructura con los cambios aplicados dentro de un savepoint que se descarta (`editor_metadatos_previsualizar`), así se ve el resultado con el renderizador sin guardar nada. No se puede cambiar de operativo ni guardar versiones con cambios pendientes.

## Versiones

El botón de historial guarda y lista copias del formulario con todo lo que tiene adentro (tabla `casilleros_versiones`; script `operaciones/2026-10-18-actualizar_casilleros_versiones.sql` para bases ya instaladas). **Restaurar** (sólo superuser) primero guarda cómo está y después reemplaza el formulario por la copia (`reemplazar`: borra el formulario e inserta la copia con los mismos ids).

## Reglas

Están en `src/unlogged/editor-metadatos-comun.ts`, que usan el cliente (para avisar antes de mandar) y el servidor (que las vuelve a controlar):

- **Inclusiones**: un casillero sólo puede ir dentro de un tipo que lo admita según `tipoc_tipoc`; sólo los formularios (`F`) van sueltos.
- **Tipo de variable**: obligatorio si `tipoc.puede_ser_var` es `true`, prohibido si es `false`.
- **Opciones**: una pregunta (`P`, `OM`) con opciones necesita tipo `opciones` o `si_no`; con opciones Sí/No conviene `si_no`; sólo las preguntas tienen opciones; una pregunta de opciones sin opciones es un error.
- **id_casillero**: lo calcula el trigger `irrepetible_trg` (el código si el tipo es irrepetible; si no, `padre/código`). `idQueTendria` hace la misma cuenta para avisar si se repite.
- **Saltos** a casilleros que no existen: aviso.
- **Diseño cerrado** (`operativos.disform_cerrado`): la pantalla queda sólo para mirar (y el trigger `control_disform_cerrado_trg` lo impide igual).

## Permisos

| Quién | Qué puede |
| :-- | :-- |
| `casilleros_texto.editar` (por ejemplo `dis_conceptual`) | entrar y cambiar los textos (`nombre`, `aclaracion`) |
| superuser (`admin`) | además agregar, mover, borrar y cambiar cualquier campo (como la grilla `casilleros`, que sólo edita el admin) |

## Cómo se guardan los cambios

`editor_metadatos_aplicar` recibe una lista de operaciones (`crear`, `modificar`, `mover`, `eliminar`) y las aplica en orden dentro de la transacción del procedimiento, todas o ninguna:

1. `set constraints all deferred`: al cambiar un id quedan por un momento hijos apuntando al id viejo.
2. Valida cada operación con `validarOperacion` contra los casilleros como están en ese momento.
3. **Mover** o **cambiar el código** de un casillero no irrepetible le cambia el id: `llevarHijosAlIdNuevo` actualiza el `padre` de sus hijos (el trigger recalcula sus ids) y sigue hacia abajo.
4. El casillero ocupa el hueco entre sus vecinos (`ordenParaInsertar`): los órdenes de la base tienen huecos irregulares y se respetan; sólo si no hay lugar se renumeran los hermanos de 10 en 10 (`numerarHermanos`). `mover` acepta un `orden` exacto, que usa el deshacer para volver al número original.
5. **Borrar** borra el casillero y todo lo que tiene adentro.
6. Avisa que cambió la estructura (`timestampEstructura`): los dispositivos y la vista previa la vuelven a pedir.

Los `var_name` los recalcula el trigger. Las respuestas ya cargadas no se tocan: si se borra o se renombra un casillero, sus datos dejan de verse en el formulario.

## Dónde está cada cosa

| Qué | Dónde |
| :-- | :-- |
| Tipos, reglas, plantillas | `src/unlogged/editor-metadatos-comun.ts` |
| Lectura, aplicación de operaciones, versiones, permisos y procedimientos `editor_metadatos_traer`, `_aplicar`, `_previsualizar`, `_versiones_traer`, `_version_guardar` y `_version_restaurar` | `src/server/editor-metadatos.ts` |
| Tabla de versiones | `src/server/table-casilleros_versiones.ts` |
| Registro de procedimientos y opción de menú | `src/server/app-dmencu.ts` |
| Pantallas `editor_metadatos` y `formulario_previsualizar` | `src/client/render-editor-metadatos.tsx` |
| Tests | `src/test/test-editor-metadatos.ts` |

## Pendiente / ideas

- Editor de consistencias (`CONS`) con la condición probada contra datos de ejemplo.
- Mostrar en el panel qué casilleros saltan *hacia* el seleccionado.
- Comparar dos versiones de un formulario antes de restaurar.
- Arrastrar varios casilleros juntos y copiar y pegar casilleros entre formularios.
- La vista previa abre sólo formularios de la unidad de análisis principal; los demás se navegan desde el principal.
