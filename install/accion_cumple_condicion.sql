--set role to ggs2022_owner;
--set search_path=base;
CREATE OR REPLACE FUNCTION accion_cumple_condicion(p_operativo text, p_estado text, p_enc text, p_eaccion text, p_condicion text)
RETURNS boolean AS
$BODY$
DECLARE
    v_sent text; 
    v_cond text;
    v_salida integer;
BEGIN
 v_cond=p_condicion;
 v_sent=' select 1 
    from base.tareas_tem t
    inner join base.estados_acciones ea using (operativo, estado, tarea)
    inner join tem te using (operativo,enc)
    left join sincronizaciones s on t.cargado_dm=s.token
	  left join viviendas v on (te.operativo =  v.operativo and te.enc = v.vivienda)
    left join no_rea nr on (te.norea::text = nr.no_rea)
    where t.operativo='||quote_literal(p_operativo)||
    ' and t.estado='||quote_literal(p_estado)||
    ' and t.enc='||quote_literal(p_enc)||
    ' and ea.eaccion='||quote_literal(p_eaccion)||
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