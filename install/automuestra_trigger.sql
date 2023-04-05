
CREATE TRIGGER insert_tem_trigger
AFTER UPDATE ON areas
FOR EACH ROW
WHEN (NEW.cantidad_encuestas <= (SELECT maximo_creacion_encuestas FROM parametros LIMIT 1))
BEGIN
  DECLARE enc VARCHAR(50);
  DECLARE maximo_creacion_encuestas INT;

  SELECT maximo_creacion_encuestas INTO maximo_creacion_encuestas FROM parametros LIMIT 1;

  SET enc = CONCAT(LPAD(NEW.area, LENGTH(NEW.cantidad_encuestas), '0'), '_');

  IF (NEW.cantidad_encuestas > OLD.cantidad_encuestas) THEN
    DECLARE i INT DEFAULT OLD.cantidad_encuestas + 1;
    DECLARE insert_count INT DEFAULT 0;

    WHILE (i <= NEW.cantidad_encuestas AND insert_count < maximo_creacion_encuestas) DO
      SET enc = CONCAT(enc, LPAD(i, LENGTH(NEW.cantidad_encuestas), '0'));

      INSERT INTO tem (enc) VALUES (enc);

      SET i = i + 1;
      SET insert_count = insert_count + 1;
    END WHILE;
  ELSE
    SET enc = CONCAT(enc, LPAD(NEW.cantidad_encuestas, LENGTH(NEW.cantidad_encuestas), '0'));

    INSERT INTO tem (enc) VALUES (enc);
  END IF;
END;

