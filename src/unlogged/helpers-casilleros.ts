
import { date } from "best-globals";

export const helpersCasilleros = {
    null2zero(posibleNull: any) {
        if (posibleNull == null) {
            return 0;
        }
        return posibleNull;
    },
    div0err(numerador: number, denominador: number, pk: string) {
        if (denominador == 0) {
            throw new Error("Error en " + pk + " division por cero de " + numerador);
        }
        return numerador / denominador;
    },
    funs: {
        blanco(x: any) {
            return x !== 0 && !x
        },
        hoy() {
            return date.today().toDmy()
        },
        fecha_valida(x: string) {
            var formato_valido = /^([1-9]|0[1-9]|[12]\d|3[01])\/([1-9]|0[1-9]|1[012])\/20\d\d$/.test(x)
            var xDate: Date;
            var conversionOk: boolean;
            conversionOk = true;
            if (formato_valido) {
                const [d, m, y] = x.split('/');
                try {
                    xDate = new Date(`${y}/${m}/${d}`);
                } catch (err) {
                    conversionOk = false;
                }
            };
            //faltaria validar que no sea una fecha futura y que sea una fecha en el rango del operativo
            return formato_valido && conversionOk
        },
        mesanio_valido(x: string) {
            var formato_valido = /^([1-9]|0[1-9]|1[012])\/(19|20)\d\d$/.test(x)
            return formato_valido
        },
        informado(x: any) {
            return x !== undefined && x !== null && (!(x instanceof Array) || x.length !== 0)
                && (!(x instanceof Object) || Object.keys(x).length !== 0)
        },
        nsnc(x: any) {
            return x == -9
        },
        par(x: number) {
            return x % 2 == 0
        },
        edad_mes_annio_valido(edad: number, mesAnnio: string, fechaRealizacionDDMMYYYY: string) {
            var mesesDiferencia = (d1: Date, d2: Date) => {
                var months;
                months = (d2.getFullYear() - d1.getFullYear()) * 12;
                months -= d1.getMonth();
                months += d2.getMonth();
                return months <= 0 ? 0 : months;
            }
            var partesRealizacion = fechaRealizacionDDMMYYYY.split("/");
            //@ts-ignore las partes corresponden a una fecha válida
            var today = date.ymd(Number(partesRealizacion[2]), Number(partesRealizacion[1]), Number(partesRealizacion[0]))
            var partesMesAnnio = mesAnnio.split('/');
            //@ts-ignore las partes corresponden a una fecha válida
            var nacimiento = date.ymd(Number(partesMesAnnio[1]), Number(partesMesAnnio[0]), 1)
            //@ts-ignore RealDate es Date y se puede restar
            var diferenciaMeses = mesesDiferencia(nacimiento, today);
            var edadDecimales = diferenciaMeses / 12; //ej 36.5
            return (
                Math.floor(edadDecimales) == edad || //misma edad
                edadDecimales == edad + 1 //mes de tolerancia
            )
        },
        //copiar_campo_ua_rama(respuestasOrigen:Respuestas[], posicion:number, variableOrigen: IdVariable, camino:string, condicion:boolean){
        //    return condicion?(respuestasOrigen && respuestasOrigen[posicion-1] && respuestasOrigen[posicion-1][`${camino}`][variableOrigen]):null
        //    return condicion?eval(`respuestasOrigen[${posicion-1}].`+camino+'.'+variableOrigen):null;
        //}
        /*
        dbo:{
            datoFamiliar(encu:string,hog:number,per:number, dato:string){
                var xpersonas=personas;
                return encu==enc && hog==hogar && informado(xpersonas) && per<= xpersonas.length && per>=1 && !!xpersonas[per-1][dato]? xpersonas[per-1][dato]:null
            },
            edadfamiliar(encu:string,hog:number,per:number){
                var xpersonas=personas;
                return datoFamiliar(encu:string,hog:number,per:number,'edad')
            },
            existeindividual(encu:string,hog:number,per:number){
                var xpersonas=personas;
                return encu==enc && hog==hogar && !!personas && per<= personas.length && per>=1 && !!personas[per-1]['entreaind']
            },
            existemiembro(encu:string,hog:number,per:number){
                var xpersonas=personas;
                return encu==enc && hog==hogar && !!personas && per<= personas.length && per>=1
            },
            nroconyuges(encu:string,hog:number){
                var xpersonas=personas
                return xpersonas.filter( per->per.p4==2).length
            },
            nrojefes(encu:string,hog:number,per:number){
                return personas.filter( per->per.p4==1).length
            },
            parentescofamiliar(encu:string,hog:number,per:number){
                return datoFamiliar(encu:string,hog:number,per:number,'p4')
            },
            sexofamiliar(encu:string,hog:number,per:number){
                var xpersonas=personas;
                return encu==enc && hog==hogar && !!xpersonas && per<= xpersonas.length && per>=1 && !!xpersonas[per-1].sexo? xpersonas[per-1]['sexo']:null
            },
            sitconyjefe(encu:string,hog:number){
                return datoFamiliar(encu:string,hog:number,1,'p5')
            }
        } */
    }
};