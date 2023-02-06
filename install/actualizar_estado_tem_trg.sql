CREATE OR REPLACE FUNCTION base.actualizar_estado_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$

begin
    update tem set estado = new.estado where operativo = new.operativo and enc = new.enc;
    return new;
end;
$BODY$;

CREATE TRIGGER actualizar_estado_tem_trg
    AFTER INSERT OR UPDATE OF estado
    ON base.tareas_tem
    FOR EACH ROW
    EXECUTE FUNCTION base.actualizar_estado_tem_trg();