# Sincronización y funcionamiento offline

El dispositivo trabaja sin conexión: lleva consigo la **estructura** del formulario y las **encuestas asignadas** (hoja de ruta), y sólo se conecta para sincronizar y para enviar backups.

## Qué guarda el dispositivo

| Dato | Qué es | Dónde se guarda |
| :-- | :-- | :-- |
| Aplicación (shell, scripts, estilos) | La PWA misma | Service worker (`service-worker-admin`), se sirve sin sesión para que funcione sin cobertura |
| Estructura | Formularios, casilleros, variables, reglas de REA/no REA ya compiladas a JS (`operativo_estructura_completa`) | `localStorage` (vía `FormRenderer`, ver `src/unlogged/render-init.ts`) |
| Datos (`DatosByPassPersistibles`) | Respuestas por unidad de análisis, `cargas` (áreas), `informacionHdr` (datos de la encuesta y tarea), token, número de sincronización | `localStorage` |
| Backups | Cola de encuestas modificadas que aún no se enviaron | `localStorage`, clave `backups` |
| Modo DM | `produc` o `capa` | `localStorage` |
| Ayuda | Temas de ayuda del usuario, que se descargan al sincronizar (ver [ayuda-online.md](ayuda-online.md)) | `localStorage`, clave `ayuda` |
| Último login válido (`idper`, usuario) | Para seguir operando si se pierde la cookie de sesión | `localStorage` |

## Sincronización

Se hace desde la pantalla *sincronizar* (o *cambiar modo*) del dispositivo. En un solo paso el dispositivo **entrega** lo que tiene y **recibe** lo nuevo.

```mermaid
sequenceDiagram
    actor E as Encuestador
    participant D as Dispositivo (React + localStorage)
    participant S as Servidor (dm_sincronizar)
    participant DB as PostgreSQL

    E->>D: Toca "sincronizar"
    D->>D: leerDatos() (encuestas del dispositivo)
    D->>S: dm_sincronizar(persistentes, modo_dm, cambia_modo_dm, idper_logueado_tablet)
    S->>DB: busca o crea el token del dispositivo
    S->>DB: insert en sincronizaciones (guarda el JSON completo recibido)
    loop por cada encuesta con respuestas
        S->>DB: valida que exista recepcionista para (operativo, tarea, área)
        opt la encuesta se creó en el dispositivo (id negativo)
            S->>DB: persistirEncuestaAutogeneradaEnDM → asigna id definitivo
        end
        S->>DB: update tareas_tem: estado = 'D', cargado_dm = null, resumen / REA / no REA<br/>(sólo si cargado_dm = token del dispositivo)
        alt el token coincide
            S->>DB: guardarEncuestaEnTem + registrarPaseTabla (respuestas en las tablas)
        else el dispositivo ya no es el dueño de la encuesta
            S->>S: apende el JSON a local-recibido-sin-token.txt
        end
    end
    S->>DB: arma la hoja de ruta (getHdrQuery): encuestas habilitadas<br/>asignadas con operacion = 'cargar' y no cargadas por otro token
    S->>DB: update tareas_tem: estado = 'C', cargado_dm = token
    S-->>D: nueva hoja de ruta + token + número de sincronización
    D->>D: persistirDatos()
    D->>S: operativo_estructura_completa(operativo)
    S-->>D: estructura con REA/no REA compiladas
    D->>D: persistirEstructura(), borra los backups locales
    D-->>E: "datos recibidos" + link a la hoja de ruta
```

Consecuencias importantes de este diseño:

