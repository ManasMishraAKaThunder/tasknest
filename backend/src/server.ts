import "dotenv/config";
import { Solarch } from "solarch";

const PORT = Number(process.env.PORT) || 8090;
const isDev = process.env.NODE_ENV !== "production";

const app = new Solarch({ defaultDev: isDev });

app.start(PORT).then(() => {
  console.log(`TaskNest backend running on http://localhost:${PORT}`);
});