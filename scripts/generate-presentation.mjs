import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";
import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);
const docs = new URL("../docs/", import.meta.url);
const checks = new URL("../storage/checks/", import.meta.url);
const blue = "01258F";
const grey = "465064";
const pdf = await PDFDocument.create();
pdf.setTitle("GALI BLUE - Site, reservations et equipe");
pdf.setAuthor("GALI BLUE");
pdf.setSubject("Guide de recette locale, cycle par appel et permissions");
const normal = await pdf.embedFont(StandardFonts.Helvetica);
const heading = await pdf.embedFont(StandardFonts.TimesRoman);
const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "GALI BLUE";
pptx.subject = "Site, reservations, equipe et recette locale";
pptx.title = "GALI BLUE - Presentation et cas d'usage";
pptx.lang = "fr-FR";
pptx.theme = { headFontFace: "Georgia", bodyFontFace: "Aptos", lang: "fr-FR" };

const reservations = JSON.parse(await readFile(new URL("booking-use-cases.json", checks), "utf8"));
const accounts = JSON.parse(await readFile(new URL("accounts-use-cases.json", checks), "utf8"));
const floor = JSON.parse(await readFile(new URL("floor-use-cases.json", checks), "utf8"));
if (!reservations.success || reservations.scenarios.some(item => item.result !== "PASS") || accounts.checks.some(item => item.result !== "PASS") || !floor.success) throw new Error("Rapports de recette absents ou non valides.");
const slides = [
  { title: "GALI BLUE", kicker: "CASABLANCA", cover: true, lines: ["Site, reservations et equipe", "Presentation et cas d'usage", "Recette locale - plan 2D / Standard / VIP / telephone"] },
  { title: "Le site et l'exploitation", kicker: "01 / VUE D'ENSEMBLE", lines: ["Vitrine : accueil, cheffe, carte, galerie, evenements, contact et informations legales.", "Deux parcours de demande : reservation classique ou choix d'une table sur le plan 2D.", "Exploitation : appels, affectations, arrivee, paiement sur place, depart et nettoyage.", "Equipe : six roles, comptes personnels et permissions controlees sur le serveur.", "La disponibilite affichee n'est pas une confirmation. L'equipe confirme par telephone."] },
  { title: "Le parcours de decouverte", kicker: "02 / PUBLIC", lines: ["Entree photographique : acces direct, Passer ou Echap ; mouvements reduits respectes.", "Les logos publics rejouent l'entree. Le logo prive reste dans le dashboard.", "L'heure bleue : jusqu'a trois evenements publies et futurs, classes par ordre puis date.", "Presentation de la cheffe, petit mot, bandeau et photos administrables.", "Carte par categorie, prix et allergenes ; galerie plein ecran ; contact et pages legales.", "Aucun lien du personnel n'est expose dans la navigation publique."] },
  { title: "Reservation classique", kicker: "03 / STANDARD OU VIP", lines: ["1. Choisir date, convives et categorie Standard ou VIP.", "2. Choisir un service disponible et saisir nom, telephone, email facultatif et consentement.", "3. Recevoir une reference : demande en attente d'appel, sans table bloquee ni paiement.", "4. L'accueil telephone. La confirmation affecte les tables compatibles dans la categorie choisie.", "Pour un groupe, le regroupement exige le meme espace et un groupe de tables compatible.", "Aucun supplement VIP n'a ete invente ; conditions et tarifs restent a confirmer."] },
  { title: "Toutes les tables du plan", kicker: "04 / PLAN 2D COMPLET", image: "public/images/floor-plan-demo.jpg", lines: ["T01 a T37 et BAR : 38 unites de reservation, dont 9 VIP.", "Filtre Toutes / Standard / VIP ; disponibilite par date, service et convives.", "Marqueurs distincts, popup et formulaire pre-rempli ; liste alternative sur mobile.", "BAR est un comptoir collectif indicatif, pas dix sieges independants.", "Plan, capacites et classement VIP sont a valider avec la salle reelle."] },
  { title: "Du plan a la demande", kicker: "05 / CHOIX EXACT", lines: ["1. Choisir date, convives, service et eventuellement categorie.", "2. Ouvrir une table disponible puis Continuer ; une table indisponible ne propose pas de reservation.", "3. Le formulaire conserve la table, la date, le service, les convives et la categorie reelle.", "4. La demande conserve la table souhaitee mais ne bloque pas encore cette table.", "5. A l'appel, seule la table exacte peut etre confirmee si elle est encore compatible et libre.", "En cas de conflit : refus explicite, aucune substitution silencieuse. Annuler/recreer si le souhait change."] },
  { title: "Un cycle lisible par appel", kicker: "06 / ETATS", lines: ["EN ATTENTE D'APPEL  >  CONFIRMEE PAR APPEL  >  CLIENTS INSTALLES  >  TERMINEE", "CALL_PENDING  >  RESERVED  >  ARRIVED  >  COMPLETED", "Sans reponse : A rappeler, tentative et dernier appel traces, prochain rappel avant le service.", "Annulation : CANCELLED ; absence apres le delai de grace : NO_SHOW.", "La confirmation et l'affectation sont atomiques. Les demandes en attente ne bloquent rien.", "Les anciens statuts restent lisibles pour l'historique, sans revenir au parcours provisoire."] },
  { title: "Le travail de l'accueil", kicker: "07 / FILE D'APPELS", lines: ["Ouvrir la file des demandes TO_CALL ou NO_ANSWER ; les rappels sont classes par echeance.", "Consulter client, telephone, service, convives, Standard/VIP et table souhaitee.", "Sans reponse : enregistrer l'essai et choisir le prochain rappel ; aucune occupation creee.", "Client confirme : Confirmer par telephone recontrole les disponibilites et affecte les tables.", "Client annule : enregistrer l'annulation et fermer le dossier.", "Chaque action est tracee ; une confirmation en conflit est refusee et doit etre resolue avec le client."] },
  { title: "Plusieurs clients, une derniere table", kicker: "08 / CONCURRENCE", lines: ["Client A : demande classique VIP. Client B : choisit la derniere VIP sur le plan.", "Client C : fait aussi une demande. Les trois demandes peuvent rester en attente.", "L'accueil confirme A : transaction, recontrole et affectation de la VIP.", "Une confirmation concurrente de B ou C est refusee : aucun double blocage.", "Le double clic d'un meme client conserve une seule demande grace a la cle d'idempotence.", "La disponibilite est toujours reverifiee lors de la confirmation, pas seulement dans le navigateur."] },
  { title: "Arrivee, depart et exceptions", kicker: "09 / SALLE", lines: ["Clients installes : action possible dans la fenetre autorisee, jusqu'a 60 minutes avant le service.", "Terminee : depart enregistre ; la table reste reservee pendant le delai de preparation.", "Clients absents : action autorisee seulement apres le delai de grace, puis capacite liberee.", "Annulee : dossier ferme et capacite liberee ; les etats terminaux ne se reouvrent pas.", "SERVICE ne peut enregistrer arrivee/depart que sur ses reservations affectees.", "Modifier date ou categorie : annuler et creer une nouvelle demande ; aucun report automatique."] },
  { title: "Paiement au restaurant", kicker: "10 / CAISSE", lines: ["Aucun encaissement a la demande ni a la confirmation telephonique.", "Encaissement manuel : ADMIN, MANAGER ou CASHIER, apres arrivee, montant positif, une seule fois.", "Paiement et reservation sont distincts : payer ne termine pas le service.", "Annulation deja payee : traitement du remboursement separe, jamais un faux remboursement automatique.", "CMI est desactive. Aucun paiement en ligne reel ou simule n'est disponible.", "La reduction configuree ne concerne que le futur paiement en ligne, jamais le paiement sur place."] },
  { title: "Developpeur et direction", kicker: "11 / ROLES", lines: ["ADMIN / developpeur : administration complete ; seul role autorise a creer les acces, changer roles, emails, activation et mots de passe.", "MANAGER : reservations, salle, encaissement, reglages, contenus, audit et informations professionnelles de l'equipe.", "Le manager peut ajouter une fiche SERVICE sans connexion, mais ne peut pas gerer les acces ni modifier le developpeur.", "Un administrateur ne peut pas retirer son propre acces ni retirer le dernier administrateur actif avec mot de passe.", "Les permissions sont verifiees sur le serveur, meme pour une requete fabriquee hors interface."] },
  { title: "Les roles du restaurant-bar", kicker: "12 / ACCES LIMITES", lines: ["HOST / accueil : demandes, appels, confirmation, annulation, absence, affectations, arrivee et depart. Pas de caisse ou de reglages.", "SERVICE : uniquement ses dossiers affectes ; arrivee/depart. Pas de confirmation d'appel ni d'encaissement.", "CASHIER / caisse : dossiers installes ou termines et encaissement ; sans telephone, email ou note client.", "EDITOR / communication : carte, evenements, medias, brouillons et publication ; aucune reservation ni fiche personnel.", "Tous les roles peuvent changer leur propre mot de passe via Mon compte."] },
  { title: "Premier acces de l'equipe", kicker: "13 / COMPTES PERSONNELS", lines: ["Six comptes de recette avec adresses .test : developpeur, manager, accueil, service, caisse et communication.", "Mots de passe aleatoires remis separement dans un fichier prive hors depot. Aucun secret dans cette presentation.", "Premiere connexion : renouvellement obligatoire avant tout acces au dashboard ou a ses API.", "Nouveau mot de passe distinct, 12 caracteres minimum, limite de 72 octets.", "Le renouvellement invalide les autres sessions. Desactiver un compte coupe aussi son acces.", "L'administrateur existant est conserve. Un redeploiement ne reinitialise et ne reactive aucun compte."] },
  { title: "Salle, equipe et reglages", kicker: "14 / ORGANISATION", lines: ["Salle & tables : nom, places, espace, groupe, actif, Standard/VIP et position sur le plan.", "Reaffecter les dossiers futurs avant reduction de capacite ou changement de categorie, espace, groupe ou activation.", "Personnel : fonctions, fiches, planning sous forme de note et affectations par reservation.", "Parametres : parcours classique/plan independants ; au moins un parcours doit rester actif.", "Services, fermetures, convives maximum, duree, nettoyage et delai de grace controles par le serveur.", "Audit global pour ADMIN/MANAGER et historique du dossier pour le suivi operationnel."] },
  { title: "La publication du site", kicker: "15 / COMMUNICATION", lines: ["Carte : categorie, description, prix MAD, allergenes, photo, ordre et visibilite.", "Evenements : date, horaire, description, photo, ordre et publication. Les brouillons/passes sont caches du public.", "Medias : JPEG/PNG/WebP jusqu'a 8 Mo, MP4 jusqu'a 30 Mo ; SVG/HTML refuses.", "Contenus : textes, cheffe, bandeau, contact et logos. Brouillon > apercu prive > publication.", "Un brouillon enregistre ne change pas le site public. Pas de donnees de brouillon pour les roles operationnels.", "Les photos, prix, identites et annonces d'exemple doivent etre remplaces avant exploitation."] },
  { title: "Mobile : la recette effectuee", kicker: "16 / USAGE TACTILE", lines: ["Plan : cinq largeurs, 320 / 390 / 768 / 1024 / 1440 ; 38 marqueurs, popup et liste alternative.", "Deux clients anonymes tactiles : demande classique VIP et demande sur plan VIP.", "Appel sur mobile : rappel, confirmation et affectation visibles apres actualisation.", "Recette generale : cinq pages publiques et dix vues du dashboard sur six formats, dont paysage 844 pixels.", "Six roles sur mobile : navigation restreinte, Mon compte et premier renouvellement.", "Tableaux et plan defilent dans leur propre conteneur ; pas de debordement global de la page."] },
  { title: "Resultats de recette", kicker: "17 / VERIFIE LOCALEMENT", lines: [`${reservations.scenarios.length} scenarios multi-clients : donnees, capacite, categories, concurrence et cycle de vie.`, `${accounts.checks.length} controles d'acces : six roles, premier renouvellement, origines, anciennes sessions et desactivation.`, `${floor.checks.length} groupes de controles du plan : ${floor.canonicalTables} unites, ${floor.vipTables} VIP, cinq formats et ${floor.touchClients} clients tactiles.`, "Recette generale UI et regression responsive passees sur la base locale.", "Ces resultats ne constituent pas une certification de la base ou du deploiement Railway.", "Les fixtures et comptes temporaires sont nettoyes ; les acces d'equipe sont conserves."] },
  { title: "Conditions avant exploitation", kicker: "18 / LIMITES EXPLICITES", lines: ["Valider la salle reelle, les capacites, groupes et VIP ; definir les conditions et tarifs VIP sans supposition.", "Remplacer les identites .test par les collaborateurs reels ; renouveler les mots de passe et desactiver les acces inutilises.", "Remplacer photos, cheffe, carte, prix, evenements et informations de contact/legal de demonstration.", "Pas de SMS/email automatique, recuperation de mot de passe, 2FA ni report automatique implementes.", "CMI exige contrat, integration, notifications signees, rapprochement et tests prestataire avant activation.", "Sauvegarder la base et les fichiers importes sur le volume persistant ; verifier le deploiement Railway apres publication."] },
];
for (let offset = 0; offset < reservations.scenarios.length; offset += 6) slides.push({ title: `Recette reservations ${offset + 1}-${Math.min(offset + 6, reservations.scenarios.length)}`, kicker: "ANNEXE / CAS D'USAGE", lines: reservations.scenarios.slice(offset, offset + 6).map(item => `${item.id} / ${item.title} : ${item.result}`) });
slides.push({ title: "Reproduire et maintenir", kicker: "ANNEXE / DOCUMENTATION", lines: ["Guide detaille : docs/GUIDE-UTILISATION.md ; regeneration : npm run docs:generate.", "Comptes : npm run test:accounts ; salle : npm run test:floor.", "General : npm run test:ui ; mobile : npm run test:responsive ; regles serveur : npm test.", "Tests avec base : uniquement localement, sequentiellement ; jamais sur une base de production.", "Les acces d'equipe seront initialises une seule fois lors du prochain demarrage de la nouvelle image deployee.", "GALI BLUE / Casablanca / blanc et #01258F. Aucun mot de passe dans les livrables publics."] });

