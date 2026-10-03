import test from "node:test";
import assert from "node:assert/strict";
import { parseContent } from "../src/lib/content";

test("MySQL binary JSON titles are decoded while normal custom text is retained", () => {
  const content = parseContent({ eventTitle: "base64:type15:TCdoZXVyZQpibGV1ZS4=", storyTitle: `base64:type15:${Buffer.from("Une cuisine de coeur.\nUne signature singuliere.").toString("base64")}`, chefName: "Nom personnalise" });
  assert.equal(content.eventTitle, "L'heure\nbleue.");
  assert.equal(content.storyTitle, "Une cuisine de coeur.\nUne signature singuliere.");
  assert.equal(content.chefName, "Nom personnalise");
  assert.equal(parseContent({ eventTitle: "Mon titre" }).eventTitle, "Mon titre");
  assert.equal(parseContent({ eventTitle: "base64:type15:/w==" }).eventTitle, parseContent(null).eventTitle);
});