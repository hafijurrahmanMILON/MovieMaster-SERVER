const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const userCollection = moviesDB.collection("users");
    // movies api ----------------------------------------
    // featured movie --
    app.get("/featured-movies", async (req, res) => {
      const result = await movieCollection.find().toArray();
      res.send(result);
    });

    // latest --
    app.get("/latest-movies", async (req, res) => {
      const result = await movieCollection
        .find()
        .sort({ created_at: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });
    // top rated --
    app.get("/top-rated-movies", async (req, res) => {
      const result = await movieCollection
        .find()
        .sort({ rating: -1 })
        .limit(5)
        .toArray();
      res.send(result);
    });

    // all movies --
    app.get("/movies", async (req, res) => {
      const result = await movieCollection.find().toArray();
      res.send(result);
    });
    // avg-rating --
    app.get("/avg-rating", async (req, res) => {
      const result = await movieCollection
        .aggregate([
          {
            $group: {
              _id: null,
              avgRating: { $avg: "$rating" },
            },
          },
        ])
        .toArray();
      res.send(result[0]);
    });

    // movie details --
    app.get("/movies/:id", async (req, res) => {
      const id = req.params.id;
      const result = await movieCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // users api -----------------------------------------
    app.post("/add-user", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const existingUser = await userCollection.findOne({ email: email });
      if (existingUser) {
        res.send({ message: "user already exist" });
      } else {
        const result = await userCollection.insertOne(newUser);
        res.send(result);
      }
    });
    // all users --
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
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