const pdfColour = value => rgb(parseInt(value.slice(0, 2), 16) / 255, parseInt(value.slice(2, 4), 16) / 255, parseInt(value.slice(4, 6), 16) / 255);
const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function wrap(text, width, size) {
  const lines = []; let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (normal.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
const html = [];
await mkdir(docs, { recursive: true });
await mkdir(checks, { recursive: true });
for (const [index, item] of slides.entries()) {
  const page = pdf.addPage([960, 540]);
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };
  slide.addNotes([item.lines.join("\n"), "Guide complet : docs/GUIDE-UTILISATION.md. Recette locale ; aucune donnee d'acces privee."]);
  if (item.cover) {
    const buffer = await readFile(new URL("public/images/restaurant.jpg", root));
    const image = await pdf.embedJpg(buffer);
    const scale = Math.max(960 / image.width, 360 / image.height);
    page.drawImage(image, { x: (960 - image.width * scale) / 2, y: 180, width: image.width * scale, height: image.height * scale });
    page.drawRectangle({ x: 0, y: 0, width: 960, height: 210, color: pdfColour(blue) });
    page.drawText(item.title, { x: 54, y: 139, font: heading, size: 44, color: rgb(1, 1, 1) });
    page.drawText(item.kicker, { x: 58, y: 116, font: normal, size: 10, color: rgb(1, 1, 1) });
    page.drawText(item.lines[0], { x: 58, y: 72, font: normal, size: 21, color: rgb(1, 1, 1) });
    page.drawText(item.lines[2], { x: 58, y: 40, font: normal, size: 12, color: rgb(1, 1, 1) });
    slide.addImage({ data: `image/jpeg;base64,${buffer.toString("base64")}`, ...pptxgenImageCover(image.width, image.height, 0, 0, 13.333, 5) });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 4.5833, w: 13.333, h: 2.9167, line: { transparency: 100 }, fill: { color: blue } });
    slide.addText(item.title, { x: 0.75, y: 4.9, w: 11.8, h: 0.8, fontFace: "Georgia", fontSize: 44, color: "FFFFFF", margin: 0 });
    slide.addText(item.kicker, { x: 0.805, y: 5.65, w: 10, h: 0.3, fontSize: 10, color: "FFFFFF", margin: 0 });
    slide.addText(item.lines[0], { x: 0.805, y: 6.2, w: 11.8, h: 0.5, fontSize: 21, color: "FFFFFF", margin: 0 });
    slide.addText(item.lines[2], { x: 0.805, y: 6.82, w: 11.8, h: 0.3, fontSize: 12, color: "FFFFFF", margin: 0 });
    html.push(`<section class="slide cover"><img src="data:image/jpeg;base64,${buffer.toString("base64")}"/><div class="cover-band"><h1>GALI BLUE</h1><small>CASABLANCA</small><p>${escape(item.lines[0])}</p><small>${escape(item.lines[2])}</small></div></section>`);
    continue;
  }
  const width = item.image ? 392 : 848;
  let size = 17;
  let paragraphs;
  let height;
  do {
    paragraphs = item.lines.map(text => wrap(text, width, size));
    height = paragraphs.reduce((total, lines) => total + lines.length * size * 1.38 + size * 0.85, 0);
    if (height > 328) size--;
  } while (height > 328 && size >= 12);
  if (size < 12 || heading.widthOfTextAtSize(item.title, 31) > 848) throw new Error(`Mise en page trop dense : ${item.title}`);
  page.drawRectangle({ x: 56, y: 493, width: 44, height: 3, color: pdfColour(blue) });
  page.drawText(item.kicker, { x: 56, y: 475, size: 10, font: normal, color: pdfColour(blue) });
  page.drawText(item.title, { x: 54, y: 430, size: 31, font: heading, color: pdfColour(blue) });
  let baseline = 385;
  for (const lines of paragraphs) {
    for (const line of lines) { page.drawText(line, { x: 56, y: baseline, size, font: normal, color: pdfColour(grey) }); baseline -= size * 1.38; }
    baseline -= size * 0.85;
  }
  if (baseline < 45) throw new Error(`Texte hors page : ${item.title}`);
  page.drawLine({ start: { x: 56, y: 37 }, end: { x: 904, y: 37 }, thickness: 0.5, color: pdfColour("DEE3EC") });
  page.drawText("GALI BLUE / Casablanca / Recette locale", { x: 56, y: 19, font: normal, size: 9, color: pdfColour(grey) });
  page.drawText(`${index + 1} / ${slides.length}`, { x: 862, y: 19, font: normal, size: 9, color: pdfColour(grey) });
  slide.addShape(pptx.ShapeType.line, { x: 0.778, y: 0.61, w: 0.61, h: 0, line: { color: blue, width: 2 } });
  slide.addText(item.kicker, { x: 0.778, y: 0.78, w: 11.78, h: 0.25, fontSize: 10, color: blue, margin: 0 });
  slide.addText(item.title, { x: 0.75, y: 1.15, w: 11.78, h: 0.56, fontFace: "Georgia", fontSize: 31, color: blue, margin: 0, fit: "shrink" });
  slide.addText(paragraphs.map(lines => lines.join("\n")).join("\n\n"), { x: 0.778, y: 1.97, w: width / 72, h: 4.55, fontSize: size, color: grey, margin: 0, breakLine: false, fit: "shrink", valign: "top", lineSpacingMultiple: 1.1 });
  slide.addText("GALI BLUE / Casablanca / Recette locale", { x: 0.778, y: 7.08, w: 10, h: 0.22, fontSize: 9, color: grey, margin: 0 });
  slide.addText(`${index + 1} / ${slides.length}`, { x: 11.972, y: 7.08, w: 0.8, h: 0.22, fontSize: 9, color: grey, margin: 0 });
  let imageHtml = "";
  if (item.image) {
    const buffer = await readFile(new URL(item.image, root));
    const image = await pdf.embedJpg(buffer);
    const scale = Math.min(418 / image.width, 306 / image.height);
    const imageWidth = image.width * scale; const imageHeight = image.height * scale;
    const left = 486 + (418 - imageWidth) / 2; const top = 153 + (306 - imageHeight) / 2;
    page.drawImage(image, { x: left, y: 540 - top - imageHeight, width: imageWidth, height: imageHeight });
    slide.addImage({ data: `image/jpeg;base64,${buffer.toString("base64")}`, x: left / 72, y: top / 72, w: imageWidth / 72, h: imageHeight / 72 });
    imageHtml = `<img class="plan" style="left:${left}px;top:${top}px;width:${imageWidth}px;height:${imageHeight}px" src="data:image/jpeg;base64,${buffer.toString("base64")}"/>`;
  }
  html.push(`<section class="slide"><div class="rule"></div><div class="kicker">${escape(item.kicker)}</div><h2>${escape(item.title)}</h2><div class="body" style="width:${width}px;font-size:${size}px;line-height:${size * 1.38}px">${paragraphs.map(lines => `<p>${escape(lines.join("\n"))}</p>`).join("")}</div>${imageHtml}<footer>GALI BLUE / Casablanca / Recette locale<span>${index + 1} / ${slides.length}</span></footer></section>`);
}
function pptxgenImageCover(sourceWidth, sourceHeight, x, y, width, height) {
  return pptxgenImageSizing(sourceWidth, sourceHeight, x, y, width, height);
}
function pptxgenImageSizing(sourceWidth, sourceHeight, x, y, width, height) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  return { x: x + (width - sourceWidth * scale) / 2, y: y + (height - sourceHeight * scale) / 2, w: sourceWidth * scale, h: sourceHeight * scale };
}
const pdfBytes = await pdf.save();
const pdfFile = new URL("GALI-BLUE-presentation.pdf", docs);
const pptFile = new URL("GALI-BLUE-presentation.pptx", docs);
await writeFile(pdfFile, pdfBytes);
await pptx.writeFile({ fileName: fileURLToPath(pptFile) });
const preview = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>GALI BLUE - Presentation</title><style>*{box-sizing:border-box}body{margin:0;background:#edf0f5;font-family:Helvetica,sans-serif;color:#${grey}}.slide{position:relative;width:960px;height:540px;margin:24px auto;background:white;overflow:hidden}.rule{position:absolute;left:56px;top:44px;width:44px;height:3px;background:#${blue}}.kicker{position:absolute;left:56px;top:56px;font-size:10px;color:#${blue}}h2{position:absolute;left:54px;top:79px;margin:0;font:31px Georgia;color:#${blue}}.body{position:absolute;left:56px;top:139px}.body p{white-space:pre;margin:0 0 .85em}.plan{position:absolute}footer{position:absolute;left:56px;right:56px;bottom:16px;border-top:1px solid #dee3ec;padding-top:9px;font-size:9px}footer span{float:right}.cover>img{width:100%;height:360px;object-fit:cover}.cover-band{position:absolute;inset:330px 0 0;background:#${blue};color:white;padding:20px 56px}.cover h1{font:44px Georgia;margin:0 0 4px}.cover small{font-size:10px}.cover p{font-size:21px;margin:22px 0 16px}@media print{body{background:white}.slide{margin:0;break-after:page}@page{size:960px 540px;margin:0}}</style></head><body>${html.join("\n")}</body></html>`;
await writeFile(new URL("GALI-BLUE-presentation.html", docs), preview);
const loaded = await PDFDocument.load(pdfBytes);
if (loaded.getPageCount() !== slides.length) throw new Error("Nombre de pages PDF incorrect.");
const zip = await JSZip.loadAsync(await readFile(pptFile));
const xmlSlides = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((left, right) => parseInt(left.match(/slide(\d+)/)[1], 10) - parseInt(right.match(/slide(\d+)/)[1], 10));
if (xmlSlides.length !== slides.length) throw new Error("Nombre de diapositives PowerPoint incorrect.");
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1008, height: 600 } });
  await page.setContent(preview);
  await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
  for (const [index, xmlName] of xmlSlides.entries()) {
    const xml = await zip.file(xmlName).async("string");
    const valid = await page.evaluate(({ xml, title }) => {
      const document = new DOMParser().parseFromString(xml, "application/xml");
      return !document.querySelector("parsererror") && document.documentElement.textContent.includes(title);
    }, { xml, title: slides[index].title });
    if (!valid) throw new Error(`Diapositive PowerPoint invalide : ${index + 1}`);
  }
  const invalid = await page.evaluate(() => [...document.querySelectorAll(".slide:not(.cover)")].flatMap((slide, index) => {
    const body = slide.querySelector(".body").getBoundingClientRect();
    const footer = slide.querySelector("footer").getBoundingClientRect();
    const title = slide.querySelector("h2").getBoundingClientRect();
    return body.bottom >= footer.top || body.width < slide.querySelector(".body").scrollWidth || title.right > slide.getBoundingClientRect().right - 40 ? [index + 2] : [];
  }));
  if (invalid.length) throw new Error(`Debordement dans la presentation : ${invalid.join(", ")}`);
  for (const index of [0, 4, 6, 11, 19, slides.length - 1]) await page.locator(".slide").nth(index).screenshot({ path: fileURLToPath(new URL(`presentation-${index + 1}.png`, checks)) });
} finally { await browser.close(); }
await writeFile(new URL("presentation-verification.json", checks), JSON.stringify({ pages: slides.length, slides: xmlSlides.length, pdfLoaded: true, powerpointXmlValid: true, noOverflow: true, reservationCases: reservations.scenarios.length, accountChecks: accounts.checks.length, noPrivateInput: true }, null, 2));
console.log(`Presentation verified: ${slides.length} PDF pages and ${xmlSlides.length} PowerPoint slides. Branded preview rendered; XML, images and text bounds checked. No private credentials read.`);