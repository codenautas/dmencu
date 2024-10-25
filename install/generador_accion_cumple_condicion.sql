--set search_path= base, his, comun;
--set role esede241_owner;

CREATE OR REPLACE FUNCTION regenerar_accion_cumple_condicion_trg()
  RETURNS trigger 
  LANGUAGE plpgsql AS
$CREATOR$
DECLARE
  xcase_condiciones TEXT;
  v_sql text := $SQL_CON_TAG$

CREATE OR REPLACE FUNCTION accion_cumple_condicion(
    p_operativo text,
    p_estado text,
    p_enc text,
    p_eaccion text,
    p_condicion text)
    RETURNS boolean
    LANGUAGE SQL
    STABLE
AS $SQL$    
    -- ¡ATENCIÓN! NO MODIFICAR MANUALMENTE ESTA FUNCIÓN FUE GENERADA CON EL SCRIPT generador_accion_cumple_condicion_v2.sql
  select true
    from base.tareas_tem t
    inner join base.estados_acciones ea using (operativo, estado)
    inner join tem te using (operativo,enc)
    left join no_rea nr on (te.norea::text = nr.no_rea)
    left join tareas_tem tta on (te.operativo = tta.operativo and te.enc = tta.enc and te.tarea_actual = tta.tarea)
    where t.operativo = p_operativo
    and t.estado = p_estado
    and t.enc = p_enc
    and ea.eaccion = p_eaccion
    and te.habilitada
    and
    -- COMIENZA LA PARTE GENERADA DINÁMICAMENTE:
      /**xcase_condiciones**/
    -- FIN DE LA GENERADA DINÁMICAMENTE:
    ;
    $SQL$;

$SQL_CON_TAG$;
BEGIN

 SELECT 'CASE p_condicion' || 
    string_agg(distinct chr(10) || lpad(' ',8)|| 'WHEN ' || quote_literal(condicion) || ' THEN ' || condicion, '') 
    ||chr(10) ||lpad(' ',6)|| 'END'
  INTO xcase_condiciones 
  FROM base.estados_acciones;
  
  execute replace(v_sql,'/**xcase_condiciones**/',xcase_condiciones);
  RETURN new;
END;
$CREATOR$;

CREATE OR REPLACE TRIGGER update_accion_cumple_condicion_trg
    AFTER UPDATE of condicion
    ON base.estados_acciones
    FOR EACH ROW
    EXECUTE FUNCTION base.regenerar_accion_cumple_condicion_trg();

--regenerar la primera vez (ya que se cargan antes en el dump los estados_acciones)
with aux as (select * from estados_acciones limit 1)
update estados_acciones ea
  set condicion=aux.condicion
  from aux 
  where ea.operativo= aux.operativo and
    ea.estado=aux.estado and 
    ea.eaccion=aux.eaccion and
    ea.estado_destino=aux.estado_destino    