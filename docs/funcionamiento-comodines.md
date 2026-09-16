# Guía de Uso de Comodines en dmencu

Los **comodines** permiten incluir datos dinámicos dentro de los textos del formulario (preguntas, aclaraciones, títulos o casilleros libres). Cuando el encuestador ve la pantalla, el comodín se reemplaza automáticamente por el dato real que corresponda.

---

## 1. Regla General de Escritura

Todos los comodines se escriben siempre **entre signos de arroba**:

```text
@nombre_del_comodin@
```

No debe haber espacios entre las arrobas y el nombre (por ejemplo, escribir `@SEM_REF@` y **no** `@ SEM_REF @`).

---

## 2. Tipos de Comodines Disponibles

Existen 3 formas de usar comodines:

### A. Comodines Estándar (Fechas, Personas y Hogar)

Se escriben directamente con su nombre entre arrobas. El sistema los calcula automáticamente:

| Comodín | ¿Qué muestra? | Ejemplo de salida |
| :--- | :--- | :--- |
| `@SEM_REF@` | Rango de la semana de referencia de la encuesta | `Lunes 10 de Marzo a Domingo 16 de Marzo` |
| `@D30_REF@` | Rango de los últimos 30 días de referencia | `10 de Febrero a 11 de Marzo` |
| `@MES_REF@` | Mes de referencia de la semana | `Marzo` |
| `@SEM_NUM@` | Número de semana del operativo | `12` |
| `@resps1@` | Nombre del respondente de la encuesta general (S1) | `Juan Pérez` |
| `@parents1@` | Parentesco del respondente de S1 con el jefe de hogar | `Cónyuge/pareja` |
| `@respi1@` | Nombre del miembro elegido para la encuesta individual | `María Gómez` |
| `@parenti1@` | Parentesco del miembro individual con el jefe de hogar | `Hijo/a` |
| `@njefe@` | Nombre del jefe o jefa de hogar (persona 1) | `Carlos Rodríguez` |
| `@frealiz@` | Fecha de realización de la encuesta | `15/03/2026` |
| `@canti_hogares@` | Total de hogares relevados en la vivienda | `2` |

---

### B. Variables en Vivo del Formulario (`@#...`)

Permiten mostrar el valor de **cualquier variable** que se esté respondiendo en el formulario en ese momento.

* **Cómo se escribe:** El nombre de la variable precedido por un numeral (`#`):
  ```text
  @#nombre_variable@
  ```
* **Cómo funciona:** A medida que el encuestador escribe la respuesta en esa variable, el texto donde esté puesto el comodín se actualiza en tiempo real.
* **Ejemplos:**
  - `@#nombre@` → Muestra el nombre cargado en la variable `nombre`.
  - `@#edad@` → Muestra la edad cargada en la variable `edad`.
  - `@#p2@` → Muestra la respuesta cargada en `p2`.

---

### C. Datos del Marco Muestral / TEM (`@$tem...`)

Permiten mostrar información precargada de la vivienda o de la muestra que viene en el encabezado de la encuesta.

* **Cómo se escribe:** El prefijo `$tem.` seguido del campo que se quiere mostrar:
  ```text
  @$tem.campo@
  @$tem.objeto.campo@
  ```
* **Ejemplos frecuentes:**
  - `@$tem.dominio@` → Dominio de la vivienda.
  - `@$tem.cita.fecha@` → Fecha de una cita pactada anteriormente.
  - `@$tem.cita.hora@` → Hora de la cita pactada.
  - `@$tem.nomcalle@` → Nombre de la calle de la vivienda.

---

## 3. ¿Qué pasa si el dato todavía no fue cargado?

* **Comodines estándar y variables (`@#...`):** Si la variable aún no se respondió o el dato todavía no está disponible, el sistema muestra puntos suspensivos:  
  `........`
* **Comodines de marco (`@$tem...`):** Si el campo solicitado no existe en la información de la muestra, el sistema muestra una advertencia en color rojo:  
  `No se encontró @$tem.campo@`

---

## 4. Ejemplos Prácticos de Redacción

### Ejemplo 1: Pregunta de empleo con fecha y respondente
* **Texto a escribir en la pregunta:**
  > En la semana del **@SEM_REF@**, ¿**@resps1@** trabajó al menos una hora?
* **Cómo lo ve el encuestador:**
  > En la semana del **Lunes 10 de Marzo a Domingo 16 de Marzo**, ¿**Juan Pérez** trabajó al menos una hora?

---

### Ejemplo 2: Confirmación con variables cargadas en vivo
* **Texto a escribir en la pregunta:**
  > ¿Me confirma que la edad de **@#nombre@** es **@#edad@** años?
* **Cómo lo ve el encuestador:**
  - Si aún no completó los datos:  
    `¿Me confirma que la edad de ........ es ........ años?`
  - Al completar `nombre = Lucas` y `edad = 28`:  
    `¿Me confirma que la edad de Lucas es 28 años?`

---

### Ejemplo 3: Aviso de cita pactada desde la muestra
* **Texto a escribir en la aclaración:**
  > Atención: hay una cita coordinada para el día **@$tem.cita.fecha@** a las **@$tem.cita.hora@** hs.
* **Cómo lo ve el encuestador:**
  > Atención: hay una cita coordinada para el día **18/03/2026** a las **10:30** hs.
