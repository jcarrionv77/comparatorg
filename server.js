var express = require('express');
var bodyParser = require('body-parser');


var app = express();
var port = process.env.PORT || 8080;

var objetosArray = new Array();

function consultaObjetos()
{
	pg.defaults.ssl = true;
	pg.connect(process.env.DATABASE_URL, function(err, client) {
		if (err) 
			throw err;
		
		console.log('Connected to postgres!');
		dbCli = client;

		var a  = dbCli.query('SELECT nombre, apiname FROM objetos');
		console.log('a es ' + a);

}


app.use(bodyParser.json());
var routes = require('./routes/index');

app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));

app.use('/routes', routes);


app.get('/', function(req, res) {

	console.log('hola mundo');

	consultaObjetos();


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