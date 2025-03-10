set search_path = base;

alter table tem add column "token_autogenerado_dm" text; 
alter table tem add column "enc_autogenerado_dm" text;

alter table "tem" add constraint "token_autogenerado_dm<>''" check ("token_autogenerado_dm"<>'');
alter table "tem" add constraint "enc_autogenerado_dm<>''" check ("enc_autogenerado_dm"<>'');

alter table "tem" add constraint "autogenerado_dm_uk" unique ("token_autogenerado_dm", "enc_autogenerado_dm");