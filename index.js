const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware
app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ujho7bh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const reviewCollection = client.db('workwaveDB').collection('reviews')
    const userCollection = client.db('workwaveDB').collection('users')

    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({ token })
    })

    // middleware
    const verifyToken = (req, res, next) => {
      console.log("Indise verify token", req.headers)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded
        next()
      })
    }

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === "admin"
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" })
      }
      next()
    }

    // verify HR
    const verifyHr = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isHr = user?.role === "hr"
      if (!isHr) {
        return res.status(403).send({ message: "forbidden access" })
      }
      next()
    }

    // verify admin or hr
    const verifyAdminOrHr = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === "admin"
      const isHr = user?.role === "hr"
      if (isAdmin || isHr) {
        next()
      } else {
        res.status(403).send({ message: "forbidden access" })
      }
    }



    // review related api
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })

    // user related api
    // app.get("/users",verifyToken,verifyAdminOrHr, async (req, res) => {
    //   console.log(req.headers)
    //   const result = await userCollection.find().toArray()
    //   res.send(result)
    // })

    app.get("/users", verifyToken, verifyAdminOrHr, async (req, res) => {
      console.log(req.headers)
      const email = req.decoded.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === "admin"
      const isHr = user?.role === "hr"
      const isEmployee = user?.role === "employee"

      let filter = {}

      if (isAdmin) {
        filter = {
          $or: [
            { role: "employee", verify_status: "verified" },
            { role: "hr" }
          ]
        };

      } else if (isHr) {
        filter = { role: "employee" }
      } else if (isEmployee) {
        filter = { email: email }
      }

      const result = await userCollection.find(filter).toArray()
      res.send(result)
    })


    app.get('/users/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const result = await userCollection.findOne(filter)
      res.send(result)
    })


    app.patch("/users/hr/:id", verifyToken, verifyAdminOrHr, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const user = await userCollection.findOne(filter)

      const status = user.verify_status === "notverified" ? "verified" : "notverified"
      const updateDoc = {
        $set: {
          verify_status: status
        }
      }

      const result = await userCollection.updateOne(filter, updateDoc)
      res.send(result)
    })




    app.post("/users", async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const isExistingUser = await userCollection.findOne(query)

      if (isExistingUser) {
        return res.send({ message: "user already exists", insertedId: null })
      }

      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    // for hr
    app.get('/users/hr/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
      }

      const query = { email: email }
      const user = await userCollection.findOne(query)
      let hr = false
      if (user) {
        hr = user?.role === "hr"
      }
      res.send({ hr })
    })

    // admin api
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" })
      }

      const query = { email: email }
      const user = await userCollection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === "admin"
      }
      res.send({ admin })
    })

    app.patch('/users/admin/:id',verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          action: "fired"
        }
      }
      const result = await userCollection.updateOne(query,updateDoc)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (rea, res) => {
  res.send("Server is running")
})

app.listen(port, () => {
  console.log(`server is running on port: ${port}`)
})