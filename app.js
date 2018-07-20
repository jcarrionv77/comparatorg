var fs = require("fs");
var pg = require('pg');
var unique = require('array-unique');
var path = require('path');
var HashMap = require('hashmap');

var dbCli = null;
var instanciasArray = new Array();
var objetosArray = new Array();

var Cliente = require('pg-native');

const { exec } = require('child_process');
const { execSync } = require('child_process');

var client = new Cliente();
client.connectSync(process.env.DATABASE_URL);


function ConsultaInstancias()
{
	pg.defaults.ssl = true;
	pg.connect(process.env.DATABASE_URL, function(err, client) {
		if (err) 
			throw err;
		
		console.log('Connected to postgres!');
		dbCli = client;

		dbCli.query(
			'SELECT nombre, secreto, usuario, url FROM instancias where activo = true', 
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
			'SELECT nombre, apiname FROM objetos  where activo = true', 
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

					var directorio = 'tmp/'+objeto.nombre;
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
	
	try{
		execSync(commandSFDXDescribe, {maxBuffer: 1024 * 500});
	}
	catch(err){
		console.log('skip ' + instancia);
	}
	
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


	console.log('fin release 1');

	consultaPermission();

	console.log('fin release 2');

	consultaLicencias();

	console.log('fin release 3');

	//stopWorker();

}

function procesaArrays(fieldsArray, orgsArray, nombreColumna){

	unique(fieldsArray);
	
	//lista unica de elementos para las filas
	var sortFieldsArray = fieldsArray.sort();


	var fieldResult = new Array();
	
	//mapa de saber cada elemento en que fila está
	var map = new HashMap();


	//relleno el mapa
	for(var i=0; i< sortFieldsArray.length; i++){
		map.set(sortFieldsArray[i], i);
	}


	//recorrer el listadp de org
	for (var k=0; k<orgsArray.length;k++){
		
		//array con el tamaño de las filas unicas para rellenar los valores especificos de una org específica
		var camposOrg = new Array(sortFieldsArray.length);  

		//pongo un si en las posiciones que aplican para 
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

	htmlTanspuesto = htmlTanspuesto + '</tbody></table>';

	return htmlTanspuesto;
}


function procesaArraysNuevo(fieldsArray, orgsArray, nombreColumna){

	unique(fieldsArray);
	
	//lista unica de elementos para las filas
	var sortFieldsArray = fieldsArray.sort();

	var fieldResult = new Array();
	
	//mapa de saber cada elemento en que fila está
	var map = new HashMap();


	//relleno el mapa
	for(var i=0; i< sortFieldsArray.length; i++){
		map.set(sortFieldsArray[i], i);
	}


	//recorrer el listadp de org
	for (var k=0; k<orgsArray.length;k++){
		
		//array con el tamaño de las filas unicas para rellenar los valores especificos de una org específica
		var camposOrg = new Array(sortFieldsArray.length);  

		//pongo un si en las posiciones que aplican para 
		for(j=0;j<orgsArray[k].fields.length;j++)
		{
			camposOrg[map.get(orgsArray[k].fields[j])] = orgsArray[k].fieldsData[j].valor;
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

	htmlTanspuesto = htmlTanspuesto + '</tbody></table>';

	return htmlTanspuesto;
}

function readFilesSandbox(){
	
	var directorioObj = 'tmp/objetos';
	console.log('readFiles en  ' + directorioObj);
	
	var files = fs.readdirSync(directorioObj);

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


	console.log('update ');


	 dbCli.query('UPDATE instancias set html =($1)', 
	        [htmlObjetos]); 
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


function consultaLicencias(){

	var directorio = 'tmp/licencias';

	execSync('mkdir ' + directorio);

	var fileName = './tmp/licencias/asignacionPS.json'
	var sQuery = 'SELECT Assignee.name,  Assignee.LastLoginDate, Assignee.Profile.Name, Assignee.Profile.Id, Assignee.Profile.UserLicense.name,Id,  PermissionSet.name FROM PermissionSetAssignment  where Assignee.IsActive = true and Assignee.Profile.UserLicense.name= \'Salesforce\' order by Assignee.name';
	var sProduccion = 'produccion';
	var commandSFDXDescribe	= 'sfdx force:data:soql:query -q "' + sQuery  +  '" ' + '-u ' + sProduccion +' --json > ' + fileName;

	console.log('commandSFDXDescribe ' + commandSFDXDescribe);

	execSync(commandSFDXDescribe, {maxBuffer: 1024 * 500});

	var fileName = './tmp/licencias/asignacionApp.json'
	sQuery = 'SELECT Id, Parent.name,SetupEntityId FROM SetupEntityAccess WHERE SetupEntityType = \'TabSet\'  order by Parent.name';
	commandSFDXDescribe	= 'sfdx force:data:soql:query -q "' + sQuery  +  '" ' + '-u ' + sProduccion +' --json > ' + fileName;

	console.log('commandSFDXDescribe ' + commandSFDXDescribe);

	execSync(commandSFDXDescribe, {maxBuffer: 1024 * 500});


	var fileName = './tmp/licencias/App.json'
	sQuery = 'SELECT ApplicationId,Label FROM AppMenuItem WHERE Type = \'TabSet\'';
	commandSFDXDescribe	= 'sfdx force:data:soql:query -q "' + sQuery  +  '" ' + '-u ' + sProduccion +' --json > ' + fileName;

	console.log('commandSFDXDescribe ' + commandSFDXDescribe);

	execSync(commandSFDXDescribe, {maxBuffer: 1024 * 500});

	var MyFile = fs.readFileSync('tmp/licencias/App.json');
	var jsonContent = JSON.parse(MyFile);

	var map = new HashMap();
	var nombreAppArray = new Array();

	for (var i =0; i<jsonContent.result.records.length; i++)
	{
		map.set(jsonContent.result.records[i].ApplicationId, jsonContent.result.records[i].Label);
		nombreAppArray.push(jsonContent.result.records[i].Label);
	}

	MyFile = fs.readFileSync('tmp/licencias/asignacionApp.json');
	jsonContent = JSON.parse(MyFile);
	
	var psArray = new Array();
	var appsArray = new Array();
	var objPsAppp ={};
	var mapPS = new HashMap();

	console.log('********************************************');

	for (var i =0; i<jsonContent.result.records.length; i++)
	{
		
		if(i == 0 || jsonContent.result.records[i].Parent.Name != jsonContent.result.records[i-1].Parent.Name)
		{
			if (i>0){
				objPsApp.arrayApps = appsArray;
				psArray.push(objPsApp);

				//console.log('objPsApp.NamePs : ' + objPsApp.NamePs);
				//console.log('objPsApp.arrayApps : ' + objPsApp.arrayApps);

				mapPS.set(objPsApp.NamePs, objPsApp);
			}

			objPsApp={};
			appsArray = [];
			objPsApp.NamePs = jsonContent.result.records[i].Parent.Name;
			//console.log('objPsApp.NamePs : ' + objPsApp.NamePs);

			if(map.get(jsonContent.result.records[i].SetupEntityId) != 'Chatter Repsol')
				appsArray.push(map.get(jsonContent.result.records[i].SetupEntityId));
			//console.log('objPsApp.NameAPP : ' +map.get(jsonContent.result.records[i].SetupEntityId));
		}
		else
		{
			if(map.get(jsonContent.result.records[i].SetupEntityId) != 'Chatter Repsol')
				appsArray.push(map.get(jsonContent.result.records[i].SetupEntityId));
			//console.log('objPsApp.NameAPP : ' +map.get(jsonContent.result.records[i].SetupEntityId));
		}
		
	}


	objPsApp.arrayApps = appsArray;

	mapPS.set(objPsApp.NamePs, objPsApp);
	psArray.push(objPsApp);

	//console.log('objPsApp.NamePs : ' + objPsApp.NamePs);
	//console.log('objPsApp.arrayApps : ' + objPsApp.arrayApps);


	MyFile = fs.readFileSync('tmp/licencias/asignacionPS.json');
	jsonContent = JSON.parse(MyFile);

	var userArray = new Array();
	var objUser ={};
	var userAppsArray = new Array();

	var listaAppProcesada = new Array();

	//console.log('********************************************');

	//console.log('jsonContent.result.records.length ' + jsonContent.result.records.length);

	for (var i =0; i<jsonContent.result.records.length; i++)
	{
		//if(jsonContent.result.records[i].Assignee.Name != 'JOSE SANCHEZ-QUINTANAR SANCHEZ-ALARCOS')
		//{
			if(i == 0 || jsonContent.result.records[i].Assignee.Name != jsonContent.result.records[i-1].Assignee.Name)
			{
				if (i>0){
					objUser.userAppsArray = userAppsArray;
					userArray.push(objUser);
				}
					//console.log('******');
				
				
				objUser={};
				userAppsArray = [];
				
				objUser.Name = jsonContent.result.records[i].Assignee.Name;
				objUser.LastLoginDate = jsonContent.result.records[i].Assignee.LastLoginDate;
				objUser.Profile = jsonContent.result.records[i].Assignee.Profile.Name;
				objUser.ProfileId = jsonContent.result.records[i].Assignee.Profile.Id;
				//console.log('objUser.Name : ' + objUser.Name);

				//console.log('jsonContent.result.records[i].PermissionSet.Name : ' + jsonContent.result.records[i].PermissionSet.Name);

				if(mapPS.get(jsonContent.result.records[i].PermissionSet.Name) != null){
					var miPS = mapPS.get(jsonContent.result.records[i].PermissionSet.Name);

					//console.log('miPS: ' + JSON.stringify(miPS));

					for (var j=0; j<miPS.arrayApps.length; j++)
					{
						if(miPS.arrayApps[j] != 'Chatter Repsol' && miPS.arrayApps[j] != 'App Launcher' 
								 && miPS.arrayApps[j] != '' 
								 && miPS.arrayApps[j] != 'undefined' 
								 && miPS.arrayApps[j] != 'All Tabs' 
								 && miPS.arrayApps[j] != 'Sales Console'
								 && miPS.arrayApps[j] != 'Sales'
								 && miPS.arrayApps[j] != 'Content'
								 && miPS.arrayApps[j] != 'Sample Console'
								 && miPS.arrayApps[j] != 'Platform'
								 && miPS.arrayApps[j] != 'Service Console'
								 && miPS.arrayApps[j] != 'Service'
								 && miPS.arrayApps[j] != 'Marketing'
								 && miPS.arrayApps[j] != 'Analytics Studio'
								 && miPS.arrayApps[j] != 'Sales'
								 && miPS.arrayApps[j] != 'Lightning Usage App') 
						{
							userAppsArray.push(miPS.arrayApps[j]);
							listaAppProcesada.push(miPS.arrayApps[j]);
							//console.log('app : ' + miPS.arrayApps[j]);
						}

					}
				}



			}
			else
			{
				//console.log('jsonContent.result.records[i].PermissionSet.Name : ' + jsonContent.result.records[i].PermissionSet.Name);

				if(mapPS.get(jsonContent.result.records[i].PermissionSet.Name) != null){
					var miPS = mapPS.get(jsonContent.result.records[i].PermissionSet.Name);

					//console.log('miPS: ' + JSON.stringify(miPS));

					for (var j=0; j<miPS.arrayApps.length; j++)
					{
						if(miPS.arrayApps[j] != 'Chatter Repsol' && miPS.arrayApps[j] != 'App Launcher' 
								 && miPS.arrayApps[j] != 'All Tabs' 
								 && miPS.arrayApps[j] != '' 
								 && miPS.arrayApps[j] != 'undefined' 
								 && miPS.arrayApps[j] != 'Sales Console'
								 && miPS.arrayApps[j] != 'Sales'
								 && miPS.arrayApps[j] != 'Content'
								 && miPS.arrayApps[j] != 'Sample Console'
								 && miPS.arrayApps[j] != 'Platform'
								 && miPS.arrayApps[j] != 'Service Console'
								 && miPS.arrayApps[j] != 'Service'
								 && miPS.arrayApps[j] != 'Marketing'
								 && miPS.arrayApps[j] != 'Analytics Studio'
								 && miPS.arrayApps[j] != 'Sales'
								 && miPS.arrayApps[j] != 'Lightning Usage App') 	
						{
							userAppsArray.push(miPS.arrayApps[j]);
							listaAppProcesada.push(miPS.arrayApps[j]);
							//console.log('app : ' + miPS.arrayApps[j]);
						}
					}
				}
			}
		//}
	}

	objUser.userAppsArray = userAppsArray;
	userArray.push(objUser);

	console.log('********************************************');


	console.log(userArray.length);


	nombreAppArray = unique(listaAppProcesada);

	console.log(nombreAppArray.length);
	console.log(listaAppProcesada.length);

	console.log('nombreAppArray.length es: ' + listaAppProcesada.length);
	console.log('nombreAppArray.length es: ' + nombreAppArray.length);

	for(var i=0; i<userArray.length; i++)
	{
		userArray[i].userAppsArray = unique(userArray[i].userAppsArray);
	}
	

	var HTML = '';

	console.log('HTML es: ' + HTML);

	var nombreColumna = 'Usuario';

	HTML = '<table class="slds-table slds-table_bordered slds-table_cell-buffer">';
	HTML = HTML + '<thead><tr class="slds-text-title_caps"><th scope="col"><div class="slds-truncate">' + nombreColumna + '</div></th><th scope="col"><div class="slds-truncate">Last Login</div></th></th><th scope="col"><div class="slds-truncate">Profile</div></th>';

	console.log('nombreAppArray.length es: ' + nombreAppArray.length);

	for (var k=0; k<nombreAppArray.length;k++){

		HTML = HTML + '<th scope="col"><div class="slds-truncate">' + nombreAppArray[k].substring(0, 8) + '</div></th>';
		
	}

	HTML = HTML + '</thead><tbody>';

	console.log('userArray.length es: ' + userArray.length);

	for(var i=0; i<userArray.length; i++){


		var lastLogin;
		if(userArray[i].LastLoginDate != null)
			lastLogin = userArray[i].LastLoginDate.substring(0, 10);
		else
			lastLogin = '';

		HTML = HTML + '<tr><th scope="row"><div class="slds-truncate">' + userArray[i].Name + '</div></th><th scope="row"><div class="slds-truncate">' + lastLogin + '</div></th><th scope="row"><div class="slds-truncate">' + userArray[i].Profile + '</div></th>';
	
		for (var k=0; k<nombreAppArray.length;k++){
			var bool = false;
			for (var j=0; j< userArray[i].userAppsArray.length; j++){

				if(userArray[i].userAppsArray[j]==nombreAppArray[k]){
					var bool = true;
				}

			}

			if(bool)
				HTML = HTML + '<th scope="row"><div class="slds-truncate">' +  Number.parseFloat(1/userArray[i].userAppsArray.length).toPrecision(2)  + '</div></th>';
			else
				HTML = HTML + '<th scope="row"><div class="slds-truncate">' + '' + '</div></th>';
				
		}
		HTML = HTML + '</tr>';
		

	}	
	
	HTML = HTML + '</tbody></table>';


	//console.log('HTML es: ' + HTML);

	console.log('********************************************');

	dbCli.query('UPDATE licenses set html =($1) ', 
		[HTML]); 
	console.log('row update');


}

function consultaPermission(){



	var result = client.querySync('SELECT name, apiname FROM permissionset');

	for (var i=0; i<result.length; i++)
	{
		var directorio = 'tmp/'+result[i].apiname;
		execSync('mkdir ' + directorio);
	}

	if  (result != null && result.length>0)
	{
		//descargar las permission set de una sandbox
		for (var j=0; j<instanciasArray.length; j++)
		{
			//descarga de un PS
			for (var i=0; i<result.length; i++)
			{
				
				console.log('instanciasArray[j] ' + instanciasArray[j].nombre);

				var fileName = './tmp/' + result[i].apiname + '/' +  instanciasArray[j].nombre + '.json';

				var commandSFDXDescribe	= 'sfdx force:data:soql:query -q "select SobjectType,parent.name,PermissionsCreate,PermissionsRead,PermissionsDelete,PermissionsViewAllRecords,PermissionsModifyAllRecords from ObjectPermissions where parent.name= \'' +  result[i].apiname   +'\' order by SobjectType" ' + '-u ' + instanciasArray[j].nombre +' --json > ' + fileName;

				console.log('commandSFDXDescribe ' + commandSFDXDescribe);
				console.log('escribimos en ' + fileName);

				execSync(commandSFDXDescribe, {maxBuffer: 1024 * 500});

			}
		}
		//ya estan los PS de todas las sandbox descargados
		//buche para recorrer por PS 
		for (var i=0; i<result.length; i++)
		{
			var directorio = 'tmp/'+result[i].apiname;

			console.log('directorio en PS  ' + directorio);

			var files = fs.readdirSync(directorio);

			console.log('files.length ' + files.length);

			//Array con las filas unicas quitando duplicados
			var fieldsArray = new Array();

			//Array con los datos por org
			var orgsArray = new Array();

			files.forEach(file => {
				try{

					console.log('file ' + file);
					if(path.extname(file) == '.json')
					{
						var org = { name: '', fields: [], fieldsData: []};
						org.name = file;

						var nameOrg = file.substring(0,file.length-5);

						console.log('leer fichero ' + directorio + '/' + file);

						var MyFile = fs.readFileSync(directorio+'/'+file);



						if(MyFile.length>0)
						{
							var jsonContent = JSON.parse(MyFile);	

							for (var i =0; i<jsonContent.result.records.length; i++)
							{

								var Permssions={};

								var cadena= '';

								Permssions.PermissionsRead = jsonContent.result.records[i].PermissionsRead;
								Permssions.PermissionsCreate = jsonContent.result.records[i].PermissionsCreate;
								Permssions.PermissionsDelete = jsonContent.result.records[i].PermissionsDelete;
								Permssions.PermissionsViewAllRecords = jsonContent.result.records[i].PermissionsViewAllRecords;
								Permssions.PermissionsModifyAllRecords = jsonContent.result.records[i].PermissionsModifyAllRecords;
								Permssions.name = jsonContent.result.records[i].SobjectType;

								Permssions.descripcion = Permssions.PermissionsRead + ' ' + Permssions.PermissionsCreate + ' ' + Permssions.PermissionsDelete + ' ' + Permssions.PermissionsViewAllRecords + ' ' + Permssions.PermissionsModifyAllRecords;

								if(Permssions.PermissionsRead)
									cadena = cadena + ' R';
								if(Permssions.PermissionsCreate)
									cadena = cadena + ' C';
								if(Permssions.PermissionsDelete)
									cadena = cadena + ' D';		
								if(Permssions.PermissionsViewAllRecords)
									cadena = cadena + ' VA';	
								if(Permssions.PermissionsModifyAllRecords)
									cadena = cadena + ' MA';		

								Permssions.valor = 	cadena;			

								org.fields.push(jsonContent.result.records[i].SobjectType);
								org.fieldsData.push(Permssions);




								fieldsArray.push(jsonContent.result.records[i].SobjectType);

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

			var html = procesaArraysNuevo(fieldsArray, orgsArray,   'Objetos');



			console.log('update ' + result[i].apiname);


			dbCli.query('UPDATE permissionset set html =($1)  where name = ($2)', 
				[html, result[i].apiname]); 
			console.log('row update');

				
		}



	}
			

}


function stopWorker()
{
	dbCli.end();
	process.exit(0);
}

console.log('ARRANQUE !!!');

var serverKey = process.env.SERVER_KEY;

var directorio = 'tmp/objetos';
execSync('mkdir ' + directorio);

var directorio = 'tmp/ps';
execSync('mkdir ' + directorio);

var fs = require('fs');
fs.writeFileSync("tmp/server.key", serverKey); 

consultaObjetos();








