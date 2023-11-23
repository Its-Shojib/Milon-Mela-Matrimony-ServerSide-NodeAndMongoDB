const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const app = express()
const port = process.env.PORT || 5000
require('dotenv').config()
let cors = require('cors')
let cookieParser = require('cookie-parser')
let jwt = require('jsonwebtoken');

app.use(cors({
    origin: [
        'http://localhost:5173',
    ],
    credentials: true
}))
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oglq0ui.mongodb.net/?retryWrites=true&w=majority`;

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
        await client.connect();

        const userCollections = client.db("Milon-Mela-DB").collection('Users');
        const reviewCollections = client.db("Milon-Mela-DB").collection('Reviews');
        const favoriteCollections = client.db("Milon-Mela-DB").collection('Favorites');
        const paymentCollections = client.db("Milon-Mela-DB").collection('Payments');

        // user related api
        app.post('/users', async (req, res) => {
            let newUser = req.body;
            let query = { email: newUser.email };
            let existingUser = await userCollections.findOne(query);
            if (existingUser) {
              return res.send({ message: 'User already exist', insertedId: null });
            }
            let result = await userCollections.insertOne(newUser);
            res.send(result)
          })


        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Milon Mela Server is Running')
})

app.listen(port, () => {
    console.log(`Milon Mela listening on port ${port}`)
})