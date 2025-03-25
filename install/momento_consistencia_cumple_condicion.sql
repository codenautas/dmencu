--set role to ggs2022_owner;
--set search_path=base;
CREATE OR REPLACE FUNCTION momento_consistencia_cumple_condicion(p_operativo text, p_enc text, p_usuario text, p_condicion text)
RETURNS boolean AS
$BODY$
DECLARE
    v_sent text; 
    v_cond text;
    v_salida integer;
BEGIN
 v_cond=p_condicion;
 v_sent='select 1
   from usuarios u, tem t
   where u.usuario = '||quote_literal(p_usuario)|| 
   ' and t.operativo = '||quote_literal(p_operativo)||
   ' and t.enc = '||quote_literal(p_enc)||
   ' and '||v_cond||';';
 --raise notice 'esto %',vsent;
 execute v_sent into v_salida;
 IF v_salida=1 THEN
    return true;
 ELSE
    return false;
 END IF;

END;
$BODY$
 LANGUAGE plpgsql VOLATILE;