var fs = require("fs");
var pg = require('pg');

var dbCli = null;
var instanciasArray = new Array();
var objetosArray = new Array();

const { exec } = require('child_process');
const { execSync } = require('child_process');


function start()
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
				consultaObjetos();
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
				whenConnected();
			}
		}); 

    });
}


function whenConnected()
{
    console.log('whenConnected!');
	try {

		console.log('hola mundo  ');

		var serverKey = process.env.SERVER_KEY;

		var fs = require('fs');
		fs.writeFileSync("tmp/server.key", serverKey); 

		var commandSFDXLogin = '';

		
		for (var i=0; i<instanciasArray.length; i++)
		{
			commandSFDXLogin = 'sfdx force:auth:jwt:grant --clientid ' + instanciasArray[i].secreto +' --jwtkeyfile ./tmp/server.key --username ' + instanciasArray[i].usuario + ' --instanceurl ' + instanciasArray[i].url+ ' --setalias '+ instanciasArray[i].nombre;
		}

		//var commandSFDXLogin = 'sfdx force:auth:jwt:grant --clientid 3MVG9X0_oZyBSzHrtbrbfMcbIYRG2EJYKx.kHJqYn5fr_CJypNQvV0UaNy5ALJEqbHm8fuglPg6J0VxFdsCKa --jwtkeyfile ./tmp/server.key --username jcarrion@salesforce.com.repsol.repaudit --instanceurl https://test.salesforce.com --setalias repaudit';
		
		console.log('commandSFDXLogin  ' + commandSFDXLogin);

		//var commandSFDXList = 'sfdx force:org:list --verbose --json > tmp/MyOrgList.json';
		

		var command = 'find . -type f | wc -l';

		exec(commandSFDXLogin, (err, stdout, stderr) => {
			if (err) {
				console.error(`exec error: ${err}`);
				return;
			}

			console.log(`exec ok  ${stdout}`);
			console.log('FIN exec login');
			
			describeObject(instanciasArray[0].nombre, objetosArray[0].nombre, 0);
			
			


		});
	console.log('hola mundo2  ');
	}
	catch (err) {
		console.error(err);
	}
}


function describeObject(instancia, objeto, iteracion)
{

	var fileName = instancia + objeto + '.json';

	
	console.log('instancia [' + instancia + ']');
	console.log('objeto [' + objeto + ']');
	console.log('fileName [' + fileName + ']');
	console.log('iteracion [' + iteracion + ']');



	
	var commandSFDXDescribe	= 'sfdx force:schema:sobject:describe -u ' + instancia +    ' -s ' + objeto + ' --json > ./tmp/' + fileName ;
	
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
			describeObject(instancia, objetosArray[nuevaIteracion].nombre, nuevaIteracion)
		}

		console.log('END');

	});

}



start();

