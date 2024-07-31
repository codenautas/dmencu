"use strict";

import {TableDefinition, TableContext, FieldDefinition, OtherTableDefs} from "./types-dmencu";

export function grilla_hoja_ruta(context:TableContext):TableDefinition {
    //var be=context.be;
    var puedeEditar = true;
    return {   
        name:'grilla_hoja_ruta',
        elementName:'hdr',
        //editable:puedeEditar,
        allow:{
            insert: false,
            delete: false,
            import: false,
            update: true,
        },
        fields:[
            {name:'operativo'            , typeName:'text'    , editable: false  , nullable: false, defaultValue: 'etoi211'},
            {name:'enc'                  , typeName:'text'    , editable: false  , nullable: false                       },
            {name: "cluster"             , typeName:'integer' , editable: false, isName:true},
            {name:'tarea_actual'         , typeName:'text'    , editable: false  },
            {name:'recepcionista'        , typeName:'text'    , editable: false , inTable: false  },
            {name:'asignado'             , typeName:'text'    , editable: false , inTable: false  },
            {name:'estado'               , typeName:'text'    , editable: false , nullable: false },
            {name:'area'                 , typeName:'integer' , editable: false  },
            {name:'zona'                 , typeName:'text'    , editable: false  },
            {name:'seleccionado_ant'     , typeName:'text'    , editable: false  },
            {name:'cita'                 , typeName:'text'    , editable:true , table: 'tem' },
            {name:'semana'               , typeName:'integer' , editable: false  ,visible: true   },
            {name:'codcalle'             , typeName:'integer' , editable: false  },
            {name:'nomcalle'             , typeName:'text'    , editable: false  },
            {name:'nrocatastral'         , typeName:'integer' , editable: false  },
            {name:'piso'                 , typeName:'text'    , editable: false  },
            {name:'departamento'         , typeName:'text'    , editable: false  },
            {name:'habitacion'           , typeName:'text'    , editable: false  },
            {name:'sector'               , typeName:'text'    , editable: false  },
            {name:'edificio'             , typeName:'text'    , editable: false  },
            {name:'entrada'              , typeName:'text'    , editable: false  },
            {name:'barrio'               , typeName:'text'    , editable: false  },
            {name:'codpos'               , typeName:'integer' , editable: false  },
           // {name:'dominio'              , typeName:'integer' , editable: false  },
            {name:'nrocomuna'            , typeName:'integer' , editable: false  },
            {name:'nrofraccion'          , typeName:'integer' , editable: false  },
            {name:'nroradio'             , typeName:'integer' , editable: false  },
            {name:'nromanzana'           , typeName:'integer' , editable: false  },
            {name:'nrolado'              , typeName:'integer' , editable: false  },
           // {name:'usodomicilio'         , typeName:'integer' , editable: false  },
           // {name:'participacion'        , typeName:'integer' , editable: false  ,visible: true  },
           // {name:'rotacion'             , typeName:'integer' , editable: false  ,visible: false  },
           // {name:'clase'                , typeName:'text'    , editable: false  ,visible: false  },
           // {name:'panel'                , typeName:'integer' , editable: false  ,visible: false  },
            {name:'casa'                 , typeName:'text'    , editable: false  },
            // concatenadas en obs
           // {name:'obsdatosdomicilio'    , typeName:'text'    , editable: false  },
           // {name:'obsconjunto'          , typeName:'text'    , editable: false  },
           // {name:'reserva'              , typeName:'integer' , editable: false  },
           // {name:'periodicidad'         , typeName:'text'    , editable: false  ,visible: true   },
            {name:'obs'                  , typeName:'text'    , editable: false  },
        ],
        hiddenColumns:['cluster','seleccionado_ant','cita'],
        primaryKey:["operativo",'enc'],
        foreignKeys:[
            {references:'areas'   , fields:['operativo', 'area']},
            {references:'tareas' , fields:[
                {source:'operativo', target:'operativo'},
                {source:'tarea_actual', target:'tarea'}
            ],
                alias:'latarea'
            },
          ],   
        sql:{
            isTable:false,
            from:`(
                select t.*, recepcionista, asignado, estado
                    from tem t
                    inner join tareas_tem tt
                    on (t.operativo=tt.operativo and  t.enc=tt.enc  and t.tarea_actual=tt.tarea)
                    order by t.enc
            )`,
        }

    };
}