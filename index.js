const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("server is running fine! 🥳");
});

app.listen(port, () => {
  console.log(`port:${port}`);
});
