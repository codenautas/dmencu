--set role to ggs2022_owner;
--set search_path=base;
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
