var express = require('express');


var app = express();



app.use(bodyParser.json());




app.listen(port, function() {
	console.log('Our app is running on http://localhost:' + port);
});