/* Module: Category & Text Functions */

function extractYear(text){
  if (!text) return null;
  var yearPatterns=[
    /\b(20[0-2][0-9])\b/g,
    /\b(19[789][0-9])\b/g,
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](20[0-2][0-9])/g,
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]([0-2][0-9])/g,
    /(20[0-2][0-9])[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
    /(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(20[0-2][0-9])/gi,
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(20[0-2][0-9])/gi
  ];
  var years=[]; 
  for (var i=0;i<yearPatterns.length;i++){ 
    var m=text.match(yearPatterns[i]); 
    if(m){ 
      for(var j=0;j<m.length;j++){ 
        var mm=m[j]; 
        var y=mm.match(/\b(20[0-2][0-9])\b/)||mm.match(/\b([0-2][0-9])\b/); 
        if(y){ 
          var yy=y[1]; 
          if(yy.length===2){ yy='20'+yy;} 
          var yn=parseInt(yy); 
          if(yn>=1990 && yn<=2030){ years.push(yn);}
        }
      }
    }
  } 
  if(years.length===0) return null; 
  var counts={},best=null,max=0; 
  years.forEach(function(y){
    counts[y]=(counts[y]||0)+1;
    if(counts[y]>max){
      max=counts[y];
      best=y;
    }
  }); 
  return best;
}

function getCurrentYear(){ 
  return new Date().getFullYear().toString(); 
}

function categorizeText(text){
  if(!text) return 'autre'; 
  var lower=text.toLowerCase();
  for (var cat in CATEGORIES_CONFIG){ 
    if(cat==='autre') continue; 
    var conf=CATEGORIES_CONFIG[cat]; 
    for(var i=0;i<conf.keywords.length;i++){ 
      if(lower.indexOf(conf.keywords[i])!==-1) return cat; 
    } 
  }
  return 'autre';
}

function getCategoryLabel(c){ 
  var conf=CATEGORIES_CONFIG[c]; 
  if(!conf) return 'Autre'; 
  return conf.label[currentLanguage]||conf.label['fr']; 
}

function getCategoryColor(c){ 
  var conf=CATEGORIES_CONFIG[c]; 
  if(!conf) return '#8E8E93'; 
  return conf.color; 
}

function getCategoryIcon(c){ 
  var conf=CATEGORIES_CONFIG[c]; 
  if(!conf) return '📎'; 
  return conf.icon||'📎'; 
}
