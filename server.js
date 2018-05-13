var express = require('express');
var bodyParser = require('body-parser');


var app = express();
var port = process.env.PORT || 8080;


app.use(bodyParser.json());
var routes = require('./routes/index');

app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));

app.use('/routes', routes);


app.get('/', function(req, res) {

    // ejs render automatically looks in the views folder
    res.render('index',{users : [
            { name: 'John' },
            { name: 'Mike' },
            { name: 'Samantha' }
  	]});
});


app.listen(port, function() {
	console.log('Our app is running on http://localhost:' + port);
});