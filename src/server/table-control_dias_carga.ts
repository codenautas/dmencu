"use strict";

import {TableDefinition, TableContext, FieldDefinition, OtherTableDefs} from "./types-dmencu";
 
export function control_dias_carga(context:TableContext):TableDefinition {
    //var be=context.be;
    var puedeEditar = false;
    //se puede mejorar la forma de recuperar los nombres de los días desde dias_arreglo obtenida desde el sql
    var dias_nombre= ['','Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    return {   
        name:'control_dias_carga',
        elementName:'dias',
        editable:puedeEditar,
        fields:[
            {name:'operativo'            , typeName:'text'    , editable: false  , nullable: false, defaultValue: 'etoi211'},
            {name:'dominio'              , typeName:'integer' , editable: false  , nullable: false                         },
            {name:'cant_reas'            , typeName:'bigint'  , editable: false  , title: "Realizadas"   },
            {name:'cant_domingo'         , typeName:'bigint'  , editable: false  , title: dias_nombre[1] },
            {name:'cant_lunes'           , typeName:'bigint'  , editable: false  , title: dias_nombre[2] },
            {name:'cant_martes'          , typeName:'bigint'  , editable: false  , title: dias_nombre[3] },
            {name:'cant_miercoles'       , typeName:'bigint'  , editable: false  , title: dias_nombre[4] },
            {name:'cant_jueves'          , typeName:'bigint'  , editable: false  , title: dias_nombre[5] },
            {name:'cant_viernes'         , typeName:'bigint'  , editable: false  , title: dias_nombre[6] },
            {name:'cant_sabado'          , typeName:'bigint'  , editable: false  , title: dias_nombre[7] },
            
    ],
        primaryKey:["operativo",'dominio'],
        sql:{
            isTable:false,
            from:`(
            select a.operativo,a.dominio,array_agg(distinct dia||nombre) as dias_arreglo,
            count(*) filter (where rea=1) as cant_reas,  
            count(*) filter (where dia =1) as cant_domingo, 
            count(*) filter (where dia =2) as cant_lunes ,
            count(*) filter (where dia =3) as cant_martes ,
            count(*) filter (where dia =4) as cant_miercoles ,
            count(*) filter (where dia =5) as cant_jueves,
            count(*) filter (where dia =6) as cant_viernes ,
            count(*) filter (where dia =7) as cant_sabado 
            from (      
                select t.operativo,t.dominio,t.rea,dia,v.nombre
                 from tem t
                   left join hogares h on t.operativo=h.operativo and t.enc=h.vivienda
                   left join personas p on h.operativo=p.operativo and h.vivienda=p.vivienda and h.hogar=p.hogar
                   join variables_opciones v on t.operativo=v.operativo and v.variable='dia' and v.opcion=p.dia::text    
                   where t.rea=1 and t.operativo='UT_2023' and p.persona=h.cr_num_miembro
                   order by 1,2,3,4,5    
            )a 
            group by 1,2
            order by 1,2    
            )`,
        }

    };
}