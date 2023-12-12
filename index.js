/** @format */

const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const userCollection = client.db("tutorioDb").collection("users");
    const teachCollection = client.db("tutorioDb").collection("teach");
    const assignmentCollection = client
      .db("tutorioDb")
      .collection("assignments");
    const feedbackCollection = client.db("tutorioDb").collection("feedback");
    const newClassesCollection = client
      .db("tutorioDb")
      .collection("newClasses");
    const paymentCollection = client.db("tutorioDb").collection("payments");

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log("inside verify token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Forbidden Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Forbidden Access" });
        }
        req.decoded = decoded;

        next();
      });
    };
    // verify admin after verify token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // verify teacher after verify token
    const verifyTeacher = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isTeacher = user?.role === "teacher";
      if (!isTeacher) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    //*****CLASSES API**************/
    // get data
    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });
    // delete data
    app.delete("/classes/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.deleteOne(query);
      res.send(result);
    });
    //*****NEW CLASSES API*****/
    //post data
    app.post("/newClasses", async (req, res) => {
      const addNewClasses = req.body;
      // console.log(addNewClasses);
      const result = await newClassesCollection.insertOne(addNewClasses);
      res.send(result);
    });
    // get data
    app.get("/newClasses", async (req, res) => {
      const cursor = newClassesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //*****CART API*****/
    // get data
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
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
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    //**********USERS RELATED API************/
    // get data
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // ~~~~~admin related api~~~~~~
    // get data
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });
    // post data
    app.post("/users", async (req, res) => {
      const user = req.body;
      // insert email if user does not exist
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
    });

    // patch data for ADMIN
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    // patch data for TEACHER
    app.patch("/users/teacher/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "teacher",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // ~~~~~teacher related api~~~~~~
    // get data
    app.get("/users/teacher/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let teacher = false;
      if (user) {
        teacher = user?.role === "teacher";
      }
      res.send({ teacher });
    });

    // delete data
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // ********JWT API************
    // post data
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365D",
      });
      // res.send({ token });
      const result = await userCollection.insertOne(user);
      res.send({ result, token });
    });

    // *********TEACHER RELATED API***********
    // post data
    app.post("/teach", async (req, res) => {
      const newTeacher = req.body;
      // console.log(newTeacher);
      const result = await teachCollection.insertOne(newTeacher);
      res.send(result);
    });
    // get data
    app.get("/teach", async (req, res) => {
      const cursor = teachCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // update data
    app.patch("/teach/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatePending = req.body;
      // console.log(updatePending);
      const updateDoc = {
        $set: {
          status: updatePending.status,
        },
      };
      const result = await teachCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // delete data
    app.delete("/teach/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await teachCollection.deleteOne(query);
      res.send(result);
    });
    // **********ASSIGNMENT RELATED API********
    // post data
    app.post("/assignment", async (req, res) => {
      const newAssignment = req.body;
      console.log(newAssignment);
      const result = await assignmentCollection.insertOne(newAssignment);
      res.send(result);
    });
    // get data
    app.get("/assignment", async (req, res) => {
      const cursor = assignmentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // **********PAYMENT RELATED API**********
    // payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // get data
    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });
    // post data
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      const query = {
        _id: {
          $in: payment.classIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await cartCollection.deleteMany(query);
      res.send({ paymentResult, deleteResult });
    });

    //***********STATS RELATED API********** */
    // get data
    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const totalCLasses = await classesCollection.estimatedDocumentCount();
      const enrolled = await paymentCollection.estimatedDocumentCount();
      // to get revenue
      const payments = await paymentCollection.find().toArray();
      const revenue = payments.reduce(
        (total, payment) => total + payment.price,
        0
      );
      res.send({
        users,
        totalCLasses,
        enrolled,
        revenue,
      });
    });
    // *********FEEDBACK API***********
    // read data
    app.get("/feedback", async (req, res) => {
      const result = await feedbackCollection.find().toArray();
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
