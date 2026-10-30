--set role dmencu_owner;
--set search_path=base;

set search_path = base;

-- nromanzana, casa, nrocatastral, piso, departamento y habitacion sólo se pueden modificar en las encuestas de dominio 5
CREATE OR REPLACE FUNCTION validar_domicilio_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
begin
    if old.dominio is distinct from 5 then
        raise exception 'Error: la manzana, la casa, el número catastral, el piso, el departamento y la habitación de la encuesta % del operativo % sólo se pueden modificar si el dominio es 5', new.enc, new.operativo;
    end if;
    return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS validar_domicilio_tem_trg ON tem;
CREATE TRIGGER validar_domicilio_tem_trg
   BEFORE UPDATE OF nromanzana, casa, nrocatastral, piso, departamento, habitacion
   ON tem
   FOR EACH ROW
   WHEN (old.nromanzana is distinct from new.nromanzana or old.casa is distinct from new.casa
                or old.nrocatastral is distinct from new.nrocatastral or old.piso is distinct from new.piso
                or old.departamento is distinct from new.departamento or old.habitacion is distinct from new.habitacion)
   EXECUTE PROCEDURE validar_domicilio_tem_trg();
