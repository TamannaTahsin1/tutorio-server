/** @format */

const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u5hejig.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    //*******ALL COLLECTIONS********/
    const classesCollection = client.db("tutorioDb").collection("classes");
    const cartCollection = client.db("tutorioDb").collection("carts");

    //*****CLASSES API*****/
    // get data
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });
    //*****CART API*****/
    // get data
    app.get("/carts", async (req, res) => {
        const email = req.query.email;
        const query = {email:email}
        const result = await cartCollection.find(query).toArray();
        res.send(result);
      });
    // post data
    app.post("/carts", async (req, res) => {
        const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });
    // delete data
    app.delete("/carts/:id", async (req, res) => {
        const id = req.params.body;
        const query= {_id: new ObjectId(id)}
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// initial running
app.get("/", (req, res) => {
  res.send("Tutorio Server is Running");
});
app.listen(port, () => {
  console.log(`Tutorio Server is Running on port ${port}`);
});
