-- Actualizar: momentos_consistencia tiene clave foránea a operativos (on update cascade).
-- Sin ella, renombrar operativos.operativo falla en consistencias por "consistencias momentos_consistencia REL".
-- Correr con el owner de la base; reemplazar los nombres ficticios por los de la instalación.
--set role dmencu_owner;
set search_path = base;

alter table momentos_consistencia drop constraint if exists "momentos_consistencia operativos REL";
alter table momentos_consistencia add constraint "momentos_consistencia operativos REL"
  foreign key (operativo) references operativos (operativo) on update cascade;

create index if not exists "operativo 4 momentos_consistencia IDX" ON "momentos_consistencia" ("operativo");
