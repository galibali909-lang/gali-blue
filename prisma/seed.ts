import { PrismaClient } from "@prisma/client";
import { defaultContent } from "../src/lib/content";

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
  console.log("Demo content and tables ready. No staff password created by the seed.");
}
seed().finally(() => db.$disconnect());