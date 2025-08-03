/*
 *   __   __  _______  ______   __   __  ___      _______      ___  _______
 *  |  |_|  ||       ||      | |  | |  ||   |    |       |    |   ||       |
 *  |       ||   _   ||  _    ||  | |  ||   |    |    ___|    |   ||  _____|
 *  |       ||  | |  || | |   ||  |_|  ||   |    |   |___     |   || |_____
 *  |       ||  |_|  || |_|   ||       ||   |___ |    ___| ___|   ||_____  |
 *  | ||_|| ||       ||       ||       ||       ||   |___ |       | _____| |
 *  |_|   |_||_______||______| |_______||_______||_______||_______||_______|
 *
 *
 */
export default (function () {

  const def = {
    namespace: 'MODULE',
    version: '0.0.1',
    description: 'Moduler library',
    license: 'MIT'
  };

  var start = (new Date()).getTime();

  // Default configurations
  var Config = {
    "debug": true,
    "strict": true,
    "setter_alias": "__set",
    "getter_alias": "__get",
    "setter": function (k, v) { return set_property.apply(this, [k, v, Config.strict]); },
    "getter": function (k) { return get_property.apply(this, [k]); },
    "disable_initialize": false
  };

  /*
   * var some_mod = Module.extend({name: "sample"});
   *
   * var insane_constructor =
   *   some_mod
   *     .extend(something_1, something_2, something_3)
   *     ..... ;
   *
   */

  // Module
  // new
  //   ( [Object|Constructor]...
  //   ) -> Object
  // call
  //   ( [Object|Constructor]...
  //   ) -> Module
  //
  // Base Constructor.
  //
  function Factory() {
    return (this instanceof Factory)
      ? init_module.apply(this, arguments)
      : init_extension.apply(Factory, arguments);
  }

  function Component() {
  }

  Factory.create = create;
  Factory.config = config;
  Factory.is_Module = start;
  Factory.prototype = new Component;

  //
  define_property_hidden(Factory.prototype, 'initialize', function () { return this; });


  /* extend
   * ( Object
   *   ...
   * ) -> Module
   *
   * Take variable arguments. Returns a new Constructor.
   *
   */
  function extend( /* Arguments */) {
    var context, args, arg;

    // Prepare Module constructor and arguments.
    context = this;
    args = array_clone(arguments);

    // Pick first argument.
    // And check it's construcable or not.
    // ex: Module.extend(OtherModule)
    arg = args.shift();

    // Do Nothing.
    if (!arg) return context;

    // Module extension.
    if (is_module(arg)) {
      return extend.apply(context, arg.stack.concat(args));
      // Or clone and flatten Module.
      // arg = clone(arg.prototype, {});
    }

    // Define a new constructor.
    // - To prevent initialize() call when instantiated.
    // - To prevent extension stacking for another Module.extend call.
    // - Apply properties to a surface instance.
    var m = build(context, arg);

    // Add new prototypechain.
    substitute(context, m);
    inherit(m, context, arg);

    // Clone arg to prototype.
    clone(arg, m.prototype);

    // Apply remaining args recursively.
    return (args.length > 0) ? extend.apply(m, args) : m;
  }

  /* build
   * ( Constructor
   *   Array
   * ) -> Constructor
   */
  function build(constructor, arg) {
    /*
     * options:
     *   package -- packaging all properties to surface. [true:enable false: disable]
     *
     * @TODO should be investigate for performance -
     * with constructor in a scope.
     *
     */
    var m = function Module(a, iarg, options) {
      (valid(options, 'package', true) || (!valid(options, 'package', true) && m.package === true)) && clone(arg, this, true);
      constructor.apply(this, arguments);
    }

    m.extend = extend;
    m.create = create;
    m.package = true;
    m.is_Module = start;

    return m;
  }

  function inherit(d, s, o) {
    if (is_module(d) && is_module(s) && is_o(o)) {
      (d.stack === undefined) && (d.stack = []);
      (s.stack === undefined) && (s.stack = []);
      d.stack = d.stack.concat(s.stack.concat(o));
    }
  }

  /* substitute
   * ( ConstructorA
   *   ConstructorB
   * ) -> ConstructorB
   */
  function substitute(context, m) {
    // Surrogation.
    (function (s) {
      s.prototype = context.prototype;
      m.prototype = new s();
    })(function Stack() { });
    return m;
  }

  /* clone
   * ( Object,
   *   Object,
   *   Boolean
   * ) -> Boolean
   *
   * @mutable
   * Overrides properties to dst.
   */
  function clone(src, dst, to_module_instance) {
    // Works only with Objects.
    if (!is_o(dst) || !is_o(src)) return dst;

    for (var k in src) {
      var vl = src[k];

      // Observe 1st hier instantiation.
      (to_module_instance
        && Config.strict
        && !has_key(dst, k)
      ) && error_no_property(k);

      // Keep most recent extension.
      if (to_module_instance && dst.hasOwnProperty(k)) {
        continue;
      }

      // Cut ref.
      (is_o(vl, true)) && (vl = clone(vl, {}));
      (is_a(vl, true)) && (vl = array_clone(vl));

      // Defines the property.
      (to_module_instance)
        ? set_property.apply(dst, [k, vl, Config.strict])
        : define_property(dst, k, vl);
    }

    return dst;
  }

  /* create
   * ( ?Object
   *   ?Object|Module
   *   ...
   * ) -> Object
   *
   * @example
   * $module.create({
   *  name: 'john'
   * }, Living, Human, Programmer);
   *
   */
  function create(attr /* , extensions... */) {
    return new (init_extension.apply(this, array_clone(arguments).slice(1)))(attr || {});
  }


  /* init_module
   * ( Object
   *   ?Array
   * ) -> Object
   *
   * Be called from Factory
   */
  function init_module(attr, iarg) {
    (function (c) {
      (attr) && clone(attr, c);
      (!valid(Config, 'disable_initialize', true) && c && typeof c.initialize === 'function')
        && c.initialize.apply(c, iarg);
    })(this);
  }

  /* init_extension
   * (*)
   *   ( [Object|Constructor]...
   *   ) -> Module
   *
   * Be called from Factory
   */
  function init_extension() {
    // Defines setter
    (!this.prototype[Config.setter_alias])
      && define_property_hidden(this.prototype, Config.setter_alias, Config.setter);
    // Defines getter
    (!this.prototype[Config.getter_alias])
      && define_property_hidden(this.prototype, Config.getter_alias, Config.getter);
    // Calls extend everytime when constructor is Factory.
    // but Module.create({}) will generate 1 empty Component hier due to calling extend() with 0 arguments.
    return (arguments.length > 0 || this === Factory) ? extend.apply(this, arguments) : this;
  }

  /* error
   * ( String
   * ) -> undefined
   *   !! Expection
   */
  function error(message) {
    throw new Error(def.namespace + ": " + message);
  }

  /* error_no_property
   * ( String
   * ) -> undefined
   *   !! Expection
   */
  function error_no_property(k) {
    error("The property named '" + k + "' is not accessible.");
  }

  /* type_error
   * ( a
   *   b
   *   String
   * ) -> String
   *
   * Returns type-error message.
   *
   */
  function type_error(s, t, name) {
    var t_s = typeof s;
    var t_t = typeof t;

    if (typeof s !== typeof t) {
      return "'" + name + "' type is invalid. Expected type is " + (t_s) + ", but type of assigning value is " + (t_t);
    }

    if (is_o(s)) {
      if (s.constructor !== t.constructor) {
        return "Invalid constructor for '" + name + "'."
          + "Expected constructor is " + s.constructor.name + ", but constructor of assigning value is " + t.constructor.name;
      }
    }

    return null;
  }

  /* set_property
   * ( String
   *   a
   * ) -> a
   *   @mutable
   */
  function set_property(k, v, strict) {
    if (strict) {
      if (has_key(this, k)) {
        var e;
        if (this[k] !== undefined && v !== undefined) {
          e = type_error(this[k], v, k);
          e && error(e);
        }
        if (!e) {
          define_property(this, k, v);
        }
      } else {
        error_no_property(k);
      }
    } else {
      define_property(this, k, v);
    }
    return this;
  }

  /* get_property
   * ( String
   * ) -> a | undefined
   */
  function get_property(k) {
    if (has_key(this, k)) {
      return this[k];
    }
  }

  /* has_key
   * ( Object
   *   String
   * ) -> Boolean
   */
  function has_key(context, k) {
    for (var i in context) if (i === k) return true;
    return false;
  }

  /* valid
   * ( Object
   *   String
   *   a
   * ) -> Boolean
   */
  function valid(o, k, s) {
    return is_o(o) && has_key(o, k) && o[k] === s;
  }

  /* config
   * (1,2)
   *   ( String
   *     a
   *   ) -> a
   * (1)
   *   ( String
   *   ) -> a
   */
  function config(k, v) {
    switch (arguments.length) {
      case 2:
        return config_set(k, v);
      case 1:
        if (is_o(k)) {
          for (var i in k) {
            config_set(i, k[i]);
          }
          return config();
        } else {
          return config_get(k);
        }
      case 0:
        return clone(Config, {});
    }
  }

  /* config_get
   * ( String
   *   a
   * ) -> Boolean
   */
  function config_set(k, v) {
    if (Config.hasOwnProperty(k)) {
      Config[k] = v;
      return true;
    } else {
      return false;
    }
  }

  /* config_get
   * ( String
   * ) -> a
   *
   */
  function config_get(k) {
    return (Config.hasOwnProperty(k)) ? Config[k] : null;
  }

  /* is_o
   * ( a
   * ) -> Boolean
   *
   */
  function is_o(v, strict) {
    return v
      && (typeof v === 'object')
      && (v.constructor !== Array)
      && (strict ? v.constructor === Object : true);
  }

  /* is_a
   * ( a
   *   ?Boolean = Checks constructor
   * ) -> Boolean
   *
   * Returns passed 
   *
   */
  function is_a(v, strict) {
    return v
      && (typeof v === 'object')
      && (v instanceof Array)
      && (strict ? v.constructor === Array : true);
  }

  function is_module(c) {
    return (typeof c === "function" && c.is_Module && c.is_Module === start);
  }

  /* array_clone
   * ( Array
   * ) -> Array'
   */
  function array_clone(a) {
    return Array.prototype.slice.call(a);
  }

  /* defineProperty
   * ( Object    = Destination Object.
   *   String    = Destination key.
   *   a         = Assigning value.
   *   Object    = defineProperty option.
   * ) -> Object
   */
  function define_property(dst, k, vl, op) {
    Object.defineProperty(dst, k, {
      value: vl,
      configurable: (op && op.hasOwnProperty('configurable') ? op.configurable : true),
      enumerable: (op && op.hasOwnProperty('enumerable') ? op.enumerable : true),
      writable: (op && op.hasOwnProperty('writable') ? op.writable : true)
    });
  }

  /* define_property_hidden
   * ( Object = Destination
   *   String = Key
   *   a      = Assigning value.
   * )
   */
  function define_property_hidden(dst, k, vl) {
    define_property(dst, k, vl, {
      enumerable: false
    });
  }

  return Factory;

})()
