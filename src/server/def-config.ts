export const defConfig=`
server:
  port: 3068
  base-url: /dmencu
  session-store: memory
  skins:
    "":
      local-path: client/
    modern:
      local-path: node_modules/backend-skins/dist/
db:
  user: dmencu_admin
  motor: postgresql
  host: localhost
  database: dmencu_db
  schema: base
  search_path: [base, comun, his]
install:
  dump:
    db:
      owner: dmencu_owner
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
      - sincro_tareas_areas_tareas_tem_trg.sql
      - sincronizacion_tareas_tem.sql
      - sincronizacion_tem.sql
      - control_disform_cerrado_trg.sql
      - control_cargado_tareas_tem_trg.sql
      - generador_accion_cumple_condicion.sql
      - tarea_cumple_condicion.sql
      - momento_consistencia_cumple_condicion.sql
      - agregar_historial_tem_trg.sql
      - carga_inicial_tareas_tem.sql
      - validar_tareas_tem_trg.sql
      - asignar_desasignar_tareas_tem_trg.sql
      - desverificar_tarea_trg.sql
      - inicial_update_varcal_por_encuesta.sql
      - diccionario_func.sql
      - obtener_siguiente_contador_area.sql
login:
  infoFieldList: [usuario, rol, idper, muestra_encuestas_prod, muestra_encuestas_capa]
  table: usuarios
  userFieldName: usuario
  passFieldName: md5clave
  rolFieldName: rol
  activeClausule: activo
  lockedClausule: not activo
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
  title: SIEH 2.0
  cursors: true
  lang: es
  menu: true
  background-img: ../img/background-test.png
  grid-row-retain-moved-or-deleted: true
  deviceWidthForMobile: device-width
  user-scalable: no
  skin: modern
`