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
update estados_acciones set condicion='cargado_dm is null and operacion is null and cuando is  null and asignado is null' where operativo = 'GGS_2022' and tarea='encu' and estado='AC' and eaccion='disponibilizar';

update estados_acciones set condicion='cargado_dm is null and cuando is not null' where operativo = 'GGS_2022' and tarea='encu' and estado='CD' and eaccion='sincronizar';
update estados_acciones set condicion='consistido is not null'  where operativo = 'GGS_2022' and tarea='encu' and estado='D' and eaccion='analizar';

update estados_acciones set condicion='operacion=''cargar'' and asignado is not null'  where operativo = 'GGS_2022' and tarea='encu' and estado='D' and eaccion='cargar';
update estados_acciones set condicion='verificado is not null and operacion=''cargar'' and asignado is not null'  where operativo = 'GGS_2022' and tarea='encu' and estado='P' and eaccion='cargar';   --el verificado_encu no existe determinar si se va a agregar 
INSERT INTO base.estados_acciones(
    operativo, tarea, estado, eaccion, condicion, estado_destino, eaccion_direccion)
    VALUES ('GGS_2022','encu', 'CD' , 'no_descargar', 'cargado_dm is not null and cuando is null', 'C', 'retroceso');

alter table "estados_acciones" drop column if exists "path_icono_svg";

alter table "acciones" add column "path_icono_svg" text;
alter table "acciones" add constraint "path_icono_svg<>''" check ("path_icono_svg"<>'');

update acciones
  set path_icono_svg = 'M22.28 30.4l-15.53 15.53c-0.74,0.74 -1.94,0.74 -2.68,0 -0.74,-0.74 -0.74,-1.94 0,-2.68l15.53 -15.53c-2.1,-2.69 -3.14,-5.94 -3.14,-9.19 0,-3.84 1.46,-7.68 4.39,-10.61 2.93,-2.94 6.78,-4.4 10.62,-4.4 3.84,0 7.68,1.46 10.61,4.4 2.93,2.93 4.4,6.77 4.4,10.61 0,3.84 -1.47,7.69 -4.4,10.62 -2.93,2.93 -6.77,4.39 -10.61,4.39 -3.25,0 -6.5,-1.04 -9.19,-3.14zm17.74 -11.7c0,0.86 -0.7,1.55 -1.56,1.55 -0.86,0 -1.55,-0.69 -1.55,-1.55 0,-1.52 -0.62,-2.9 -1.62,-3.9 -1,-1 -2.37,-1.61 -3.9,-1.61 -0.86,0 -1.55,-0.7 -1.55,-1.56 0,-0.86 0.69,-1.55 1.55,-1.55 2.39,0 4.54,0.96 6.1,2.52 1.56,1.56 2.53,3.72 2.53,6.1zm-0.62 -8.11c-2.19,-2.19 -5.06,-3.28 -7.93,-3.28 -2.87,0 -5.75,1.09 -7.94,3.28 -2.19,2.2 -3.28,5.07 -3.28,7.94 0,2.88 1.09,5.75 3.28,7.94 2.19,2.19 5.07,3.29 7.94,3.29 2.87,0 5.74,-1.1 7.93,-3.29 2.2,-2.19 3.29,-5.06 3.29,-7.94 0,-2.87 -1.09,-5.74 -3.29,-7.94z '
  where operativo = 'GGS_2022' and eaccion = 'analizar';
