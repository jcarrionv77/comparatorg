var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var Cliente = require('pg-native');




var dbCli = null;

var app = express();
var port = process.env.PORT || 8080;

var objetosArray = new Array();


app.use(bodyParser.json());
var routes = require('./routes/index');

app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));

app.use('/routes', routes);


app.get('/', function(req, res) {

	console.log('hola mundo');

	console.log(JSON.stringify(req.body, null, 2));
	console.log(JSON.stringify(req.body));


	res.render('index',{objetos : objetosArray});

});


app.listen(port, function() {
	console.log('Our app is running on http://localhost:' + port);

	var client = new Cliente();
	client.connectSync(process.env.DATABASE_URL);
	var rows = client.querySync('SELECT nombre, apiname FROM objetos');


	if  (rows != null && rows.length>0)
	{
		for (var i=0; i<rows.length; i++)
		{
			var objeto = {};
			objeto.nombre = rows[i].nombre;
			objeto.apiname = rows[i].apiname;

			objetosArray.push(objeto);

		}
		
		console.log('fin consultaObjetos');

	}


});