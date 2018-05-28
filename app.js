var fs = require("fs");
var pg = require('pg');
var unique = require('array-unique');
var path = require('path');
var HashMap = require('hashmap');

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
				read();
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

		
		commandSFDXLogin = 'sfdx force:auth:jwt:grant --clientid ' + objInstancia.secreto +' --jwtkeyfile ./tmp/server.key --username ' + objInstancia.usuario + ' --instanceurl ' + objInstancia.url+ ' --setalias '+ objInstancia.nombre + ' --json';

		//var commandSFDXLogin = 'sfdx force:auth:jwt:grant --clientid 3MVG9X0_oZyBSzHrtbrbfMcbIYRG2EJYKx.kHJqYn5fr_CJypNQvV0UaNy5ALJEqbHm8fuglPg6J0VxFdsCKa --jwtkeyfile ./tmp/server.key --username jcarrion@salesforce.com.repsol.repaudit --instanceurl https://test.salesforce.com --setalias repaudit';
		
		console.log('commandSFDXLogin  ' + commandSFDXLogin);

		
		var resultado = execSync(commandSFDXLogin);

		console.log('resultado es ' + resultado);


		describeObject(objInstancia.nombre , 0);
		describeOrg(objInstancia.nombre);

		var nuevoIndice = indice + 1;
		if(nuevoIndice < instanciasArray.length)
		{
			descargaFicheros(nuevoIndice)
		}		

		console.log('fin descargaFicheros!');


	}
	catch (err) {
		console.error(err);
	}
}


function describeOrg(instancia)
{

	console.log('ini describeOrg');
	var fileName = './tmp/objetos/' +  instancia + '.json';

	var commandSFDXDescribe	= 'sfdx force:schema:sobject:list -c custom -u ' + instancia +  ' --json > ' +  fileName;
	
	console.log('commandSFDXDescribe ' + commandSFDXDescribe);

	execSync(commandSFDXDescribe, {maxBuffer: 1024 * 500});

	console.log('fin describeOrg');

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



}

function read(){
	for (var i=0; i<objetosArray.length; i++)
	{
		readFiles(objetosArray[i].apiname);
	}
	readFilesSandbox();
	console.log('fin read  **********' );
	//stopWorker();

}

function procesaArrays(fieldsArray, orgsArray, nombreColumna){

	unique(fieldsArray);
	var sortFieldsArray = fieldsArray.sort();


	var fieldResult = new Array();
	
	var map = new HashMap();


	for(var i=0; i< sortFieldsArray.length; i++){
		map.set(sortFieldsArray[i], i);
	}


	for (var k=0; k<orgsArray.length;k++){
	
		var camposOrg = new Array(sortFieldsArray.length);  

		for(j=0;j<orgsArray[k].fields.length;j++)
		{
			camposOrg[map.get(orgsArray[k].fields[j])] = 'si';
		}
		fieldResult.push(camposOrg);
	}

	
	htmlTanspuesto = '<table class="slds-table slds-table_bordered slds-table_cell-buffer">';
	htmlTanspuesto = htmlTanspuesto + '<thead><tr class="slds-text-title_caps"><th scope="col"><div class="slds-truncate">' + nombreColumna + '</div></th>';


	for (var k=0; k<orgsArray.length;k++){

		var orgName = orgsArray[k].name;
		htmlTanspuesto = htmlTanspuesto + '<th scope="col"><div class="slds-truncate">' + orgName.substring(0,orgName.length-5) + '</div></th>';
		
	}

	htmlTanspuesto = htmlTanspuesto + '</thead><tbody>';

	for(var i=0; i< sortFieldsArray.length; i++){



		htmlTanspuesto = htmlTanspuesto + '<tr><th scope="row"><div class="slds-truncate">' + sortFieldsArray[i] + '</div></th>';
		for (var k=0; k<orgsArray.length;k++){

			if(fieldResult[k][i] == 'undefined' || fieldResult[k][i] == '' || fieldResult[k][i] == null)
				htmlTanspuesto = htmlTanspuesto + '<th scope="row"><div class="slds-truncate">' + '' + '</div></th>';
			else
				htmlTanspuesto = htmlTanspuesto + '<th scope="row"><div class="slds-truncate">' + fieldResult[k][i] + '</div></th>';
		}
		htmlTanspuesto = htmlTanspuesto + '</tr>';
		
		
	}

	htmlTanspuestoRT = htmlTanspuestoRT + '</tbody></table>';

	return htmlTanspuesto:
}

