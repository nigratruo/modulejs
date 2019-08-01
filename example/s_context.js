var MB = Module({
  // This method will be called at instantiation.
  initialize: function(component){

    // this means generated Module instance "O2".
    console.log('this.id: ' + this.id, this.id === 0);
    // > 0

    // this means generated Module instance "O2".
    console.log('this.__proto__.id: ' + this.__proto__.id, this.__proto__.id === 2);
    // > 2

  }
});

var M1 = MB.extend({
  id: 1
});

var M2 = M1.extend({
  id: 2
});

var O2 = new M2({id: 0});
console.log(O2);
