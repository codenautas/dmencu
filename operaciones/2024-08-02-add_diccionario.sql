set search_path = base;
set role dmencu_owner; --cambiar owner de acuerdo a la instancia

create table "diccionario" (
  "diccionario" text, 
  "completo" boolean
, primary key ("diccionario")
);
grant select, insert, update, delete on "diccionario" to dmencu_admin;


create table "dicvar" (
  "diccionario" text, 
  "variable" text
, primary key ("diccionario", "variable")
);
grant select, insert, update, delete on "dicvar" to dmencu_admin;


create table "dictra" (
  "diccionario" text, 
  "origen" text, 
  "destino" integer
, primary key ("diccionario", "origen")
);
grant select, insert, update, delete on "dictra" to dmencu_admin;

alter table "diccionario" add constraint "diccionario<>''" check ("diccionario"<>'');
alter table "diccionario" alter column "diccionario" set not null;
alter table "dicvar" add constraint "diccionario<>''" check ("diccionario"<>'');
alter table "dicvar" alter column "diccionario" set not null;
alter table "dicvar" add constraint "variable<>''" check ("variable"<>'');
alter table "dicvar" alter column "variable" set not null;
alter table "dictra" add constraint "diccionario<>''" check ("diccionario"<>'');
alter table "dictra" alter column "diccionario" set not null;
alter table "dictra" add constraint "origen<>''" check ("origen"<>'');
alter table "dictra" alter column "origen" set not null;

alter table "dicvar" add constraint "dicvar diccionario REL" foreign key ("diccionario") references "diccionario" ("diccionario")  on update cascade;
alter table "dictra" add constraint "dictra diccionario REL" foreign key ("diccionario") references "diccionario" ("diccionario")  on update cascade;

create index "diccionario 4 dicvar IDX" ON "dicvar" ("diccionario");
create index "diccionario 4 dictra IDX" ON "dictra" ("diccionario");

CREATE OR REPLACE FUNCTION dic_tradu(
    p_dic text,
    p_origen text)
    RETURNS integer
    LANGUAGE 'sql'
    STABLE 
AS $BODY$
  select destino from dictra where diccionario=p_dic and origen=comun.cadena_normalizar(p_origen)
$BODY$;

CREATE OR REPLACE FUNCTION dic_parte(
    p_dic text,
    p_origen text,
    p_destino integer)
    RETURNS boolean
    LANGUAGE 'sql'
    STABLE 
AS $BODY$
  select p_origen ~* 
    ('(\m' || coalesce((select string_agg(origen, '\M|\m') 
      from dictra
      where diccionario=p_dic and destino=p_destino),'')|| '\M)' )
$BODY$;

do $SQL_ENANCE$
 begin
PERFORM enance_table('diccionario','diccionario');
PERFORM enance_table('dicvar','diccionario,variable');
PERFORM enance_table('dictra','diccionario,origen');
end
$SQL_ENANCE$;