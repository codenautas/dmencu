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

alter table "estados_acciones" drop column if exists "path_icono_svg";

alter table "acciones" add column "path_icono_svg" text;
alter table "acciones" add constraint "path_icono_svg<>''" check ("path_icono_svg"<>'');

update acciones 
  set path_icono_svg = 'M31.2 41.16l9.34 -0.01c0.23,-1.65 -0.71,-2.54 -1.83,-2.97 -1.12,-0.43 -2.38,-0.61 -3.06,-1.31 -0.03,-0.25 -0.06,-0.54 -0.08,-0.87 0.71,0.1 0.84,0.24 1.28,0.46 0.58,-2.07 0.76,-6.5 -0.66,-8.01 -1.36,-1.46 -4.2,-1.82 -5.47,-0.05 -1.09,1.54 -1.43,5.87 -0.76,7.97l1.66 -0.22c-0.01,0.16 -0.02,0.31 -0.03,0.45 -1.2,1.63 -5.83,1.14 -5.07,4.56l4.68 0zm-14.32 -2.07c-1.39,-2.56 -2.81,-4.52 -4.4,-5.55 0.79,-0.24 1.53,-0.44 2.31,-0.68 0.97,0.4 1.59,0.92 2.09,1.49 1.31,-2.22 3.1,-4.23 5.47,-5.98 0.83,0 1.65,0 2.47,-0.01 -3.14,3.36 -5.85,6.91 -7.94,10.73zm-4.12 2.07l7 0c1.91,0 3.48,-1.56 3.48,-3.48l0 -4.65c-0.51,0.62 -1,1.26 -1.48,1.91l0 2.74c0,1.11 -0.9,2.01 -2,2.01l-7 0c-1.1,0 -2,-0.9 -2,-2.01l0 -7c0,-1.1 0.9,-1.99 2,-1.99l6.3 0c0.5,-0.48 1.03,-0.94 1.58,-1.37 -0.28,-0.07 -0.57,-0.11 -0.88,-0.11l-7 0c-1.91,0 -3.48,1.56 -3.48,3.47l0 7c0,1.92 1.57,3.48 3.48,3.48zm18.4 -18.37l9.52 -0.02c0.24,-1.67 -0.72,-2.58 -1.86,-3.02 -1.38,-0.53 -2.96,-0.68 -3.46,-1.85 -0.02,-0.84 2.52,-2.46 1.73,-3.79 -0.23,-0.39 -0.26,-0.28 -0.24,-1.02 0.02,-0.97 -0.16,-1.51 -0.17,-2.12 -0.03,-0.02 -0.07,-0.1 -0.08,-0.07 0,0 -1.87,-2.18 -3.95,-2.06 -0.27,0.49 -0.15,0.59 -0.69,0.9 -1.64,0.94 -1.67,1.24 -1.69,3.49 -0.01,1.41 -1.16,0.8 0.04,2.57 0.41,0.6 1.15,1.52 1.39,2.1 -0.94,1.96 -6.13,1.25 -5.32,4.89l4.78 0zm-21.88 -10.48l0 7.01c0,1.91 1.57,3.47 3.48,3.47l7 0c1.91,0 3.48,-1.56 3.48,-3.47l0 -7.01c0,-1.91 -1.57,-3.47 -3.48,-3.47l-7 0c-1.91,0 -3.48,1.56 -3.48,3.47zm1.48 0l0 7.01c0,1.1 0.9,1.99 2,1.99l7 0c1.1,0 2,-0.89 2,-1.99l0 -7.01c0,-1.1 -0.9,-2 -2,-2l-7 0c-1.1,0 -2,0.9 -2,2z' 
  where operativo = 'GGS_2022' and eaccion = 'asignar';
update acciones 
  set path_icono_svg = 'M42.81 30.59l-12.22 12.22c-0.81,0.81 -2.15,0.81 -2.97,0l-6.86 -6.87 1.48 -1.48 3.8 3.8c0.15,0.14 0.38,0.14 0.52,0l11.7 -11.7c0.14,-0.14 0.14,-0.37 0,-0.52l-15.96 -15.96c-0.14,-0.14 -0.38,-0.14 -0.52,0l-11.7 11.7c-0.14,0.14 -0.14,0.38 0,0.52l5.28 5.28 -1.48 1.48 -6.69 -6.68c-0.81,-0.82 -0.81,-2.16 0,-2.97l12.22 -12.22c0.81,-0.81 2.15,-0.81 2.97,0l20.43 20.43c0.81,0.82 0.81,2.16 0,2.97zm-27.31 9l6.74 -6.74 2.21 2.21c0.73,0.74 1.59,0.08 1.69,-0.93l1.07 -10.23c0.11,-0.78 -0.51,-1.4 -1.29,-1.3l-10.24 1.07c-1,0.11 -1.66,0.96 -0.92,1.7l2.21 2.21 -6.74 6.74c-0.44,0.44 -0.44,1.16 0,1.6 1.22,1.23 2.44,2.45 3.67,3.67 0.44,0.44 1.16,0.44 1.6,0zm18.06 -6.03c0.58,-0.58 1.52,-0.58 2.1,0 0.58,0.58 0.58,1.52 0,2.1 -0.58,0.58 -1.52,0.58 -2.1,0 -0.58,-0.58 -0.58,-1.52 0,-2.1z' 
  where operativo = 'GGS_2022' and eaccion = 'cargar';
