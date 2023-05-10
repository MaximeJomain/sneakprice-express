const express = require("express");
const router = express.Router();

const sneakersController = require("../controllers/sneakers");

router.get("/", (req, res) => {
  sneakersController.handler(req, res);
});

module.exports = router;
