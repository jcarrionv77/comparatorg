var fs = require("fs");
var nrc = require('node-run-cmd');


console.log('hola mundo  ');



nrc.run('sfdx force:auth:jwt:grant --clientid 3MVG9X0_oZyBSzHrtbrbfMcbIYRG2EJYKx.kHJqYn5fr_CJypNQvV0UaNy5ALJEqbHm8fuglPg6J0VxFdsCKa --jwtkeyfile /app/repaudit/server.key --username jcarrion@salesforce.com.repsol.repaudit --instanceurl https://test.salesforce.com --setalias repaudit');


var errorCallback = function(err) {
  console.log('err  ' + err);
};

var dataCallback = function(data) {
  var miJson = data;
  console.log('dataCallback  ');
  var jsonContent = JSON.parse(miJson);
  console.log('miJson  ' + miJson);
};
nrc.run('sfdx force:org:list --verbose --json', { onData: dataCallback });

console.log('hola mundo2  ');