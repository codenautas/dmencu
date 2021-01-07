insert into roles_permisos(rol, permiso, accion, habilitado)
   select rol ,permiso, accion, predeterminado
     from roles r, permisos p
     where not exists (select 1 from roles_permisos x where x.rol=r.rol and x.permiso=p.permiso and x.accion=p.accion);