function readFilesSandbox(){
	
	var directorioObj = 'tmp/objetos' + obj;
	console.log('readFiles en  ' + readFilesSandbox);
	var files = fs.readdirSync(readFilesSandbox);

	var fieldsArray = new Array();
	var orgsArray = new Array();

	files.forEach(file => {
		try{

			console.log('file ' + file);
			if(path.extname(file) == '.json' && file != 'DevHub.json'  )
			{
				var org = { name: '', fields: []};
				org.name = file;

				var nameOrg = file.substring(0,file.length-5);
				var MyFile = fs.readFileSync(directorioObj+'/'+file);

				if(MyFile.length>0)
				{

					var jsonContent = JSON.parse(MyFile);
					var fields = new Array();


					for (var i =0; i<jsonContent.result.length; i++)
					{
						var field = {};
						field.name = jsonContent.result[i];
						fields.push(field);

						org.fields.push(jsonContent.result[i]);
						fieldsArray.push(jsonContent.result[i]);
					}
					orgsArray.push(org);
				}
			}

		}

		catch (err) {
			console.error('Error en files.forEach');
  			console.error(err);
		}




	});

	var htmlObjetos = procesaArrays(fieldsArray, orgsArray,   'Objetos');


	console.log('update ' + obj);


	 dbCli.query('UPDATE instacias set html =($1)', 
	        [htmlCampos]); 
	 console.log('row update');


}

