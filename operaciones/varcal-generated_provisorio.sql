set role preju2022_admin;
--CAMBIAR ROL  de acuerdo al entorno
-- REEMPLAZAR TAMBIENA EL OWNER

do $SQL_DUMP$
 begin
----
set search_path = base;
----
drop table if exists "preju_2022_personas_sup_calculada";
drop table if exists "preju_2022_personas_calculada";
drop table if exists "preju_2022_hogares_sup_calculada";
drop table if exists "preju_2022_hogares_calculada";
drop table if exists "preju_2022_visitas_sup_calculada";
drop table if exists "preju_2022_visitas_calculada";
drop table if exists "preju_2022_viviendas_calculada";
drop table if exists "preju_2022_tem_calculada";
----


--
-- lines 
create table "preju_2022_hogares_calculada" (
  "operativo" text, 
  "vivienda" text, 
  "hogar" bigint,
  cant_per      bigint,
  cant_jefes    bigint, 
  cant_conyuges bigint,
  edadjefe      bigint,
  sexojefe      bigint,
  sitconyjefe   bigint 
, primary key ("operativo", "vivienda", "hogar")
);
grant select, insert, update, references on "preju_2022_hogares_calculada" to preju2022_admin;
grant all on "preju_2022_hogares_calculada" to preju2022_owner;



create table "preju_2022_hogares_sup_calculada" (
  "operativo" text, 
  "vivienda" text, 
  "hogar" bigint
, primary key ("operativo", "vivienda", "hogar")
);
grant select, insert, update, references on "preju_2022_hogares_sup_calculada" to preju2022_admin;
grant all on "preju_2022_hogares_sup_calculada" to preju2022_owner;



create table "preju_2022_personas_calculada" (
  "operativo" text, 
  "vivienda" text, 
  "hogar" bigint, 
  "persona" bigint
, primary key ("operativo", "vivienda", "hogar", "persona")
);
grant select, insert, update, references on "preju_2022_personas_calculada" to preju2022_admin;
grant all on "preju_2022_personas_calculada" to preju2022_owner;



create table "preju_2022_personas_sup_calculada" (
  "operativo" text, 
  "vivienda" text, 
  "hogar" bigint, 
  "persona" bigint
, primary key ("operativo", "vivienda", "hogar", "persona")
);
grant select, insert, update, references on "preju_2022_personas_sup_calculada" to preju2022_admin;
grant all on "preju_2022_personas_sup_calculada" to preju2022_owner;



create table "preju_2022_tem_calculada" (
  "operativo" text, 
  "enc" text
, primary key ("operativo", "enc")
);
grant select, insert, update, references on "preju_2022_tem_calculada" to preju2022_admin;
grant all on "preju_2022_tem_calculada" to preju2022_owner;



create table "preju_2022_visitas_calculada" (
  "operativo" text, 
  "vivienda" text, 
  "visita" bigint
, primary key ("operativo", "vivienda", "visita")
);
grant select, insert, update, references on "preju_2022_visitas_calculada" to preju2022_admin;
grant all on "preju_2022_visitas_calculada" to preju2022_owner;



create table "preju_2022_visitas_sup_calculada" (
  "operativo" text, 
  "vivienda" text, 
  "visita" bigint
, primary key ("operativo", "vivienda", "visita")
);
grant select, insert, update, references on "preju_2022_visitas_sup_calculada" to preju2022_admin;
grant all on "preju_2022_visitas_sup_calculada" to preju2022_owner;



create table "preju_2022_viviendas_calculada" (
  "operativo" text, 
  "vivienda" text,
  cant_vis bigint,
  cant_hog bigint   
, primary key ("operativo", "vivienda")
);
grant select, insert, update, references on "preju_2022_viviendas_calculada" to preju2022_admin;
grant all on "preju_2022_viviendas_calculada" to preju2022_owner;



