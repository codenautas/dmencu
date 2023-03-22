CREATE OR REPLACE FUNCTION base.actualizar_estado_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$

begin
    update tem set estado_actual = new.estado, tarea_actual = new.tarea where operativo = new.operativo and enc = new.enc;
    return new;
end;
$BODY$;

DROP trigger if exists actualizar_estado_tem_trg  on base.tareas_tem;
CREATE TRIGGER actualizar_estado_tem_trg
    AFTER UPDATE OF estado, tarea
    ON base.tareas_tem
    FOR EACH ROW
    EXECUTE FUNCTION base.actualizar_estado_tem_trg();