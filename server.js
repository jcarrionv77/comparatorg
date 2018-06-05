var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var Cliente = require('pg-native');




var dbCli = null;

var app = express();
var port = process.env.PORT || 8080;

var objetosArray = new Array();
var psArray = new Array();

var sObjetos = '';


app.use(bodyParser.json());
var routes = require('./routes/index');

app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));

app.use('/routes', routes);


app.get('/', function(req, res) {

	console.log('hola mundo');

	console.log('psArray.length ' + psArray.length);
	console.log('psArray[0].nombre ' + psArray[0].nombre);

	res.render('index',{objetos : objetosArray, html:'', ps : psArray});

});

app.get('/index', function(req, res) {

	console.log('hola mundo');

	res.render('index',{objetos : objetosArray, html:'', ps : psArray});

});

app.get('/objetos', function(req, res) {

	console.log('hola mundo');

	res.render('index',{objetos : objetosArray, html:'', ps : psArray});

});

app.get('/sandbox', function(req, res) {

	console.log('hola mundo');

	res.render('sandbox',{ objetos : objetosArray, html: sObjetos, ps : psArray});

});

app.get('/objetos/p', function(req, res) {


  console.log('hola mundo req.query.tagId ' + req.query.indice);	

  res.render('objetos',{objetos : objetosArray, html: objetosArray[req.query.indice].html , miObjeto: objetosArray[req.query.indice].nombre, ps : psArray} );
  

});

app.get('/rt/p', function(req, res) {


  console.log('hola mundo req.query.tagId ' + req.query.indice);	

  res.render('rt',{objetos : objetosArray, html: objetosArray[req.query.indice].htmlrt, miObjeto: objetosArray[req.query.indice].nombre, ps : psArray});
  

});

app.get('/ps/p', function(req, res) {


  console.log('hola mundo req.query.tagId ' + req.query.indice);	

  res.render('ps',{objetos : objetosArray, html: objetosArray[req.query.indice].htmlrt, miObjeto: objetosArray[req.query.indice].nombre, ps : psArray});
  

});


app.listen(port, function() {
	console.log('Our app is running on http://localhost:' + port);

	var client = new Cliente();
	client.connectSync(process.env.DATABASE_URL);
	var rows = client.querySync('SELECT nombre, apiname, html, htmlrt FROM objetos');


	if  (rows != null && rows.length>0)
	{
		for (var i=0; i<rows.length; i++)
		{
			var objeto = {};
			objeto.nombre = rows[i].nombre;
			objeto.apiname = rows[i].apiname;
			objeto.html = rows[i].html;
			objeto.htmlrt = rows[i].htmlrt;
			objeto.indice = "/objetos/p?indice=" + i;
			objeto.indiceRt = "/rt/p?indice=" + i;

			objetosArray.push(objeto);


		}
		
	}


	var rowsObjetos = client.querySync('SELECT  html FROM instancias limit 1');
	if  (rowsObjetos != null && rowsObjetos.length>0)
	{
		sObjetos = rowsObjetos[0].html;

	}



	var rowsPS = client.querySync('SELECT name,  html FROM permissionset');


	if  (rowsPS != null && rowsPS.length>0)
	{
		for (var i=0; i<rowsPS.length; i++)
		{


			console.log('i ' + i);	
			console.log('rowsPS[i].nombre ' + rowsPS[i].name);	



			var ps = {};
			ps.nombre = rowsPS[i].name;
			ps.html = rowsPS[i].html;

			console.log('ps.nombre ' + ps.name);	


			ps.indice = "/ps/p?indice=" + i;

			psArray.push(ps);


		}
		
	}






});