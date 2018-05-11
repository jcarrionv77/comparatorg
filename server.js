var express = require('express');


var app = express();



app.use(bodyParser.json());

app.get('/', function(req, res) {

    // ejs render automatically looks in the views folder
    res.render('index');
});


app.listen(port, function() {
	console.log('Our app is running on http://localhost:' + port);
});