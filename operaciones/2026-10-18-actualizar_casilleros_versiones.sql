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

-- restricciones, índice e historial de cambios como los deja el dump (his.changes_trg recibe la clave de la tabla)
alter table casilleros_versiones drop constraint if exists "operativo<>''";
alter table casilleros_versiones add constraint "operativo<>''" check (operativo<>'');
alter table casilleros_versiones drop constraint if exists "id_formulario<>''";
alter table casilleros_versiones add constraint "id_formulario<>''" check (id_formulario<>'');
alter table casilleros_versiones drop constraint if exists "usuario<>''";
alter table casilleros_versiones add constraint "usuario<>''" check (usuario<>'');
alter table casilleros_versiones drop constraint if exists "descripcion<>''";
alter table casilleros_versiones add constraint "descripcion<>''" check (descripcion<>'');
create index if not exists "operativo 4 casilleros_versiones IDX" on casilleros_versiones (operativo);
drop trigger if exists changes_trg on "casilleros_versiones";
create trigger changes_trg after insert or delete or update on "casilleros_versiones" for each row execute function his.changes_trg('version');

--grant select, insert, update, delete on casilleros_versiones to <app>_admin;
--grant usage on sequence casilleros_versiones_seq to <app>_admin;
