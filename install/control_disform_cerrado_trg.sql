--set search_path=base;
--set role dmencu_owner;

CREATE OR REPLACE FUNCTION control_disform_cerrado_trg()
  RETURNS trigger AS
$BODY$
DECLARE
    v_operativo          TEXT;
    v_disform_cerrado   boolean;
    v_registro_salida    RECORD;
    v_ref_op             RECORD;
    
BEGIN
v_ref_op=NEW;
v_registro_salida=NEW;
  
IF TG_OP IN ('UPDATE','DELETE') THEN
  v_ref_op=OLD;
END IF;
IF TG_OP ='DELETE' THEN
  v_registro_salida=OLD;
END IF;

IF TG_TABLE_NAME IN ('casilleros','unidad_analisis') THEN
  v_operativo=v_ref_op.operativo;
  SELECT disform_cerrado
        INTO v_disform_cerrado
        FROM operativos
        WHERE operativo= v_operativo;
   IF v_disform_cerrado  THEN    
     RAISE EXCEPTION 'ERROR diseño de formularios cerrado. No es posible modificar la tabla %  del operativo %.', tg_table_name, v_operativo;
   END IF;
END IF;

RETURN v_registro_salida;
END;
$BODY$
  LANGUAGE plpgsql ;


CREATE TRIGGER unidad_analisis_disform_cerrado_trg
  BEFORE UPDATE OR INSERT OR DELETE
  ON unidad_analisis
  FOR EACH ROW
  EXECUTE PROCEDURE control_disform_cerrado_trg();
  
CREATE TRIGGER casilleros_disform_cerrado_trg
  BEFORE UPDATE OR INSERT OR DELETE
  ON casilleros
  FOR EACH ROW
  EXECUTE PROCEDURE control_disform_cerrado_trg();
