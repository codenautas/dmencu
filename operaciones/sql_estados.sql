--setear los roles y operativo de acuerdo a donde lo vayamos a probar.
set role ggs2022_owner;
set search_path=base;
create table "estados" (
  "operativo" text, 
  "estado" text, 
  "desc_estado" text, 
  "orden_estado" text
, primary key ("operativo", "estado")
);
grant select, insert, update, delete on "estados" to ggs2022_admin;
grant all on "estados" to ggs2022_owner;


create table "acciones" (
  "operativo" text, 
  "eaccion" text, 
  "abr_eaccion" text, 
  "desc_eaccion" text
, primary key ("operativo", "eaccion")
);
grant select, insert, update, delete on "acciones" to ggs2022_admin;
grant all on "acciones" to ggs2022_owner;



create table "estados_acciones" (
  "operativo" text, 
  "tarea" text, 
  "estado" text, 
  "eaccion" text, 
  "condicion" text, 
  "estado_destino" text, 
  "eaccion_direccion" text
, primary key ("operativo", "tarea", "estado", "eaccion")
);
grant select, insert, update, delete on "estados_acciones" to ggs2022_admin;
grant all on "estados_acciones" to ggs2022_owner;

alter table "estados" add constraint "operativo<>''" check ("operativo"<>'');
alter table "estados" alter column "operativo" set not null;
alter table "estados" add constraint "estado<>''" check ("estado"<>'');
alter table "estados" alter column "estado" set not null;
alter table "estados" add constraint "desc_estado<>''" check ("desc_estado"<>'');
alter table "estados" add constraint "orden_estado<>''" check ("orden_estado"<>'');
alter table "acciones" add constraint "operativo<>''" check ("operativo"<>'');
alter table "acciones" alter column "operativo" set not null;
alter table "acciones" add constraint "eaccion<>''" check ("eaccion"<>'');
alter table "acciones" alter column "eaccion" set not null;
alter table "acciones" add constraint "abr_eaccion<>''" check ("abr_eaccion"<>'');
alter table "acciones" add constraint "desc_eaccion<>''" check ("desc_eaccion"<>'');
alter table "estados_acciones" add constraint "operativo<>''" check ("operativo"<>'');
alter table "estados_acciones" alter column "operativo" set not null;
alter table "estados_acciones" add constraint "tarea<>''" check ("tarea"<>'');
alter table "estados_acciones" alter column "tarea" set not null;
alter table "estados_acciones" add constraint "estado<>''" check ("estado"<>'');
alter table "estados_acciones" alter column "estado" set not null;
alter table "estados_acciones" add constraint "eaccion<>''" check ("eaccion"<>'');
alter table "estados_acciones" alter column "eaccion" set not null;
alter table "estados_acciones" add constraint "condicion<>''" check ("condicion"<>'');
alter table "estados_acciones" add constraint "estado_destino<>''" check ("estado_destino"<>'');
alter table "estados_acciones" add constraint "eaccion_direccion<>''" check ("eaccion_direccion"<>'');
alter table "estados" add constraint "estados operativos REL" foreign key ("operativo") references "operativos" ("operativo")  on update cascade;
alter table "acciones" add constraint "acciones operativos REL" foreign key ("operativo") references "operativos" ("operativo")  on update cascade;
alter table "estados_acciones" add constraint "estados_acciones tareas REL" foreign key ("operativo", "tarea") references "tareas" ("operativo", "tarea")  on update cascade;
alter table "estados_acciones" add constraint "estados_acciones estados REL" foreign key ("operativo", "estado") references "estados" ("operativo", "estado")  on update cascade;
alter table "estados_acciones" add constraint "estados_acciones dest REL" foreign key ("operativo", "estado_destino") references "estados" ("operativo", "estado")  on update cascade;
alter table "estados_acciones" add constraint "estados_acciones acciones REL" foreign key ("operativo", "eaccion") references "acciones" ("operativo", "eaccion")  on update cascade;

