set search_path = base;

ALTER TABLE operativos
  ADD column habilitacion_boton_formulario jsonb default null;
UPDATE operativos
  SET habilitacion_boton_formulario= '{
    "F:I1":{
        "unidad_analisis":"personas",
        "expr_habilitar_boton":"r0 = 1",
        "habilitar_agregar_listo":false
    }
}'
where operativo = 'PRC_EAH2023';