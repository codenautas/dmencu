//import * as QRCode from 'qrcode';
import {html, HtmlTag} from "js-to-html";
import { EtiquetaOpts } from "./tipos";

async function crearQr(text:string, width:number ):Promise<HTMLImageElement>{
    //@ts-ignore // QRCode es una funcion global
    var src = await QRCode.toDataURL(text,{width:width})
    var img = html.img({id:'imagen-qr', src}).create();
    return img;
}

export async function crearEtiqueta(etiquetaOpts:EtiquetaOpts, width:number ):Promise<HTMLDivElement>{
    var qrImg = await crearQr(etiquetaOpts.dgeyc.toUpperCase()+' '+etiquetaOpts.operativo+' '+etiquetaOpts.etiqueta, width);
    var div = html.div({class:'etiqueta'},[
        html.div({class:'columna'},[
            html.div({class:'codigo-qr'},[
                qrImg
            ]),
        ]),
        html.div({class:'columna'},[
            html.div({class:'logo-estadistica'},[
                html.img({src:'img/logo_etiqueta.jpg'}),
            ]),
            html.div({class:'texto-codigo'},[
                etiquetaOpts.etiqueta
            ]),
        ]),
        html.div({class:'columna-derecha'},[
            html.div({class:'etiqueta-derecha'},[
                html.img({src:'img/etiqueta_derecha.png'}),
            ]),
        ]),
    ]).create();
    return div
}