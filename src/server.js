const express = require("express");
const admin = require("firebase-admin");
require("dotenv").config();

const sneakersRouter = require("./routes/sneakers");
const indexRouter = require("./routes/index");

const app = express();
const port = process.env.PORT || 3000;

// Firebase init
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});
const db = admin.firestore();

// Middleware
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.use("/", indexRouter);
app.use("/sneakers", sneakersRouter);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
