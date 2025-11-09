const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@devcluster.k7riodd.mongodb.net/?appName=DevCluster`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const moviesDB = client.db("movieMasterDB");
    const movieCollection = moviesDB.collection("movies");

    app.get("/featured-movies", async (req, res) => {
      const result = await movieCollection.find().toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
  } finally {
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("server is running fine! 🥳");
});

app.listen(port, () => {
  console.log(`port:${port}`);
});

// console.log(process.env.DB_USER, process.env.DB_PASSWORD);
