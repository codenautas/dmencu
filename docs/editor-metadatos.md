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
4. El orden se renumera de 10 en 10 entre los hermanos (`numerarHermanos`).
5. **Borrar** borra el casillero y todo lo que tiene adentro.
6. Avisa que cambió la estructura (`timestampEstructura`): los dispositivos y la vista previa la vuelven a pedir.

Los `var_name` los recalcula el trigger. Las respuestas ya cargadas no se tocan: si se borra o se renombra un casillero, sus datos dejan de verse en el formulario.

## Dónde está cada cosa

| Qué | Dónde |
| :-- | :-- |
| Tipos, reglas, plantillas | `src/unlogged/editor-metadatos-comun.ts` |
| Lectura, aplicación de operaciones, permisos y procedimientos `editor_metadatos_traer` / `editor_metadatos_aplicar` | `src/server/editor-metadatos.ts` |
| Registro de procedimientos y opción de menú | `src/server/app-dmencu.ts` |
| Pantallas `editor_metadatos` y `formulario_previsualizar` | `src/client/render-editor-metadatos.tsx` |
| Tests | `src/test/test-editor-metadatos.ts` |

## Pendiente / ideas

- Crear formularios nuevos (raíz `F` con su unidad de análisis) desde el editor; hoy se crean en la grilla y después se editan acá.
- Deshacer / rehacer y un historial de versiones del formulario.
- Saltos dibujados como flechas en la cancha y elegidos arrastrando.
- Previsualizar sin guardar (aplicar los cambios en una transacción que se descarta).
- Editor de consistencias y de la expresión de habilitación con ayuda de variables.
