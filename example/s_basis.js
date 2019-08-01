var ex = Module({
  name: "base",
  desc: "this is base object."
});

var q = new ex;
var r = new ex;

// Change something.
q.name = 4;

console.log("[sample1] Q: ", q);
console.log("[sample1] R: ", r);

