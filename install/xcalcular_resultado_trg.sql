--cambiar el nombre del operativo y el owner correspondiente al operativo
--set role ggs_capa2022_owner;
CREATE or replace FUNCTION base.xcalcular_resultado_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
declare
  vresultado       text;
begin
    select  case when new.rea=1 then 'efectiva'  when new.rea=3 then 'pendiente' when new.rea=4 then 'mixta' when (new.rea=2 and new.norea is not null) then (select grupo from no_rea where new.norea=no_rea::integer )  else null end  into vresultado
      from tem
      where operativo='GGS_2022' and enc=new.enc;
    
    new.resultado= vresultado ;
    return new; 
end;
$BODY$;
/* RECORDAR descomentar y agregar el owner que corresponda al operativo

ALTER FUNCTION base.xcalcular_resultado_trg()
    OWNER TO ggs_capa2022_owner;

*/
CREATE TRIGGER xcalcular_resultado_trg
    BEFORE INSERT OR UPDATE OF rea, norea
    ON base.tem
    FOR EACH ROW
    EXECUTE PROCEDURE base.xcalcular_resultado_trg();