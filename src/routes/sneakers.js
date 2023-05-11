const express = require("express");
const router = express.Router();

const sneakersController = require("../controllers/sneakers");

router.get("/", (req, res) => {
  sneakersController.handler(req, res);
});

router.get("/getHistoryById/:id", (req, res) => {
  sneakersController.getHistoryById(req, res);
});

module.exports = router;
