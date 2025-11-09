/* Module: Utils */

function showToast(message){
  var toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast active';
  setTimeout(function(){ toast.className = 'toast'; }, 3000);
}

function showLoader(){ document.getElementById('loader').className = 'loader active'; }
function hideLoader(){ document.getElementById('loader').className = 'loader'; }

function validateUUID(uuid){
  var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function getSessionUUID(){
  var params = new URLSearchParams(window.location.search);
  var uuid = params.get('session') || params.get('uuid');
  if (uuid && validateUUID(uuid)) return uuid;
  return null;
}

function padNumber(num, size){ 
  var s = '000'+num; 
  return s.substr(s.length - size); 
}

function debounce(fn, wait){
  var t=null;
  return function(){ 
    var ctx=this, args=arguments; 
    clearTimeout(t); 
    t=setTimeout(function(){ fn.apply(ctx,args); }, wait); 
  };
}

function ensureSession(){
  if(!sessionUUID){ 
    showToast('UUID de session manquant dans l URL'); 
    return false; 
  }
  return true;
}

function dataURLtoBlob(dataUrl){
  var parts=dataUrl.split(',');
  var contentType=parts[0].match(/:(.*?);/)[1];
  var raw=atob(parts[1]); 
  var arr=new Uint8Array(raw.length);
  for (var i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i);
  return new Blob([arr], {type:contentType});
}
