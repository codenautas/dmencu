set search_path=base;

CREATE OR REPLACE FUNCTION crear_encuestas() RETURNS trigger LANGUAGE plpgsql 
AS $$
DECLARE
    n INTEGER;
    max_enc INTEGER;
BEGIN
    IF NEW.cantidad_encuestas > coalesce(OLD.cantidad_encuestas,0) THEN
            SELECT coalesce(max(enc::bigint), NEW.area) INTO max_enc FROM tem WHERE area = NEW.area;
        SELECT least(maximo_creacion_encuestas, NEW.cantidad_encuestas)-coalesce(OLD.cantidad_encuestas,0) INTO n FROM parametros;
        FOR j IN 1..(n) LOOP
            INSERT INTO tem (operativo,     enc,               estado_actual,  habilitada, area) 
                     VALUES (NEW.operativo, (max_enc+j)::text, 'ESTADO_NUEVO', true,       NEW.area);
        END LOOP;
    END IF;
    RETURN NULL;
END;
$$ ;

DROP TRIGGER IF EXISTS areas_encuestas_trigger ON areas;
CREATE TRIGGER areas_encuestas_trigger 
    AFTER UPDATE OF cantidad_encuestas ON areas
    FOR EACH ROW EXECUTE FUNCTION crear_encuestas();
