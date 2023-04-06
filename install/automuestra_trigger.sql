CREATE OR REPLACE FUNCTION crear_encuestas() RETURNS trigger AS $$
DECLARE
    n INTEGER;
    max_enc INTEGER;
BEGIN
    IF NEW.cantidad_encuestas > OLD.cantidad_encuestas THEN
        SELECT min(maximo_creacion_encuestas, NEW.cantidad_encuestas)-coalesce(OLD.cantidad_encuestas,0) INTO n FROM parametros;
        FOR j IN 1..(n) LOOP
            INSERT INTO tem (enc) VALUES (LPAD((NEW.area::text), length(NEW.cantidad_encuestas), '0'));
        END LOOP;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER areas_encuestas_trigger AFTER UPDATE OF cantidad_encuestas ON areas
FOR EACH ROW EXECUTE FUNCTION crear_encuestas();
