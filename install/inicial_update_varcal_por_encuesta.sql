CREATE OR REPLACE FUNCTION base.update_varcal_por_encuesta(
	p_operativo text,
	p_id_caso text)
    RETURNS text
    LANGUAGE 'plpgsql'
AS $BODY$
BEGIN

  RETURN 'OK';
END;
$BODY$;