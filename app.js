var fs = require("fs");
var nrc = require('node-run-cmd');


console.log('hola mundo  ');

nrc.run('mkdir tmp');

nrc.run('sfdx force:auth:jwt:grant --clientid 3MVG9X0_oZyBSzHrtbrbfMcbIYRG2EJYKx.kHJqYn5fr_CJypNQvV0UaNy5ALJEqbHm8fuglPg6J0VxFdsCKa --jwtkeyfile /app/repaudit/server.key --username jcarrion@salesforce.com.repsol.repaudit --instanceurl https://test.salesforce.com --setalias repaudit');

nrc.run('sfdx force:org:list --verbose --json > tmp/MyOrgList.json');

var contents = fs.readFileSync("/tmp/MyOrgList.json");
var jsonContent = JSON.parse(contents);

console.log('contents  ' + contents);


console.log('hola mundo2  ');