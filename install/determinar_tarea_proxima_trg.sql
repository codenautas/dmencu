--set role dmencu_owner;
--set search_path=base;
DROP FUNCTION if exists determinar_tarea_proxima_trg();
CREATE OR REPLACE FUNCTION determinar_tarea_proxima_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
    declare
        v_tarea_actual  text;
        v_rea integer;
        v_norea integer;
        v_grupo0 text;
        v_proxtarea text;
        v_supervision_aleatoria integer;
        v_supervision_dirigida integer;
        v_pasa_a_recuperacion boolean;
        v_pasa_a_supervision  boolean;
begin
     select rea, norea, tarea_actual, grupo0, supervision_aleatoria, supervision_dirigida, pasa_a_recuperacion, pasa_a_supervision
        into v_rea, v_norea, v_tarea_actual, v_grupo0, v_supervision_aleatoria, v_supervision_dirigida , v_pasa_a_recuperacion, v_pasa_a_supervision
        from tem t
        left join no_rea nr  on nr.no_rea= norea::text 
        where operativo = new.operativo and enc = new.enc;    
    if new.verificado='1' then
        if v_tarea_actual='encu' then
            case when v_pasa_a_recuperacion or v_rea in (3,4) then
                    v_proxtarea='recu';
                 when v_pasa_a_supervision then 
                    v_proxtarea='supe';
                 when  v_rea=1 and (v_supervision_aleatoria is not null or v_supervision_dirigida is not null) then 
                    v_proxtarea='supe';
                 else 
                    v_proxtarea='finc';
            end case;
        elsif v_tarea_actual='recu' then
            case when v_pasa_a_supervision then 
                    v_proxtarea='supe';
                 when  v_rea=1 and (v_supervision_aleatoria is not null or v_supervision_dirigida is not null) then 
                    v_proxtarea='supe';
                 else 
                    v_proxtarea='finc';
            end case;
        elsif v_tarea_actual='supe' then
            v_proxtarea='finc';
        end if;
        update tem 
          set tarea_proxima = v_proxtarea
          where operativo = new.operativo and enc = new.enc;
        update tareas_tem
          set ts_entrada = current_timestamp
          where operativo = new.operativo and enc = new.enc and tarea = v_proxtarea;
    elsif new.verificado is null then   --podria llegar a haber otros valores de verificado 
        update tem 
            set tarea_proxima = null 
            where operativo = new.operativo and enc = new.enc;
    else 
        raise exception 'Falta considerar en la encuesta % un caso más de verificado para próxima tarea % ', new.enc, new.verificado;    
    end if;
    return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS determinar_tarea_proxima_trg ON tareas_tem;
CREATE TRIGGER determinar_tarea_proxima_trg
   AFTER UPDATE OF verificado
   ON tareas_tem
   FOR EACH ROW
   EXECUTE PROCEDURE determinar_tarea_proxima_trg();   
