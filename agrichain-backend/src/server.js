const app = require("./app");
const { port } = require("./config");

app.listen(port, () => {
  console.log(`[agrichain-backend] Listening on http://localhost:${port}`);
});
