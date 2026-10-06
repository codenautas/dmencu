set search_path = base;

alter table no_rea add column if not exists "orden" integer default 0;
update no_rea set orden = 0 where orden is null;
alter table no_rea alter column "orden" set not null;

alter table no_rea_sup add column if not exists "operativo" text;
update no_rea_sup set orden = 0 where orden is null;
alter table no_rea_sup add column if not exists "orden" integer default 0;

alter table no_rea_sup alter column "orden" set not null;

--cambiar por operativo correspondiente
--update no_rea_sup set operativo = 'etoi274' where operativo is null;
alter table no_rea_sup alter column "operativo" set not null;

ALTER TABLE no_rea_sup DROP CONSTRAINT no_rea_sup_pkey;
ALTER TABLE no_rea_sup ADD PRIMARY KEY (operativo, no_rea_sup);

alter table "no_rea_sup" add constraint "operativo<>''" check ("operativo"<>'');

alter table "no_rea_sup" add constraint "no_rea_sup operativos REL" foreign key ("operativo") references "operativos" ("operativo")  on update cascade;


alter table "no_rea_sup" drop constraint "no_rea_sup<>''";
alter table "no_rea" drop constraint "no_rea<>''";
alter table "rea_sup" drop constraint "rea_sup<>''";
alter table "rea" drop constraint "rea<>''";

ALTER TABLE "no_rea" ALTER COLUMN "no_rea" TYPE integer USING NULLIF(no_rea, '')::integer;
ALTER TABLE "no_rea_sup" ALTER COLUMN "no_rea_sup" TYPE integer USING NULLIF(no_rea_sup, '')::integer;

ALTER TABLE "rea" ALTER COLUMN "rea" TYPE integer USING NULLIF(rea, '')::integer;
ALTER TABLE "rea_sup" ALTER COLUMN "rea_sup" TYPE integer USING NULLIF(rea_sup, '')::integer;

ALTER TABLE "rea" ADD COLUMN tarea text;
ALTER TABLE "rea_sup" ADD COLUMN tarea text;
ALTER TABLE "rea" ADD COLUMN es_positiva boolean;
ALTER TABLE "rea_sup" ADD COLUMN es_positiva boolean;


ALTER TABLE "rea" ALTER COLUMN "es_positiva" SET DEFAULT true;
ALTER TABLE "rea" ALTER COLUMN "es_positiva" SET NOT NULL;

ALTER TABLE "rea_sup" ALTER COLUMN "es_positiva" SET DEFAULT true;
ALTER TABLE "rea_sup" ALTER COLUMN "es_positiva" SET NOT NULL;


alter table "rea" add constraint "rea tareas REL" foreign key ("operativo", "tarea") references "tareas" ("operativo", "tarea")  on update cascade;
alter table "rea_sup" add constraint "rea_sup tareas REL" foreign key ("operativo", "tarea") references "tareas" ("operativo", "tarea")  on update cascade;

create index "operativo,tarea 4 rea IDX" ON "rea" ("operativo", "tarea");
create index "operativo,tarea 4 rea_sup IDX" ON "rea_sup" ("operativo", "tarea");

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
    --left join tokens tok on t.cargado_dm=tok.token
    left join no_rea nr on (te.norea = nr.no_rea)
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


CREATE OR REPLACE FUNCTION regenerar_accion_cumple_condicion_trg()
  RETURNS trigger 
  LANGUAGE plpgsql
  SECURITY DEFINER AS
$CREATOR$
DECLARE
  xcase_condiciones TEXT;
  v_sql text := $SQL_CON_TAG$

CREATE OR REPLACE FUNCTION accion_cumple_condicion(
    p_operativo text,
    p_estado text,
    p_enc text,
    p_eaccion text,
    p_condicion text)
    RETURNS boolean
    LANGUAGE SQL
    STABLE
AS $SQL$    
    -- ¡ATENCIÓN! NO MODIFICAR MANUALMENTE ESTA FUNCIÓN FUE GENERADA CON EL SCRIPT generador_accion_cumple_condicion.sql
  select true
    from base.tareas_tem t
    inner join base.estados_acciones ea using (operativo, estado)
    inner join tem te using (operativo,enc)
    left join no_rea nr on (te.norea = nr.no_rea)
    left join tareas_tem tta on (te.operativo = tta.operativo and te.enc = tta.enc and te.tarea_actual = tta.tarea)
    where t.operativo = p_operativo
    and t.estado = p_estado
    and t.enc = p_enc
    and ea.eaccion = p_eaccion
    and te.habilitada
    and
    -- COMIENZA LA PARTE GENERADA DINÁMICAMENTE:
      /**xcase_condiciones**/
    -- FIN DE LA GENERADA DINÁMICAMENTE:
    ;
    $SQL$;

$SQL_CON_TAG$;
BEGIN

 SELECT 'CASE p_condicion' || 
    string_agg(distinct chr(10) || lpad(' ',8)|| 'WHEN ' || quote_literal(condicion) || ' THEN ' || condicion, '') 
    ||chr(10) ||lpad(' ',6)|| 'END'
  INTO xcase_condiciones 
  FROM base.estados_acciones;
  
  execute replace(v_sql,'/**xcase_condiciones**/',xcase_condiciones);
  RETURN new;
END;
$CREATOR$;

CREATE OR REPLACE TRIGGER update_accion_cumple_condicion_trg
    AFTER UPDATE of condicion
    ON base.estados_acciones
    FOR EACH ROW
    EXECUTE FUNCTION base.regenerar_accion_cumple_condicion_trg();

--regenerar la primera vez (ya que se cargan antes en el dump los estados_acciones)
with aux as (select * from estados_acciones limit 1)
update estados_acciones ea
  set condicion=aux.condicion
  from aux 
  where ea.operativo= aux.operativo and
    ea.estado=aux.estado and 
    ea.eaccion=aux.eaccion and
    ea.estado_destino=aux.estado_destino;

 