set search_path = base;

create table "tareas_proximas" (
  "operativo" text, 
  "tarea" text, 
  "estado" text, 
  "tarea_destino" text, 
  "estado_destino" text, 
  "orden" integer, 
  "condicion" text, 
  "desasigna_en_tarea_destino" boolean, 
  "nombre_procedure" text
, primary key ("operativo", "tarea", "estado", "tarea_destino")
);
grant select, insert, update, delete on "tareas_proximas" to eah_admin;
grant all on "tareas_proximas" to eah_owner;

alter table "tareas_proximas" add constraint "operativo<>''" check ("operativo"<>'');
alter table "tareas_proximas" alter column "operativo" set not null;
alter table "tareas_proximas" add constraint "tarea<>''" check ("tarea"<>'');
alter table "tareas_proximas" alter column "tarea" set not null;
alter table "tareas_proximas" add constraint "estado<>''" check ("estado"<>'');
alter table "tareas_proximas" alter column "estado" set not null;
alter table "tareas_proximas" add constraint "tarea_destino<>''" check ("tarea_destino"<>'');
alter table "tareas_proximas" alter column "tarea_destino" set not null;
alter table "tareas_proximas" add constraint "estado_destino<>''" check ("estado_destino"<>'');
alter table "tareas_proximas" alter column "estado_destino" set not null;
alter table "tareas_proximas" alter column "orden" set not null;
alter table "tareas_proximas" add constraint "condicion<>''" check ("condicion"<>'');
alter table "tareas_proximas" alter column "condicion" set not null;
alter table "tareas_proximas" add constraint "nombre_procedure<>''" check ("nombre_procedure"<>'');

alter table "tareas_proximas" add constraint "tareas_proximas tareas REL" foreign key ("operativo", "tarea") references "tareas" ("operativo", "tarea")  on update cascade;
alter table "tareas_proximas" add constraint "tareas_proximas estados REL" foreign key ("operativo", "estado") references "estados" ("operativo", "estado")  on update cascade;
alter table "tareas_proximas" add constraint "tareas_proximas tarea_dest REL" foreign key ("operativo", "tarea_destino") references "tareas" ("operativo", "tarea")  on update cascade;
alter table "tareas_proximas" add constraint "tareas_proximas estado_dest REL" foreign key ("operativo", "estado_destino") references "estados" ("operativo", "estado")  on update cascade;

create index "operativo,tarea 4 tareas_proximas IDX" ON "tareas_proximas" ("operativo", "tarea");
create index "operativo,estado 4 tareas_proximas IDX" ON "tareas_proximas" ("operativo", "estado");
create index "operativo,tarea_destino 4 tareas_proximas IDX" ON "tareas_proximas" ("operativo", "tarea_destino");
create index "operativo,estado_destino 4 tareas_proximas IDX" ON "tareas_proximas" ("operativo", "estado_destino");

CREATE OR REPLACE FUNCTION tarea_cumple_condicion(p_operativo text, p_tarea text, p_estado text, p_enc text, p_condicion text)
RETURNS boolean AS
$BODY$
DECLARE
    v_sent text; 
    v_cond text;
    v_salida integer;
BEGIN
 v_cond=p_condicion;
 v_sent=' select 1 
    from base.tareas_tem t
    inner join base.tareas_proximas tp using (operativo, tarea, estado)
    inner join tem te using (operativo,enc)
    left join tokens tok on t.cargado_dm=tok.token
	 left join viviendas v on (te.operativo =  v.operativo and te.enc = v.vivienda)
    left join no_rea nr on (te.norea::text = nr.no_rea)
    where t.operativo='||quote_literal(p_operativo)||
    ' and t.tarea='||quote_literal(p_tarea)||
    ' and t.estado='||quote_literal(p_estado)||
    ' and t.enc='||quote_literal(p_enc)||
    ' and '||v_cond||';';
 --raise notice 'esto %',vsent;
 execute v_sent into v_salida;
 IF v_salida=1 THEN
    return true;
 ELSE
    return false;
 END IF;

END;
$BODY$
 LANGUAGE plpgsql VOLATILE;

 --set role dmencu_owner;
--set search_path=base;
DROP FUNCTION if exists desverificar_tarea_trg();
CREATE OR REPLACE FUNCTION desverificar_tarea_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
begin
    if new.verificado is null then
        update tem 
            set tarea_proxima = null 
            where operativo = new.operativo and enc = new.enc;
    end if;
    return new;
