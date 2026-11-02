-- Actualizar: tem.resultado se calcula con el trigger xcalcular_resultado_trg (mismo contenido que xcalcular_resultado_trg.sql, para bases ya instaladas).
-- Las bases instaladas desde el dump no tenían el trigger y resultado quedó vacío: el control de campo no contaba las efectivas, pendientes ni mixtas.
-- Correr con el owner de la base; reemplazar los nombres ficticios por los de la instalación.
--set role dmencu_owner;
set search_path = base;

CREATE or replace FUNCTION base.xcalcular_resultado_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
declare
  vresultado       text;
begin
    select
        case
          when new.rea=1 then 'efectiva'
          when new.rea=3 then 'pendiente'
          when new.rea=4 then 'mixta'
          when (new.rea=2 and new.norea is not null) then
            (select grupo
              from no_rea
              where new.operativo=no_rea.operativo and new.norea=no_rea.no_rea
            )
          else null
        end  into vresultado
      from tem t join parametros p using (operativo)
      where p.unico_registro
        and enc=new.enc;

    new.resultado= vresultado ;
    return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS xcalcular_resultado_trg ON base.tem;
CREATE TRIGGER xcalcular_resultado_trg
    BEFORE INSERT OR UPDATE OF rea, norea
    ON base.tem
    FOR EACH ROW
    EXECUTE PROCEDURE base.xcalcular_resultado_trg();

-- recalcula resultado de las encuestas existentes: nombrar rea y norea en el set dispara el trigger aunque no cambien.
-- Se puede correr más de una vez.
update tem set rea = rea, norea = norea;

--alter function base.xcalcular_resultado_trg() owner to dmencu_owner;
