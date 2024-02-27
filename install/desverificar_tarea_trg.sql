--set role dmencu_owner;
--set search_path=base;
--DROP FUNCTION if exists desverificar_tarea_trg();
CREATE OR REPLACE FUNCTION desverificar_tarea_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
declare 
        v_asignado_actual text;
        v_tarea_actual text;
        v_verificado_actual text;
        v_ultima_tarea_historial text;
        v_tarea_final text;
begin
    select asignado, tarea_actual, verificado into v_asignado_actual, v_tarea_actual, v_verificado_actual
        from tareas_tem tt join tem t using (operativo, enc)
        where new.operativo = t.operativo and new.enc = t.enc and tt.tarea = t.tarea_actual;

    select tarea into v_ultima_tarea_historial
        from historial_tem ht
        where new.operativo = ht.operativo and new.enc = ht.enc
        order by ts_salida desc
        limit 1;
    select tarea into v_tarea_final
        from tareas 
        where operativo = new.operativo and es_final;
    if new.verificado is null then
        if v_ultima_tarea_historial = new.tarea then 
            if v_verificado_actual is not null then
                raise 'ERROR: no se puede desverificar la tarea % ya que la tarea siguiente (%) se encuentra verificada', new.tarea, v_tarea_actual;
            end if;
            if v_asignado_actual is null then
                update tem 
                    set tarea_actual = new.tarea
                    where operativo = new.operativo and enc = new.enc;
            else
                raise 'ERROR: no se puede desverificar la tarea % ya que la tarea siguiente (%) se encuentra asignada', new.tarea, v_tarea_actual;
            end if;
        else
            if v_tarea_final is distinct from new.tarea then
                raise 'ERROR: no se puede desverificar la tarea % ya que no es la ultima anterior a la actual', new.tarea;
            end if;
        end if;
    end if;
    return new;
end;
$BODY$;

--DROP TRIGGER IF EXISTS desverificar_tarea_trg ON tareas_tem;
CREATE TRIGGER desverificar_tarea_trg
   AFTER UPDATE OF verificado
   ON tareas_tem
   FOR EACH ROW
   EXECUTE PROCEDURE desverificar_tarea_trg();   
