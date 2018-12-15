'use strict';

// yep
var util = require('../util');

// probably yep
var Builder = function(parent, name, parentName) {
  if (parent) {
    this._parent = parent;
    this._indentLevel = parent._indentLevel;
  } else {
    this._buffer = '';
    this._indentLevel = 0;
  }
  this._name = name;
  this._parentName = parentName;
  this._methodSeparator = '';
  this._varIndex = {};
};

// probably yep
Builder.create = function(filename) {
  var builder = new Builder();
  builder.filename = filename;
  return builder;
};

// yep
util.assign(Builder.prototype, {

  // yep
  comment: function(lines) {
    return lines.map(function(line) { return '% ' + line });
  },

  // think this stays unchanged?  same in js and python
  // probably yep
  serialize: function() {
    var files = {};
    files[this._outputPathname()] = this._buffer;
    return files;
  },

  // yep
  _outputPathname: function() {
    return this.filename.replace(/\.peg$/, '.erl');
  },

  // think this stays unchanged?  same in js and python
  // probably yep
  _write: function(string) {
    if (this._parent) return this._parent._write(string);
    this._buffer += string;
  },

  // think this stays unchanged?  same in js and python
  // probably yep
  _indent: function(block, context) {
    this._indentLevel += 1;
    block.call(context, this);
    this._indentLevel -= 1;
  },

  // yep
  _newline: function() {
    this._write('\n');
  },

  // needs work to handle , vs .
  _line: function(source, semicolon) {
    var i = this._indentLevel;
    while (i--) this._write('  ');
    this._write(source);
    if (semicolon !== false) this._write(',');
    this._newline();
  },

  // should these be binaries?
  // maybe yep
  _quote: function(string) {
    string = string.replace(/\\/g, '\\\\')
                   .replace(/'/g, "\\'")
                   .replace(/\x08/g, '\\b')
                   .replace(/\t/g, '\\t')
                   .replace(/\n/g, '\\n')
                   .replace(/\v/g, '\\v')
                   .replace(/\f/g, '\\f')
                   .replace(/\r/g, '\\r');

    return '"' + string + '"';
  },

  // maybe yep
  package_: function(name, block, context) {
    this._line('-module(' + name + ').', false);
    this._newline();

    this._line('-export([ grammar/0, parser/0, parse/0 ]).', false);
    this._newline();

    this._grammarName = name;
    block.call(context, this);
  },

  // NOEP NOEP NOEP
  // NOEP NOEP NOEP
  // NOEP NOEP NOEP
  syntaxNodeClass_: function() {
    var name = 'TreeNode';
    this.function_('var ' + name, ['text', 'offset', 'elements'], function(builder) {
      builder._line('put(text, text)');
      builder._line('this.offset = offset');
      builder._line('this.elements = elements || []');
    });
    this.function_(name + '.prototype.forEach', ['block', 'context'], function(builder) {
      builder._line('for (var el = this.elements, i = 0, n = el.length; i < n; i++) {', false);
      builder._indent(function(builder) {
        builder._line('block.call(context, el[i], i, el)');
      });
      builder._line('}', false);
    });
    return name;
  },

  // NOEP NOEP NOEP
  // NOEP NOEP NOEP
  // NOEP NOEP NOEP
  grammarModule_: function(actions, block, context) {
    this._newline();
    this.assign_('var ' + this.nullNode_(), '{}');
    this._newline();
    this._line('var Grammar = {', false);
    new Builder(this)._indent(block, context);
    this._newline();
    this._line('}');
  },

  // was empty errywhere.  prolly yep?  erl doesn't need precompiled regex
  compileRegex_: function() {},

  // NOEP NOEP NOEP
  // NOEP NOEP NOEP
  // NOEP NOEP NOEP
  parserClass_: function(root) {
    this.function_('var Parser', ['input', 'actions', 'types'], function(builder) {
      builder.assign_('this._input', 'input');
      builder.assign_('this._inputSize', 'input.length');
      builder.assign_('this._actions', 'actions');
      builder.assign_('this._types', 'types');
      builder.assign_('this._offset', '0');
      builder.assign_('this._cache', '{}');
      builder.assign_('this._failure', '0');
      builder.assign_('this._expected', '[]');
    });

    this.function_('Parser.prototype.parse', [], function(builder) {
      builder.jump_('var tree', root);

      builder.if_('tree !== ' + builder.nullNode_() + ' && this._offset === this._inputSize', function(builder) {
        builder.return_('tree');
      });
      builder.if_('this._expected.length === 0', function(builder) {
        builder.assign_('this._failure', 'this._offset');
        builder.append_('this._expected', "'<EOF>'");
      });
      builder.assign_('this.constructor.lastError', '{offset: this._offset, expected: this._expected}');
      builder._line('throw new SyntaxError(formatError(this._input, this._failure, this._expected))');
    });

    this.function_('var parse', ['input', 'options'], function(builder) {
      builder.assign_('options', 'options || {}');
      builder.assign_('var parser', 'new Parser(input, options.actions, options.types)');
      builder.return_('parser.parse()');
    });

    this._line('extend(Parser.prototype, Grammar)');
    this._newline();
  },

  // maybe yep
  // i think this doesn't actually need to exist in erl, because of the export statement in package above
  exports_: function() {},

  // probably yep
  class_: function(name, parent, block, context) {
    var builder = new Builder(this, name, parent);
    block.call(context, builder);
  },

  constructor_: function(args, block, context) {
    this._line('%%% WAT constructor_');
    this.function_('var ' + this._name, args, function(builder) {
      builder._line(this._parentName + '.apply(this, arguments)');
      block.call(context, builder);
    }, this);
    this._line('inherit(' + this._name + ', ' + this._parentName + ')');
  },

  // almost yep
  // doesn't end on periods correctly
  function_: function(name, args, block, context) {
    this._newline();
    this._line(name + '(' + args.join(', ') + ') ->', false);
    new Builder(this, this._name, this._parentName)._indent(block, context);
    this._line('.', false);  // todo this might go away when we learn to special case a last line
    this._newline();
  },

  // NOEP NOEP NOEP
  // NOEP NOEP NOEP
  // NOEP NOEP NOEP
  method_: function(name, args, block, context) {
    this._line('%%% WAT method_');
    this._write(this._methodSeparator);
    this._methodSeparator = ',\n\n';
    this._line(name + '(' + args.join(', ') + ') ->', false);
    new Builder(this)._indent(block, context);
    var n = this._indentLevel;
    while (n--) this._write('  ');
    this._write('.');
  },

  cache_: function(name, block, context) {
    var temp      = this.localVars_({address: this.nullNode_(), index: 'this._offset'}),
        address   = temp.address,
        offset    = temp.index,
        cacheMap  = '_cache_' + name,
        cacheAddr = '{ ' + cacheMap + ', ' + offset + '}';

    this.assign_(cacheMap, cacheMap + ' || {}');
    this.assign_('var cached', cacheAddr);

    this.if_('cached', function(builder) {
      builder.assign_('this._offset', 'cached[1]');
      builder.return_('cached[0]');
    });

    block.call(context, this, address);
    this.assign_(cacheAddr,  '[' + address + ', this._offset]');
    this.return_(address);
  },

  attributes_: function() {},

  attribute_: function(name, value) {
//  this.assign_("this['" + name + "']", value);
    this.assign_(name, value);
  },

  localVars_: function(vars) {
    var names = {}, code = [], varName;
    for (var name in vars) {
      this._varIndex[name] = this._varIndex[name] || 0;
      varName = name + this._varIndex[name];
      this._varIndex[name] += 1;
      code.push(varName + ' = ' + vars[name]);
      names[name] = varName;
    }
    this._line('var ' + code.join(', '));
    return names;
  },

  localVar_: function(name, value) {
    this._varIndex[name] = this._varIndex[name] || 0;
    var varName = name + this._varIndex[name];
    this._varIndex[name] += 1;
    this.assign_('var ' + varName, (value === undefined) ? this.nullNode_() : value);
    return varName;
  },

  chunk_: function(length) {
    var chunk = this.localVar_('chunk', this.null_()), input = 'this._input', of = 'this._offset';
    this.if_(of + ' < this._inputSize', function(builder) {
      builder._line(chunk + ' = ' + input + '.substring(' + of + ', ' + of + ' + ' + length + ')');
    });
    return chunk;
  },

  syntaxNode_: function(address, start, end, elements, action, nodeClass) {
    var args;

    if (action) {
      action = 'this._actions.' + action;
      args   = ['this._input', start, end];
    } else {
      action = 'new ' + (nodeClass || 'TreeNode');
      args   = ['this._input.substring(' + start + ', ' + end + ')', start];
    }
    if (elements) args.push(elements);

    this.assign_(address, action + '(' + args.join(', ') + ')');
    this.assign_('this._offset', end);
  },

  ifNode_: function(address, block, else_, context) {
    this.if_(address + ' !== ' + this.nullNode_(), block, else_, context);
  },

  unlessNode_: function(address, block, else_, context) {
    this.if_(address + ' === ' + this.nullNode_(), block, else_, context);
  },

  ifNull_: function(elements, block, else_, context) {
    this.if_(elements + ' === null', block, else_, context);
  },

  extendNode_: function(address, nodeType) {
    if (!nodeType) return;
    this._line('extend(' + address + ', this._types.' + nodeType + ')');
  },

  failure_: function(address, expected) {
    expected = this._quote(expected);
    this.assign_(address, this.nullNode_());

    this.if_('this._offset > this._failure', function(builder) {
      builder.assign_('this._failure', 'this._offset');
      builder.assign_('this._expected', '[]');
    });
    this.if_('this._offset === this._failure', function(builder) {
      builder.append_('this._expected', expected);
    });
  },

  assign_: function(name, value) {
    this._line('put(' + name + ', ' + value + ')');
  },

  jump_: function(address, rule) {
    this.assign_(address, 'this._read_' + rule + '()');
  },

  conditional_: function(kwd, condition, block, else_, context) {
    if (typeof else_ !== 'function') {
      context = else_;
      else_   = null;
    }
    this._line(kwd + ' (' + condition + ') {', false);
    this._indent(block, context);
    if (else_) {
      this._line('} else {', false);
      this._indent(else_, context);
    }
    this._line('}', false);
  },

  if_: function(condition, block, else_, context) {
    this.conditional_('if', condition, block, else_, context);
  },

  whileNotNull_: function(expression, block, context) {
    this.conditional_('while', expression + ' !== ' + this.nullNode_(), block, context);
  },

  stringMatch_: function(expression, string) {
    return expression + ' === ' + this._quote(string);
  },

  stringMatchCI_: function(expression, string) {
    return expression + ' !== null && ' +
      expression + '.toLowerCase() === ' + this._quote(string) + '.toLowerCase()';
  },

  regexMatch_: function(regex, string) {
    return string + ' !== null && /' + regex.source + '/.test(' + string + ')';
  },

  return_: function(expression) {
    this._line('return ' + expression);
  },

  arrayLookup_: function(expression, offset) {
    return expression + '[' + offset + ']';
  },

  append_: function(list, value, index) {
    if (index === undefined)
      this._line(list + '.push(' + value + ')');
    else
      this._line(list + '[' + index + '] = ' + value);
  },

  decrement_: function(variable) {
    this._line('--' + variable);
  },

  isZero_: function(expression) {
    return expression + ' <= 0';
  },

  hasChars_: function() {
    return 'this._offset < this._inputSize';
  },

  nullNode_: function() {
    return 'FAILURE';
  },

  offset_: function() {
    return 'this._offset';
  },

  emptyList_: function(size) {
    return size ? 'new Array(' + size + ')' : '[]';
  },

  emptyString_: function() {
    return "''";
  },

  true_: function() {
    return 'true';
  },

  null_: function() {
    return 'null';
  }
});

module.exports = Builder;
