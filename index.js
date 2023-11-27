const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const biodataCollections = client.db("Milon-Mela-DB").collection('Biodatas');
        const premiumRequestCollections = client.db("Milon-Mela-DB").collection('PremiumReq');



        // middlewares verify token
        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_PASS, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollections.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }
        // use verify Premium after verifyToken
        // const verifyPremium = async (req, res, next) => {
        //     const email = req.decoded.email;
        //     const query = { email: email };
        //     const user = await biodataCollections.findOne(query);
        //     const isPremium = user?.role === 'premium';
        //     if (!isPremium) {
        //         return res.status(403).send({ message: 'forbidden access' });
        //     }
        //     next();
        // }


        //jwt related api
        app.post('/jwt', async (req, res) => {
            let user = req.body;
            let token = jwt.sign(user, process.env.ACCESS_TOKEN_PASS, { expiresIn: '1h' });
            res.send({ token })
        })

        // ===============================Check Admin===================================
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            let userEmail = req.params.email;
            if (userEmail !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidded access' })
            }
            let query = { email: userEmail };
            let user = await userCollections.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin });
        })
        // ===============================Check Premium=================================
        app.get('/users/premium/:email', async (req, res) => {
            let userEmail = req.params.email;
            let query = { email: userEmail };
            let user = await biodataCollections.findOne(query);
            let premium = false;
            if (user) {
                premium = user?.role === 'premium'
            }
            res.send({ premium });
        })








        // ================================User Related API👇=============================
        // Create new user
        app.post('/users', async (req, res) => {
            let newUser = req.body;
            let query = { email: newUser.email };
            let existingUser = await userCollections.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exist', insertedId: null });
            }
            let result = await userCollections.insertOne(newUser);
            res.send(result)
        });

        // Load All User for Admin 
        app.get('/allUser', async (req, res) => {
            let result = await userCollections.find().toArray();
            res.send(result);
        })

        //Make a user to Admin
        app.patch('/user/admin/:email', async (req, res) => {
            let email = req.params.email;
            let query = { email: email };
            let updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            let result = await userCollections.updateOne(query, updatedDoc);
            res.send(result)
        })
        // ================================End of User Related API👆==========================









        // ================================Biodata Related API==========================
        // Edit Biodata section
        app.patch('/edit-biodata/:email', async (req, res) => {
            let email = req.params.email;
            let biodata = req.body;
            const options = { upsert: true };
            let query = { email: email };
            let existingUser = await biodataCollections.findOne(query);
            console.log(existingUser);
            if (existingUser) {
                updatedDoc = {
                    $set: {
                        Name: biodata.Name,
                        Image: biodata.Image,
                        Gender: biodata.Gender,
                        Dob: biodata.Dob,
                        Height: biodata.Height,
                        Weight: biodata.Weight,
                        Age: biodata.Age,
                        Ocupation: biodata.Ocupation,
                        Race: biodata.Race,
                        FaName: biodata.FaName,
                        MoName: biodata.MoName,
                        PermanentDiv: biodata.PermanentDiv,
                        PresentDiv: biodata.PresentDiv,
                        PartnerAgeExp: biodata.PartnerAgeExp,
                        PartnerHeightExp: biodata.PartnerHeightExp,
                        PartnerWeightExp: biodata.PartnerWeightExp,
                        email: biodata.email,
                        Mobile: biodata.Mobile,
                    }
                }
                let result = await biodataCollections.updateOne(query, updatedDoc);
                res.send(result);
            }
            else {
                let count = await biodataCollections.estimatedDocumentCount();
                console.log(count);
                let updatedDoc2 = {
                    $set: {
                        bioId: count + 1,
                        Name: biodata.Name,
                        Image: biodata.Image,
                        Gender: biodata.Gender,
                        Dob: biodata.Dob,
                        Height: biodata.Height,
                        Weight: biodata.Weight,
                        Age: biodata.Age,
                        Ocupation: biodata.Ocupation,
                        Race: biodata.Race,
                        FaName: biodata.FaName,
                        MoName: biodata.MoName,
                        PermanentDiv: biodata.PermanentDiv,
                        PresentDiv: biodata.PresentDiv,
                        PartnerAgeExp: biodata.PartnerAgeExp,
                        PartnerHeightExp: biodata.PartnerHeightExp,
                        PartnerWeightExp: biodata.PartnerWeightExp,
                        email: biodata.email,
                        Mobile: biodata.Mobile,
                    }
                }
                let result = await biodataCollections.updateOne(query, updatedDoc2, options);
                res.send(result);
            }
        })

        //Goto View ProfilePage
        app.get('/biodata/profile/:id', async (req, res) => {
            let id = req.params.id;
            let query = { _id: new ObjectId(id) };
            let result = await biodataCollections.findOne(query);
            res.send(result)
        })

        //View biodata in Dashboard section
        app.get('/viewBiodata', async (req, res) => {
            let email = req.query.email;
            let query = { email: email };
            let result = await biodataCollections.findOne(query);
            res.send(result);
        });

        //Biodata Collection Load All Biodata(useBiodata)
        app.get('/biodata', async (req, res) => {
            let result = await biodataCollections.find().toArray();
            res.send(result);
        });

        //View Premium Biodata in Home section
        app.get('/biodata/premium', async (req, res) => {
            let query = { role: 'premium' };
            let result = await biodataCollections.find(query).limit(6).sort({ Age: 1 }).toArray();
            res.send(result);
        });

        // Make Acount Premium
        app.patch('/biodata/premium/:email', async (req, res) => {
            let email = req.params.email;
            let query = { email: email };
            let updatedDoc = {
                $set: {
                    role: 'premium'
                }
            }
            let result = await biodataCollections.updateOne(query, updatedDoc);
            res.send(result);
        });

        // ============================End Biodata Related API=====================







        // ============================Premium Acount Related API===================
        // Request for premium
        app.post('/makePremiumRequest/:email', async (req, res) => {
            let email = req.params.email;
            let query = { Email: email };
            let existingReq = await premiumRequestCollections.findOne(query);
            if (existingReq) {
                return res.send({ "message": 'Already exist' });
            }
            else {
                let premiumInfo = req.body;
                let result = await premiumRequestCollections.insertOne(premiumInfo);
                res.send(result);
            }
        })

        // Load All requested premium user(for admin)
        app.get('/premiumReqUser', async (req, res) => {
            let result = await premiumRequestCollections.find().toArray();
            res.send(result);
        })
        //Delete Premium Request
        app.delete('/premiumReqDelete/:email', async (req, res) => {
            let email = req.params.email;
            let query = { Email: email };
            let result = await premiumRequestCollections.deleteOne(query);
            res.send(result);
        })
        // ============================End Premium Acount Related API===================




        // ============================Favorite Related API👇===================
        //Add to favorite item
        app.post('/favorite', async (req, res) => {
            let favoriteBio = req.body;
            let result = await favoriteCollections.insertOne(favoriteBio);
            res.send(result)
        })

        //Load my Favorite Biodata
        app.get('/favoriteBioData/:email', async (req, res) => {
            let email = req.params.email;
            let query = { Email: email };
            let result = await favoriteCollections.find(query).toArray();
            res.send(result);
        });

        //Delete from Favorite Biodata
        app.delete('/favoriteDelete/:id', async (req, res) => {
            let id = req.params.id;
            let query = { _id: new ObjectId(id) };
            let result = await favoriteCollections.deleteOne(query);
            res.send(result);
        });
        // ============================End of Favorite Biodata Related API👆===================



        // =============================SuccessStory Related Api👇===============================

        //Add Success story
        app.post('/successStory', async (req, res) => {
            let successStory = req.body;
            let result = await reviewCollections.insertOne(successStory);
            res.send(result);
        })

        //Load Success Story
        app.get('/successStory', async (req, res) => {
            let result = await reviewCollections.find().sort({ marrigeInDays: 1 }).toArray();
            res.send(result);
        })



        // =========================End Of SuccessStory Related Api👆============================


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