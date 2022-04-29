set role preju_test2022_owner;
set role preju_capa2022_owner;
set role preju2022_owner;

drop schema if exists "comun" cascade;
create schema "comun";
grant usage on schema "comun" to "preju_test2022_admin";
grant create on schema "comun" to "preju_test2022_admin";

CREATE OR REPLACE FUNCTION comun.informado("P_valor" anyelement)
  RETURNS boolean AS
'SELECT $1 IS NOT NULL'
  LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION comun.informado("P_valor" text)
  RETURNS boolean AS
$BODY$SELECT $1 !~ '^\s*$' AND $1 IS NOT NULL$BODY$
  LANGUAGE sql IMMUTABLE;



--NSNC
CREATE OR REPLACE FUNCTION comun.nsnc("P_valor" anyelement)
  RETURNS boolean AS
'SELECT $1 IS NOT DISTINCT FROM -9'
  LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION comun.nsnc("P_valor" text)
  RETURNS boolean AS
$BODY$SELECT $1 IS NOT DISTINCT FROM '-9'$BODY$
  LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION comun.nsnc("P_valor" date)
  RETURNS boolean AS
$$SELECT $1 IS NOT DISTINCT FROM '0999-09-09'$$
  LANGUAGE sql IMMUTABLE;

--CON_DATO
CREATE OR REPLACE FUNCTION comun.con_dato("P_valor" anyelement)
  RETURNS boolean AS
'SELECT comun.informado($1) AND NOT comun.nsnc($1)'
  LANGUAGE sql IMMUTABLE;

--blanco
CREATE OR REPLACE FUNCTION comun.blanco("P_valor" anyelement)
  RETURNS boolean AS
'SELECT $1 IS NULL'
  LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION comun.blanco("P_valor" text)
  RETURNS boolean AS
$BODY$SELECT $1 IS NULL$BODY$
  LANGUAGE sql IMMUTABLE;