update acciones 
  set path_icono_svg = 'M9.28 30.68l0 7.01c0,1.91 1.57,3.47 3.48,3.47l7 0c1.91,0 3.48,-1.56 3.48,-3.47l0 -7.01c0,-1.91 -1.57,-3.47 -3.48,-3.47l-7 0c-1.91,0 -3.48,1.56 -3.48,3.47zm21.92 10.48l9.34 -0.02c0.23,-1.64 -0.71,-2.53 -1.83,-2.96 -1.12,-0.43 -2.38,-0.61 -3.06,-1.31 -0.03,-0.25 -0.06,-0.54 -0.08,-0.87 0.71,0.1 0.84,0.24 1.28,0.46 0.58,-2.07 0.76,-6.5 -0.66,-8.01 -1.36,-1.46 -4.2,-1.82 -5.47,-0.05 -1.09,1.54 -1.43,5.87 -0.76,7.97l1.66 -0.22c-0.01,0.16 -0.02,0.31 -0.03,0.45 -1.2,1.63 -5.83,1.14 -5.07,4.56l4.68 0zm-0.04 -18.37l9.52 -0.01c0.24,-1.68 -0.72,-2.59 -1.86,-3.03 -1.38,-0.53 -2.96,-0.68 -3.47,-1.85 -0.01,-0.83 2.53,-2.46 1.74,-3.79 -0.23,-0.39 -0.26,-0.28 -0.24,-1.02 0.02,-0.97 -0.16,-1.51 -0.17,-2.12 -0.03,-0.02 -0.07,-0.1 -0.08,-0.07 0,0 -1.87,-2.18 -3.95,-2.06 -0.27,0.49 -0.15,0.59 -0.69,0.9 -1.64,0.94 -1.67,1.24 -1.69,3.49 -0.01,1.41 -1.16,0.8 0.04,2.57 0.41,0.6 1.15,1.52 1.39,2.1 -0.94,1.96 -6.13,1.25 -5.32,4.89l4.78 0zm-21.88 -10.48l0 7.01c0,1.91 1.57,3.47 3.48,3.47l7 0c1.91,0 3.48,-1.56 3.48,-3.47l0 -7.01c0,-1.91 -1.57,-3.47 -3.48,-3.47l-7 0c-1.91,0 -3.48,1.56 -3.48,3.47zm1.48 0l0 7.01c0,1.09 0.9,1.99 2,1.99l7 0c1.1,0 2,-0.9 2,-1.99l0 -7.01c0,-1.1 -0.9,-1.99 -2,-1.99l-7 0c-1.1,0 -2,0.89 -2,1.99zm0 18.37l0 7.01c0,1.1 0.9,2 2,2l7 0c1.1,0 2,-0.9 2,-2l0 -7.01c0,-1.09 -0.9,-2 -2,-2l-7 0c-1.1,0 -2,0.91 -2,2z' 
  where operativo = 'GGS_2022' and eaccion = 'disponibilizar';
update acciones 
  set path_icono_svg = 'M38.51 20.4l-21.04 0 0 2.03c0,0.68 -0.7,0.77 -1.21,0.36l-5.21 -4.23c-0.4,-0.31 -0.4,-0.87 0,-1.19l5.21 -4.22c0.51,-0.42 1.21,-0.33 1.21,0.36l0 2.03 21.04 0c0.41,0 0.74,0.33 0.74,0.74 0,1.12 0,2.25 0,3.38 0,0.4 -0.33,0.74 -0.74,0.74zm-27.02 9.2l21.04 0 0 -2.03c0,-0.68 0.7,-0.77 1.21,-0.36l5.2 4.23c0.41,0.31 0.41,0.87 0,1.19l-5.2 4.22c-0.51,0.41 -1.21,0.33 -1.21,-0.36l0 -2.03 -21.04 0c-0.41,0 -0.74,-0.33 -0.74,-0.74 0,-1.12 0,-2.25 0,-3.38 0,-0.4 0.33,-0.74 0.74,-0.74z' 
  where operativo = 'GGS_2022' and eaccion = 'sincronizar' ;
