const express = require('express')
const { MongoClient, ServerApiVersion, Collection, ObjectId } = require('mongodb');
const admin = require("firebase-admin");
const cors = require('cors')
require('dotenv').config()
const app = express()
app.use(cors())
app.use(express.json());
const port = process.env.PORT || 3000;
console.log(process.env)

// const serviceAccount = require("./online learning platform sdk.json");
const decoded = Buffer.from(process.env.SECRET_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.adidkqb.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyFireaseToken = async (req, res, next) => {
    const authorizationToken = req.headers.authorization;
    // console.log(authorizationToken)
    if (!authorizationToken) {
        return res.status(401).send({ message: 'Unathorized access' })
    }
    const token = authorizationToken.split(' ')[1];
    console.log(token)
    if (!token) {
        return res.status(401).send({ message: 'Unathorized access' })
    }

    try {
        const tokenInfo = await admin.auth().verifyIdToken(token)
        req.token_email = tokenInfo.email
        console.log('after tokenInfo', tokenInfo)
        next();

    } catch {
        return res.status(401).send({ message: 'Unathorized access' })

    }
}

async function run() {
    try {
        // await client.connect();
        const db = client.db('learning_Platform');
        const coursesCollections = db.collection('courses')
        const enrollCollections = db.collection('enrolls')

        app.get('/popular-courses', async (req, res) => {
            const result = await coursesCollections.find().sort({ enroll_count: -1 }).limit(6).toArray();
            res.send(result)
        })
        app.get('/courses', verifyFireaseToken, async (req, res) => {
            const email = req.query.email;
            const query = {}
            if (email) {
                if (req.token_email != email) {
                    return res.stutas(403).send({ message: 'Forbiden access' })
                }
                query.created_by = email;
            }
            const result = await coursesCollections.find(query).toArray();
            res.send(result)
        })
        app.post('/courses', async (req, res) => {
            const newCourse = req.body;
            const result = await coursesCollections.insertOne(newCourse);
            res.send(result)
        })
        app.post('/enroll', async (req, res) => {
            const newEnroll = req.body;
            const result = await enrollCollections.insertOne(newEnroll);
            res.send(result);
        })
        app.get('/enroll', verifyFireaseToken, async (req, res) => {
            const email = req.query.email;
            const query = {}
            if (email) {
                if (req.token_email != email) {
                    return res.status(403).send({ messege: 'Forbiden access' })
                }
                query.enroll_by = email;
            }
            const result = await enrollCollections.find(query).toArray();
            res.send(result);
        })
        app.patch('/course/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateCourse = {
                $inc: { enroll_count: 1 }
            }
            const result = await coursesCollections.updateOne(query, updateCourse);
            res.send(result);
        })
        app.patch('/courses/:id', async (req, res) => {
            const course = req.body;
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateCourse = {
                $set: course
            }
            const result = await coursesCollections.updateOne(query, updateCourse);
            if (result.modifiedCount > 0) {
                res.send({ success: true, message: "Course updated successfully" });
            } else {
                res.send({ success: false, message: "No course found or nothing to update" });
            }
            res.send(result);
        })
        app.get('/courses/:id', async (req, res) => {
            const id = req.params.id
            console.log(id)
            const result = await coursesCollections.findOne({ _id: new ObjectId(id) });
            res.send(result)
        })
        app.delete('/courses/:id', async (req, res) => {
            const id = req.params.id
            console.log(id)
            const result1 = await coursesCollections.deleteOne({ _id: new ObjectId(id) });
            const result2 = await enrollCollections.deleteOne({ course_id: id });
            res.send(result1, result2)
        })



        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Server is Running')
})
app.listen(port, () => {
    console.log('Localhost', port);
})