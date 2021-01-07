export const defConfig=`
server:
  port: 3068
  base-url: /dmencu
  session-store: memory
db:
  motor: postgresql
  host: localhost
  database: dmencu_db
  schema: base
  user: tedede_php
  search_path: 
  - base
  - encu
  - comun
install:
  dump:
    db:
      owner: tedede_owner
      apply-generic-user-replaces: true
    admin-can-create-tables: true
    enances: inline
    skip-content: true
    scripts:
      prepare:
      - ../node_modules/operativos/install/rel_tabla_relacionada.sql
      - esquema_comun.sql
      - esquema_comun_sin_dato.sql
      - esquema_comun_nsnc.sql
      - ../node_modules/meta-enc/install/prepare.sql
      - ../node_modules/varcal/install/wrappers.sql
      - ../node_modules/operativos/install/sql2tabla_datos.sql
      post-adapt: 
      - para-install.sql
      - ../node_modules/pg-triggers/lib/recreate-his.sql
      - ../node_modules/pg-triggers/lib/table-changes.sql
      - ../node_modules/pg-triggers/lib/function-changes-trg.sql
      - ../node_modules/pg-triggers/lib/enance.sql
      - ../node_modules/datos-ext/install/controlar_modificacion_estructura_cerrada.sql
      - ../node_modules/meta-enc/install/casilleros_orden_total_fun.sql
      - ../node_modules/meta-enc/install/casilleros_jerarquizados_fun.sql
      - ../node_modules/consistencias/install/try_sql.sql
      - esquema_dbo.sql 
      - varcal_manual/estructura.sql
      - varcal_manual/funcion_update.sql
      - fun_validar_tipodato.sql
      - desintegrarpk.sql
      - agregar_adjunto_carto_trg
      - tem_area_sincro_trg.sql
      - upd_operacion_area_tem_trg.sql
      - sincronizacion_tem.sql
login:
  infoFieldList: [usu_usu, usu_rol, usu_rol as rol, usu_rol_secundario]
  table: usuarios
  userFieldName: usu_usu
  passFieldName: usu_clave
  rolFieldName: usu_rol
  activeClausule: usu_activo
  lockedClausule: not usu_activo
  schema: encu
  plus:
    maxAge-5-sec: 5000    
    maxAge: 864000000
    maxAge-10-day: 864000000
    allowHttpLogin: true
    fileStore: false
    skipCheckAlreadyLoggedIn: true
    loginForm:
      formTitle: dmencu
      usernameLabel: usuario
      passwordLabel: clave
      buttonLabel: entrar
      formImg: img/login-lock-icon.png
    chPassForm:
      usernameLabel: usuario
      oldPasswordLabel: clave anterior
      newPasswordLabel: nueva clave
      repPasswordLabel: repetir nueva clave
      buttonLabel: Cambiar
      formTitle: Cambio de clave
  messages:
    userOrPassFail: el nombre de usuario no existe o la clave no corresponde
    lockedFail: el usuario se encuentra bloqueado
    inactiveFail: es usuario está marcado como inactivo
client-setup:
  title: DMENCU
  cursors: true
  lang: es
  menu: true
  operativo: DMENCU
  background-img: ../img/background-test.png
  deviceWidthForMobile: device-width
  user-scalable: no
  grid-buffer: wsql
  para_dm: true
`