create index "operativo 4 estados IDX" ON "estados" ("operativo");
create index "operativo 4 acciones IDX" ON "acciones" ("operativo");
create index "operativo,tarea 4 estados_acciones IDX" ON "estados_acciones" ("operativo", "tarea");
create index "operativo,estado 4 estados_acciones IDX" ON "estados_acciones" ("operativo", "estado");
create index "operativo,eaccion 4 estados_acciones IDX" ON "estados_acciones" ("operativo", "eaccion");

do $SQL_ENANCE$
begin
  PERFORM enance_table('estados','operativo,estado');
  PERFORM enance_table('acciones','operativo,eaccion');
  PERFORM enance_table('estados_acciones','operativo,tarea,estado,eaccion');
end
$SQL_ENANCE$;

alter table "tareas_tem" add column "estado" text not null default '0D';

alter table "tareas_tem" add constraint "estado<>''" check ("estado"<>'');
alter table "tareas_tem" alter column "estado" set not null;
alter table "tareas_tem" add constraint "tareas_tem estados REL" foreign key ("operativo", "estado") references "estados" ("operativo", "estado")  on update cascade;
create index "operativo,estado 4 tareas_tem IDX" ON "tareas_tem" ("operativo", "estado");

update tareas_tem set estado = 'A' where enc = '10002' and operativo = 'GGS_2022';
update tareas_tem set estado = 'AC' where enc = '10003' and operativo = 'GGS_2022';
update tareas_tem set estado = 'C' where enc = '10004' and operativo = 'GGS_2022';
update tareas_tem set estado = 'CD' where enc = '10005' and operativo = 'GGS_2022';
update tareas_tem set estado = 'D' where enc = '10006' and operativo = 'GGS_2022';
update tareas_tem set estado = 'P' where enc = '10007' and operativo = 'GGS_2022';
update tareas_tem set estado = 'V' where enc = '10008' and operativo = 'GGS_2022';

alter table "estados_acciones" add column "path_icono_svg" text;
alter table "estados_acciones" add constraint "path_icono_svg<>''" check ("path_icono_svg"<>'');
alter table "estados_acciones" add column "nombre_procedure" text;
alter table "estados_acciones" add constraint "nombre_procedure<>''" check ("nombre_procedure"<>'');

update estados_acciones set condicion='verificado=''1''' where operativo = 'GGS_2022' and tarea='encu' and estado='P' and eaccion='verificar';
update estados_acciones set condicion='asignado is not null' where operativo = 'GGS_2022' and tarea='encu' and estado='0D' and eaccion='asignar';
update estados_acciones set condicion='cargado_dm is not null and cuando is not null' where operativo = 'GGS_2022' and tarea='encu' and estado='AC' and eaccion='sincronizar';
update estados_acciones set condicion='cargado_dm is not null and operacion is not null and cuando is not null and asignado is not null' where operativo = 'GGS_2022' and tarea='encu' and estado='AC' and eaccion='disponibilizar';

update estados_acciones set condicion='cargado_dm is not null and cuando is not null' where operativo = 'GGS_2022' and tarea='encu' and estado='CD' and eaccion='sincronizar';
update estados_acciones set condicion='consistido is not null'  where operativo = 'GGS_2022' and tarea='encu' and estado='D' and eaccion='analizar';

update estados_acciones set condicion='operacion=''cargar'' and asignado is not null'  where operativo = 'GGS_2022' and tarea='encu' and estado='D' and eaccion='cargar';
update estados_acciones set condicion='verificado_encu is not null and operacion=''cargar'' and asignado is not null'  where operativo = 'GGS_2022' and tarea='encu' and estado='P' and eaccion='cargar';
INSERT INTO base.estados_acciones(
    operativo, tarea, estado, eaccion, condicion, estado_destino, eaccion_direccion)
    VALUES ('GGS_2022','encu', 'CD' , 'no_descargar', 'cargado_dm is not null and cuando is null', 'C', 'retroceso');