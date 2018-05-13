var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	console.log("loggggg");
  res.send('Hello routes!!!');
  
});

module.exports = router;