set role to preju_test2022_owner;
--set role to discon_owner;
--set role to dmencu_owner;
--set role to preju_capa2022_owner;
--set role to preju2022_owner;

set search_path=base;

create table "viviendas" (
  "operativo" text, 
  "vivienda" text, 
  "vdominio" bigint, 
  "obs_re" text, 
  "total_vis" bigint, 
  "soporte" bigint, 
  "entreav" bigint, 
  "identif" bigint, 
  "resid_hog" bigint, 
  "contac" bigint, 
  "v1" bigint, 
  "total_h" bigint, 
  "razonv" bigint, 
  "razon2_1" bigint, 
  "razon2_2" bigint, 
  "razon2_3" bigint, 
  "razon2_4" bigint, 
  "razon2_5" bigint, 
  "razon2_6" bigint, 
  "razon3" text, 
  "razon_9v" bigint, 
  "vdominio_sup" bigint, 
  "s1a1_obs_sup" text, 
  "datos_personal_sup" text, 
  "total_vis_sup" bigint, 
  "soporte_sup" bigint, 
  "modo_sup" bigint, 
  "confir_tel_sup" bigint, 
  "domicilio_sup" text, 
  "confir_dom_sup" bigint, 
  "sp1_sup" bigint, 
  "sp1a" bigint, 
  "sp1b" bigint, 
  "sp1c" bigint, 
  "sp3_sup" bigint, 
  "total_h_sup" bigint, 
  "sp2_sup" bigint, 
  "razon_1_sup" bigint, 
  "razon_2_sup" bigint, 
  "razon2_3_sup" bigint, 
  "razon2_4_sup" bigint, 
  "razon2_5_sup" bigint, 
  "razon2_6_sup" bigint, 
  "razon3_sup" text, 
  "razon2_7v_sup" bigint, 
  "razon_9v_sup" bigint
, primary key ("operativo", "vivienda")
);
grant select, insert, update, delete, references on "viviendas" to preju_test2022_admin;
grant all on "viviendas" to preju_test2022_owner;

create table "visitas" (
  "operativo" text, 
  "vivienda" text, 
  "visita" bigint, 
  "anoenc" bigint, 
  "rol" text, 
  "per" bigint, 
  "usu" text, 
  "fecha" text, --date
  "hora" text,  --interval 
  "anotacion" text
, primary key ("operativo", "vivienda", "visita")
);
grant select, insert, update, delete, references on "visitas" to preju_test2022_admin;
grant all on "visitas" to preju_test2022_owner;



create table "hogares" (
  "operativo" text, 
  "vivienda" text, 
  "hogar" bigint, 
  "observaciones" text, 
  "prejue1" bigint, 
  "entrea" bigint, 
  "f_realiz_o" date, 
  "los_nombres" text, 
  "total_m" bigint, 
  "nombrer" text, 
  "sorteo" bigint, 
  "tp" bigint, 
  "cr_num_miembro" bigint, 
  "msnombre" text, 
  "cr_num_miembro_ing" bigint, 
  "fijo" text, 
  "movil" text, 
  "razon1" bigint, 
  "razon2_7" bigint, 
  "razon2_8" bigint, 
  "razon2_9" bigint
, primary key ("operativo", "vivienda", "hogar")
);
grant select, insert, update, delete, references on "hogares" to preju_test2022_admin;
grant all on "hogares" to preju_test2022_owner;



