var fs = require("fs");
var pg = require('pg');

var dbCli = null;
var instanciasArray = new Array();
var objetosArray = new Array();

const { exec } = require('child_process');
const { execSync } = require('child_process');


function ConsultaInstancias()
{
	pg.defaults.ssl = true;
	pg.connect(process.env.DATABASE_URL, function(err, client) {
		if (err) 
			throw err;
		
		console.log('Connected to postgres!');
		dbCli = client;

		dbCli.query(
			'SELECT nombre, secreto, usuario, url FROM instancias', 
			function(err, result) {
			if (err) {
				console.log(err);
			} 
			else if  (result != null && result.rows.length>0)
			{
				for (var i=0; i<result.rows.length; i++)
				{
					var instancia = {};
					instancia.nombre = result.rows[i].nombre;
					instancia.secreto = result.rows[i].secreto;
					instancia.usuario = result.rows[i].usuario;
					instancia.url = result.rows[i].url;

					instanciasArray.push(instancia);
				}
				descargaFicheros(instanciasArray[0]);
			}
		}); 

    });
}


function consultaObjetos()
{
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

					var directorio = 'tmp/'+objeto.nombre
					execSync('mkdir ' + directorio);
				}
				ConsultaInstancias();
			}
		}); 

    });
}


function descargaFicheros(objInstancia)
{
    console.log('descargaFicheros!');
	try {

		console.log('Login en objInstancia ' + objInstancia.nombre);



		var commandSFDXLogin = '';

		
		commandSFDXLogin = 'sfdx force:auth:jwt:grant --clientid ' + objInstancia.secreto +' --jwtkeyfile ./tmp/server.key --username ' + objInstancia.usuario + ' --instanceurl ' + objInstancia.url+ ' --setalias '+ objInstancia.nombre;

		//var commandSFDXLogin = 'sfdx force:auth:jwt:grant --clientid 3MVG9X0_oZyBSzHrtbrbfMcbIYRG2EJYKx.kHJqYn5fr_CJypNQvV0UaNy5ALJEqbHm8fuglPg6J0VxFdsCKa --jwtkeyfile ./tmp/server.key --username jcarrion@salesforce.com.repsol.repaudit --instanceurl https://test.salesforce.com --setalias repaudit';
		
		console.log('commandSFDXLogin  ' + commandSFDXLogin);

		exec(commandSFDXLogin, (err, stdout, stderr) => {
			if (err) {
				console.error(`exec error: ${err}`);
				return;
			}

			console.log(`exec ok  ${stdout}`);
			console.log('FIN exec login');
			
			describeObject(objInstancia.nombre , 0);
			
			


		});
	console.log('hola mundo2  ');
	}
	catch (err) {
		console.error(err);
	}
}


function describeObject(instancia , iteracion)
{
	var objeto = objetosArray[iteracion].nombre;

	var fileName = './tmp/' + objeto + '/' +  instancia + '.json';

	
	console.log('instancia [' + instancia + ']');
	console.log('objeto [' + objeto + ']');
	console.log('fileName [' + fileName + ']');
	console.log('iteracion [' + iteracion + ']');

	
	var commandSFDXDescribe	= 'sfdx force:schema:sobject:describe -u ' + instancia +    ' -s ' + objeto + ' --json > ' +  fileName;
	
	console.log('commandSFDXDescribe ' + commandSFDXDescribe);

	//var commandSFDXDescribe	= 'sfdx force:schema:sobject:describe -u ' + instanciasArray[0].nombre +    ' -s Account --json ';

	exec(commandSFDXDescribe, {maxBuffer: 1024 * 500}, (err, stdout, stderr) => {
		if (err) {
			console.error(`exec error: ${err}`);
			return;
		}

		//var contents = stdout;
		//console.log(`exec ok  ${stdout}`);
		//console.log('exec contents ' + contents);
		//console.log('FIN exec commandSFDXDescribe');
		//var contents = fs.readFileSync("tmp/prueba.json");
		//var jsonContent = JSON.parse(contents);

		//console.log('contents ' + contents);
		
		console.log('iteracion ' + iteracion);
		var nuevaIteracion = iteracion + 1;
		console.log('nuevaIteracion ' + nuevaIteracion);
		console.log('objetosArray.length ' + objetosArray.length);
		if(nuevaIteracion < objetosArray.length)
		{
			describeObject(instancia, nuevaIteracion)
		}

		console.log('END');

	});

}

var serverKey = process.env.SERVER_KEY;

var fs = require('fs');
fs.writeFileSync("tmp/server.key", serverKey); 

consultaObjetos();