update acciones 
  set path_icono_svg = 'M19.41 42.81l-12.22 -12.22c-0.81,-0.81 -0.81,-2.15 0,-2.97l20.43 -20.43c0.82,-0.81 2.16,-0.81 2.97,0l12.22 12.22c0.81,0.81 0.81,2.15 0,2.97l-4.99 4.99c-0.04,0.03 -0.07,0.06 -0.1,0.09l-1.4 1.4 -1.48 -1.48 5.08 -5.08c0.15,-0.14 0.15,-0.38 0,-0.52l-11.7 -11.7c-0.14,-0.14 -0.37,-0.14 -0.52,0l-15.96 15.96c-0.14,0.15 -0.14,0.38 0,0.52l11.7 11.7c0.14,0.14 0.38,0.14 0.52,0l4 -4 1.48 1.48 -0.78 0.79 -6.28 6.28c-0.82,0.81 -2.15,0.81 -2.97,0zm4.9 -13.81l6.74 6.74 -2.21 2.21c-0.74,0.74 -0.08,1.59 0.92,1.7l10.24 1.07c0.78,0.1 1.4,-0.51 1.3,-1.3l-1.07 -10.23c-0.11,-1.01 -0.96,-1.67 -1.7,-0.93l-2.21 2.21 -0.8 -0.8 -1.48 -1.49 -4.46 -4.45c-0.44,-0.44 -1.16,-0.44 -1.6,0 -1.22,1.22 -2.45,2.45 -3.67,3.67 -0.44,0.44 -0.44,1.16 0,1.6zm-7.86 4.56c0.58,0.58 0.58,1.52 0,2.1 -0.59,0.58 -1.53,0.58 -2.11,0 -0.58,-0.58 -0.58,-1.52 0,-2.1 0.58,-0.58 1.52,-0.58 2.11,0z' 
  where operativo = 'GGS_2022' and eaccion = 'descargar';
update acciones 
  set path_icono_svg = 'M19.41 42.81l-12.21 -12.21c-0.82,-0.82 -0.82,-2.15 0,-2.97l20.43 -20.43c0.81,-0.82 2.15,-0.82 2.97,0l12.21 12.21c0.82,0.82 0.82,2.16 0,2.97l-4.99 4.99c-0.03,0.03 -0.06,0.06 -0.09,0.09l-1.4 1.41 -1.49 -1.48 5.08 -5.09c0.15,-0.14 0.15,-0.37 0,-0.52l-11.69 -11.7c-0.15,-0.14 -0.38,-0.14 -0.52,0l-15.97 15.97c-0.14,0.14 -0.14,0.38 0,0.52l11.7 11.7c0.14,0.14 0.38,0.14 0.52,0l4 -4 1.48 1.48 -0.78 0.78 -6.28 6.28c-0.82,0.82 -2.15,0.82 -2.97,0zm-5.76 -33.94c0.3,-0.3 0.79,-0.3 1.09,0 0.3,0.3 0.3,0.79 0,1.09l-2.02 2.01 2.02 2.01c0.3,0.3 0.3,0.79 0,1.09 -0.3,0.3 -0.79,0.3 -1.09,0l-2.01 -2.01 -2.01 2.01c-0.3,0.3 -0.79,0.3 -1.09,0 -0.3,-0.3 -0.3,-0.79 0,-1.09l2.02 -2.01 -2.02 -2.01c-0.3,-0.3 -0.3,-0.79 0,-1.09 0.3,-0.3 0.79,-0.3 1.09,0l2.01 2.02 2.01 -2.02zm-2.01 -2.46c-1.54,0 -2.93,0.62 -3.93,1.63 -1.01,1 -1.63,2.39 -1.63,3.93 0,1.54 0.62,2.93 1.63,3.93 1,1.01 2.39,1.63 3.93,1.63 1.54,0 2.93,-0.62 3.93,-1.63 1.01,-1 1.63,-2.39 1.63,-3.93 0,-1.54 -0.62,-2.93 -1.63,-3.93 -1,-1.01 -2.39,-1.63 -3.93,-1.63zm-5.02 0.54c1.29,-1.28 3.06,-2.07 5.02,-2.07 1.96,0 3.73,0.79 5.02,2.07 1.28,1.29 2.08,3.06 2.08,5.02 0,1.96 -0.8,3.73 -2.08,5.02 -1.29,1.28 -3.06,2.08 -5.02,2.08 -1.96,0 -3.73,-0.8 -5.02,-2.08 -1.28,-1.29 -2.07,-3.06 -2.07,-5.02 0,-1.96 0.79,-3.73 2.07,-5.02zm17.69 22.06l6.74 6.74 -2.21 2.21c-0.73,0.73 -0.08,1.59 0.93,1.69l10.23 1.07c0.79,0.11 1.4,-0.51 1.3,-1.29l-1.07 -10.24c-0.11,-1 -0.96,-1.66 -1.7,-0.92l-2.21 2.21 -0.8 -0.81 -1.48 -1.48 -4.46 -4.46c-0.44,-0.44 -1.16,-0.44 -1.6,0 -1.22,1.23 -2.45,2.45 -3.67,3.68 -0.44,0.44 -0.44,1.16 0,1.6zm-7.86 4.55c0.58,0.58 0.58,1.53 0,2.11 -0.58,0.58 -1.53,0.58 -2.11,0 -0.58,-0.58 -0.58,-1.53 0,-2.11 0.58,-0.58 1.53,-0.58 2.11,0z' 
  where operativo = 'GGS_2022' and eaccion = 'no_descargar';