create table "personas" (
  "operativo" text, 
  "vivienda" text, 
  "hogar" bigint, 
  "persona" bigint, 
  "nombre" text, 
  "sexo" bigint, 
  "edad" bigint, 
  "p4" bigint, 
  "lp" bigint, 
  "l0" text, 
  "p5" bigint, 
  "p5b" bigint, 
  "p6a" bigint, 
  "p6b" bigint, 
  "entreaind" bigint, 
  "preju1_1" bigint, 
  "preju1_2" bigint, 
  "preju1_3" bigint, 
  "preju1_4" bigint, 
  "preju1_5" bigint, 
  "preju1_6" bigint, 
  "preju1_7" bigint, 
  "preju1_8" bigint, 
  "preju1_8_esp" text, 
  "preju2_1" bigint, 
  "preju2_2" bigint, 
  "preju2_3" bigint, 
  "preju2_4" bigint, 
  "preju2_5" bigint, 
  "preju2_6" bigint, 
  "preju2_7" bigint, 
  "preju2_8" bigint, 
  "preju3" bigint, 
  "preju4" bigint, 
  "preju5" bigint, 
  "preju6" bigint, 
  "preju7" bigint, 
  "preju8" bigint, 
  "preju9" bigint, 
  "preju10" bigint, 
  "preju11" bigint, 
  "preju12" bigint, 
  "preju13" bigint, 
  "preju14" bigint, 
  "preju15" bigint, 
  "preju16" bigint, 
  "preju17" bigint, 
  "preju18" bigint, 
  "preju19" bigint, 
  "preju20" bigint, 
  "preju21" bigint, 
  "preju22" bigint, 
  "preju23" bigint, 
  "preju23_otro" text, 
  "preju24" bigint, 
  "preju25" bigint, 
  "preju26" bigint, 
  "preju27" bigint, 
  "preju28_1" bigint, 
  "preju28_2" bigint, 
  "preju28_3" bigint, 
  "preju28_4" bigint, 
  "preju28_5" bigint, 
  "preju28_6" bigint, 
  "preju28_7" bigint, 
  "preju28_8" bigint, 
  "preju28_8_esp" text, 
  "preju29" bigint, 
  "e12j" bigint, 
  "e13j" bigint, 
  "e14j" bigint, 
  "t1" bigint, 
  "t2" bigint, 
  "t9" bigint, 
  "t29j" bigint, 
  "t44" bigint, 
  "t46" bigint, 
  "it1" bigint, 
  "it2" bigint, 
  "noreaind" bigint, 
  "noreaind_esp" text
, primary key ("operativo", "vivienda", "hogar", "persona")
);
grant select, insert, update, delete, references on "personas" to preju_test2022_admin;
grant all on "personas" to preju_test2022_owner;



create table "visitas_sup" (
  "operativo" text, 
  "vivienda" text, 
  "visita" bigint, 
  "anoenc_sup" bigint, 
  "rol_sup" text, 
  "per_sup" bigint, 
  "usu_sup" text, 
  "fecha_sup" text,   --date 
  "hora_sup"  text,   --interval
  "anotacion_sup" text
, primary key ("operativo", "vivienda", "visita")
);
grant select, insert, update, delete, references on "visitas_sup" to preju_test2022_admin;
grant all on "visitas_sup" to preju_test2022_owner;



create table "hogares_sup" (
  "operativo" text, 
  "vivienda" text, 
  "hogar" bigint, 
  "obs_hogar_sup" text, 
  "resp_comp_sup" text, 
  "resp_comp_ed_sup" bigint, 
  "resp_indi_sup" text, 
  "resp_indi_ed_sup" bigint, 
  "spr1_sup" bigint, 
  "sp4" bigint, 
  "sp5_sup" text, 
  "spr2_sup" bigint, 
  "entrea_sup" bigint, 
  "fecha_realiz_sup" date, 
  "nombres_componentes_sup" text, 
  "total_m_sup" bigint, 
  "sorteo_sup" bigint, 
  "total_rango_sup" bigint, 
  "nro_miembro_sel_sup" bigint, 
  "nombre_miembro_sel_sup" text, 
  "nro_mie_sel_ing_sup" bigint, 
  "spr3_sup" bigint, 
  "tel_fijo_sup" text, 
  "tel_movil_sup" text, 
  "razon1_sup" bigint, 
  "razon_7_1h_sup" bigint, 
  "razon_8_1_sup" bigint, 
  "razon_9_1h_sup" bigint
, primary key ("operativo", "vivienda", "hogar")
);
grant select, insert, update, delete, references on "hogares_sup" to preju_test2022_admin;
grant all on "hogares_sup" to preju_test2022_owner;



