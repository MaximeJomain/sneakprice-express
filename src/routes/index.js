const express = require("express");
const router = express.Router();

router.get("/", (req, res, next) => {
  res.send("Welcome on sneakprice server");
});

module.exports = router;
