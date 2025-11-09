/* Module: Labels Management */

function renderLabels(){
  var list=document.getElementById('labels-list');
  list.innerHTML='';
  if(documentLabels.length===0){ 
    list.innerHTML='<div class="labels-empty">Aucun label</div>'; 
    return; 
  }
  documentLabels.forEach(function(l,idx){
    var chip=document.createElement('div'); 
    chip.className='label-chip'; 
    chip.style.borderColor=l.color;
    
    var dot=document.createElement('div'); 
    dot.className='label-chip-dot'; 
    dot.style.background=l.color;
    
    var text=document.createElement('span'); 
    text.className='label-chip-text'; 
    text.textContent=l.text;
    
    var rm=document.createElement('button'); 
    rm.className='label-chip-remove'; 
    rm.innerHTML='<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
    rm.onclick=function(){ 
      documentLabels.splice(idx,1); 
      renderLabels(); 
      saveMetaDebounced(); 
    };
    
    chip.appendChild(dot); 
    chip.appendChild(text); 
    chip.appendChild(rm); 
    list.appendChild(chip);
  });
}

function showLabelForm(){
  var container=document.getElementById('label-form-container');
  if(container.innerHTML!==''){ 
    container.innerHTML=''; 
    isCustomLabelMode=false; 
    selectedLabelId=null; 
    return; 
  }
  
  var form=document.createElement('div'); 
  form.className='label-form';
  
  var title=document.createElement('div'); 
  title.className='label-form-title';
  title.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg> Choisissez un type de document';
  form.appendChild(title);
  
  var grid=document.createElement('div'); 
  grid.className='label-grid';
  
  for (var id in CATEGORIES_CONFIG){
    if(id==='autre') continue;
    (function(catId){
      var opt=document.createElement('div'); 
      opt.className='label-option';
      opt.setAttribute('data-category', catId);
      
      var icon=document.createElement('span'); 
      icon.className='label-option-icon'; 
      icon.textContent=getCategoryIcon(catId);
      
      var dot=document.createElement('div'); 
      dot.className='label-option-dot'; 
      dot.style.background=getCategoryColor(catId);
      
      var text=document.createElement('span'); 
      text.className='label-option-text'; 
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
  
  var customOpt=document.createElement('div'); 
  customOpt.className='label-option label-custom-option';
  customOpt.setAttribute('data-category', '__custom__');
  var customIcon=document.createElement('span'); 
  customIcon.className='label-option-icon'; 
  customIcon.textContent='✏️';
  var customText=document.createElement('span'); 
  customText.className='label-option-text'; 
  customText.textContent='Label personnalisé';
  customOpt.appendChild(customIcon); 
  customOpt.appendChild(customText);
  customOpt.onclick=function(){ selectLabelOption('__custom__', true); };
  grid.appendChild(customOpt);
  
  form.appendChild(grid);
  
  var input=document.createElement('input'); 
  input.type='text'; 
  input.className='label-custom-input'; 
  input.id='label-custom-input'; 
  input.placeholder='Saisir un label personnalisé...'; 
  input.style.display='none';
  input.onkeydown=function(e){ if(e.key==='Enter') saveLabel(); };
  form.appendChild(input);
  
  var actions=document.createElement('div'); 
  actions.className='label-form-actions';
  
  var save=document.createElement('button'); 
  save.className='label-form-btn save'; 
  save.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Ajouter';
  save.onclick=saveLabel;
  
  var cancel=document.createElement('button'); 
  cancel.className='label-form-btn cancel'; 
  cancel.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg> Annuler';
  cancel.onclick=function(){ 
    container.innerHTML=''; 
    isCustomLabelMode=false; 
    selectedLabelId=null; 
  };
  
  actions.appendChild(save); 
  actions.appendChild(cancel);
  form.appendChild(actions);
  
  container.innerHTML=''; 
  container.appendChild(form);
}

function selectLabelOption(catId, isCustom){
  var opts=document.querySelectorAll('.label-option');
  for(var i=0;i<opts.length;i++){ 
    opts[i].classList.remove('selected'); 
  }
  
  var opt=document.querySelector('.label-option[data-category="'+catId+'"]');
  if(opt){ 
    opt.classList.add('selected'); 
  }
  
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
    if(!labelText){ 
      showToast('Veuillez saisir un label'); 
      return; 
    }
    labelColor='#8E8E93';
  } else {
    if(!selectedLabelId || selectedLabelId==='__custom__'){ 
      showToast('Veuillez sélectionner un type'); 
      return; 
    }
    labelText=getCategoryLabel(selectedLabelId); 
    labelColor=getCategoryColor(selectedLabelId);
  }
  
  if(documentLabels.some(function(l){ 
    return l.text.toLowerCase()===labelText.toLowerCase(); 
  })){
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

function addAutoLabels(){
  if(photos.length===0){ 
    documentLabels=[]; 
    renderLabels(); 
    return; 
  }
  
  var allTexts=photos.map(function(p){
    return p.extractedText||'';
  }).join(' ');
  
  if(!allTexts.trim()){ 
    return;
  }
  
  var categories={}; 
  photos.forEach(function(p){ 
    if(p.category && p.category!=='autre'){ 
      categories[p.category]=(categories[p.category]||0)+1; 
    } 
  });
  
  var sorted=Object.keys(categories).sort(function(a,b){
    return categories[b]-categories[a];
  });
  
  documentLabels=[];
  
  for(var i=0;i<Math.min(3,sorted.length);i++){ 
    var id=sorted[i]; 
    documentLabels.push({ 
      text:getCategoryLabel(id), 
      color:getCategoryColor(id) 
    }); 
  }
  
  var detected=extractYear(allTexts); 
  var y=detected||getCurrentYear();
  documentLabels.push({ 
    text:String(y), 
    color:'#007AFF' 
  });
  
  renderLabels(); 
  saveMetaDebounced(); 
  showToast('Labels calculés automatiquement ✓');
}

function renderAttachments(){
  var list = document.getElementById('attachments-list');
  if(!list) return;
  list.innerHTML='';
  attachments.forEach(function(a, idx){
    var chip = document.createElement('div'); 
    chip.className='attachment-chip';
    
    var name = document.createElement('span'); 
    name.className='attachment-name'; 
    name.textContent=a.name;
    
    var rm = document.createElement('button'); 
    rm.className='attachment-remove'; 
    rm.innerHTML='<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
    rm.onclick=function(){ detachAttachment(a); };
    
    chip.appendChild(name); 
    chip.appendChild(rm); 
    list.appendChild(chip);
  });
}
