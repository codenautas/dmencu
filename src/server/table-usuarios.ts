"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function usuarios(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name:'usuarios',
        title:'Usuarios de la Aplicación',
        editable:admin,
        fields:[
            {name:'usuario'          , typeName:'text'    , nullable:false  },
            {name:'idper'            , typeName:'text'    },
            {name:'rol'              , typeName:'text'    },
            {name:'md5clave'         , typeName:'text'    , allow:{select: context.forDump} },
            {name:'activo'           , typeName:'boolean' , nullable:false ,defaultValue:false},
            {name:'nombre'           , typeName:'text'                      },
            {name:'apellido'         , typeName:'text'                      },
            {name:'telefono'         , typeName:'text'    , title:'teléfono'},
            {name:'interno'          , typeName:'text'                      },
            {name:'cuit'             , typeName:'text'                      },
            {name:'recepcionista'    , typeName:'text'                      },
            {name:'mail'             , typeName:'text'                      },
            {name:'mail_alternativo' , typeName:'text'                      },
            {name:'rol2'             , typeName:'text'                      },
            {name:'clave_nueva'      , typeName:'text', clientSide:'newPass', allow:{select:admin, update:true, insert:false}},
        ],
        primaryKey:['usuario'],
        constraints:[
            {constraintType:'unique', fields:['idper']},
            {constraintType:'unique', fields:['idper','rol']}
        ],
        foreignKeys:[
            {references:'roles', fields:['rol']},
            {references:'roles', fields:[{source:'rol2', target:'rol'}], alias:'rol2'},
            {references:'usuarios', fields:[{source:'recepcionista', target:'idper'}], alias:'recepcionista'}
        ],
        sql:{
            where:admin || context.forDump?'true':"usuarios.usuario = "+context.be.db.quoteNullable(context.user.usuario)
            /*
            where:` (${q(esSuperUser)} 
                or usuarios.rol= ${q(context.user.rol)}
                or exists (select rol_subordinado from roles_subordinados s where s.rol=${q(context.user.rol)} and usuarios.rol=s.rol_subordinado)                      
            )`
            */
        }
    };
}
