--set role dmencu_owner;
--set search_path=base;

CREATE OR REPLACE FUNCTION sincronizacion_tareas_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
begin
    new.cargado      = new.cargado_dm is not null;
    return new;
end;
$BODY$;

CREATE TRIGGER sincronizacion_tareas_tem_trg
    BEFORE INSERT OR UPDATE OF cargado_dm
    ON tareas_tem
    FOR EACH ROW
    EXECUTE PROCEDURE sincronizacion_tareas_tem_trg();