- **El token es el dueño de la encuesta.** Sólo el dispositivo cuyo token figura en `tareas_tem.cargado_dm` puede devolverla. Si la encuesta fue reasignada o descargada por gabinete, lo que envíe ese dispositivo no pisa la base: se escribe en `local-recibido-sin-token.txt` para recuperarlo a mano.
- **La carga a un dispositivo depende de `operacion = 'cargar'`**, que se marca desde gabinete (acción *cargar*, ver [tareas-estados-acciones.md](tareas-estados-acciones.md)). Sólo lo que esté en esa condición baja al dispositivo.
- **Descargar:** en cada sincronización el dispositivo entrega todo lo que tiene; lo que vuelve a bajar depende de `operacion = 'cargar'`. Si gabinete marca `operacion = 'descargar'`, o si el dispositivo cambia de modo o de usuario, la encuesta se entrega pero no se vuelve a cargar.
- **Cambio de modo (`produc` ↔ `capa`):** sólo si el operativo permite generar muestra; en caso contrario se rechaza. El cambio hace una sincronización con `cambia_modo_dm = true`.
- **Encuestas autogeneradas:** cuando el operativo lo permite, el encuestador crea encuestas en el dispositivo con un id provisorio negativo; el servidor les asigna el id definitivo al sincronizar o al recibir el backup.
- Los resultados que calcula el dispositivo (`resumenEstado`, REA y no REA) se guardan en `tareas_tem` con el prefijo `dm_` y luego se llevan a la TEM; ver [rea-no-rea.md](rea-no-rea.md).

## Backup continuo

Mientras el encuestador trabaja una encuesta, el formulario encola un backup (`encolarBackup`) y se intenta enviar al servidor sin interrumpirlo. Si no hay conexión simplemente se reintenta con el siguiente cambio.

```mermaid
sequenceDiagram
    participant F as Formulario (React)
    participant LS as localStorage (backups)
    participant S as Servidor (dm_backup)
    participant DB as PostgreSQL

    F->>LS: encolarBackup(token, forPkRaiz, respuestas) → idBackup = n
    F->>S: dm_backup(token, tem, modo_dm)
    alt sin conexión o error
        S--xF: falla
        F->>F: registra el error en consola y conserva el backup
    else token inexistente o nulo
        S-->>F: "ok:N/T" (no hace nada)
    else token válido
        S->>DB: update tem set json_backup, fecha_backup<br/>(sólo si el JSON cambió)
        S-->>F: ok
        F->>LS: elimina los backups con idBackup ≤ n
    end
```

- El backup **no cambia el estado** de la encuesta, sólo guarda `json_backup` en la TEM como respaldo.
- Si una encuesta autogenerada (id negativo) llega por backup, el servidor la registra igual.
- El backup guarda sólo el último JSON; la base no acumula versiones por backup.

## Rescate manual

Si un dispositivo no puede sincronizar (por ejemplo por un error al grabar), se entra a la pantalla `/salvar`: envía cada ítem de `localStorage` a `dm_rescatar`, que los agrega a `local-rescate.txt` en el servidor, y desregistra los service workers. Con ese archivo se puede reconstruir la encuesta a mano.

## Gabinete: abrir una encuesta

En gabinete se usa el mismo formulario del dispositivo, pero los datos se piden en línea con `dm_forpkraiz_cargar` y se graban con `dm_forpkraiz_descargar`:

```mermaid
sequenceDiagram
    actor U as Usuario de gabinete
    participant C as Grilla (cliente)
    participant S as Servidor
    participant DB as PostgreSQL

    U->>C: Click en "abrir" en una encuesta
    C->>S: dm_forpkraiz_cargar(operativo, enc, tarea)
    S->>DB: ¿cargada en un dm, o el estado no permite editar,<br/>o tarea 'proc' sin permiso/ya verificada?
    DB-->>S: soloLectura sí/no
    S->>DB: arma la hoja de ruta de esa encuesta
    S-->>C: datos + soloLectura + timestampEstructura
    C->>C: carga estructura y datos y abre el formulario
    U->>C: Edita y guarda
    C->>S: dm_forpkraiz_descargar(operativo, persistentes)  (si no es de sólo lectura)
    S->>DB: guardarEncuestaEnTem + registrarPaseTabla
    S-->>C: ok
```

La encuesta se abre en **sólo lectura** si está cargada en un dispositivo, si el estado no permite editarla y no está asignada al usuario, o si está en procesamiento y el usuario no puede procesar (o ya está verificada).

## Cambios de estructura

Cuando cambia la estructura del formulario (casilleros, semanas, REA/no REA) el servidor actualiza `timestampEstructura`. El dispositivo vuelve a pedir `operativo_estructura_completa` en la siguiente sincronización; mientras tanto trabaja con la estructura que tenía.
