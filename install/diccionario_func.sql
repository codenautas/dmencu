--funciones para diccionarios
-- TODO Mejorar dic_parte

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
