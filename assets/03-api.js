/* Module: API Functions */

function resetRemote(){ 
  if(!sessionUUID) return; 
  fetch('api/reset/'+sessionUUID,{method:'POST'}); 
}

function apiPostJSON(url, obj){
  return fetch(url, { 
    method:'POST', 
    headers:{'Content-Type':'application/json'}, 
    body: JSON.stringify(obj) 
  });
}

function apiPostForm(url, form){
  return fetch(url, { method:'POST', body: form });
}

function saveMeta(){
  if(!ensureSession()) return;
  var metaOnly = {
    uuid: sessionUUID,
    title: meta.title || '',
    description: meta.description || '',
    labels: documentLabels.map(function(l){ return { text: l.text, color: l.color }; }),
    pages: photos.map(function(p, i){
      return {
        index: i+1,
        filename: p.filename || ('page_'+padNumber(i+1,3)+'.jpg'),
        category: p.category || 'autre',
        ocrStatus: p.ocrStatus,
        ocrConfidence: p.ocrConfidence || 0,
        extractedText: p.extractedText || ''
      };
    })
  };
  var url = BASE_API + '/meta/' + sessionUUID;
  apiPostJSON(url, metaOnly).catch(function(){ showToast('Erreur lors de l upload'); });
}

var saveMetaDebounced = debounce(saveMeta, 500);

function uploadSinglePhoto(photo){
  if(!ensureSession()) return;
  var form = new FormData();
  var blob = dataURLtoBlob(photo.dataUrl);
  var filename = photo.filename || ('page_'+padNumber(photos.indexOf(photo)+1,3)+'.jpg');
  form.append('file', blob, filename);
  form.append('meta', JSON.stringify({
    title: meta.title || '',
    description: meta.description || '',
    labels: documentLabels
  }));
  apiPostForm(BASE_API + '/file/' + sessionUUID, form)
    .then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(resp){ 
      try{ 
        if(resp && resp.saved_files && resp.saved_files.length){ 
          photo.filename = resp.saved_files[0]; 
        } 
      }catch(e){} 
      saveMetaDebounced(); 
      try{ 
        if(window.__lastUploadToast!==true){ 
          showToast('Image enregistree'); 
          window.__lastUploadToast=true; 
          setTimeout(function(){ window.__lastUploadToast=false; }, 1500);
        } 
      }catch(e){} 
    })
    .catch(function(){ showToast('Erreur lors de l upload'); });
}

function deleteRemotePhoto(photo){
  if(!ensureSession()) return;
  if(!photo.filename){ return; }
  var form = new FormData();
  form.append('filename', photo.filename);
  apiPostForm(BASE_API + '/delete/' + sessionUUID, form)
    .then(function(r){ if(!r.ok) throw 0; })
    .then(function(){ 
      saveMetaDebounced(); 
      try{ 
        if(window.__lastUploadToast!==true){ 
          showToast('Image enregistree'); 
          window.__lastUploadToast=true; 
          setTimeout(function(){ window.__lastUploadToast=false; }, 1500);
        } 
      }catch(e){} 
    })
    .catch(function(){ showToast('Erreur lors de l upload'); });
}

function saveOrder(){
  if(!ensureSession()) return;
  var order = photos.map(function(p){ return p.filename || ''; });
  apiPostJSON(BASE_API + '/reorder/' + sessionUUID, {order: order})
    .then(function(r){ if(!r.ok) throw 0; })
    .catch(function(){ showToast('Erreur lors de l upload'); });
}

function attachFile(blob, name){
  if(!ensureSession()) return;
  var form = new FormData();
  form.append('file', blob, name || 'attachment');
  apiPostForm(BASE_API + '/attach/' + sessionUUID, form)
    .then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(resp){
      var saved = (resp && resp.attachments) ? resp.attachments : [];
      if (saved && saved.length){
        saved.forEach(function(nm){
          attachments.push({ name: nm });
        });
        renderAttachments(); 
        saveMetaDebounced();
      }
    })
    .catch(function(){ showToast('Erreur lors de lupload'); });
}

function detachAttachment(att){
  if(!ensureSession() || !att || !att.name) return;
  var form = new FormData();
  form.append('filename', att.name);
  apiPostForm(BASE_API + '/detach/' + sessionUUID, form)
    .then(function(r){ if(!r.ok) throw 0; })
    .then(function(){
      attachments = attachments.filter(function(x){ return x.name !== att.name; });
      renderAttachments(); 
      saveMetaDebounced();
    })
    .catch(function(){ showToast('Erreur lors de lupload'); });
}

function loadExistingSession(){
  if(!sessionUUID) return Promise.resolve();
  return fetch(BASE_API + '/read/' + sessionUUID, { method:'GET' })
    .then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(resp){
      if(!resp || !resp.ok || !resp.config) return;
      var cfg = resp.config;
      meta.title = (cfg.title || '');
      meta.description = (cfg.description || '');
      document.getElementById('doc-title').value = meta.title;
      document.getElementById('doc-desc').value = meta.description;
      documentLabels = Array.isArray(cfg.labels) ? cfg.labels : [];
      renderLabels();
      attachments = Array.isArray(cfg.attachments) ? cfg.attachments.map(function(a){ return {name:a.name}; }) : [];
      renderAttachments();
      
      var pages = Array.isArray(cfg.pages) ? cfg.pages : null;
      var filesMap = {};
      if (Array.isArray(resp.files)) {
        resp.files.forEach(function(f){ filesMap[f.name] = f; });
      }

      var toUse = [];
      if (pages && pages.length){
        pages.forEach(function(p){
          var fname = p.filename || p.name || '';
          if (fname && filesMap[fname]) toUse.push(filesMap[fname]);
        });
      } else if (cfg.files && cfg.files.length) {
        cfg.files.forEach(function(f){
          var name = f.name || '';
          if (name && filesMap[name]) toUse.push(filesMap[name]);
        });
      } else {
        toUse = resp.files || [];
      }

      photos = toUse.filter(function(f){ return (f.mime||'').indexOf('image/')===0; }).map(function(f, idx){
        return {
          dataUrl: f.url,
          name: f.name,
          type: f.mime,
          filename: f.name,
          extractedText: '',
          category: 'autre',
          ocrStatus: 'done',
          ocrConfidence: 0
        };
      });
      
      if(photos.length > 0 && documentLabels.length > 0){
        labelsAutoCalculated = true;
      }
      
      renderGrid();
    })
    .catch(function(){});
}