update acciones 
  set path_icono_svg = 'M38.51 20.4l-21.04 0 0 2.03c0,0.68 -0.7,0.77 -1.21,0.36l-5.21 -4.23c-0.4,-0.31 -0.4,-0.87 0,-1.19l5.21 -4.22c0.51,-0.42 1.21,-0.33 1.21,0.36l0 2.03 21.04 0c0.41,0 0.74,0.33 0.74,0.74 0,1.12 0,2.25 0,3.38 0,0.4 -0.33,0.74 -0.74,0.74zm-27.02 9.2l21.04 0 0 -2.03c0,-0.68 0.7,-0.77 1.21,-0.36l5.2 4.23c0.41,0.31 0.41,0.87 0,1.19l-5.2 4.22c-0.51,0.41 -1.21,0.33 -1.21,-0.36l0 -2.03 -21.04 0c-0.41,0 -0.74,-0.33 -0.74,-0.74 0,-1.12 0,-2.25 0,-3.38 0,-0.4 0.33,-0.74 0.74,-0.74z' 
  where operativo = 'GGS_2022' and eaccion = 'sincronizar';
update acciones 
  set path_icono_svg = 'M35.47 43.89c1.65,0 3.01,-1.35 3.01,-3.01l0 -28.92c0,-1.65 -1.36,-3.01 -3.01,-3.01l-3.27 0c0.05,0.2 0.08,0.4 0.08,0.61l0 1.43 2.74 0c0.7,0 1.28,0.57 1.28,1.27l0 23.3 -6.05 6.3 -12.11 0 -3.16 0c-0.63,0 -1.14,-0.44 -1.25,-1.08l-1.73 1.74c0.52,0.82 1.45,1.37 2.53,1.37l3.68 0 17.26 0zm-15.85 -10.61l-9.5 9.51c-0.46,0.45 -1.19,0.45 -1.65,0 -0.45,-0.46 -0.45,-1.19 0,-1.65l9.51 -9.51c-1.28,-1.65 -1.92,-3.64 -1.92,-5.63 0,-2.35 0.9,-4.7 2.69,-6.5 1.8,-1.8 4.15,-2.69 6.51,-2.69 2.35,0 4.7,0.89 6.5,2.69 1.79,1.8 2.69,4.15 2.69,6.5 0,2.36 -0.9,4.71 -2.69,6.51 -1.8,1.79 -4.15,2.69 -6.5,2.69 -1.99,0 -3.98,-0.64 -5.64,-1.92zm10.87 -7.17c0,0.52 -0.42,0.95 -0.95,0.95 -0.53,0 -0.95,-0.43 -0.95,-0.95 0,-0.94 -0.38,-1.78 -0.99,-2.39 -0.61,-0.61 -1.46,-0.99 -2.39,-0.99 -0.53,0 -0.95,-0.43 -0.95,-0.95 0,-0.53 0.42,-0.96 0.95,-0.96 1.46,0 2.78,0.59 3.74,1.55 0.95,0.96 1.54,2.28 1.54,3.74zm-0.37 -4.97c-1.34,-1.34 -3.1,-2.01 -4.86,-2.01 -1.76,0 -3.52,0.67 -4.87,2.01 -1.34,1.34 -2.01,3.1 -2.01,4.86 0,1.76 0.67,3.52 2.01,4.87 1.35,1.34 3.11,2.01 4.87,2.01 1.76,0 3.52,-0.67 4.86,-2.01 1.34,-1.35 2.01,-3.11 2.01,-4.87 0,-1.76 -0.67,-3.52 -2.01,-4.86zm-16.42 13.16l0 -16.53 0 -5.51c0,-0.7 0.58,-1.27 1.28,-1.27l3.16 0 0 -1.43c0,-0.21 0.02,-0.41 0.07,-0.61l-3.68 0c-1.65,0 -3.01,1.36 -3.01,3.01l0 3.63 0 20.9 2.18 -2.19zm21.03 1.26l-3.34 0c-0.63,0 -1.14,0.51 -1.14,1.14l0 3.6 4.48 -4.74zm-14.1 -21.49l9.15 0c0.75,0 1.36,-0.61 1.36,-1.35l0 -3.16c0,-0.75 -0.61,-1.36 -1.36,-1.36l-1.24 0 0 -2.24c0,-1.26 -1.03,-2.3 -2.3,-2.3l-1.99 0c-1.27,0 -2.3,1.04 -2.3,2.3l0 2.24 -1.32 0c-0.74,0 -1.35,0.61 -1.35,1.36l0 3.16c0,0.74 0.61,1.35 1.35,1.35zm4.58 -9.39c-0.7,0 -1.26,0.56 -1.26,1.26 0,0.7 0.56,1.26 1.26,1.26 0.69,0 1.26,-0.56 1.26,-1.26 0,-0.7 -0.57,-1.26 -1.26,-1.26z' 
  where operativo = 'GGS_2022' and eaccion = 'analizar';
