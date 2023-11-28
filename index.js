const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const app = express()
const port = process.env.PORT || 5000
require('dotenv').config()
let cors = require('cors')
let cookieParser = require('cookie-parser')
let jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors({
    origin: [
        'http://localhost:5173', 'https://milon-mela-matrimony.netlify.app',
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
        // await client.connect();

        const userCollections = client.db("Milon-Mela-DB").collection('Users');
        const reviewCollections = client.db("Milon-Mela-DB").collection('Reviews');
        const favoriteCollections = client.db("Milon-Mela-DB").collection('Favorites');
        const paymentCollections = client.db("Milon-Mela-DB").collection('Payments');
        const contactReqCollections = client.db("Milon-Mela-DB").collection('ContactReq');
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

        // =================================JWT Related API👇===============================
        app.post('/jwt', async (req, res) => {
            let user = req.body;
            let token = jwt.sign(user, process.env.ACCESS_TOKEN_PASS, { expiresIn: '1h' });
            res.send({ token })
        })

        // ===============================Check Admin👇===================================
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
        // ===============================Check Premium👇=================================
        app.get('/users/premium/:email', verifyToken, async (req, res) => {
            let userEmail = req.params.email;
            if (userEmail !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidded access' })
            }
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
        app.get('/allUser', verifyToken, verifyAdmin, async (req, res) => {
            let result = await userCollections.find().toArray();
            res.send(result);
        })

        //Make a user to Admin
        app.patch('/user/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
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









        // ================================Biodata Related API👇==========================
        // Edit Biodata section
        app.patch('/edit-biodata/:email', verifyToken, async (req, res) => {
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
        app.get('/biodata/profile/:id', verifyToken, async (req, res) => {
            let id = req.params.id;
            let query = { _id: new ObjectId(id) };
            let result = await biodataCollections.findOne(query);
            res.send(result)
        })

        //View biodata in Dashboard section
        app.get('/viewBiodata', verifyToken, async (req, res) => {
            let email = req.query.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidded access' })
            }
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
        app.patch('/biodata/premium/:email', verifyToken, verifyAdmin, async (req, res) => {
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

        //load biodata for going checkout page
        app.get('/checkout/:id', verifyToken, async (req, res) => {
            let id = req.params.id;
            let query = { _id: new ObjectId(id) };
            let result = await biodataCollections.findOne(query);
            res.send(result);
        });

        app.get('/biodata/checkout/:email', verifyToken, async (req, res) => {
            let email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidded access' })
            }
            let query = { email: email };
            let result = await biodataCollections.findOne(query);
            res.send(result);
        })


        //Get all Biodata collection for pagination (biodatas)
        app.get('/allBiodataCollection', async (req, res) => {
            let currentPage = parseInt(req.query.page);
            let page = currentPage;
            let result = await biodataCollections.find()
                .skip(page * 5)
                .limit(5)
                .toArray();
            res.send(result);
        })
        // ============================End Biodata Related API👆=====================







        // ============================Premium Acount Related API👇===================
        // Request for premium
        app.post('/makePremiumRequest/:email', verifyToken, async (req, res) => {
            let email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidded access' })
            }
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
        app.get('/premiumReqUser', verifyToken, verifyAdmin, async (req, res) => {
            let result = await premiumRequestCollections.find().toArray();
            res.send(result);
        })

        //Delete Premium Request
        app.delete('/premiumReqDelete/:email', verifyToken, verifyAdmin, async (req, res) => {
            let email = req.params.email;
            let query = { Email: email };
            let result = await premiumRequestCollections.deleteOne(query);
            res.send(result);
        })
        // ============================End Premium Acount Related API👆===================




        // ============================Favorite Related API👇===================
        //Add to favorite item
        app.post('/favorite', verifyToken, async (req, res) => {
            let favoriteBio = req.body;
            let result = await favoriteCollections.insertOne(favoriteBio);
            res.send(result)
        })

        //Load my Favorite Biodata
        app.get('/favoriteBioData/:email', verifyToken, async (req, res) => {
            let email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidded access' })
            }
            let query = { Email: email };
            let result = await favoriteCollections.find(query).toArray();
            res.send(result);
        });

        //Delete from Favorite Biodata
        app.delete('/favoriteDelete/:id', verifyToken, async (req, res) => {
            let id = req.params.id;
            let query = { _id: new ObjectId(id) };
            let result = await favoriteCollections.deleteOne(query);
            res.send(result);
        });
        // ============================End of Favorite Biodata Related API👆===================



        // =============================SuccessStory Related Api👇===============================

        //Add Success story
        app.post('/successStory', verifyToken, async (req, res) => {
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



        // ====================Payment Related API Start👇=========================================
        //create payment intent
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            let amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        //Admin Status for Show status in Admin Home
        app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
            let orders = await paymentCollections.estimatedDocumentCount();
            let result = await paymentCollections.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: '$price'
                        }
                    }
                }
            ]).toArray();
            let revenue = result.length > 0 ? result[0].totalRevenue : 0;
            res.send({ revenue, orders })
        });
        // ====================End of Payment Related API👆========================================






        // ======================Requested Contact Related API👇====================================
        //post request data into database with payment
        app.post('/payment', verifyToken, async (req, res) => {
            let contactRequest = req.body;
            let payment = {
                price: contactRequest?.price,
                email: contactRequest?.userEmail,
                reqBio: contactRequest?.reqBioId,
            }
            let paymentSuccess = await paymentCollections.insertOne(payment);
            let result = await contactReqCollections.insertOne(contactRequest);
            res.send(result);
        });

        //load myRequestedUser in MyRequested User
        app.get('/myRequestedUser/:email', verifyToken, async (req, res) => {
            let email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidded access' })
            }
            let query = { userEmail: email };
            let result = await contactReqCollections.find(query).toArray();
            res.send(result);
        });

        //Load All Requested User for Admin
        app.get('/allRequestedUser', verifyToken, verifyAdmin, async (req, res) => {
            let result = await contactReqCollections.find().toArray();
            res.send(result);
        });

        // Update the Contact information from Admin
        app.patch('/requestedUser/approve/:id', verifyToken, verifyAdmin, async (req, res) => {
            let id = req.params.id;
            let query1 = { _id: new ObjectId(id) };
            let requestedUser = await contactReqCollections.findOne(query1);
            let biodataId = requestedUser.reqBioId;
            let query2 = { bioId: biodataId };
            let biodata = await biodataCollections.findOne(query2);
            console.log(biodata);
            let updatedDoc = {
                $set: {
                    status: "Approved",
                    reqEmail: biodata?.email,
                    reqPhone: biodata?.Mobile
                }
            }
            let result = await contactReqCollections.updateOne(query1, updatedDoc);
            res.send(result);
        });

        //Delete Requested User
        app.delete('/requestedUser/delete/:id', verifyToken, async (req, res) => {
            let id = req.params.id;
            let query = { _id: new ObjectId(id) };
            let result = await contactReqCollections.deleteOne(query);
            res.send(result);
        });

        // =========================End Of Requested User Related API👆============================






        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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