-- conss
alter table "preju_2022_hogares_calculada" add constraint "operativo<>''" check ("operativo"<>'');
alter table "preju_2022_hogares_calculada" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "preju_2022_hogares_sup_calculada" add constraint "operativo<>''" check ("operativo"<>'');
alter table "preju_2022_hogares_sup_calculada" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "preju_2022_personas_calculada" add constraint "operativo<>''" check ("operativo"<>'');
alter table "preju_2022_personas_calculada" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "preju_2022_personas_sup_calculada" add constraint "operativo<>''" check ("operativo"<>'');
alter table "preju_2022_personas_sup_calculada" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "preju_2022_tem_calculada" add constraint "operativo<>''" check ("operativo"<>'');
alter table "preju_2022_tem_calculada" add constraint "enc<>''" check ("enc"<>'');
alter table "preju_2022_visitas_calculada" add constraint "operativo<>''" check ("operativo"<>'');
alter table "preju_2022_visitas_calculada" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "preju_2022_visitas_sup_calculada" add constraint "operativo<>''" check ("operativo"<>'');
alter table "preju_2022_visitas_sup_calculada" add constraint "vivienda<>''" check ("vivienda"<>'');
alter table "preju_2022_viviendas_calculada" add constraint "operativo<>''" check ("operativo"<>'');
alter table "preju_2022_viviendas_calculada" add constraint "vivienda<>''" check ("vivienda"<>'');
-- FKs
alter table "preju_2022_hogares_calculada" add constraint "preju_2022_hogares_calculada hogares REL" foreign key ("operativo", "vivienda", "hogar") references "hogares" ("operativo", "vivienda", "hogar")  on delete cascade on update cascade;
alter table "preju_2022_hogares_sup_calculada" add constraint "preju_2022_hogares_sup_calculada hogares_sup REL" foreign key ("operativo", "vivienda", "hogar") references "hogares_sup" ("operativo", "vivienda", "hogar")  on delete cascade on update cascade;
alter table "preju_2022_personas_calculada" add constraint "preju_2022_personas_calculada personas REL" foreign key ("operativo", "vivienda", "hogar", "persona") references "personas" ("operativo", "vivienda", "hogar", "persona")  on delete cascade on update cascade;
alter table "preju_2022_personas_sup_calculada" add constraint "preju_2022_personas_sup_calculada personas_sup REL" foreign key ("operativo", "vivienda", "hogar", "persona") references "personas_sup" ("operativo", "vivienda", "hogar", "persona")  on delete cascade on update cascade;
alter table "preju_2022_tem_calculada" add constraint "preju_2022_tem_calculada tem REL" foreign key ("operativo", "enc") references "tem" ("operativo", "enc")  on delete cascade on update cascade;
alter table "preju_2022_visitas_calculada" add constraint "preju_2022_visitas_calculada visitas REL" foreign key ("operativo", "vivienda", "visita") references "visitas" ("operativo", "vivienda", "visita")  on delete cascade on update cascade;
alter table "preju_2022_visitas_sup_calculada" add constraint "preju_2022_visitas_sup_calculada visitas_sup REL" foreign key ("operativo", "vivienda", "visita") references "visitas_sup" ("operativo", "vivienda", "visita")  on delete cascade on update cascade;
alter table "preju_2022_viviendas_calculada" add constraint "preju_2022_viviendas_calculada viviendas REL" foreign key ("operativo", "vivienda") references "viviendas" ("operativo", "vivienda")  on delete cascade on update cascade;
-- index
create index "operativo,vivienda,hogar 4 preju_2022_hogares_calculada IDX" ON "preju_2022_hogares_calculada" ("operativo", "vivienda", "hogar");
create index "preju_2022_hogares_sup_calculada hogares_sup IDX" ON "preju_2022_hogares_sup_calculada" ("operativo", "vivienda", "hogar");
create index "preju_2022_personas_calculada personas IDX" ON "preju_2022_personas_calculada" ("operativo", "vivienda", "hogar", "persona");
create index "preju_2022_personas_sup_calculada personas_sup IDX" ON "preju_2022_personas_sup_calculada" ("operativo", "vivienda", "hogar", "persona");
create index "operativo,enc 4 preju_2022_tem_calculada IDX" ON "preju_2022_tem_calculada" ("operativo", "enc");
create index "operativo,vivienda,visita 4 preju_2022_visitas_calculada IDX" ON "preju_2022_visitas_calculada" ("operativo", "vivienda", "visita");
create index "preju_2022_visitas_sup_calculada visitas_sup IDX" ON "preju_2022_visitas_sup_calculada" ("operativo", "vivienda", "visita");
create index "operativo,vivienda 4 preju_2022_viviendas_calculada IDX" ON "preju_2022_viviendas_calculada" ("operativo", "vivienda");
-- policies

