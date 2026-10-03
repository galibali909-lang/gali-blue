export type SiteContent = {
  brandName: string; brandTagline: string; logoImage: string; logoLightImage: string;
  tagline: string; heroTitle: string; heroSubtitle: string; heroImage: string; heroVideo: string;
  storyEyebrow: string; storyTitle: string; storyText: string; storyImage: string; storySignature: string; storyCaption: string;
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
  storyEyebrow: "LA CHEFFE",
  storyTitle: "Une cuisine de coeur.\nUne signature singuliere.",
  storyText: "Derriere chaque assiette, notre cheffe imagine une cuisine genereuse, attentive aux produits et au plaisir de partager. Des premieres inspirations a la derniere touche, elle donne a la table GALI BLUE son caractere et sa sensibilite.",
  storyImage: "/images/interior.jpg",
  storySignature: "Le plaisir de recevoir, jusque dans l'assiette.",
  storyCaption: "LE GESTE. LE GOUT. LE PARTAGE.",
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
  return { ...defaultContent, ...(value && typeof value === "object" && !Array.isArray(value) ? value : {}) } as SiteContent;
}