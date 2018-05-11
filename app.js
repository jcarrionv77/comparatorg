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
				descargaFicheros(0);
				console.log('Fin descarga !!!!!!!!');
				stopWorker();
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

				console.log('fin consultaObjetos');
				//stopWorker();
			}
		}); 

    });

}


function descargaFicheros(indice)
{
    console.log('ini descargaFicheros!');
    var objInstancia = instanciasArray[indice];
	
	try {

		console.log('Login en objInstancia ' + objInstancia.nombre);



		var commandSFDXLogin = '';

		
		commandSFDXLogin = 'sfdx force:auth:jwt:grant --clientid ' + objInstancia.secreto +' --jwtkeyfile ./tmp/server.key --username ' + objInstancia.usuario + ' --instanceurl ' + objInstancia.url+ ' --setalias '+ objInstancia.nombre;

		//var commandSFDXLogin = 'sfdx force:auth:jwt:grant --clientid 3MVG9X0_oZyBSzHrtbrbfMcbIYRG2EJYKx.kHJqYn5fr_CJypNQvV0UaNy5ALJEqbHm8fuglPg6J0VxFdsCKa --jwtkeyfile ./tmp/server.key --username jcarrion@salesforce.com.repsol.repaudit --instanceurl https://test.salesforce.com --setalias repaudit';
		
		console.log('commandSFDXLogin  ' + commandSFDXLogin);

		
		execSync(commandSFDXLogin);

		describeObject(objInstancia.nombre , 0);

		var nuevoIndice = indice + 1;
		if(nuevoIndice < instanciasArray.length)
		{
			descargaFicheros(nuevoIndice)
		}		

		console.log('fin descargaFicheros!');

		/*
		console.log('ini llamada asincrona');
		exec(commandSFDXLogin, (err, stdout, stderr) => {
			if (err) {
				console.error(`exec error: ${err}`);
				return;
			}

			
			describeObject(objInstancia.nombre , 0);
			
			var nuevoIndice = indice + 1;
			if(nuevoIndice < instanciasArray.length)
			{
				descargaFicheros(nuevoIndice)
			}

		});
		console.log('fin llamada asincrona');
		*/

	}
	catch (err) {
		console.error(err);
	}
}


function describeObject(instancia , iteracion)
{
	console.log('ini describeObject');

	var objeto = objetosArray[iteracion].nombre;

	var fileName = './tmp/' + objeto + '/' +  instancia + '.json';
	
	var commandSFDXDescribe	= 'sfdx force:schema:sobject:describe -u ' + instancia +    ' -s ' + objeto + ' --json > ' +  fileName;
	
	console.log('commandSFDXDescribe ' + commandSFDXDescribe);

	execSync(commandSFDXDescribe, {maxBuffer: 1024 * 500});
	var nuevaIteracion = iteracion + 1;

	if(nuevaIteracion < objetosArray.length)
	{
		describeObject(instancia, nuevaIteracion)
	}

	console.log('fin describeObject');


	//var commandSFDXDescribe	= 'sfdx force:schema:sobject:describe -u ' + instanciasArray[0].nombre +    ' -s Account --json ';

	/*
	exec(commandSFDXDescribe, {maxBuffer: 1024 * 500}, (err, stdout, stderr) => {
		if (err) {
			console.error(`exec error: ${err}`);
			return;
		}
		
		var nuevaIteracion = iteracion + 1;

		if(nuevaIteracion < objetosArray.length)
		{
			describeObject(instancia, nuevaIteracion)
		}


	});
	*/

}

function stopWorker()
{
	process.exit(0);
}

var serverKey = process.env.SERVER_KEY;

var fs = require('fs');
fs.writeFileSync("tmp/server.key", serverKey); 

consultaObjetos();

console.log('fin');




