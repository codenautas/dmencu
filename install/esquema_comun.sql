-- set role preju_test2022_owner;
-- set role preju_capa2022_owner;
--set role preju2022_owner;

drop schema if exists "comun" cascade;
create schema "comun";
--grant usage on schema "comun" to "preju2022_admin";
--grant create on schema "comun" to "preju2022_admin";

CREATE OR REPLACE FUNCTION comun.informado("P_valor" anyelement)
  RETURNS boolean AS
'SELECT $1 IS NOT NULL'
  LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION comun.informado("P_valor" text)
  RETURNS boolean AS
$BODY$SELECT $1 !~ '^\s*$' AND $1 IS NOT NULL$BODY$
  LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION comun.es_dia_1(
	p_fecha date)
    RETURNS boolean
    LANGUAGE 'sql'
    COST 100
    IMMUTABLE PARALLEL UNSAFE
AS $BODY$
  
SELECT coalesce(extract(DAY from $1::timestamp),1) is not distinct from 1; --la tabla por ahora no tiene la restriccion q no sea null este campo
$BODY$;

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

--es_par
CREATE OR REPLACE FUNCTION comun.es_par(p_valor anyelement)
    RETURNS boolean
    AS $BODY$select case when mod(p_valor,2)=0 then TRUE else FALSE end$BODY$
    LANGUAGE 'sql'
    IMMUTABLE ;

CREATE OR REPLACE FUNCTION comun.cadena_normalizar(
    p_cadena text)
    RETURNS text
    LANGUAGE 'sql'
    IMMUTABLE 
AS $BODY$
/*
-- Pruebas:
select entrada, esperado, comun.cadena_normalizar(entrada)
    , esperado is distinct from comun.cadena_normalizar(entrada)
  from (
  select 'hola' as entrada, 'HOLA' as esperado
  union select 'Cañuelas', 'CAÑUELAS'
  union select 'ÁCÉNTÍTÓSÚCü','ACENTITOSUCU'
  union select 'CON.SIGNOS/DE-PUNTUACION    Y MUCHOS ESPACIOS','CON SIGNOS DE-PUNTUACION Y MUCHOS ESPACIOS'
  union select 'CONÁÀÃÄÂáàãäâ   A', 'CONAAAAAAAAAA A'
  union select 'vocalesÁÒöÈÉüÙAeùúÍî?j', 'VOCALESAOOEEUUAEUUII J'
  union select 'ÅåÕõ.e', 'AAOO E'
) casos
  where esperado is distinct from comun.cadena_normalizar(entrada);
*/
  select upper(trim(regexp_replace(translate ($1, 'ÁÀÃÄÂÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛáàãäâåéèëêíìïîóòöôõúùüûçÇ¿¡!:;,?¿"./,()_^[]*$', 'AAAAAAEEEEIIIIOOOOOUUUUaaaaaaeeeeiiiiooooouuuu                      '), ' {2,}',' ','g')));
$BODY$;