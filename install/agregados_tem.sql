set search_path=base;

alter table tem 
add column "libre" boolean default true, 
add column "fecha_bloqueo" timestamp;