create table "personas_sup" (
  "operativo" text, 
  "vivienda" text, 
  "hogar" bigint, 
  "persona" bigint, 
  "nombre_sup" text, 
  "sexo_sup" bigint, 
  "edad_sup" bigint, 
  "sp4_sup" bigint, 
  "spl0_sup" text, 
  "spp5" bigint
, primary key ("operativo", "vivienda", "hogar", "persona")
);
grant select, insert, update, delete, references on "personas_sup" to preju_test2022_admin;
grant all on "personas_sup" to preju_test2022_owner;

-- conss
alter table "viviendas" add constraint "operativo<>''" check ("operativo"<>'');
alter table "viviendas" alter column "operativo" set not null;
alter table "viviendas" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "viviendas" alter column "vivienda" set not null;
alter table "viviendas" add constraint "obs_re<>''" check ("obs_re"<>'');
alter table "viviendas" add constraint "razon3<>''" check ("razon3"<>'');
alter table "viviendas" add constraint "s1a1_obs_sup<>''" check ("s1a1_obs_sup"<>'');
alter table "viviendas" add constraint "datos_personal_sup<>''" check ("datos_personal_sup"<>'');
alter table "viviendas" add constraint "domicilio_sup<>''" check ("domicilio_sup"<>'');
alter table "viviendas" add constraint "razon3_sup<>''" check ("razon3_sup"<>'');
alter table "visitas" add constraint "operativo<>''" check ("operativo"<>'');
alter table "visitas" alter column "operativo" set not null;
alter table "visitas" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "visitas" alter column "vivienda" set not null;
alter table "visitas" alter column "visita" set not null;
alter table "visitas" add constraint "rol<>''" check ("rol"<>'');
alter table "visitas" add constraint "usu<>''" check ("usu"<>'');
alter table "visitas" add constraint "anotacion<>''" check ("anotacion"<>'');
alter table "hogares" add constraint "operativo<>''" check ("operativo"<>'');
alter table "hogares" alter column "operativo" set not null;
alter table "hogares" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "hogares" alter column "vivienda" set not null;
alter table "hogares" alter column "hogar" set not null;
alter table "hogares" add constraint "observaciones<>''" check ("observaciones"<>'');
alter table "hogares" add constraint "los_nombres<>''" check ("los_nombres"<>'');
alter table "hogares" add constraint "nombrer<>''" check ("nombrer"<>'');
alter table "hogares" add constraint "msnombre<>''" check ("msnombre"<>'');
alter table "hogares" add constraint "fijo<>''" check ("fijo"<>'');
alter table "hogares" add constraint "movil<>''" check ("movil"<>'');
alter table "personas" add constraint "operativo<>''" check ("operativo"<>'');
alter table "personas" alter column "operativo" set not null;
alter table "personas" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "personas" alter column "vivienda" set not null;
alter table "personas" alter column "hogar" set not null;
alter table "personas" alter column "persona" set not null;
alter table "personas" add constraint "nombre<>''" check ("nombre"<>'');
alter table "personas" add constraint "l0<>''" check ("l0"<>'');
alter table "personas" add constraint "preju1_8_esp<>''" check ("preju1_8_esp"<>'');
alter table "personas" add constraint "preju23_otro<>''" check ("preju23_otro"<>'');
alter table "personas" add constraint "preju28_8_esp<>''" check ("preju28_8_esp"<>'');
alter table "personas" add constraint "noreaind_esp<>''" check ("noreaind_esp"<>'');
alter table "visitas_sup" add constraint "operativo<>''" check ("operativo"<>'');
alter table "visitas_sup" alter column "operativo" set not null;
alter table "visitas_sup" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "visitas_sup" alter column "vivienda" set not null;
alter table "visitas_sup" alter column "visita" set not null;
alter table "visitas_sup" add constraint "rol_sup<>''" check ("rol_sup"<>'');
alter table "visitas_sup" add constraint "usu_sup<>''" check ("usu_sup"<>'');
alter table "visitas_sup" add constraint "anotacion_sup<>''" check ("anotacion_sup"<>'');
alter table "hogares_sup" add constraint "operativo<>''" check ("operativo"<>'');
alter table "hogares_sup" alter column "operativo" set not null;
alter table "hogares_sup" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "hogares_sup" alter column "vivienda" set not null;
alter table "hogares_sup" alter column "hogar" set not null;
alter table "hogares_sup" add constraint "obs_hogar_sup<>''" check ("obs_hogar_sup"<>'');
alter table "hogares_sup" add constraint "resp_comp_sup<>''" check ("resp_comp_sup"<>'');
alter table "hogares_sup" add constraint "resp_indi_sup<>''" check ("resp_indi_sup"<>'');
alter table "hogares_sup" add constraint "sp5_sup<>''" check ("sp5_sup"<>'');
alter table "hogares_sup" add constraint "nombres_componentes_sup<>''" check ("nombres_componentes_sup"<>'');
alter table "hogares_sup" add constraint "nombre_miembro_sel_sup<>''" check ("nombre_miembro_sel_sup"<>'');
alter table "hogares_sup" add constraint "tel_fijo_sup<>''" check ("tel_fijo_sup"<>'');
alter table "hogares_sup" add constraint "tel_movil_sup<>''" check ("tel_movil_sup"<>'');
alter table "personas_sup" add constraint "operativo<>''" check ("operativo"<>'');
alter table "personas_sup" alter column "operativo" set not null;
alter table "personas_sup" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "personas_sup" alter column "vivienda" set not null;
alter table "personas_sup" alter column "hogar" set not null;
alter table "personas_sup" alter column "persona" set not null;
alter table "personas_sup" add constraint "nombre_sup<>''" check ("nombre_sup"<>'');
alter table "personas_sup" add constraint "spl0_sup<>''" check ("spl0_sup"<>'');
alter table "visitas" add constraint "fecha<>''" check ("fecha"<>'');
alter table "visitas" add constraint "hora<>''" check ("hora"<>'');
alter table "visitas_sup" add constraint "fecha_sup<>''" check ("fecha_sup"<>'');
alter table "visitas_sup" add constraint "hora_sup<>''" check ("hora_sup"<>'');


