--set role <app>_owner;
set search_path = base;

-- versiones de los formularios que guarda y restaura el editor visual de metadatos (ver docs/editor-metadatos.md)

create sequence if not exists casilleros_versiones_seq start with 1;

create table if not exists casilleros_versiones (
    version bigint default nextval('casilleros_versiones_seq'::regclass) not null,
    operativo text not null,
    id_formulario text not null,
    cuando timestamp default current_timestamp,
    usuario text,
    descripcion text,
    casilleros jsonb not null,
    primary key (version),
    constraint "casilleros_versiones operativos REL" foreign key (operativo) references operativos (operativo) on update cascade
);

--grant select, insert, update, delete on casilleros_versiones to <app>_admin;
--grant usage on sequence casilleros_versiones_seq to <app>_admin;
