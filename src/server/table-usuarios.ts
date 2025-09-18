"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function usuarios(context:TableContext):TableDefinition{
    var q = context.be.db.quoteLiteral;
    var rol = context.user.rol;
    var admin = rol ==='admin';
    var adminOCoord = admin||context?.puede?.campo?.administrar;
    return {
        name:'usuarios',
        title:'Usuarios de la Aplicación',
        editable:true,
        fields:[
            {name:'usuario'          , typeName:'text'    , nullable: false  },
            {name:'idper'            , typeName:'text'    , nullable: false  },
            {name:'rol'              , typeName:'text'    },
            {name:'md5clave'         , typeName:'text'    , allow:{select: context.forDump} },
            {name:'activo'           , typeName:'boolean' , nullable:false ,defaultValue:false},
            {name:'nombre'           , typeName:'text'    ,isName:true                  },
            {name:'apellido'         , typeName:'text'    ,isName:true                  },
            {name:'dispositivo'      , typeName:'text'    , nullable: true, isName: true },
            {name:'telefono'         , typeName:'text'    , title:'teléfono'},
            {name:'interno'          , typeName:'text'                      },
            {name:'cuit'             , typeName:'text'                      },
            {name:'recepcionista'    , typeName:'text'    , references: 'recepcionistas' },
            {name:'mail'             , typeName:'text'                      },
            {name:'mail_alternativo' , typeName:'text'                      },
            {name:'rol2'             , typeName:'text'    , editable: admin , visible:false},
            {name:'clave_nueva'      , typeName:'text', clientSide:'newPass', allow:{select:adminOCoord, update:true, insert:false}},
            {name:'muestra_encuestas_prod'  , typeName:'boolean',  editable:true, defaultDbValue:'true'},
            {name:'muestra_encuestas_capa'  , typeName:'boolean',  editable:true},
        ],
        primaryKey:['usuario'],
        constraints:[
            {constraintType:'unique', fields:['idper']},
            {constraintType:'unique', fields:['idper','rol']},
            {constraintType:'unique', fields:['dispositivo']},
            {consName:'muestra encuestas not false', constraintType:'check', expr:'muestra_encuestas_prod is not false and muestra_encuestas_capa is not false'}
        ],
        foreignKeys:[
            {references:'roles', fields:['rol']},
            {references:'roles', fields:[{source:'rol2', target:'rol'}], alias:'rol2'},
            {references:'usuarios', fields:[{source:'recepcionista', target:'idper'}], alias:'recepcionista'}
        ],
        sql:{
            where:admin || context.forDump?'true':// "usuarios.usuario = "+q(context.user.usuario)
            `usuarios.rol in (select rol_subordinado from roles_subordinados where rol = ${q(rol)})`
        },
        hiddenColumns: ['recepcionista__dispositivo'],
    };
}
