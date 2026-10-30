--set role dmencu_owner;
--set search_path=base;

set search_path = base;

-- nromanzana y casa sólo se pueden modificar en las encuestas de dominio 5
CREATE OR REPLACE FUNCTION validar_manzana_casa_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
begin
    if old.dominio is distinct from 5 then
        raise exception 'Error: la manzana y la casa de la encuesta % del operativo % sólo se pueden modificar si el dominio es 5', new.enc, new.operativo;
    end if;
    return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS validar_manzana_casa_tem_trg ON tem;
CREATE TRIGGER validar_manzana_casa_tem_trg
   BEFORE UPDATE OF nromanzana, casa
   ON tem
   FOR EACH ROW
   WHEN (old.nromanzana is distinct from new.nromanzana or old.casa is distinct from new.casa)
   EXECUTE PROCEDURE validar_manzana_casa_tem_trg();
