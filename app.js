var fs = require("fs");
var pg = require('pg');

var dbCli = null;
var instanciasArray = new Array();

const { exec } = require('child_process');


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

		var commandSFDXList = 'sfdx force:org:list --verbose --json > tmp/MyOrgList.json';


		var command = 'find . -type f | wc -l';

		exec(commandSFDXLogin, (err, stdout, stderr) => {
			if (err) {
				console.error(`exec error: ${err}`);
				return;
			}

			console.log(`exec ok  ${stdout}`);
			console.log('FIN exec login');


			exec(commandSFDXList, (err, stdout, stderr) => {
				if (err) {
					console.error(`exec error: ${err}`);
					return;
				}

				console.log(`exec ok  ${stdout}`);
				console.log('FIN exec login');

				var contents = fs.readFileSync("tmp/MyOrgList.json");
				var jsonContent = JSON.parse(contents);

				console.log('contents ' + contents);
				console.log('END');

			});
		});
	console.log('hola mundo2  ');
	}
	catch (err) {
		console.error(err);
	}
}

start();

