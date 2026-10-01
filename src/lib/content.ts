export type SiteContent = {
  tagline: string; heroTitle: string; heroSubtitle: string; heroImage: string; heroVideo: string;
  storyEyebrow: string; storyTitle: string; storyText: string; storyImage: string;
  menuTitle: string; menuText: string; eventTitle: string;
  address: string; phone: string; email: string; hours: string; instagram: string;
  legal: string; privacy: string; bookingTerms: string; galleryTitle: string;
};
export const defaultContent: SiteContent = {
  tagline: "RESTAURANT · BAR · CASABLANCA",
  heroTitle: "GALI BLUE",
  heroSubtitle: "Les belles heures de Casablanca.",
  heroImage: "/images/restaurant.jpg",
  heroVideo: "",
  storyEyebrow: "UN LIEU, MILLE INSTANTS",
  storyTitle: "On vient pour la cuisine.\nOn reste pour l'instant.",
  storyText: "Une table que l'on partage, des saveurs qui voyagent, un dernier verre qui se prolonge. GALI BLUE imagine des moments simples et des soirees qui comptent, au rythme de Casablanca.",
  storyImage: "/images/interior.jpg",
  menuTitle: "Le gout des bonnes choses.",
  menuText: "Des assiettes genereuses, des produits choisis et une touche d'inattendu.",
  eventTitle: "La nuit a son adresse.",
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