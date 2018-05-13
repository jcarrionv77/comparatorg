var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');


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

	pg.defaults.ssl = true;
	pg.connect(process.env.DATABASE_URL, function(err, client) {
		if (err) 
			throw err;
		
		console.log('Connected to postgres!');
		dbCli = client;

		dbCli.query(
			'SELECT nombre, apiname FROM objetos', 
			function(err, result) {
			if (err) {
				console.log(err);
			} 
			else if  (result != null && result.rows.length>0)
			{
				for (var i=0; i<result.rows.length; i++)
				{
					var objeto = {};
					objeto.nombre = result.rows[i].nombre;
					objeto.apiname = result.rows[i].apiname;

					objetosArray.push(objeto);

				}


				console.log('fin consultaObjetos');

			res.render('index',{objetos : objetosArray});



			}
		}); 

    });





    // ejs render automatically looks in the views folder
    /*res.render('index',{users : [
            { name: 'John' },
            { name: 'Mike' },
            { name: 'Samantha' }
  	]});*/

});


app.listen(port, function() {
	console.log('Our app is running on http://localhost:' + port);
});