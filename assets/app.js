/* Frontend logic extracted & refactored to standalone JS */
(function(){
  /* CONFIG */
function resetRemote(){ if(!sessionUUID) return; fetch('api/reset/'+sessionUUID,{method:'POST'}); }


  /* --- AUTOSAVE API --- */
  function apiPostJSON(url, obj){
    return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(obj) });
  }
  function apiPostForm(url, form){
    return fetch(url, { method:'POST', body: form });
  }
  function ensureSession(){
    if(!sessionUUID){ showToast('UUID de session manquant dans l URL'); return false; }
    return true;
  }
  function debounce(fn, wait){
    var t=null;
    return function(){ var ctx=this, args=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(ctx,args); }, wait); };
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
      .then(function(resp){ try{ if(resp && resp.saved_files && resp.saved_files.length){ photo.filename = resp.saved_files[0]; } }catch(e){} saveMetaDebounced(); try{ if(window.__lastUploadToast!==true){ showToast('Image enregistree'); window.__lastUploadToast=true; setTimeout(function(){ window.__lastUploadToast=false; }, 1500);} }catch(e){} })
      .catch(function(){ showToast('Erreur lors de l upload'); });
  }

  function deleteRemotePhoto(photo){
    if(!ensureSession()) return;
    if(!photo.filename){ return; }
    var form = new FormData();
    form.append('filename', photo.filename);
    apiPostForm(BASE_API + '/delete/' + sessionUUID, form)
      .then(function(r){ if(!r.ok) throw 0; })
      .then(function(){ saveMetaDebounced(); try{ if(window.__lastUploadToast!==true){ showToast('Image enregistree'); window.__lastUploadToast=true; setTimeout(function(){ window.__lastUploadToast=false; }, 1500);} }catch(e){} })
      .catch(function(){ showToast('Erreur lors de l upload'); });
  }


  function renderAttachments(){
    var list = document.getElementById('attachments-list');
    if(!list) return;
    list.innerHTML='';
    attachments.forEach(function(a, idx){
      var chip = document.createElement('div'); chip.className='attachment-chip';
      var name = document.createElement('span'); name.className='attachment-name'; name.textContent=a.name;
      var rm = document.createElement('button'); rm.className='attachment-remove'; rm.innerHTML='<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
      rm.onclick=function(){ detachAttachment(a); };
      chip.appendChild(name); chip.appendChild(rm); list.appendChild(chip);
    });
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
          renderAttachments(); saveMetaDebounced();
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
        renderAttachments(); saveMetaDebounced();
      })
      .catch(function(){ showToast('Erreur lors de lupload'); });
  }

  function saveOrder(){
    if(!ensureSession()) return;
    var order = photos.map(function(p){ return p.filename || ''; });
    apiPostJSON(BASE_API + '/reorder/' + sessionUUID, {order: order})
      .then(function(r){ if(!r.ok) throw 0; })
      .catch(function(){ showToast('Erreur lors de l upload'); });
  }

  var BASE_API = 'api';
  var CONFIG = {
    uploadUrl: '/api/upload/{uuid}',
    symlinkUrl: '/api/symlink/{uuid}',
    methodUpload: 'POST',
    methodSymlink: 'POST'
  };

  /* STATE */
  var photos = [];
  var sessionUUID = null;
  var draggedIndex = null;
  var ghostElement = null;
  var debugMode = false;
  var tesseractWorker = null;
  var ocrQueue = [];
  var isProcessingOCR = false;
  var documentLabels = [];
  var labelsAutoCalculated = false;
  var attachments = [];
  var isCustomLabelMode = false;
  var meta = { title: "", description: "" };
  var selectedLabelId = null;  // NEW: track selected label in form

  /* UTILS */
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
  function padNumber(num, size){ var s = '000'+num; return s.substr(s.length - size); }

  /* Categories config */
  var CATEGORIES_CONFIG = {
    "facture":{"label":{"fr":"Facture","en":"Invoice","de":"Rechnung"},"color":"#34C759","icon":"💰","keywords":["facture","invoice","rechnung","total ttc","tva","vat","mwst","montant","amount","betrag"]},
    "devis":{"label":{"fr":"Devis","en":"Quote","de":"Angebot"},"color":"#5AC8FA","icon":"📋","keywords":["devis","quote","angebot","estimation","offre"]},
    "bon-commande":{"label":{"fr":"Bon de commande","en":"Purchase order","de":"Bestellung"},"color":"#007AFF","icon":"🛒","keywords":["bon de commande","purchase order","bestellung","order"]},
    "contrat":{"label":{"fr":"Contrat","en":"Contract","de":"Vertrag"},"color":"#FF9500","icon":"📝","keywords":["contrat","contract","vertrag","accord","agreement","vereinbarung","convention","conditions generales","cgv","terms and conditions","agb"]},
    "fiche-paie":{"label":{"fr":"Fiche de paie","en":"Payslip","de":"Gehaltsabrechnung"},"color":"#5856D6","icon":"💵","keywords":["salaire","salary","gehalt","bulletin","paie","payslip","lohnabrechnung","remuneration","vergütung"]},
    "contrat-travail":{"label":{"fr":"Contrat de travail","en":"Employment contract","de":"Arbeitsvertrag"},"color":"#AF52DE","icon":"🤝","keywords":["contrat de travail","employment contract","arbeitsvertrag","cdi","cdd","avenant","amendment","nachtrag"]},
    "attestation":{"label":{"fr":"Attestation","en":"Certificate","de":"Bescheinigung"},"color":"#FF2D55","icon":"🎓","keywords":["certificat","certificate","bescheinigung","attestation","zeugnis"]},
    "juridique":{"label":{"fr":"Document juridique","en":"Legal document","de":"Rechtsdokument"},"color":"#AF52DE","icon":"⚖️","keywords":["mandat","mandate","vollmacht","procuration","power of attorney","proces-verbal","pv","protokoll","assemblee","assembly","versammlung","decision","beschluss"]},
    "technique":{"label":{"fr":"Fiche technique","en":"Datasheet","de":"Datenblatt"},"color":"#007AFF","icon":"🔧","keywords":["fiche technique","datasheet","datenblatt","specifications","spezifikationen","schema","schematic","plan","cad"]},
    "procedure":{"label":{"fr":"Procédure","en":"Procedure","de":"Prozedur"},"color":"#FF3B30","icon":"📖","keywords":["procedure","prozedur","mode d","anleitung","manuel"]},
    "rapport":{"label":{"fr":"Rapport","en":"Report","de":"Bericht"},"color":"#FF9500","icon":"📊","keywords":["rapport","report","bericht","intervention","einsatz"]},
    "formulaire":{"label":{"fr":"Formulaire","en":"Form","de":"Formular"},"color":"#FFCC00","icon":"📄","keywords":["formulaire","formular","form"]},
    "identite":{"label":{"fr":"Pièce d'identité","en":"ID document","de":"Ausweisdokument"},"color":"#AF52DE","icon":"🪪","keywords":["carte d","identite","identity","ausweis","passeport","passport","reisepass","permis","license","führerschein"]},
    "recu":{"label":{"fr":"Reçu","en":"Receipt","de":"Beleg"},"color":"#FFCC00","icon":"🧾","keywords":["recu","receipt","beleg","ticket","quittung","caisse","cash register","kasse"]},
    "autre":{"label":{"fr":"Autre","en":"Other","de":"Andere"},"color":"#8E8E93","icon":"📎","keywords":[]}
  };
  var currentLanguage = 'fr';

  function extractYear(text){
    if (!text) return null;
    var yearPatterns=[/\b(20[0-2][0-9])\b/g,/\b(19[789][0-9])\b/g,/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](20[0-2][0-9])/g,/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]([0-2][0-9])/g,/(20[0-2][0-9])[\/\-](\d{1,2})[\/\-](\d{1,2})/g,/(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(20[0-2][0-9])/gi,/(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(20[0-2][0-9])/gi];
    var years=[]; for (var i=0;i<yearPatterns.length;i++){ var m=text.match(yearPatterns[i]); if(m){ for(var j=0;j<m.length;j++){ var mm=m[j]; var y=mm.match(/\b(20[0-2][0-9])\b/)||mm.match(/\b([0-2][0-9])\b/); if(y){ var yy=y[1]; if(yy.length===2){ yy='20'+yy;} var yn=parseInt(yy); if(yn>=1990 && yn<=2030){ years.push(yn);}}}}} if(years.length===0) return null; var counts={},best=null,max=0; years.forEach(function(y){counts[y]=(counts[y]||0)+1;if(counts[y]>max){max=counts[y];best=y;}}); return best;
  }
  function getCurrentYear(){ return new Date().getFullYear().toString(); }
  function categorizeText(text){
    if(!text) return 'autre'; var lower=text.toLowerCase();
    for (var cat in CATEGORIES_CONFIG){ if(cat==='autre') continue; var conf=CATEGORIES_CONFIG[cat]; for(var i=0;i<conf.keywords.length;i++){ if(lower.indexOf(conf.keywords[i])!==-1) return cat; } }
    return 'autre';
  }
  function getCategoryLabel(c){ var conf=CATEGORIES_CONFIG[c]; if(!conf) return 'Autre'; return conf.label[currentLanguage]||conf.label['fr']; }
  function getCategoryColor(c){ var conf=CATEGORIES_CONFIG[c]; if(!conf) return '#8E8E93'; return conf.color; }
  function getCategoryIcon(c){ var conf=CATEGORIES_CONFIG[c]; if(!conf) return '📎'; return conf.icon||'📎'; }

  /* LABELS */
  function renderLabels(){
    var list=document.getElementById('labels-list');
    list.innerHTML='';
    if(documentLabels.length===0){ list.innerHTML='<div class="labels-empty">Aucun label</div>'; return; }
    documentLabels.forEach(function(l,idx){
      var chip=document.createElement('div'); chip.className='label-chip'; chip.style.borderColor=l.color;
      var dot=document.createElement('div'); dot.className='label-chip-dot'; dot.style.background=l.color;
      var text=document.createElement('span'); text.className='label-chip-text'; text.textContent=l.text;
      var rm=document.createElement('button'); rm.className='label-chip-remove'; rm.innerHTML='<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
      rm.onclick=function(){ documentLabels.splice(idx,1); renderLabels(); saveMetaDebounced(); };
      chip.appendChild(dot); chip.appendChild(text); chip.appendChild(rm); list.appendChild(chip);
    });
  }

  /* NEW IMPROVED LABEL FORM - Grid layout with visual cards */
  function showLabelForm(){
    var container=document.getElementById('label-form-container');
    if(container.innerHTML!==''){ container.innerHTML=''; isCustomLabelMode=false; selectedLabelId=null; return; }
    
    var form=document.createElement('div'); form.className='label-form';
    
    // Title
    var title=document.createElement('div'); title.className='label-form-title';
    title.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg> Choisissez un type de document';
    form.appendChild(title);
    
    // Grid of label options
    var grid=document.createElement('div'); grid.className='label-grid';
    
    // Add category options
    for (var id in CATEGORIES_CONFIG){
      if(id==='autre') continue;
      (function(catId){
        var opt=document.createElement('div'); 
        opt.className='label-option';
        opt.setAttribute('data-category', catId);
        
        var icon=document.createElement('span'); icon.className='label-option-icon'; 
        icon.textContent=getCategoryIcon(catId);
        
        var dot=document.createElement('div'); dot.className='label-option-dot'; 
        dot.style.background=getCategoryColor(catId);
        
        var text=document.createElement('span'); text.className='label-option-text'; 
        text.textContent=getCategoryLabel(catId);
        
        opt.appendChild(icon);
        opt.appendChild(dot);
        opt.appendChild(text);
        
        opt.onclick=function(){ 
          selectLabelOption(catId, false); 
        };
        grid.appendChild(opt);
      })(id);
    }
    
    // Custom option
    var customOpt=document.createElement('div'); 
    customOpt.className='label-option label-custom-option';
    customOpt.setAttribute('data-category', '__custom__');
    var customIcon=document.createElement('span'); customIcon.className='label-option-icon'; customIcon.textContent='✏️';
    var customText=document.createElement('span'); customText.className='label-option-text'; customText.textContent='Label personnalisé';
    customOpt.appendChild(customIcon); customOpt.appendChild(customText);
    customOpt.onclick=function(){ selectLabelOption('__custom__', true); };
    grid.appendChild(customOpt);
    
    form.appendChild(grid);
    
    // Custom input (hidden by default)
    var input=document.createElement('input'); 
    input.type='text'; 
    input.className='label-custom-input'; 
    input.id='label-custom-input'; 
    input.placeholder='Saisir un label personnalisé...'; 
    input.style.display='none';
    input.onkeydown=function(e){ if(e.key==='Enter') saveLabel(); };
    form.appendChild(input);
    
    // Actions
    var actions=document.createElement('div'); actions.className='label-form-actions';
    var save=document.createElement('button'); save.className='label-form-btn save'; 
    save.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Ajouter';
    save.onclick=saveLabel;
    var cancel=document.createElement('button'); cancel.className='label-form-btn cancel'; 
    cancel.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg> Annuler';
    cancel.onclick=function(){ container.innerHTML=''; isCustomLabelMode=false; selectedLabelId=null; };
    actions.appendChild(save); actions.appendChild(cancel);
    form.appendChild(actions);
    
    container.innerHTML=''; container.appendChild(form);
  }
  
  function selectLabelOption(catId, isCustom){
    // Remove previous selection
    var opts=document.querySelectorAll('.label-option');
    for(var i=0;i<opts.length;i++){ opts[i].classList.remove('selected'); }
    
    // Select this one
    var opt=document.querySelector('.label-option[data-category="'+catId+'"]');
    if(opt){ opt.classList.add('selected'); }
    
    selectedLabelId = catId;
    isCustomLabelMode = isCustom;
    
    var input=document.getElementById('label-custom-input');
    if(input){
      if(isCustom){ 
        input.style.display='block'; 
        input.focus(); 
      } else { 
        input.style.display='none'; 
      }
    }
  }
  
  function saveLabel(){
    var labelText='', labelColor='';
    
    if(isCustomLabelMode){
      var input=document.getElementById('label-custom-input'); 
      labelText=input.value.trim();
      if(!labelText){ showToast('Veuillez saisir un label'); return; }
      labelColor='#8E8E93';
    } else {
      if(!selectedLabelId || selectedLabelId==='__custom__'){ 
        showToast('Veuillez sélectionner un type'); 
        return; 
      }
      labelText=getCategoryLabel(selectedLabelId); 
      labelColor=getCategoryColor(selectedLabelId);
    }
    
    if(documentLabels.some(function(l){ return l.text.toLowerCase()===labelText.toLowerCase(); })){
      showToast('Ce label existe déjà'); 
      return; 
    }
    
    documentLabels.push({ text: labelText, color: labelColor });
    document.getElementById('label-form-container').innerHTML=''; 
    isCustomLabelMode=false; 
    selectedLabelId=null;
    renderLabels(); 
    saveMetaDebounced(); 
    showToast('Label ajouté ✓');
  }

  /* AUTO LABELS - Called automatically after OCR of pages 1, 2, or 3 */
  function addAutoLabels(){
    if(photos.length===0){ documentLabels=[]; renderLabels(); return; }
    
    var allTexts=photos.map(function(p){return p.extractedText||'';}).join(' ');
    if(!allTexts.trim()){ 
      return; // Don't show error, just skip silently for auto-calc
    }
    
    var categories={}; 
    photos.forEach(function(p){ 
      if(p.category && p.category!=='autre'){ 
        categories[p.category]=(categories[p.category]||0)+1; 
      } 
    });
    
    var sorted=Object.keys(categories).sort(function(a,b){return categories[b]-categories[a];});
    documentLabels=[];
    
    // Add top 3 categories
    for(var i=0;i<Math.min(3,sorted.length);i++){ 
      var id=sorted[i]; 
      documentLabels.push({ text:getCategoryLabel(id), color:getCategoryColor(id) }); 
    }
    
    // Add year
    var detected=extractYear(allTexts); 
    var y=detected||getCurrentYear();
    documentLabels.push({ text:String(y), color:'#007AFF' });
    
    renderLabels(); 
    saveMetaDebounced(); 
    showToast('Labels calculés automatiquement ✓');
  }

  /* OCR */
  function initTesseract(){
    if(tesseractWorker) return Promise.resolve(tesseractWorker);
    return Tesseract.createWorker().then(function(w){
      tesseractWorker=w; return w.loadLanguage('fra+eng');
    }).then(function(){ return tesseractWorker.initialize('fra+eng'); });
  }
  
  function calculateOtsuThreshold(data){
    var hist=new Array(256).fill(0), total=0;
    for(var i=0;i<data.length;i+=4){ hist[data[i]]++; total++; }
    var sum=0; for(var i=0;i<256;i++) sum+=i*hist[i];
    var sumB=0,wB=0,maxVar=0,thr=128;
    for(var t=0;t<256;t++){ wB+=hist[t]; if(wB===0) continue; var wF=total-wB; if(wF===0) break; sumB+=t*hist[t]; var mB=sumB/wB; var mF=(sum-sumB)/wF; var v=wB*wF*(mB-mF)*(mB-mF); if(v>maxVar){maxVar=v; thr=t;} }
    return thr;
  }
  
  function resizeImageForOCR(dataUrl,maxWidth){
    return new Promise(function(resolve){
      var img=new Image(); img.onload=function(){
        var w=img.width,h=img.height;
        if(w>maxWidth){ var r=maxWidth/w; w=maxWidth; h=h*r; }
        var canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; var ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0,w,h);
        var imageData=ctx.getImageData(0,0,w,h); var d=imageData.data;
        for(var i=0;i<d.length;i+=4){ var gray=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]; d[i]=d[i+1]=d[i+2]=gray; }
        var thr=calculateOtsuThreshold(d);
        for(var i=0;i<d.length;i+=4){ var v=d[i]; if(v<thr-20) v=0; else if(v>thr+20) v=255; else { var t=(v-(thr-20))/40; v=t*255; } d[i]=d[i+1]=d[i+2]=v; }
        ctx.putImageData(imageData,0,0);
        resolve(canvas.toDataURL('image/jpeg',0.9));
      }; img.src=dataUrl;
    });
  }
  
  function processOCRQueue(){
    if(isProcessingOCR || ocrQueue.length===0) return;
    isProcessingOCR=true; 
    var item=ocrQueue.shift();
    updatePhotoOCRStatus(item.index,'processing');
    
    resizeImageForOCR(item.dataUrl,1600).then(function(resized){
      return initTesseract().then(function(){ return tesseractWorker.recognize(resized); });
    }).then(function(result){
      photos[item.index].extractedText=result.data.text;
      photos[item.index].ocrConfidence=result.data.confidence;
      photos[item.index].category=categorizeText(result.data.text);
      photos[item.index].ocrStatus='done';
      updatePhotoOCRStatus(item.index,'done'); 
      renderGrid();
      
      // *** NEW: Auto-calculate labels after OCR of pages 1, 2, or 3 ***
      if ((item.index === 0 || item.index === 1 || item.index === 2) && !labelsAutoCalculated) {
        // Check if we have enough OCR data
        var ocrCount = 0;
        for(var i=0; i<Math.min(3, photos.length); i++){
          if(photos[i].ocrStatus === 'done') ocrCount++;
        }
        // Auto-calculate when first 1-3 pages are done
        if(ocrCount >= 1){
          labelsAutoCalculated = true;
          setTimeout(function(){ addAutoLabels(); }, 500);
        }
      }
      
      isProcessingOCR=false; 
      processOCRQueue();
    }).catch(function(){
      photos[item.index].ocrStatus='error'; 
      photos[item.index].extractedText=''; 
      photos[item.index].category='autre';
      updatePhotoOCRStatus(item.index,'error'); 
      isProcessingOCR=false; 
      processOCRQueue();
    });
  }
  
  function queueOCR(index,dataUrl){ ocrQueue.push({index:index,dataUrl:dataUrl}); processOCRQueue(); }
  
  function updatePhotoOCRStatus(index,status){
    photos[index].ocrStatus=status;
    var tile=document.querySelector('.tile[data-index="'+index+'"]'); if(!tile) return;
    var statusEl=tile.querySelector('.tile-ocr-status');
    if(!statusEl){ statusEl=document.createElement('div'); tile.appendChild(statusEl); }
    statusEl.className = status==='processing' ? 'tile-ocr-status processing' : 'tile-ocr-status';
    statusEl.textContent = status==='processing' ? 'OCR...' : (status==='done' ? 'OCR ✓' : 'OCR ✗');
    if(status==='done'){ setTimeout(function(){ if(statusEl&&statusEl.parentNode){ statusEl.parentNode.removeChild(statusEl);} }, 1500); }
  }

  /* FILE HANDLING */
  function addPhotos(files){
    for (var i=0;i<files.length;i++){
      var f=files[i], t=f.type;
      if(t.match('image.*')) processImageFile(f);
      else if(t==='application/pdf') processPDFFile(f);
      else if(t==='application/vnd.openxmlformats-officedocument.wordprocessingml.document' || t==='application/msword') processDocxFile(f);
    }
  }
  
  function processImageFile(file){
    var reader=new FileReader();
    reader.onload=function(e){
      var idx=photos.length;
      var fname = 'page_'+padNumber(idx+1,3)+'.jpg';
      photos.push({ dataUrl:e.target.result, name:file.name, type:file.type, filename: fname, extractedText:'', category:'autre', ocrStatus:'pending', ocrConfidence:0 });
      renderGrid(); 
      queueOCR(idx, e.target.result);
      uploadSinglePhoto(photos[idx]);
    };
    reader.readAsDataURL(file);
  }
  
  function processPDFFile(file){ 
    attachFile(file, file.name);
    var reader=new FileReader();
    reader.onload=function(e){
      if (typeof pdfjsLib==='undefined'){ showToast('PDF.js non chargé'); return; }
      pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      pdfjsLib.getDocument({data:e.target.result}).promise.then(function(pdf){
        var n=pdf.numPages;
        for (let p=1;p<=n;p++){
          pdf.getPage(p).then(function(page){
            var scale=2.0, viewport=page.getViewport({scale:scale});
            var canvas=document.createElement('canvas'), ctx=canvas.getContext('2d');
            canvas.height=viewport.height; canvas.width=viewport.width;
            page.render({canvasContext:ctx, viewport:viewport}).promise.then(function(){
              var dataUrl=canvas.toDataURL('image/jpeg',0.9);
              var idx=photos.length;
              var fname = 'page_'+padNumber(idx+1,3)+'.jpg';
              photos.push({ dataUrl:dataUrl, name:file.name+' - Page '+p, type:'image/jpeg', filename: fname, extractedText:'', category:'autre', ocrStatus:'pending', ocrConfidence:0 });
              renderGrid(); 
              queueOCR(idx, dataUrl);
              uploadSinglePhoto(photos[idx]);
            });
          });
        }
        showToast('PDF chargé: '+n+' page(s)');
      }).catch(function(){ showToast('Erreur lecture PDF'); });
    };
    reader.readAsArrayBuffer(file);
  }
  
  function processDocxFile(file){ 
    attachFile(file, file.name);
    var reader=new FileReader();
    reader.onload=function(e){
      if (typeof mammoth==='undefined'){ showToast('Mammoth non chargé'); return; }
      mammoth.extractRawText({ arrayBuffer:e.target.result }).then(function(result){
        var text=result.value; if(!text.trim()){ showToast('Document vide'); return; }
        var canvas=document.createElement('canvas'); canvas.width=800; canvas.height=1000; var ctx=canvas.getContext('2d');
        ctx.fillStyle='white'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='black'; ctx.font='14px Arial';
        var lines=text.split('\n'), y=30, lh=20;
        for (var i=0;i<lines.length && y<canvas.height-30;i++){ var line=lines[i], words=line.split(' '), cur='';
          for (var j=0;j<words.length;j++){ var test=cur+words[j]+' '; var w=ctx.measureText(test).width;
            if (w>canvas.width-60){ ctx.fillText(cur,30,y); cur=words[j]+' '; y+=lh; if (y>canvas.height-30) break; }
            else { cur=test; } }
          ctx.fillText(cur,30,y); y+=lh; }
        var dataUrl=canvas.toDataURL('image/jpeg',0.9);
        var idx=photos.length;
        var fname='page_'+padNumber(idx+1,3)+'.jpg';
        photos.push({ dataUrl:dataUrl, name:file.name, type:'image/jpeg', filename: fname, extractedText:text, category:categorizeText(text), ocrStatus:'done', ocrConfidence:100 });
        renderGrid(); 
        uploadSinglePhoto(photos[idx]);
        
        // Auto-calculate for docx too
        if (!labelsAutoCalculated && photos.length >= 1) { 
          labelsAutoCalculated = true;
          setTimeout(function(){ addAutoLabels(); }, 500);
        }
        showToast('Document Word chargé');
      }).catch(function(){ showToast('Erreur lecture DOCX'); });
    };
    reader.readAsArrayBuffer(file);
  }

  /* GRID RENDER + DND */
  function renderGrid(){
    var grid=document.getElementById('grid'); grid.innerHTML='';
    for (var i=0;i<photos.length;i++){ grid.appendChild(createPhotoTile(photos[i], i)); }
    grid.appendChild(createAddTile());
  }
  
  function createPhotoTile(photo, index){
    var tile=document.createElement('div'); tile.className='tile'; tile.setAttribute('data-index', index); tile.setAttribute('draggable','false');
    var img=document.createElement('img'); img.src=photo.dataUrl; img.alt='Page '+(index+1);
    var badge=document.createElement('div'); badge.className='tile-badge'; badge.textContent=index+1;
    var debug=document.createElement('div'); debug.className=debugMode?'tile-debug-text visible':'tile-debug-text'; debug.textContent=photo.extractedText||'(aucun texte détecté)';
    var del=document.createElement('button'); del.className='tile-delete'; del.setAttribute('aria-label','Supprimer la page '+(index+1));
    del.innerHTML='<svg fill="white" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    del.onclick=function(e){ e.stopPropagation(); deletePhoto(index); };
    tile.appendChild(img); tile.appendChild(badge); tile.appendChild(debug); tile.appendChild(del);
    if (photo.ocrStatus==='processing' || photo.ocrStatus==='pending'){ var s=document.createElement('div'); s.className=photo.ocrStatus==='processing'?'tile-ocr-status processing':'tile-ocr-status'; s.textContent=photo.ocrStatus==='processing'?'OCR...':'En attente'; tile.appendChild(s); }
    setupDragHandlers(tile, index);
    return tile;
  }
  
  function createAddTile(){
    var tile=document.createElement('div'); tile.className='tile tile-add';
    tile.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';
    tile.setAttribute('aria-label','Prendre une photo'); tile.onclick=function(){ document.getElementById('file-input').click(); };
    return tile;
  }
  
  function setupDragHandlers(tile, index){
    var startX=0,startY=0,isDragging=false;
    tile.addEventListener('pointerdown',function(e){ if(e.target.closest('.tile-delete')) return; startX=e.clientX; startY=e.clientY; isDragging=false; tile.setPointerCapture(e.pointerId); });
    tile.addEventListener('pointermove',function(e){
      if(!tile.hasPointerCapture(e.pointerId)) return;
      var dx=Math.abs(e.clientX-startX), dy=Math.abs(e.clientY-startY);
      if(!isDragging && (dx>10 || dy>10)){ isDragging=true; startDrag(tile,index,e); }
      if(isDragging){ moveDrag(e); }
    });
    tile.addEventListener('pointerup',function(e){ if(isDragging){ endDrag(e); } tile.releasePointerCapture(e.pointerId); });
    tile.addEventListener('pointercancel',function(e){ if(isDragging){ endDrag(e); } tile.releasePointerCapture(e.pointerId); });
  }
  
  function startDrag(tile, index, e){
    draggedIndex=index; tile.className='tile dragging';
    ghostElement=tile.cloneNode(true); ghostElement.className='tile drag-ghost'; ghostElement.style.width=tile.offsetWidth+'px'; ghostElement.style.height=tile.offsetHeight+'px';
    document.body.appendChild(ghostElement); moveDrag(e);
  }
  
  function moveDrag(e){
    if(!ghostElement) return; ghostElement.style.left=e.clientX+'px'; ghostElement.style.top=e.clientY+'px';
    var tiles=document.querySelectorAll('.tile:not(.tile-add):not(.dragging)');
    for (var i=0;i<tiles.length;i++){ var rect=tiles[i].getBoundingClientRect(); tiles[i].classList.remove('drag-over');
      if (e.clientX>=rect.left && e.clientX<=rect.right && e.clientY>=rect.top && e.clientY<=rect.bottom){ tiles[i].classList.add('drag-over'); }
    }
  }
  
  function endDrag(e){
    if(ghostElement){ document.body.removeChild(ghostElement); ghostElement=null; }
    var tiles=document.querySelectorAll('.tile'); var targetIndex=null;
    for (var i=0;i<tiles.length;i++){ if(tiles[i].classList.contains('drag-over')){ targetIndex=parseInt(tiles[i].getAttribute('data-index')); } tiles[i].classList.remove('dragging','drag-over'); }
    if(targetIndex!==null && targetIndex!==draggedIndex){ movePhoto(draggedIndex, targetIndex); }
    draggedIndex=null; renderGrid();
  }
  
  function movePhoto(from,to){ if(from===to) return; var it=photos.splice(from,1)[0]; photos.splice(to,0,it); renderGrid(); saveOrder(); saveMetaDebounced(); }
  
  function deletePhoto(idx){ 
    var removed = photos.splice(idx,1)[0]; 
    if(removed){ deleteRemotePhoto(removed); } 
    if(photos.length===0){ documentLabels=[]; labelsAutoCalculated=false; } 
    renderGrid(); 
    renderLabels(); 
    saveMetaDebounced(); 
    showToast('Photo supprimée'); 
  }

  /* Upload with metadata */
  function dataURLtoBlob(dataUrl){
    var parts=dataUrl.split(',');
    var contentType=parts[0].match(/:(.*?);/)[1];
    var raw=atob(parts[1]); var arr=new Uint8Array(raw.length);
    for (var i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i);
    return new Blob([arr], {type:contentType});
  }
  
  function buildMetadata(){
    var ocrMap = photos.map(function(p, i){
      return {
        index: i+1,
        filename: 'page_'+padNumber(i+1,3)+'.jpg',
        category: p.category || 'autre',
        ocrStatus: p.ocrStatus,
        ocrConfidence: p.ocrConfidence || 0,
        extractedText: p.extractedText || ''
      };
    });
    return {
      uuid: sessionUUID,
      title: meta.title || '',
      description: meta.description || '',
      labels: documentLabels.map(function(l){ return { text: l.text, color: l.color }; }),
      pages: ocrMap,
      page_count: photos.length,
      created_at: new Date().toISOString()
    };
  }
  
  function uploadAndSymlink(){
    if(!sessionUUID){ showToast('UUID de session manquant dans l URL'); return; }
    if(photos.length===0){ showToast('Aucune photo à uploader'); return; }
    showLoader();
    var formData=new FormData(); formData.append('uuid', sessionUUID);
    for (var i=0;i<photos.length;i++){ var blob=dataURLtoBlob(photos[i].dataUrl); var name='page_'+padNumber(i+1,3)+'.jpg'; formData.append('files[]', blob, name); }
    formData.append('meta', JSON.stringify(buildMetadata()));

    var uploadUrl=(BASE_API + '/upload/' + sessionUUID);
    fetch(uploadUrl, { method: CONFIG.methodUpload, body: formData })
      .then(function(r){ if(!r.ok) throw new Error('Upload failed'); return r.json(); })
      .then(function(){ var linkUrl=(BASE_API + '/symlink/' + sessionUUID); return fetch(linkUrl, { method: CONFIG.methodSymlink }); })
      .then(function(r){ if(!r.ok) throw new Error('Symlink failed'); hideLoader(); showToast('Upload terminé avec succès'); })
      .catch(function(){ hideLoader(); showToast('Erreur lors de lupload'); });
  }

  /* Debug */
  function toggleDebugMode(){}

  /* PWA manifest */
  function setupPWA(){
    var manifest={ name:'Document Photo', short_name:'DocPhoto', start_url:'.', display:'standalone', theme_color:'#4A90E2', background_color:'#ffffff',
      icons:[{ src:'data:image/svg+xml;base64,'+btoa('<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><rect width=\"512\" height=\"512\" fill=\"#4A90E2\"/><path fill=\"white\" d=\"M256 128c-70.7 0-128 57.3-128 128s57.3 128 128 128 128-57.3 128-128-57.3-128-128-128zm0 208c-44.2 0-80-35.8-80-80s35.8-80 80-80 80 35.8 80 80-35.8 80-80 80z\"/><circle fill=\"white\" cx=\"384\" cy=\"128\" r=\"32\"/></svg>'), sizes:'512x512', type:'image/svg+xml'}] };
    var blob=new Blob([JSON.stringify(manifest)], {type:'application/json'});
    var url=URL.createObjectURL(blob);
    document.getElementById('manifest-placeholder').setAttribute('href', url);
  }

  /* EVENTS */
  function bindEvents(){
    document.getElementById('btn-load').addEventListener('click', function(){ document.getElementById('file-load').click(); });
    document.getElementById('file-load').addEventListener('change', function(e){ if(e.target.files && e.target.files.length>0){ addPhotos(e.target.files); showToast(e.target.files.length+' fichier(s) chargé(s)'); } });
    document.getElementById('file-input').addEventListener('change', function(e){ if(e.target.files && e.target.files.length>0){ addPhotos(e.target.files); } });
    document.getElementById('btn-clear').addEventListener('click', function(){ if(photos.length===0){ showToast('Le document est déjà vide'); return; } if(confirm('Tout supprimer ?')){ resetRemote(); photos=[]; documentLabels=[]; labelsAutoCalculated=false; renderGrid(); renderLabels(); showToast('Document vide'); } });
    document.getElementById('btn-exit').addEventListener('click', function(){ if (photos.length>0){ if(confirm('Vous avez des photos non sauvegardees. Quitter ?')){ resetRemote(); window.close(); setTimeout(function(){ window.location.href='about:blank'; },100); } } else { window.close(); setTimeout(function(){ window.location.href='about:blank'; },100); } });
    document.getElementById('recalc-labels-btn').addEventListener('click', function(){ 
      if(photos.length===0){ showToast('Aucune photo disponible'); return; }
      addAutoLabels(); 
    });
    document.getElementById('add-label-btn').addEventListener('click', showLabelForm);
    
    var titleEl=document.getElementById('doc-title'); 
    var descEl=document.getElementById('doc-desc');
    
    titleEl.addEventListener('input', function(){ meta.title=this.value; saveMetaDebounced(); try{ if(window.__lastUploadToast!==true){ showToast('Image enregistree'); window.__lastUploadToast=true; setTimeout(function(){ window.__lastUploadToast=false; }, 1500);} }catch(e){} });
    descEl.addEventListener('input', function(){ meta.description=this.value; saveMetaDebounced(); try{ if(window.__lastUploadToast!==true){ showToast('Image enregistree'); window.__lastUploadToast=true; setTimeout(function(){ window.__lastUploadToast=false; }, 1500);} }catch(e){} });
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
        
        // If we loaded existing photos with labels, mark as calculated
        if(photos.length > 0 && documentLabels.length > 0){
          labelsAutoCalculated = true;
        }
        
        renderGrid();
      })
      .catch(function(){});
  }

  /* INIT */
  function init(){
    sessionUUID=getSessionUUID();
    loadExistingSession().then(function(){ renderGrid(); renderLabels(); });
    setupPWA(); bindEvents();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
