import { PrismaClient } from "@prisma/client";
import { defaultContent } from "../src/lib/content";
import { dateLabel, localDateTime } from "../src/lib/domain";

const db = new PrismaClient();
async function seed() {
  await db.settings.upsert({ where: { id: 1 }, update: {}, create: {
    id: 1, serviceTimes: ["12:00", "14:30", "19:00", "21:30"], closedDates: [], content: defaultContent,
  } });
  if (await db.diningTable.count() === 0) await db.diningTable.createMany({ data: [
    { name: "T01", area: "Salle", seats: 2, joinGroup: "A" }, { name: "T02", area: "Salle", seats: 2, joinGroup: "A" },
    { name: "T03", area: "Salle", seats: 4 }, { name: "T04", area: "Salle", seats: 4 },
    { name: "T05", area: "Terrasse", seats: 4, joinGroup: "B" }, { name: "T06", area: "Terrasse", seats: 4, joinGroup: "B" },
    { name: "T07", area: "Terrasse", seats: 6 }, { name: "T08", area: "Bar", seats: 2 },
  ] });
  if (await db.menuItem.count() === 0) await db.menuItem.createMany({ data: [
    { name: "Burrata & tomates de saison", category: "A partager", description: "Burrata cremeuse, tomates, basilic frais et huile d'olive.", price: 12000, image: "/images/burrata.jpg", allergens: "Lait", position: 0 },
    { name: "Tartare de saumon", category: "A partager", description: "Saumon, avocat, agrumes et notes de sesame.", price: 14500, image: "/images/salmon.jpg", allergens: "Poisson, sesame", position: 1 },
    { name: "Filet de boeuf grille", category: "Les signatures", description: "Jus corse, pommes de terre fondantes et legumes de saison.", price: 26000, image: "/images/steak.jpg", position: 2 },
    { name: "Risotto aux champignons", category: "Les signatures", description: "Riz carnaroli, champignons et parmesan affine.", price: 17000, image: "/images/risotto.jpg", allergens: "Lait", position: 3 },
    { name: "Blue signature", category: "Au bar", description: "Agrumes frais, notes botaniques et une touche maison.", price: 11000, image: "/images/cocktail.jpg", position: 4 },
    { name: "Passion sans alcool", category: "Au bar", description: "Fruit de la passion, citron vert et eau petillante.", price: 7500, image: "/images/cocktail.jpg", position: 5 },
    { name: "Chocolat & fleur de sel", category: "Douceurs", description: "Chocolat intense, coeur fondant et glace vanille.", price: 8500, image: "/images/dessert.jpg", allergens: "Lait, oeufs, gluten", position: 6 },
  ] });
  if (await db.media.count() === 0) await db.media.createMany({ data: [
    { title: "La salle", url: "/images/restaurant.jpg", kind: "image", gallery: true, position: 0 },
    { title: "L'instant cocktail", url: "/images/cocktail.jpg", kind: "image", gallery: true, position: 1 },
    { title: "Autour de la table", url: "/images/interior.jpg", kind: "image", gallery: true, position: 2 },
  ] });
  await db.event.upsert({ where: { id: "demo-blue-sessions" }, update: {}, create: {
    id: "demo-blue-sessions", title: "Blue Sessions", description: "Une soiree au rythme de la soul et du jazz, des cocktails signature et des assiettes a partager. Retrouvez-nous au bar pour prolonger la soiree, entre musique et belles conversations.",
    date: localDateTime(dateLabel(new Date(Date.now() + 14 * 86400000), "yyyy-MM-dd"), "21:30"),
    image: "/images/cocktail.jpg", published: true, position: 0,
  } });
  await db.media.upsert({ where: { id: "demo-chef-portrait" }, update: {}, create: { id: "demo-chef-portrait", title: "Cheffe - photo d'illustration", url: "/images/chef-demo.jpg", kind: "image", gallery: false, position: 3 } });
  const eventExamples = [
    { id: "01", image: "/images/event-live.jpg", title: "Oussamabk - Soiree live" },
    { id: "02", image: "/images/event-concert.jpg", title: "Oussamabk - Le rendez-vous" },
    { id: "03", image: "/images/event-music.jpg", title: "Oussamabk - Blue Sessions" },
  ];
  for (const [index, event] of eventExamples.entries()) {
    await db.media.upsert({ where: { id: `demo-event-photo-${event.id}` }, update: {}, create: { id: `demo-event-photo-${event.id}`, title: `Evenement - illustration ${event.id}`, url: event.image, kind: "image", gallery: false, position: 4 + index } });
    await db.event.upsert({ where: { id: `draft-oussamabk-${event.id}` }, update: {}, create: {
      id: `draft-oussamabk-${event.id}`, title: event.title, image: event.image, published: false, position: index + 1,
      date: localDateTime(dateLabel(new Date(Date.now() + (14 + index * 7) * 86400000), "yyyy-MM-dd"), "21:30"),
      description: "Projet d'evenement avec Oussamabk. Date et horaire indicatifs, programmation a confirmer avec l'artiste avant publication. Photo d'illustration : elle ne represente ni l'artiste ni un evenement annonce par GALI BLUE.",
    } });
  }
  console.log("Demo content ready: chef illustration and three event drafts with example photos. No staff password created by the seed.");
}
seed().finally(() => db.$disconnect());