function mostrarErrorEnConsola(error:Event, url?:string, lineNumber?:string) {
    var pre = document.getElementById('consola-errores');
    // @ts-ignore
    var message = error.message
    // @ts-ignore
    window.requireBroLogAll = pre;
    if(!pre){
        pre = document.createElement('pre');
        pre.textContent = 'Consola de errores';
        document.body.appendChild(pre)
        pre.id='consola-errores';
        pre.style.backgroundColor='#FBB';
    }
    pre.textContent += '\nERROR: ' + message;
    if(url || lineNumber){
        pre.textContent += '\n' + (url||'')+' / '+(lineNumber||'');
    }
}

window.addEventListener('load',function(){
    // @ts-ignore
    mostrarErrorEnConsola({message:'---------------- acá va el log y los errores ------------------'})
})

window.addEventListener("error", mostrarErrorEnConsola);