update acciones
  set path_icono_svg = 'M18.57 44.1l3.96 -0.01c-0.07,-0.39 -0.11,-0.79 -0.11,-1.2l0 -10.8c0,-1.8 0.73,-3.44 1.92,-4.63 1.18,-1.18 2.82,-1.92 4.62,-1.92l4.65 0c1.28,-1.72 2.19,-3.55 1.2,-5.22 -0.63,-1.06 -0.7,-0.77 -0.65,-2.78 0.07,-2.66 -0.44,-4.15 -0.45,-5.81 -0.08,-0.07 -0.19,-0.27 -0.23,-0.2 0,0.01 -5.11,-5.98 -10.81,-5.63 -0.75,1.34 -0.42,1.61 -1.9,2.46 -4.5,2.58 -4.57,3.4 -4.62,9.56 -0.03,3.87 -3.2,2.19 0.1,7.05 1.11,1.64 3.15,4.15 3.8,5.74 -2.56,5.37 -16.79,3.42 -14.58,13.41l13.1 -0.02zm16.75 0.96c-2.14,-3.96 -4.34,-6.97 -6.79,-8.57 1.21,-0.37 2.36,-0.68 3.57,-1.05 1.49,0.62 2.45,1.42 3.22,2.3 2.02,-3.42 4.79,-6.52 8.44,-9.22 1.28,-0.01 2.55,-0.01 3.82,-0.02 -4.86,5.18 -9.04,10.66 -12.26,16.56zm-6.36 3.19l10.81 0c2.95,0 5.36,-2.41 5.36,-5.36l0 -7.19c-0.78,0.97 -1.54,1.95 -2.28,2.95l0 4.24c0,1.7 -1.39,3.09 -3.08,3.09l-10.81 0c-1.7,0 -3.09,-1.39 -3.09,-3.09l0 -10.8c0,-1.7 1.39,-3.09 3.09,-3.09l9.72 0c0.78,-0.74 1.6,-1.44 2.45,-2.1 -0.44,-0.12 -0.89,-0.18 -1.36,-0.18l-10.81 0c-2.95,0 -5.36,2.42 -5.36,5.37l0 10.8c0,2.95 2.41,5.36 5.36,5.36z '
  where operativo = 'GGS_2022' and eaccion = 'asignar';
update acciones
  set path_icono_svg = 'M37.99 37.99l1.23 1.29 7.47 -7.47c0.99,-0.99 0.99,-2.62 0,-3.62l-24.88 -24.88c-1,-0.99 -2.63,-0.99 -3.62,0l-14.88 14.88c-0.99,0.99 -0.99,2.62 0,3.62l8.14 8.13 1.81 -1.8 -6.43 -6.43c-0.18,-0.17 -0.18,-0.46 0,-0.63l14.25 -14.25c0.17,-0.18 0.46,-0.18 0.63,0l19.44 19.44c0.18,0.17 0.18,0.46 0,0.63l-14.25 14.25c-0.17,0.18 -0.46,0.18 -0.63,0l-4.63 -4.63 -1.81 1.81 8.36 8.36c1,0.99 2.63,0.99 3.62,0l7.41 -7.41 -1.23 -1.29c-0.71,0.71 -1.86,0.7 -2.57,0 -0.71,-0.71 -0.71,-1.86 0,-2.57 0.71,-0.71 1.86,-0.71 2.57,0 0.7,0.71 0.7,1.86 0,2.57zm-24.56 4.78l8.21 -8.21 2.69 2.69c0.89,0.9 1.94,0.1 2.06,-1.12l1.31 -12.47c0.12,-0.95 -0.63,-1.7 -1.58,-1.58l-12.47 1.31c-1.22,0.12 -2.02,1.16 -1.12,2.06l2.69 2.69 -8.21 8.21c-0.54,0.54 -0.54,1.42 0,1.95 1.49,1.49 2.98,2.98 4.47,4.47 0.53,0.54 1.41,0.54 1.95,0 '
  where operativo = 'GGS_2022' and eaccion = 'cargar';
update acciones
  set path_icono_svg = 'M24.15 29.89l8.24 8.23 -2.7 2.7c-0.9,0.9 -0.1,1.94 1.13,2.07l12.5 1.31c0.96,0.13 1.71,-0.62 1.59,-1.58l-1.31 -12.51c-0.13,-1.22 -1.17,-2.03 -2.08,-1.12l-2.69 2.69 -0.98 -0.98 -1.81 -1.81 -5.44 -5.44c-0.54,-0.54 -1.42,-0.54 -1.96,0 -1.5,1.49 -2.99,2.99 -4.49,4.48 -0.53,0.54 -0.53,1.42 0,1.96zm-12.17 8.13l-1.27 1.27 -7.46 -7.46c-1,-1 -1,-2.63 0,-3.63l24.96 -24.95c0.99,-1 2.62,-1 3.62,0l14.92 14.92c1,1 1,2.63 0,3.63l-6.09 6.09c-0.04,0.04 -0.08,0.07 -0.12,0.11l-1.71 1.72 -1.81 -1.81 6.21 -6.21c0.17,-0.17 0.17,-0.46 0,-0.64l-14.29 -14.29c-0.18,-0.17 -0.46,-0.17 -0.64,0l-19.5 19.5c-0.17,0.18 -0.17,0.46 0,0.64l14.29 14.29c0.18,0.18 0.46,0.18 0.64,0l4.88 -4.88 1.81 1.8 -0.95 0.96 -7.67 7.67c-1,1 -2.63,1 -3.63,0l-7.46 -7.46 1.27 -1.27c0.71,0.71 1.86,0.71 2.57,0 0.71,-0.71 0.71,-1.86 0,-2.57 -0.71,-0.71 -1.86,-0.71 -2.57,0 -0.71,0.71 -0.71,1.86 0,2.57z '
  where operativo = 'GGS_2022' and eaccion = 'descargar';
