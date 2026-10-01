export function configureProductionEnvironment(environment) {
  let source = environment.DATABASE_URL?.trim() ? "DATABASE_URL" : environment.MYSQL_URL?.trim() ? "MYSQL_URL" : null;
  let connection;
  if (source) {
    try { connection = new URL(environment[source].trim()); }
    catch { throw new Error(`${source} doit contenir une URL mysql:// valide. Verifier que la reference Railway est resolue.`); }
  } else {
    const required = ["MYSQLHOST", "MYSQLUSER", "MYSQLPASSWORD", "MYSQLDATABASE"];
    const missing = required.filter(name => !environment[name]);
    if (missing.length) throw new Error(`Connexion MySQL absente : ajouter DATABASE_URL ou MYSQL_URL au service web, ou les variables MySQL completes. Variables manquantes : ${missing.join(", ")}.`);
    let server;
    try { server = new URL(`http://${environment.MYSQLHOST.trim()}`); }
    catch { throw new Error("MYSQLHOST doit contenir uniquement le nom d'hote MySQL."); }
    if (server.username || server.password || server.port || server.pathname !== "/" || server.search || server.hash) throw new Error("MYSQLHOST doit contenir uniquement le nom d'hote ; utiliser MYSQLPORT pour le port.");
    const port = environment.MYSQLPORT?.trim() || "3306";
    if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error("MYSQLPORT doit etre un port entre 1 et 65535.");
    connection = new URL(`mysql://${server.hostname}`);
    connection.port = port;
    connection.username = encodeURIComponent(environment.MYSQLUSER);
    connection.password = encodeURIComponent(environment.MYSQLPASSWORD);
    connection.pathname = `/${encodeURIComponent(environment.MYSQLDATABASE)}`;
    source = "MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE";
  }
  if (connection.protocol !== "mysql:" || !connection.hostname || !connection.username || !connection.pathname || connection.pathname === "/" || connection.hash) throw new Error(`${source} doit designer une base MySQL complete (mysql://utilisateur:mot-de-passe@hote:port/base).`);
  environment.DATABASE_URL = connection.href;
  if (!environment.APP_ORIGIN && environment.RAILWAY_PUBLIC_DOMAIN) environment.APP_ORIGIN = `https://${environment.RAILWAY_PUBLIC_DOMAIN.trim()}`;
  environment.PORT ||= "8080";
  if (!/^\d+$/.test(environment.PORT) || Number(environment.PORT) < 1 || Number(environment.PORT) > 65535) throw new Error("PORT doit etre un port HTTP entre 1 et 65535, par exemple 8080.");
  return source;
}