update acciones 
  set path_icono_svg = 'M11.53 40.93c0,1.66 1.35,2.96 3.01,2.96 6.98,0 13.95,0 20.93,0 1.66,0 3.01,-1.34 3.01,-3.05 -1,0.63 -2.18,1 -3.44,1l-4.77 0 -0.02 0.02 -15.26 0c-0.71,0 -1.28,-0.57 -1.28,-1.28l0 -28.32c0,-0.7 0.57,-1.27 1.28,-1.27l3.15 0c0,-0.55 -0.04,-1.56 0.08,-2.04l-3.68 0c-1.66,0 -3.01,1.36 -3.01,3.01l0 28.97zm12.78 -0.23l10.73 0c2.92,0 5.32,-2.39 5.32,-5.32l0 -7.14c-0.77,0.96 -1.53,1.93 -2.26,2.93l0 4.21c0,1.68 -1.38,3.06 -3.06,3.06l-10.73 0c-1.69,0 -3.07,-1.38 -3.07,-3.06l0 -10.73c0,-1.69 1.38,-3.07 3.07,-3.07l9.65 0c0.77,-0.73 1.59,-1.42 2.43,-2.08 -0.43,-0.12 -0.89,-0.18 -1.35,-0.18l-10.73 0c-2.93,0 -5.33,2.4 -5.33,5.33l0 10.73c0,2.93 2.4,5.32 5.33,5.32zm6.31 -3.17c-2.12,-3.93 -4.31,-6.92 -6.74,-8.51 1.2,-0.37 2.34,-0.68 3.55,-1.04 1.47,0.61 2.42,1.41 3.19,2.28 2.01,-3.39 4.75,-6.47 8.38,-9.15 1.27,-0.01 2.53,-0.01 3.8,-0.02 -4.83,5.15 -8.98,10.58 -12.18,16.44zm7.86 -18.66l0 -6.91c0,-1.65 -1.35,-3.01 -3.01,-3.01l-3.27 0c0.13,0.48 0.08,1.49 0.08,2.04l2.74 0c0.7,0 1.28,0.57 1.28,1.27l0 6.05 2.18 0.56zm-12.23 -15.21l-2 0c-1.26,0 -2.3,1.04 -2.3,2.3l0 2.24 -1.31 0c-0.75,0 -1.36,0.61 -1.36,1.36l0 3.16c0,0.74 0.61,1.35 1.36,1.35l9.14 0c0.75,0 1.36,-0.61 1.36,-1.35l0 -3.16c0,-0.75 -0.61,-1.36 -1.36,-1.36l-1.24 0 0 -2.24c0,-1.26 -1.03,-2.3 -2.29,-2.3zm-1.04 1.02c-0.7,0 -1.26,0.56 -1.26,1.26 0,0.7 0.56,1.26 1.26,1.26 0.7,0 1.26,-0.56 1.26,-1.26 0,-0.7 -0.56,-1.26 -1.26,-1.26z' 
  where operativo = 'GGS_2022' and eaccion = 'verificar';