function readFiles(obj){

	var directorioObj = 'tmp/' + obj;

	console.log('readFiles en  ' + directorioObj);
	var files = fs.readdirSync(directorioObj);
	
	var fieldsArray = new Array();
	var rtArray = new Array();

	var orgsArray = new Array();
	var orgsRtArray = new Array();

	files.forEach(file => {
		try{

			console.log('file ' + file);
			if(path.extname(file) == '.json' && file != 'DevHub.json'  )
			{
				//console.log('file ' + file);

				var org = { name: '', fields: []};
				org.name = file;

				var orgRT = { name: '', fields:[]};
				orgRT.name = file;


				var nameOrg = file.substring(0,file.length-5);
				var MyFile = fs.readFileSync(directorioObj+'/'+file);

				if(MyFile.length>0)
				{

					var jsonContent = JSON.parse(MyFile);
					var fields = new Array();

					var recordTypes = new Array();

					for (var i =0; i<jsonContent.result.fields.length; i++)
					{
						var field = {};
						field.name = jsonContent.result.fields[i].name;
						fields.push(field);

						org.fields.push(jsonContent.result.fields[i].name);
						fieldsArray.push(jsonContent.result.fields[i].name);
					}
					orgsArray.push(org);

					for (var i =0; i<jsonContent.result.recordTypeInfos.length; i++)
					{
						var rt = {};
						rt.name = jsonContent.result.recordTypeInfos[i].name;

						orgRT.fields.push(jsonContent.result.recordTypeInfos[i].name);
						rtArray.push(jsonContent.result.recordTypeInfos[i].name);
					}

					orgsRtArray.push(orgRT);

				}
			}
		}
		catch (err) {
			console.error('Error en files.forEach');
  			console.error(err);
		}
	});

	var htmlCampos = procesaArrays(fieldsArray, orgsArray,   'Campos');
	var htmlRT = procesaArrays(rtArray, orgsRtArray,  'Record Type');

/*

	unique(fieldsArray);
	var sortFieldsArray = fieldsArray.sort();

	unique(rtArray);
	var sortRtArray = rtArray.sort();

	var fieldResult = new Array();
	var rtResult = new Array();
	
	var map = new HashMap();
	var mapRt = new HashMap();

	for(var i=0; i< sortFieldsArray.length; i++){
		map.set(sortFieldsArray[i], i);
	}

	for(var i=0; i< sortRtArray.length; i++){
		mapRt.set(sortRtArray[i], i);
	}

	for (var k=0; k<orgsArray.length;k++){
	
		var camposOrg = new Array(sortFieldsArray.length);  

		for(j=0;j<orgsArray[k].fields.length;j++)
		{
			camposOrg[map.get(orgsArray[k].fields[j])] = 'si';
		}
		fieldResult.push(camposOrg);
	}


	for (var k=0; k<orgsArray.length;k++){
	
		var rtOrg = new Array(sortRtArray.length);  

		for(j=0;j<orgsArray[k].recordTypes.length;j++)
		{
			rtOrg[mapRt.get(orgsArray[k].recordTypes[j])] = 'si';
		}
		rtResult.push(rtOrg);
	}


	
	htmlTanspuesto = '<table class="slds-table slds-table_bordered slds-table_cell-buffer">';
	htmlTanspuesto = htmlTanspuesto + '<thead><tr class="slds-text-title_caps"><th scope="col"><div class="slds-truncate">Campo</div></th>';


	htmlTanspuestoRT = '<table class="slds-table slds-table_bordered slds-table_cell-buffer">';
	htmlTanspuestoRT = htmlTanspuestoRT + '<thead><tr class="slds-text-title_caps"><th scope="col"><div class="slds-truncate">Record Type</div></th>';


	for (var k=0; k<orgsArray.length;k++){

		var orgName = orgsArray[k].name;
		htmlTanspuesto = htmlTanspuesto + '<th scope="col"><div class="slds-truncate">' + orgName.substring(0,orgName.length-5) + '</div></th>';
		
		htmlTanspuestoRT = htmlTanspuestoRT + '<th scope="col"><div class="slds-truncate">' + orgName.substring(0,orgName.length-5) + '</div></th>';
		
		//htmlTanspuesto = htmlTanspuesto + '<th>' + orgName.substring(0,orgName.length-5) + '</th>';
	}

	htmlTanspuesto = htmlTanspuesto + '</thead><tbody>';
	htmlTanspuestoRT = htmlTanspuestoRT + '</thead><tbody>';

	for(var i=0; i< sortFieldsArray.length; i++){

		if(sortFieldsArray[i].includes("__c"))
		{	

			htmlTanspuesto = htmlTanspuesto + '<tr><th scope="row"><div class="slds-truncate">' + sortFieldsArray[i] + '</div></th>';
			for (var k=0; k<orgsArray.length;k++){

				if(fieldResult[k][i] == 'undefined' || fieldResult[k][i] == '' || fieldResult[k][i] == null)
					htmlTanspuesto = htmlTanspuesto + '<th scope="row"><div class="slds-truncate">' + '' + '</div></th>';
				else
					htmlTanspuesto = htmlTanspuesto + '<th scope="row"><div class="slds-truncate">' + fieldResult[k][i] + '</div></th>';
			}
			htmlTanspuesto = htmlTanspuesto + '</tr>';
		}
		
	}


	for(var i=0; i< sortRtArray.length; i++){

		htmlTanspuestoRT = htmlTanspuestoRT + '<tr><th scope="row"><div class="slds-truncate">' + sortRtArray[i] + '</div></th>';
		for (var k=0; k<orgsArray.length;k++){

			if(rtResult[k][i] == 'undefined' || rtResult[k][i] == '' || rtResult[k][i] == null)
				htmlTanspuestoRT = htmlTanspuestoRT + '<th scope="row"><div class="slds-truncate">' + '' + '</div></th>';
			else
				htmlTanspuestoRT = htmlTanspuestoRT + '<th scope="row"><div class="slds-truncate">' + rtResult[k][i] + '</div></th>';
		}
		htmlTanspuestoRT = htmlTanspuestoRT + '</tr>';
				
	}


	htmlTanspuesto = htmlTanspuesto + '</tbody></table>';
	htmlTanspuestoRT = htmlTanspuestoRT + '</tbody></table>';
*/


	console.log('update ' + obj);


	 dbCli.query('UPDATE objetos set html =($1), htmlrt =($2) where nombre = ($3)', 
	        [htmlCampos, htmlRT, obj]); 
	 console.log('row update');


}



function stopWorker()
{
	dbCli.end();
	process.exit(0);
}

var serverKey = process.env.SERVER_KEY;

var fs = require('fs');
fs.writeFileSync("tmp/server.key", serverKey); 

consultaObjetos();

console.log('fin');




