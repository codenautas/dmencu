set search_path= base;
set role dmencu_owner;

insert into roles (rol,nombre,superuser) values ('recuperador','Recuperador',false);
insert into roles (rol,nombre,superuser) values ('supervisor','Supervisor',false);
update roles set rol='encuestador', nombre='Encuestador' where rol='relevador';

insert into roles_permisos(rol, permiso, accion, habilitado)
   select rol ,permiso, accion, predeterminado
     from roles r, permisos p
     where rol in ('recuperador','supervisor') and not exists (select 1 from roles_permisos x where x.rol=r.rol and x.permiso=p.permiso and x.accion=p.accion);

--falta revisar roles, permisos, roles_permisos
--???update roles_permisos set habilitado=true where rol in ('recuperador','supervisor')
--??  and permiso='campo'and accion='editar'

alter table areas rename column relevador to encuestador;

drop table if exists etiquetas;
drop table if exists planchas;
drop table if exists resultados_test;

alter table tareas_tem drop column if exists visitas;

