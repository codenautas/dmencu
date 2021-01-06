"use strict";

import {TableDefinition, TableContext} from "./types-dmencu";

export function personal_rol(context:TableContext):TableDefinition {
    var esEditable = context.user.rol==='admin' || context.puede.configurar.editar; 
    return {
        name: 'personal_rol',
        elementName: 'rol de la persona',
        editable: esEditable,
        fields: [
            { name: "persona"     , typeName: "integer" },
            { name: "rol"         , typeName: "text"    },
        ],
        primaryKey: ['persona','rol'],
        softForeignKeys:[
            {references:'personal', fields:['persona']},
            {references:'roles'   , fields:['rol']    },
        ],
        sql:{
            isTable:false,
            viewBody:`select idper as persona, rol
                from usuarios
                where idper is not null 
            union 
                select idper as persona, rol2
                from usuarios
                where idper is not null and rol2 is not null`,
        }
    };
}