update acciones
  set path_icono_svg = 'M18.57 44.1l3.96 -0.01c-0.07,-0.39 -0.11,-0.79 -0.11,-1.2l0 -10.8c0,-1.8 0.73,-3.44 1.92,-4.63 1.18,-1.18 2.82,-1.92 4.62,-1.92l4.65 0c1.28,-1.72 2.19,-3.55 1.2,-5.22 -0.63,-1.06 -0.7,-0.77 -0.65,-2.78 0.07,-2.66 -0.44,-4.15 -0.45,-5.81 -0.08,-0.07 -0.19,-0.27 -0.23,-0.2 0,0.01 -5.11,-5.98 -10.81,-5.63 -0.75,1.34 -0.42,1.61 -1.9,2.46 -4.5,2.58 -4.57,3.4 -4.62,9.56 -0.03,3.87 -3.2,2.19 0.1,7.05 1.11,1.64 3.15,4.15 3.8,5.74 -2.56,5.37 -16.79,3.42 -14.58,13.41l13.1 -0.02zm5.03 -12.02l0 10.81c0,2.95 2.41,5.36 5.36,5.36l10.81 0c2.95,0 5.36,-2.41 5.36,-5.36l0 -10.81c0,-2.95 -2.41,-5.36 -5.36,-5.36l-10.81 0c-2.95,0 -5.36,2.41 -5.36,5.36l2.28 0c0,-1.69 1.38,-3.08 3.08,-3.08l10.81 0c1.69,0 3.08,1.39 3.08,3.08l0 10.81c0,1.7 -1.39,3.09 -3.08,3.09l-10.81 0c-1.69,0 -3.08,-1.39 -3.08,-3.09l0 -10.81 -2.28 0z '
  where operativo = 'GGS_2022' and eaccion = 'disponibilizar';
update acciones
  set path_icono_svg = 'M46.69 31.81l-7.43 7.43 -1.27 -1.25c0.7,-0.71 0.7,-1.86 0,-2.57 -0.71,-0.71 -1.86,-0.71 -2.57,0 -0.71,0.71 -0.71,1.86 0,2.57 0.71,0.7 1.86,0.71 2.57,0l1.27 1.25 -7.45 7.45c-0.99,0.99 -2.62,0.99 -3.62,0l-8.36 -8.36 1.81 -1.81 4.63 4.63c0.17,0.18 0.46,0.18 0.63,0l14.25 -14.25c0.18,-0.17 0.18,-0.46 0,-0.63l-0.39 -0.39c0.85,-0.32 1.65,-0.73 2.39,-1.22l3.54 3.53c0.99,1 0.99,2.63 0,3.62zm-5.33 -25.08l1.74 -1.74c-1.92,-1.5 -4.34,-2.4 -6.97,-2.4 -3.12,0 -5.94,1.27 -7.98,3.31 -2.05,2.05 -3.31,4.87 -3.31,7.99 0,3.11 1.26,5.94 3.31,7.98 2.04,2.04 4.86,3.31 7.98,3.31 3.12,0 5.94,-1.27 7.99,-3.31 2.04,-2.04 3.31,-4.87 3.31,-7.98 0,-2.63 -0.9,-5.05 -2.4,-6.97l-1.75 1.74c1.08,1.47 1.71,3.27 1.71,5.23 0,2.44 -0.99,4.66 -2.59,6.26 -1.61,1.6 -3.82,2.59 -6.26,2.59 -1.96,0 -3.76,-0.63 -5.23,-1.7l12.37 -12.38 1.75 -1.74c-0.29,-0.35 -0.59,-0.7 -0.91,-1.02 -0.32,-0.32 -0.67,-0.63 -1.02,-0.91l-14.12 14.12c-1.07,-1.47 -1.7,-3.27 -1.7,-5.22 0,-2.45 0.99,-4.66 2.59,-6.27 1.61,-1.6 3.82,-2.59 6.27,-2.59 1.95,0 3.75,0.64 5.22,1.7zm-17.22 2.53l-2.43 -2.43c-0.17,-0.18 -0.46,-0.18 -0.63,0l-14.25 14.25c-0.18,0.17 -0.18,0.46 0,0.63l6.43 6.43 -1.81 1.8 -8.14 -8.13c-0.99,-1 -0.99,-2.63 0,-3.62l14.88 -14.88c0.99,-0.99 2.62,-0.99 3.62,0l3.55 3.56c-0.48,0.74 -0.9,1.54 -1.22,2.39zm-10.71 33.51l8.21 -8.21 2.69 2.69c0.89,0.9 1.94,0.1 2.06,-1.12l1.31 -12.47c0.12,-0.95 -0.63,-1.7 -1.58,-1.58l-12.47 1.31c-1.22,0.12 -2.02,1.16 -1.12,2.06l2.69 2.69 -8.21 8.21c-0.54,0.54 -0.54,1.42 0,1.95 1.49,1.49 2.98,2.98 4.47,4.47 0.53,0.54 1.41,0.54 1.95,0z '
  where operativo = 'GGS_2022' and eaccion = 'no_acargar';
