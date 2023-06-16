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
begin
     select rea, norea, tarea_actual, grupo0, supervision_aleatoria 
        into v_rea, v_norea, v_tarea_actual, v_grupo0, v_supervision_aleatoria 
        from tem t
        left join no_rea nr  on nr.no_rea= norea::text 
        where operativo = new.operativo and enc = new.enc;    
    if new.verificado='1' then
        if v_tarea_actual='encu' then
            case when  v_grupo0 in ('ausentes', 'rechazos') then
                    v_proxtarea='recu';
                 when  v_grupo0 in ('no encuestable') then 
                    v_proxtarea='supe';
                 when  v_rea=1 and (v_supervision_aleatoria is not null or new.supervision_dirigida is not null) then 
                    v_proxtarea='supe';
                 else 
                    v_proxtarea=null;
            end case;
      --analizar condiciones de  supervision para encu  por ahora ponemos algo provisiorio, falta cuando la encuesta es rea considerar si la mandan a supervision            
          update tem 
            set tarea_proxima = v_proxtarea
            where operativo = new.operativo and enc = new.enc;
        end if;        
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
