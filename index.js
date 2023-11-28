const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');

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
    app.post('/jwt', async(req,res)=>{
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET , {
        expiresIn: '1hr'
      })
      res.send({token})
    })

    // middleware
    const verifyToken = (req,res, next)=>{
      console.log("Indise verify token", req.headers)
      if(!req.headers.authorization){
        return res.status(401).send({message: "unauthorized access"})
      }
      const token = req.headers.authorization.split('')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded)=>{
        if(error){
          return res.status(401).send({message: 'forbidden access'})
        }
        req.decoded = decoded
        next()
      })
    }

    // review related api
    app.get('/reviews', async(req,res)=>{
        const result = await reviewCollection.find().toArray()
        res.send(result)
    })

    // user related api
    app.post("/users", async(req, res)=>{
      const user = req.body

      const query = {email: user.email}
      const isExistingUser = await userCollection.findOne(query)
      if(isExistingUser){
        res.send({ message: "user already exists", insertedId: null})
      }

      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    app.get("/users", async(req,res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (rea,res)=>{
    res.send("Server is running")
})

app.listen(port, ()=>{
    console.log(`server is running on port: ${port}`)
})