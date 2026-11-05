--set role dmencu_owner;
--set search_path=base;

-- tem.resultado se calcula a partir de rea y norea. El control de campo cuenta las efectivas, pendientes y mixtas por esta columna:
-- sin el trigger queda vacía y esas encuestas no se cuentan.
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