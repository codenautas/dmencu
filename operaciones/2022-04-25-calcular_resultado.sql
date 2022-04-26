set role to discon_owner;
--set role to dmencu_owner;
--set role to preju_capa2022_owner;
--set role to preju2022_owner;
--set role to preju_test2022_owner;
set search_path=base;

alter table tem add column resultado text;


CREATE OR REPLACE FUNCTION base.xcalcular_resultado_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
declare
  vresultado       text;
begin
    select  case when new.rea=1 then 'efectiva'  when new.rea=3 then 'pendiente' when new.rea=4 then 'mixta' when (new.rea=2 and new.norea is not null) then (select grupo from no_rea where new.norea=no_rea::integer )  else null end  into new.resultado
    from tem
    where operativo='PREJU_2022' and enc=new.enc;
    
   -- new.resultado       = vresultado ;
    return new;
end;
$BODY$;

ALTER FUNCTION base.xcalcular_resultado_trg()
    OWNER TO discon_owner;
    
DROP TRIGGER IF EXISTS xcalcular_resultado_trg ON base.tem;
CREATE TRIGGER xcalcular_resultado_trg
   BEFORE INSERT OR UPDATE OF rea, norea
    ON base.tem
    FOR EACH ROW
    EXECUTE FUNCTION base.xcalcular_resultado_trg();    
------------------------------------------------------    
--para probar que corra trigger y comprobar valores
/*
--solo la primer vez
update base.tem set resultado=null where resultado is not null;
*/
update base.tem
  set rea=rea 
  where rea is not null and operativo='PREJU_2022';

update base.tem
  set norea=norea 
  where norea is not null and operativo='PREJU_2022' ;
select operativo,enc, rea, norea, resultado
  from base.tem
  where operativo='PREJU_2022' and (norea is not null or rea is not null);