----
            INSERT INTO "preju_2022_viviendas_calculada" ("operativo","vivienda") 
              SELECT "operativo","vivienda" FROM "viviendas";

            INSERT INTO "preju_2022_tem_calculada" ("operativo","enc") 
              SELECT "operativo","enc" FROM "tem";

            INSERT INTO "preju_2022_visitas_calculada" ("operativo","vivienda","visita") 
              SELECT "operativo","vivienda","visita" FROM "visitas";

            INSERT INTO "preju_2022_visitas_sup_calculada" ("operativo","vivienda","visita") 
              SELECT "operativo","vivienda","visita" FROM "visitas_sup";

            INSERT INTO "preju_2022_hogares_calculada" ("operativo","vivienda","hogar") 
              SELECT "operativo","vivienda","hogar" FROM "hogares";

            INSERT INTO "preju_2022_hogares_sup_calculada" ("operativo","vivienda","hogar") 
              SELECT "operativo","vivienda","hogar" FROM "hogares_sup";

            INSERT INTO "preju_2022_personas_calculada" ("operativo","vivienda","hogar","persona") 
              SELECT "operativo","vivienda","hogar","persona" FROM "personas";

            INSERT INTO "preju_2022_personas_sup_calculada" ("operativo","vivienda","hogar","persona") 
              SELECT "operativo","vivienda","hogar","persona" FROM "personas_sup";

----
CREATE OR REPLACE FUNCTION base.gen_fun_var_calc() RETURNS TEXT
  LANGUAGE PLPGSQL AS
$GENERATOR$
declare
  v_sql text:=$THE_FUN$
CREATE OR REPLACE FUNCTION update_varcal_por_encuesta("p_operativo" text, "p_id_caso" text) RETURNS TEXT
  LANGUAGE PLPGSQL AS
$BODY$
BEGIN
-- Cada vez que se actualizan las variables calculadas, previamente se deben insertar los registros que no existan (on conflict do nothing)
-- de las tablas base (solo los campos pks), sin filtrar por p_id_caso para update_varcal o con dicho filtro para update_varcal_por_encuesta
    INSERT INTO "preju_2022_viviendas_calculada" ("operativo","vivienda") 
      SELECT "operativo","vivienda" FROM "viviendas" WHERE operativo=p_operativo AND "vivienda"=p_id_caso ON CONFLICT DO NOTHING;
    INSERT INTO "preju_2022_tem_calculada" ("operativo","enc") 
      SELECT "operativo","enc" FROM "tem" WHERE operativo=p_operativo AND "enc"=p_id_caso ON CONFLICT DO NOTHING;
    INSERT INTO "preju_2022_visitas_calculada" ("operativo","vivienda","visita") 
      SELECT "operativo","vivienda","visita" FROM "visitas" WHERE operativo=p_operativo AND "vivienda"=p_id_caso ON CONFLICT DO NOTHING;
    INSERT INTO "preju_2022_visitas_sup_calculada" ("operativo","vivienda","visita") 
      SELECT "operativo","vivienda","visita" FROM "visitas_sup" WHERE operativo=p_operativo AND "vivienda"=p_id_caso ON CONFLICT DO NOTHING;
    INSERT INTO "preju_2022_hogares_calculada" ("operativo","vivienda","hogar") 
      SELECT "operativo","vivienda","hogar" FROM "hogares" WHERE operativo=p_operativo AND "vivienda"=p_id_caso ON CONFLICT DO NOTHING;
    INSERT INTO "preju_2022_hogares_sup_calculada" ("operativo","vivienda","hogar") 
      SELECT "operativo","vivienda","hogar" FROM "hogares_sup" WHERE operativo=p_operativo AND "vivienda"=p_id_caso ON CONFLICT DO NOTHING;
    INSERT INTO "preju_2022_personas_calculada" ("operativo","vivienda","hogar","persona") 
      SELECT "operativo","vivienda","hogar","persona" FROM "personas" WHERE operativo=p_operativo AND "vivienda"=p_id_caso ON CONFLICT DO NOTHING;
    INSERT INTO "preju_2022_personas_sup_calculada" ("operativo","vivienda","hogar","persona") 
      SELECT "operativo","vivienda","hogar","persona" FROM "personas_sup" WHERE operativo=p_operativo AND "vivienda"=p_id_caso ON CONFLICT DO NOTHING;