update acciones
  set path_icono_svg = 'M24.15 29.89l8.24 8.23 -2.7 2.7c-0.9,0.9 -0.1,1.94 1.13,2.07l12.5 1.31c0.96,0.13 1.71,-0.62 1.59,-1.58l-1.31 -12.51c-0.13,-1.22 -1.17,-2.03 -2.08,-1.12l-2.69 2.69 -0.98 -0.98 -1.81 -1.81 -5.44 -5.44c-0.54,-0.54 -1.42,-0.54 -1.96,0 -1.5,1.49 -2.99,2.99 -4.49,4.48 -0.53,0.54 -0.53,1.42 0,1.96zm-5.13 -23.25l1.74 -1.74c-1.92,-1.5 -4.34,-2.4 -6.97,-2.4 -3.11,0 -5.94,1.26 -7.98,3.31 -2.05,2.04 -3.31,4.86 -3.31,7.98 0,3.12 1.26,5.95 3.31,7.99 2.04,2.04 4.87,3.31 7.98,3.31 3.12,0 5.94,-1.27 7.99,-3.31 2.04,-2.04 3.31,-4.87 3.31,-7.99 0,-2.62 -0.9,-5.04 -2.4,-6.96l-1.74 1.74c1.07,1.46 1.7,3.27 1.7,5.22 0,2.45 -0.99,4.66 -2.59,6.26 -1.6,1.6 -3.82,2.59 -6.26,2.59 -1.96,0 -3.76,-0.63 -5.23,-1.7l12.38 -12.37 1.74 -1.74c-0.28,-0.36 -0.59,-0.7 -0.91,-1.02 -0.32,-0.33 -0.67,-0.63 -1.02,-0.91l-14.12 14.11c-1.07,-1.46 -1.7,-3.27 -1.7,-5.22 0,-2.44 0.99,-4.66 2.59,-6.26 1.61,-1.6 3.82,-2.59 6.27,-2.59 1.95,0 3.75,0.63 5.22,1.7zm-7.04 31.38l-1.27 1.27 -7.46 -7.46c-1,-1 -1,-2.63 0,-3.63l4.3 -4.3c0.78,0.48 1.6,0.87 2.46,1.16l-1.21 1.21c-0.17,0.18 -0.17,0.46 0,0.64l14.29 14.29c0.18,0.18 0.46,0.18 0.64,0l4.88 -4.88 1.81 1.8 -0.95 0.96 -7.67 7.67c-1,1 -2.63,1 -3.63,0l-7.46 -7.46 1.27 -1.27c0.71,0.71 1.86,0.71 2.57,0 0.71,-0.71 0.71,-1.86 0,-2.57 -0.71,-0.71 -1.86,-0.71 -2.57,0 -0.71,0.71 -0.71,1.86 0,2.57zm11.93 -30.47l4.3 -4.3c0.99,-1 2.62,-1 3.62,0l14.92 14.92c1,1 1,2.63 0,3.63l-6.09 6.09c-0.04,0.04 -0.08,0.07 -0.12,0.11l-1.71 1.72 -1.81 -1.81 6.21 -6.21c0.17,-0.17 0.17,-0.46 0,-0.64l-14.29 -14.29c-0.18,-0.17 -0.46,-0.17 -0.64,0l-3.24 3.24c-0.29,-0.87 -0.67,-1.68 -1.15,-2.46z '
  where operativo = 'GGS_2022' and eaccion = 'no_descargar';