-- FKs
alter table "visitas" add constraint "visitas viviendas REL" foreign key ("operativo", "vivienda") references "viviendas" ("operativo", "vivienda")  on update cascade;
alter table "hogares" add constraint "hogares viviendas REL" foreign key ("operativo", "vivienda") references "viviendas" ("operativo", "vivienda")  on update cascade;
alter table "personas" add constraint "personas hogares REL" foreign key ("operativo", "vivienda", "hogar") references "hogares" ("operativo", "vivienda", "hogar")  on update cascade;
alter table "visitas_sup" add constraint "visitas_sup viviendas REL" foreign key ("operativo", "vivienda") references "viviendas" ("operativo", "vivienda")  on update cascade;
alter table "hogares_sup" add constraint "hogares_sup viviendas REL" foreign key ("operativo", "vivienda") references "viviendas" ("operativo", "vivienda")  on update cascade;
alter table "personas_sup" add constraint "personas_sup hogares_sup REL" foreign key ("operativo", "vivienda", "hogar") references "hogares_sup" ("operativo", "vivienda", "hogar")  on update cascade;

do $SQL_ENANCE$
 begin
PERFORM enance_table('viviendas','operativo,vivienda');
PERFORM enance_table('visitas','operativo,vivienda,visita');
PERFORM enance_table('hogares','operativo,vivienda,hogar');
PERFORM enance_table('personas','operativo,vivienda,hogar,persona');
PERFORM enance_table('visitas_sup','operativo,vivienda,visita');
PERFORM enance_table('hogares_sup','operativo,vivienda,hogar');
PERFORM enance_table('personas_sup','operativo,vivienda,hogar,persona');
end
$SQL_ENANCE$;