----
    UPDATE preju_2022_hogares_calculada
        SET 
            cant_per = personas_agg.cant_per,
            cant_jefes = personas_agg.cant_jefes,
            cant_conyuges = personas_agg.cant_conyuges
        FROM "hogares"  
            ,LATERAL (
            SELECT
                count(nullif(true,false)) as cant_per,
                count(nullif(CASE WHEN "personas"."p4"=1 THEN true ELSE NULL END,false)) as cant_jefes,
                count(nullif(CASE WHEN "personas"."p4"=2 THEN true ELSE NULL END,false)) as cant_conyuges
            FROM "personas" JOIN "preju_2022_personas_calculada" using ("operativo","vivienda","hogar","persona")
                WHERE "hogares"."operativo"="personas"."operativo" 
                AND "hogares"."vivienda"="personas"."vivienda" 
                AND "hogares"."hogar"="personas"."hogar"
            ) as personas_agg
        WHERE "hogares"."operativo"="preju_2022_hogares_calculada"."operativo" 
            AND "hogares"."vivienda"="preju_2022_hogares_calculada"."vivienda" 
            AND "hogares"."hogar"="preju_2022_hogares_calculada"."hogar" 
            AND "hogares"."operativo"=p_operativo AND "hogares"."vivienda"=p_id_caso;

    UPDATE preju_2022_hogares_calculada
      SET 
            edadjefe = respondiente.edad,
            sexojefe = respondiente.sexo,
            sitconyjefe = respondiente.p5
    FROM hogares inner join viviendas using (operativo, vivienda) inner join preju_2022_viviendas_calculada using (operativo, vivienda)
        LEFT JOIN (
            SELECT operativo, vivienda, hogar, persona, respondiente.edad, respondiente.sexo, respondiente.p5
              FROM personas respondiente
              WHERE respondiente.persona=1
        ) respondiente ON respondiente.operativo=hogares.operativo AND respondiente.vivienda=hogares.vivienda AND respondiente.hogar=hogares.hogar  
    WHERE "hogares"."operativo"="preju_2022_hogares_calculada"."operativo" AND "hogares"."vivienda"="preju_2022_hogares_calculada"."vivienda" AND "hogares"."hogar"="preju_2022_hogares_calculada"."hogar" 
      AND "hogares"."operativo"=p_operativo AND "hogares"."vivienda"=p_id_caso;



    UPDATE preju_2022_viviendas_calculada
        SET 
            cant_vis = visitas_agg.cant_vis,
            cant_hog = hogares_agg.cant_hog
        FROM "viviendas"  
            ,LATERAL (
            SELECT
                count(nullif(true,false)) as cant_vis
                FROM "visitas" JOIN "preju_2022_visitas_calculada" using ("operativo","vivienda","visita")
                WHERE "viviendas"."vivienda"="visitas"."vivienda" 
                AND "viviendas"."operativo"="visitas"."operativo"
            ) as visitas_agg
            ,LATERAL (
            SELECT
                count(nullif(true,false)) as cant_hog
                FROM "hogares" JOIN "preju_2022_hogares_calculada" using ("operativo","vivienda","hogar")
                WHERE "viviendas"."operativo"="hogares"."operativo" AND "viviendas"."vivienda"="hogares"."vivienda"
            ) as hogares_agg
        WHERE "viviendas"."operativo"="preju_2022_viviendas_calculada"."operativo" 
            AND "viviendas"."vivienda"="preju_2022_viviendas_calculada"."vivienda" 
            AND "viviendas"."operativo"=p_operativo AND "viviendas"."vivienda"=p_id_caso;


----
  RETURN 'OK';
END;
$BODY$;
$THE_FUN$;
begin 
  -- TODO: hacer este reemplazo en JS
  execute v_sql;
  execute replace(replace(regexp_replace(replace(
    v_sql,
    $$update_varcal_por_encuesta("p_operativo" text, "p_id_caso" text) RETURNS TEXT$$, $$update_varcal("p_operativo" text) RETURNS TEXT$$),
    $$(.* )".*"\."vivienda"=p_id_caso(.*)$$, $$\1TRUE\2$$,'gm'),
    $$"enc"=p_id_caso$$, $$TRUE$$),
    $$"vivienda"=p_id_caso$$, $$TRUE$$);
  return '2GENERATED';
end;
$GENERATOR$;        
----
perform gen_fun_var_calc();
----
UPDATE operativos SET calculada=now()::timestamp(0) WHERE operativo='PREJU_2022';
UPDATE tabla_datos SET generada=now()::timestamp(0) WHERE operativo='PREJU_2022' AND tipo='calculada';
----
end;
$SQL_DUMP$;--- generado: Tue May 03 2022 19:09:04 GMT-0300 (hora estándar de Argentina)

select update_varcal('PREJU_2022');