update acciones
  set path_icono_svg = 'M45.19 18.12l-31.44 0 0 3.04c0,1.01 -1.04,1.15 -1.81,0.53l-7.78 -6.31c-0.61,-0.47 -0.61,-1.31 0,-1.78l7.78 -6.31c0.77,-0.62 1.81,-0.48 1.81,0.53l0 3.04 31.44 0c0.61,0 1.1,0.5 1.1,1.1 0,1.69 0,3.37 0,5.06 0,0.6 -0.49,1.1 -1.1,1.1zm-40.38 13.76l31.44 0 0 -3.04c0,-1.01 1.04,-1.15 1.81,-0.53l7.78 6.31c0.61,0.47 0.61,1.31 0,1.78l-7.78 6.31c-0.77,0.62 -1.81,0.48 -1.81,-0.53l0 -3.04 -31.44 0c-0.61,0 -1.11,-0.5 -1.11,-1.1 0,-1.69 0,-3.37 0,-5.06 0,-0.6 0.5,-1.1 1.11,-1.1z '
  where operativo = 'GGS_2022' and eaccion = 'sincronizar';
update acciones
  set path_icono_svg = 'M19.03 43.08c-4.68,-8.63 -9.49,-15.22 -14.83,-18.72 2.65,-0.8 5.15,-1.48 7.8,-2.29 3.25,1.35 5.34,3.12 7.03,5.02 4.42,-7.47 10.45,-14.23 18.44,-20.13 2.78,-0.01 5.56,-0.02 8.34,-0.03 -10.61,11.31 -19.74,23.27 -26.78,36.15z '
  where operativo = 'GGS_2022' and eaccion = 'verificar';

set search_path=base;

CREATE OR REPLACE FUNCTION accion_cumple_condicion(operativo text, estado text, enc text, tarea text, eaccion text,condicion text)
RETURNS boolean AS
$BODY$
DECLARE
    vsent text; 
    vcond text;
    vsalida integer;
BEGIN
 vcond=condicion;
 vsent=' select 1 
    from base.tareas_tem t
    inner join base.estados_acciones ea using (operativo, estado, tarea)
    inner join tem te using (operativo,enc)
    left join sincronizaciones s on t.cargado_dm=s.token
	left join viviendas v on (te.operativo =  v.operativo and te.enc = v.vivienda)
    where t.operativo='''||$1||''' and t.estado='''||$2||'''  and t.enc='''||$3||'''  and t.tarea='''||$4||''' and ea.eaccion='''||$5 ||''' and '||vcond||';';
 --raise notice 'esto %',vsent;
 execute vsent into vsalida;
 IF vsalida=1 THEN
    return true;
 ELSE
    return false;
 END IF;

END;
$BODY$
 LANGUAGE plpgsql VOLATILE;
 ALTER FUNCTION accion_cumple_condicion(text, text, text, text,text,text) owner to ggs2022_owner;

update estados_acciones set condicion='verificado is null' where operativo = 'GGS_2022' and tarea='encu' and estado='V' and eaccion='verificar';

alter table "estados" add column "permite_asignar_encuestador" boolean not null default 'false';

update estados set permite_asignar_encuestador = true where operativo = 'GGS_2022' and estado in ('0D','A');

alter table "tem" add column "estado" text not null default '0D';
alter table "tem" add constraint "estado<>''" check ("estado"<>'');
alter table "tem" alter column "estado" set not null;
alter table "tem" add constraint "tem estados REL" foreign key ("operativo", "estado") references "estados" ("operativo", "estado")  on update cascade;
create index "operativo,estado 4 tem IDX" ON "tem" ("operativo", "estado");

alter table "tem" add column "tarea" text not null default 'encu';
alter table "tem" add constraint "tarea<>''" check ("tarea"<>'');
alter table "tem" alter column "tarea" set not null;
alter table "tem" add constraint "tem tareas REL" foreign key ("operativo", "tarea") references "tareas" ("operativo", "tarea")  on update cascade;
create index "operativo,tarea 4 tem IDX" ON "tem" ("operativo", "tarea");

alter table "acciones" add column "desactiva_boton" boolean not null default 'false';

update acciones set desactiva_boton = true where operativo = 'GGS_2022' and eaccion = 'sincronizar';