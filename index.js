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
    // await client.connect();
    const moviesDB = client.db("movieMasterDB");
    const movieCollection = moviesDB.collection("movies");
    const watchlistCollection = moviesDB.collection("watchlist");
    const userCollection = moviesDB.collection("users");

    app.get("/dashboard/overview", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email)
          return res.status(400).send({ message: "email is required" });

        const totalMovies = await movieCollection.countDocuments({
          addedBy: email,
        });

        const avgAgg = await movieCollection
          .aggregate([
            { $match: { addedBy: email } },
            { $group: { _id: null, avgRating: { $avg: "$rating" } } },
          ])
          .toArray();

        const avgRating = avgAgg[0]?.avgRating || 0;

        const watchlistCount = await watchlistCollection.countDocuments({
          user_email: email,
        });

        const monthlyMovies = await movieCollection
          .aggregate([
            { $match: { addedBy: email } },
            {
              $addFields: {
                createdDate: {
                  $cond: [
                    { $eq: [{ $type: "$created_at" }, "date"] },
                    "$created_at",
                    { $toDate: "$created_at" },
                  ],
                },
              },
            },
            {
              $group: {
                _id: {
                  y: { $year: "$createdDate" },
                  m: { $month: "$createdDate" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.y": 1, "_id.m": 1 } },
            {
              $project: {
                _id: 0,
                month: {
                  $concat: [
                    { $toString: "$_id.y" },
                    "-",
                    {
                      $cond: [
                        { $lt: ["$_id.m", 10] },
                        { $concat: ["0", { $toString: "$_id.m" }] },
                        { $toString: "$_id.m" },
                      ],
                    },
                  ],
                },
                count: 1,
              },
            },
          ])
          .toArray();

        const last6 = monthlyMovies.slice(-6);

        res.send({
          cards: {
            totalMovies,
            avgRating: Number(avgRating.toFixed(2)),
            watchlistCount,
          },
          chart: last6,
        });
      } catch (err) {
        res.status(500).send({ message: "server error", error: err.message });
      }
    });

    // movies api ----------------------------------------
    // featured movie --
    app.get("/featured-movies", async (req, res) => {
      const result = await movieCollection
        .find()
        .sort({ created_at: -1 })
        .toArray();
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

    // my-collection --
    app.get("/movies/my-collection", async (req, res) => {
      const email = req.query.email;
      const filter = { addedBy: email };
      const result = await movieCollection.find(filter).toArray();
      res.send(result);
    });

    // movie details --
    app.get("/movies/:id", async (req, res) => {
      const id = req.params.id;
      const result = await movieCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // add-movie --
    app.post("/movies/add", async (req, res) => {
      const newMovie = req.body;
      const title = req.body.title;
      const existing = await movieCollection.findOne({ title: title });
      if (existing) {
        return res.status(400).send({ message: "Movie already exist" });
      } else {
        const result = await movieCollection.insertOne(newMovie);
        res.send(result);
      }
    });

    // update-movie --
    app.put("/movies/update/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: body,
      };
      const result = await movieCollection.updateOne(filter, update);
      res.send(result);
    });

    // delete movie --
    app.delete("/movies/delete/:id", async (req, res) => {
      const id = req.params.id;
      const result = await movieCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // movies by genre --

    app.get("/movies-by-genre", async (req, res) => {
      const genres = req.query.genres.split(",");
      // console.log(genres);
      const result = await movieCollection
        .find({ genre: { $in: genres } })
        .toArray();
      res.send(result);
    });

    // movie by rating --

    app.get("/movies-by-rating", async (req, res) => {
      const max = Number(req.query.maxRating) || 10;
      const min = Number(req.query.minRating) || 0;
      // console.log(max, min);
      const filter = { rating: { $lte: max, $gte: min } };
      const result = await movieCollection.find(filter).toArray();
      res.send(result);
    });

    // watchList api -------------------------------------

    // post --
    app.post("/watchList/add", async (req, res) => {
      const body = req.body;
      // console.log(body);
      const movieId = req.body.movieId;
      const email = req.body.user_email;
      const existing = await watchlistCollection.findOne({
        movieId: movieId,
        user_email: email,
      });
      if (existing) {
        return res.status(400).send({ message: "Already in watchlist" });
      } else {
        const result = await watchlistCollection.insertOne(body);
        res.send(result);
      }
    });

    //  check existing --
    app.get("/watchList/check", async (req, res) => {
      const movieId = req.query.movie;
      const email = req.query.email;
      // console.log(req.query);
      const existing = await watchlistCollection.findOne({
        movieId: movieId,
        user_email: email,
      });
      if (existing) {
        res.send(true);
      } else {
        res.send(false);
      }
    });

    // watchList by email --

    app.get("/watchList/myWatchList", async (req, res) => {
      const email = req.query.email;
      const result = await watchlistCollection
        .find({ user_email: email })
        .toArray();
      res.send(result);
    });

    // delete one --
    app.delete("/watchList/delete", async (req, res) => {
      const id = req.query.id;
      // console.log(id);
      const result = await watchlistCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // users api -----------------------------------------
    app.post("/add-user", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const existingUser = await userCollection.findOne({ email: email });
      if (existingUser) {
        return res.send({ message: "user already exist" });
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

    // await client.db("admin").command({ ping: 1 });
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