end;
$BODY$;

DROP TRIGGER IF EXISTS desverificar_tarea_trg ON tareas_tem;
CREATE TRIGGER desverificar_tarea_trg
   AFTER UPDATE OF verificado
   ON tareas_tem
   FOR EACH ROW
   EXECUTE PROCEDURE desverificar_tarea_trg();   

DROP TRIGGER IF EXISTS determinar_tarea_proxima_trg ON tareas_tem;
DROP FUNCTION if exists determinar_tarea_proxima_trg();

create table "historial_tem" (
  "operativo" text, 
  "enc" text, 
  "orden" integer, 
  "ts_salida" timestamp, 
  "tarea" text, 
  "recepcionista" text, 
  "asignado" text, 
  "json_encuesta" jsonb, 
  "resumen_estado" text, 
  "resumen_estado_sup" text, 
  "rea" integer, 
  "norea" integer, 
  "rea_sup" integer, 
  "norea_sup" integer
, primary key ("operativo", "enc", "orden")
);
grant select, insert, update on "historial_tem" to eah_admin;
grant all on "historial_tem" to eah_owner;

alter table "historial_tem" add constraint "operativo<>''" check ("operativo"<>'');
alter table "historial_tem" add constraint "enc<>''" check ("enc"<>'');
alter table "historial_tem" add constraint "tarea<>''" check ("tarea"<>'');
alter table "historial_tem" add constraint "recepcionista<>''" check ("recepcionista"<>'');
alter table "historial_tem" add constraint "asignado<>''" check ("asignado"<>'');
alter table "historial_tem" add constraint "resumen_estado<>''" check ("resumen_estado"<>'');
alter table "historial_tem" add constraint "resumen_estado_sup<>''" check ("resumen_estado_sup"<>'');

alter table "historial_tem" add constraint "historial_tem tem REL" foreign key ("operativo", "enc") references "tem" ("operativo", "enc")  on update cascade;
alter table "historial_tem" add constraint "historial_tem tareas REL" foreign key ("operativo", "tarea") references "tareas" ("operativo", "tarea")  on update cascade;
alter table "historial_tem" add constraint "historial_tem asignado REL" foreign key ("asignado") references "usuarios" ("idper")  on update cascade;
alter table "historial_tem" add constraint "historial_tem recepcionista REL" foreign key ("recepcionista") references "usuarios" ("idper")  on update cascade;

create index "operativo,enc 4 historial_tem IDX" ON "historial_tem" ("operativo", "enc");
create index "operativo,tarea 4 historial_tem IDX" ON "historial_tem" ("operativo", "tarea");
create index "asignado 4 historial_tem IDX" ON "historial_tem" ("asignado");
create index "recepcionista 4 historial_tem IDX" ON "historial_tem" ("recepcionista");

CREATE OR REPLACE FUNCTION agregar_historial_tem_trg()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
    declare
        v_proximo_orden integer;
        v_recepcionista text;
        v_asignado text;
        v_json_encuesta jsonb;
        v_resumen_estado text;
        v_resumen_estado_sup text;
        v_rea integer;
        v_norea integer;
        v_rea_sup integer;
        v_norea_sup integer;
begin
    if old.tarea_actual is distinct from new.tarea_actual and old.tarea_actual is not null then
        select coalesce(max(orden),0)+1 into v_proximo_orden
            from historial_tem 
            where operativo = old.operativo and enc = old.enc;
        
        select recepcionista, asignado, resumen_estado, resumen_estado_sup, rea, norea, rea_sup, norea_sup  into
            v_recepcionista, v_asignado, v_resumen_estado, v_resumen_estado_sup, v_rea, v_norea, v_rea_sup, v_norea_sup 
            from tareas_tem 
            where operativo = old.operativo and enc = old.enc and tarea = old.tarea_actual;
        
        select json_encuesta  into
            v_json_encuesta
            from tem 
            where operativo = old.operativo and enc = old.enc;

        insert into historial_tem (operativo, enc, orden, tarea, ts_salida, recepcionista, asignado, json_encuesta, resumen_estado, resumen_estado_sup, rea, norea, rea_sup, norea_sup) values 
            (old.operativo, old.enc, v_proximo_orden, old.tarea_actual, current_timestamp, v_recepcionista, v_asignado, v_json_encuesta, v_resumen_estado, v_resumen_estado_sup, v_rea, v_norea, v_rea_sup, v_norea_sup);
    end if;
    return new;
end;
$BODY$;
