CREATE OR REPLACE FUNCTION obtener_siguiente_contador_area(
    p_operativo TEXT, 
    p_area INTEGER,
    p_max_contador INTEGER 
)
RETURNS INTEGER AS $$
DECLARE
    v_nuevo_contador INTEGER;
    v_contador_actual INTEGER;
BEGIN
    -- 1. Intentar insertar la clave (operativo, area) si no existe.
    INSERT INTO area_enc_proximas (operativo, area, contador)
      VALUES (p_operativo, p_area, 0)
      ON CONFLICT (operativo, area) DO NOTHING
      -- Capturamos el contador actual, o 0 si acabamos de insertar
      RETURNING contador INTO v_contador_actual;

    -- Si la fila ya existía, necesitamos obtener el valor actual para la verificación
    -- Si acabamos de insertar, v_contador_actual es 0, si ya existía, tiene su valor actual
    IF v_contador_actual IS NULL THEN
        -- Si ON CONFLICT DO NOTHING se ejecutó, recuperamos el valor actual
        SELECT contador INTO v_contador_actual
            FROM area_enc_proximas
            WHERE operativo = p_operativo AND area = p_area;
    END IF;

    -- 2. Verificar el límite ANTES de la actualización atómica
    IF (v_contador_actual + 1) > p_max_contador THEN
        -- Si el próximo número excede el límite, lanzamos un error y revertimos
        RAISE EXCEPTION 'Límite de encuestas alcanzado para el Operativo "%" y Área %: %/%', 
            p_operativo, p_area, v_contador_actual + 1, p_max_contador;
    END IF;

    -- 3. Actualiza y obtiene el siguiente contador en una operación atómica.
    UPDATE area_enc_proximas
      SET contador = contador + 1
      WHERE operativo = p_operativo AND area = p_area
      RETURNING contador INTO v_nuevo_contador;

    -- Este chequeo ya no es estrictamente necesario, pero lo mantenemos por seguridad
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fallo de concurrencia al actualizar el contador para el Operativo % y Área %.', p_operativo, p_area;
    END IF;

    RETURN v_nuevo_contador;
END;
$$ LANGUAGE plpgsql VOLATILE;