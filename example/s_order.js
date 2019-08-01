var M1 = Module({id: 1});
var M2 = Module({id: 2});
var M3 = Module({id: 3});
var MW = Module(M2, M3, M1);

var O = new MW({id: 0});

console.dir(O);
console.log(O.id); // 0
console.log(O.__proto__.id); // 1
console.log(O.__proto__.__proto__.id); // 3
console.log(O.__proto__.__proto__.__proto__.id); // 2
