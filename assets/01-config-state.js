/* Module: Config & State */

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
var selectedLabelId = null;

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
