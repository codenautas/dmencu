create or replace function accion_cumple_condicion(operativo text, estado text, enc text, tarea text, eaccion text,condicion text)
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
	join base.estados_acciones ea on ea.operativo=ea.operativo and ea.eaccion='''||$5 ||''' and ea.estado=t.estado and ea.tarea=t.tarea 
	where t.operativo='''||$1||''' and t.estado='''||$2||'''  and t.enc='''||$3||'''  and t.tarea='''||$4||''' and '||vcond||';';
 raise notice 'esto %',vsent;
 execute vsent into vsalida;
 IF vsalida=1 THEN
    return true;
 ELSE
    return false;
 END IF;

END;
$BODY$