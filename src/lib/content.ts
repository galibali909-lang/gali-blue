export type SiteContent = {
  brandName: string; brandTagline: string; logoImage: string; logoLightImage: string;
  tagline: string; heroTitle: string; heroSubtitle: string; heroImage: string; heroVideo: string;
  welcomePhrase1: string; welcomePhrase2: string; welcomePhrase3: string;
  chefName: string; storyEyebrow: string; storyTitle: string; storyText: string; storyImage: string; storySignature: string; storyCaption: string;
  menuTitle: string; menuText: string; eventTitle: string;
  address: string; phone: string; email: string; hours: string; instagram: string;
  legal: string; privacy: string; bookingTerms: string; galleryTitle: string;
};
export const defaultContent: SiteContent = {
  brandName: "GALI BLUE", brandTagline: "CASABLANCA", logoImage: "", logoLightImage: "",
  tagline: "RESTAURANT · BAR · CASABLANCA",
  heroTitle: "GALI BLUE",
  heroSubtitle: "Les belles heures de Casablanca.",
  heroImage: "/images/restaurant.jpg",
  heroVideo: "",
  welcomePhrase1: "Une cuisine qui rassemble.",
  welcomePhrase2: "Des cocktails qui inspirent.",
  welcomePhrase3: "Des instants qui restent.",
  storyEyebrow: "LA CHEFFE",
  chefName: "Salma Benali",
  storyTitle: "Une cuisine de coeur.\nUne signature singuliere.",
  storyText: "Derriere chaque assiette, notre cheffe imagine une cuisine genereuse, attentive aux produits et au plaisir de partager. Des premieres inspirations a la derniere touche, elle donne a la table GALI BLUE son caractere et sa sensibilite.",
  storyImage: "/images/chef-demo.jpg",
  storySignature: "J'aime les assiettes qui donnent envie de se retrouver. Un beau produit, un geste juste et le plaisir de vous recevoir : c'est ainsi que j'imagine ma cuisine.",
  storyCaption: "Photo d'illustration",
  menuTitle: "Le gout des bonnes choses.",
  menuText: "Des assiettes genereuses, des produits choisis et une touche d'inattendu.",
  eventTitle: "L'heure\nbleue.",
  address: "Casablanca, Maroc",
  phone: "", email: "", hours: "Horaires a confirmer", instagram: "",
  galleryTitle: "Un avant-gout de GALI BLUE.",
  legal: "Site local de demonstration. Les informations de l'exploitant doivent etre renseignees avant publication.",
  privacy: "Les informations du formulaire servent au traitement de votre reservation et au suivi telephonique. Politique de conservation et contact pour vos droits a completer avant publication.",
  bookingTerms: "Le paiement au restaurant donne lieu a un appel de notre equipe. Votre table est reservee provisoirement apres cet appel. Les demandes non validees ne garantissent pas de disponibilite.",
};
export function parseContent(value: unknown): SiteContent {
  const content = { ...defaultContent, ...(value && typeof value === "object" && !Array.isArray(value) ? value : {}) } as SiteContent;
  for (const key of Object.keys(defaultContent) as (keyof SiteContent)[]) {
    const text = content[key];
    if (typeof text !== "string" || !/^base64:type15:[A-Za-z0-9+/]+={0,2}$/.test(text)) continue;
    try {
      content[key] = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(text.slice("base64:type15:".length)), character => character.charCodeAt(0)));
    } catch { content[key] = defaultContent[key]; }
  }
  return content;
}