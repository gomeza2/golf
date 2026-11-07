import { communityPool } from "../server/community/database";
import { migrateCommunity } from "../server/community/schema";
if (!process.env.COMMUNITY_DATABASE_URL)
  throw Error("Falta COMMUNITY_DATABASE_URL.");
const pool = communityPool(process.env.COMMUNITY_DATABASE_URL);
try {
  await migrateCommunity(pool);
  console.log(
    "Comunidad: migración 1 aplicada; no se crean cuentas ni publicaciones.",
  );
} finally {
  await pool.end();
}
