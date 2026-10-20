-- Desverificación excepcional de encuestas (grilla "desverificables" y procedimiento encuesta_desverificar_excepcional):
-- el historial guarda quién la hizo y por qué.
-- Correr con el owner de la base; reemplazar los nombres ficticios por los de la instalación.
--set role <app>_owner;
set search_path = base;

alter table historial_tem add column if not exists usuario_accion text;
alter table historial_tem add column if not exists motivo text;

-- el usuario admin (el que usa el backend) necesita poder modificar esas columnas
--grant update (estado, asignado, usuario_accion, motivo) on historial_tem to <app>_admin;
