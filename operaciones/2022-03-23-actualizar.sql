--set role dmencu_owner; --o discon_owner dependiendo de la base.
set role to discon_owner;

set search_path = base;

alter table tareas add column if not exists operativo text;
update tareas set operativo = 'PREJU_2022';
alter table "tareas" add constraint "operativo<>''" check ("operativo"<>'');
alter table tareas_areas add column if not exists operativo text;
alter table "tareas_areas" add constraint "operativo<>''" check ("operativo"<>'');
update tareas_areas set operativo = 'PREJU_2022';
alter table tareas_areas drop constraint tareas_areas_pkey;
alter table tareas_areas add CONSTRAINT tareas_areas_pkey PRIMARY KEY (operativo, tarea, area);
alter table areas add column if not exists operativo text;
alter table "areas" add constraint "operativo<>''" check ("operativo"<>'');
update areas set operativo = 'PREJU_2022';
alter table tareas_areas drop constraint "tareas_areas areas REL";
alter table tem drop constraint "tem areas REL";
alter table areas drop constraint areas_pkey;
alter table areas add CONSTRAINT areas_pkey PRIMARY KEY (operativo, area);
alter table tareas_tem drop constraint "tareas_tem tareas REL";
alter table tareas_areas drop constraint "tareas_areas tareas REL";
alter table tareas drop constraint tareas_pkey;
alter table tareas add CONSTRAINT tareas_pkey PRIMARY KEY (operativo, tarea);
insert into tareas (operativo, tarea, nombre, rol_asignante, main_form, registra_estado_en_tem)
select o.operativo, tarea, t.nombre, rol_asignante, main_form, registra_estado_en_tem
	FROM base.tareas t, operativos o
	WHERE o.operativo<>'PREJU_2022';
alter table "tareas_areas" add constraint "tareas_areas areas REL" foreign key ("operativo", "area") references "areas" ("operativo","area")  on update cascade;
insert into areas (operativo, area) (select operativo, area from tem where operativo <> 'PREJU_2022' and area is not null group by 1,2);
alter table "tem" add constraint "tem areas REL" foreign key ("operativo","area") references "areas" ("operativo","area")  on update cascade;
alter table "tareas_tem" add constraint "tareas_tem tareas REL" foreign key ("operativo","tarea") references "tareas" ("operativo","tarea")  on update cascade;
alter table "tareas_areas" add constraint "tareas_areas tareas REL" foreign key ("operativo","tarea") references "tareas" ("operativo","tarea")  on update cascade;

alter table "areas" alter column "operativo" set not null;
alter table "areas" add constraint "areas operativos REL" foreign key ("operativo") references "operativos" ("operativo")  on update cascade;
alter table "tareas" add constraint "tareas operativos REL" foreign key ("operativo") references "operativos" ("operativo")  on update cascade;
create index "operativo 4 areas IDX" ON "areas" ("operativo");
create index "operativo 4 tareas IDX" ON "tareas" ("operativo");
create index "operativo,tarea 4 tareas_areas IDX" ON "tareas_areas" ("operativo", "tarea");
create index "operativo,area 4 tareas_areas IDX" ON "tareas_areas" ("operativo", "area");

do $SQL_ENANCE$
begin
PERFORM enance_table('areas','operativo,area');
PERFORM enance_table('tareas','operativo,tarea');
PERFORM enance_table('tareas_areas','operativo,tarea,area');
end
$SQL_ENANCE$;
