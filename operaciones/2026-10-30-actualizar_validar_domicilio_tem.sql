-- Actualizar: nromanzana, casa, nrocatastral, piso, departamento y habitacion de tem sólo se pueden modificar en encuestas de dominio 5
-- (mismo contenido que validar_domicilio_tem_trg.sql, para bases ya instaladas)
-- Correr con el owner de la base; reemplazar los nombres ficticios por los de la instalación.
--set role dmencu_owner;
set search_path = base;

-- se reemplaza validar_manzana_casa_tem_trg (2026-10-15) por validar_domicilio_tem_trg
DROP TRIGGER IF EXISTS validar_manzana_casa_tem_trg ON tem;
DROP FUNCTION IF EXISTS validar_manzana_casa_tem_trg();

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

-- el usuario admin (el que usa el backend) no necesita permisos extra para que el trigger se dispare
--grant execute on function validar_domicilio_tem_trg() to dmencu_admin;
