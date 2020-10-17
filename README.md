# atom-autocomplete-lua

[![](https://img.shields.io/apm/dm/autocomplete-lua.svg)](http://atom.io/packages/autocomplete-lua) [![](https://img.shields.io/badge/liberapay-donate-yellow.svg)](https://liberapay.com/dapetcu21/donate) [![](https://img.shields.io/badge/paypal-donate-blue.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=KRJ4ZRJNU76Y2)

Atom Autocomplete+ provider for Lua.

This package aims to parse Lua files with [oxyc/luaparse](https://github.com/oxyc/luaparse) and generate scope and type-aware completions with syntactic analysis.

![](https://cloud.githubusercontent.com/assets/428060/19417900/ebb20426-93c0-11e6-98ef-c90b66fbf109.png)

## Features

* Limited type inference mechanism
* Scope-aware variable name suggestions
* Table member completions on `.` and `:`
* Snippets for function call arguments
* Aware of `setmetatable()` and function return types
* Completion for the Lua standard library
* `.luacompleterc` file to define additional globals
* Doc-strings in `.luacompleterc`
* Configuration service for other packages to programmatically define globals
* Autocomplete `require`d modules

## Available Providers

- [Defold IDE](http://atom.io/packages/defold-ide) - Adds hot reloading, autocompletion and in-line API docs for the [Defold](http://www.defold.com/) game engine.
- [LÖVE Atom](https://github.com/rm-code/love-atom) - Smart autocompletion for the [LÖVE](https://love2d.org/) framework in Atom.

## Configuration

Besides what you can configure in Atom preferences, `atom-autocomplete-lua`
looks for a `.luacompleterc` file in the parent directories of the current file.

If you need to define additional global symbols for your specific Lua environment,
place a `.luacompleterc` file in your project root. It's a JSON file with roughly
the following structure:

```javascript
{
  "global": {
    "type": "table",
    "fields": {
      "my_global_var": { /* type definition */ },
      /* ... */
    }
  },
  "namedTypes": {
    "my_named_type": { /* type definition */ },
    /* ... */
  }
  "luaVersion": "5.2",
  "packagePath": "./?.lua",
  "cwd": "path/to/lua/module/root"
}
```

All options are optional. Here's what each option does:

| Option | Default | Description |
|--------|---------|-------------|
|`global`|`{ type: 'table', fields: {} }`|The type definition of the global environment. Define additional fields on this table to declare globals available in your Lua environment. Read the [Type definitions](#type-definitions) section for more info.
|`namedTypes`|`{}`|To avoid deep nesting and allow multiple places to reference a single type, you can define named types. Read the [Named types](#named-types) section for more info.
|`luaVersion`|`"5.2"`|The version of Lua your code is targeting. Valid values are `"5.1"`, `"5.2"`, `"5.3"`, `"5.4"` and `"luajit-2.0"`.
|`packagePath`|`"./?.lua"`|The value of `LUA_PATH` used when resolving required modules.
|`cwd`|`.`|The current directory used to resolve relative paths in `packagePath`. If `cwd` is relative, it's considered relative to the parent directory of `.luacompleterc`.


## Type definitions

The general format of a type definition is:

```javascript
{
  "type": "type_name", // one of "function", "table", "number", "boolean", "string" or "unknown", "ref"
  "description": "Optional short Markdown description of your symbol",
  "descriptionPlain": "Optional short plain text description of your symbol (if you don't want Markdown for some reason)",
  "link": "http://optional.link/to/full/api/docs"
}
```

### Tables

Tables (`"type": "table"`) have 2 more properties:
  * `fields`: *Required.* An object mapping table fields to their corresponding type definition. Even though Lua allows indexing tables with any value, only string keys are supported for autocompletion purposes.
  * `metatable`: *Optional.* The type definition of the metatable of this table, if it has one. `autocomplete-lua` is aware of keys like `__index` in this metatable and uses them for completion. If present, the `type` of the metatable must be `"table"`.

**Example:**
```javascript
{ // Type definition for a student
  "type": "table",
  "fields": {
    "name": { "type": "string" },
    "surname": { "type": "string" },
    "height": { "type": "number" }
  },
  "metatable": {
    "type": "table",
    "fields": {
      "__index": {
        "type": "table",
        "fields": { "skip_rope": { "type": "function" } }
      }
    }
  }
}
```

### Functions

Functions (`"type": "function"`) can have a few more optional properties:
  * `returnTypes`: An array of type definitions describing the types of the function's return values.
  * `args`: An array of argument name definitions (see below).
  * `argsDisplay`: In case you want your arguments to be displayed in the autocomplete dropdown in a custom way, you can provide a string of the argument list here.
  * `argsDisplayOmitSelf`: Same as above, but displayed when completing method calls with `:`. You should provide the same arg list string, but with the first argument removed. Defaults to `argsDisplay`.
  * `argTypes`: An array of argument type definitions (or `null` when type is unknown).

Argument names are of the form `{ "name": "arg_name", "displayName": "display_name" }`,
where `displayName` is optional.

`displayName` will be displayed in the
autocomplete dropdown, while `name` will be part of the inserted snippet.
This is useful for things like optional arguments:

```javascript
{
  "type": "function",
  "args": [{ "name": "arg1" }, { "name": "arg2", "displayName": "[arg2]" }],
}
```

will produce `f(arg1, [arg2])` in the dropdown and `f(arg1, arg2)` after being inserted.

In rare cases, `displayName` might be unsuitable for you. `argsDisplay` and `argsDisplayOmitSelf` can be used to manually specify the comma-separated list of
arguments.

For example, you can use it to customize comma placement in relation to `[`:

```javascript
{
  "type": "function",
  "args": [{ "name": "self" }, { "name": "arg1" }, { "name": "arg2" }],
  "argsDisplay": "self[, arg1[, arg2]]",
  "argsDisplayOmitSelf": "[arg1[, arg2]]"
}
```

This will produce `f(self[, arg1[, arg2]])` in the dropdown and `f(self, arg1, arg2)`
after being inserted.

### Function variants

Sometimes, you may have polymorphic functions which can be called with a number
of different argument configurations. You might want to show all of these
versions separately in the autocomplete dropdown.

You can provide multiple versions of the same function by moving `link`,
`description`, `args`, `argsDisplay` and `argsDisplayOmitSelf` inside a
`variants` array like so:

```javascript
{ // Type definition for a get(url_or_filename) function
  "type": "function",
  "variants": [{
    "args": [{ "name": "url" }],
    "description": "Fetches an URL and returns a string with the contents"
  }, {
    "args": [{ "name": "filename" }],
    "description": "Read the file at filename and returns a string with the contents"
  }]
}
```

The autocomplete dropdown will show both `get(url)` and `get(filename)` with their
corresponding descriptions.

### Named types

There are often cases where you want to use the same type definition in
multiple places. In these situations, you can use named types in your `.luacompleterc`.

Just use `{ "type": "ref", "name": "my_named_type" }` instead of your type
definition and define `my_named_type` in `namedTypes`.

**Example .luacompleterc:**
```javascript
{
  "global": {
    "type": "table",
    "fields": {
      "make_a_cat": {
        "type": "function",
        "returnTypes": [{ "type": "ref", "name": "cat" }]
      },
      "make_a_cat_somehow_else": {
        "type": "function",
        "returnTypes": [{ "type": "ref", "name": "cat" }]
      }
    }
  },
  "namedTypes": {
    "cat": {
      "type": "table",
      "fields": {
        "color": { "type": "string" },
        "is_fluffy": { "type": "boolean" }
      }
    }
  }
}
```

## Option providers

All the options provided in a `.luacompleterc` can be programmatically provided
by plugin packages (like [Defold IDE](http://atom.io/packages/defold-ide)).

Start by adding this to your `package.json`:

```json
"providedServices": {
  "autocomplete-lua.options-provider": {
    "versions": {
      "1.0.0": "getOptionProvider"
    }
  }
}
```

Then, in your package's JS object:

```javascript
getOptionProvider () {
  return myProvider; // You can also return an array of providers if you have more
}
```

The provider is an object (or a class) with the following interface:

```javascript
const myProvider = {
  priority: 20,

  getOptions (request, getPreviousOptions, utils, cache) {
    // Just return the options from the previous provider
    return getPreviousOptions().then(previousOptions => {
      return { options: previousOptions }
    })
  }

  dispose () {
    // Destroy stuff
  }
}
```

### `priority` and `getPreviousOptions()`

Each time a completion is needed (roughly at each keystroke), `autocomplete-lua`
sorts all the option providers by their priority and calls the `getOptions()`
method of the highest priority option provider.

The option provider can choose to call the next-highest-in-priority provider
by calling `getPreviousOptions()`. `getPreviousOptions()` returns a promise
to the options object provided by the next-in-line provider.

There are 3 option providers that come with `autocomplete-lua`:
  * **[StdLibProvider]**. *Priority 100.* Adds Lua's standard library functions to the options.
  * **[LuaCompleteRcProvider]**. *Priority 10.* Adds the contents of `.luacompleterc` to the options.
  * **[EmptyProvider]**. *Priority 0.* Just returns an empty options object. Acts as fallback for `getPreviousOptions()`.

[StdLibProvider]:https://github.com/dapetcu21/atom-autocomplete-lua/blob/master/lib/options/stdlib.js
[LuaCompleteRcProvider]:https://github.com/dapetcu21/atom-autocomplete-lua/blob/master/lib/options/luacompleterc.js
[EmptyProvider]:https://github.com/dapetcu21/atom-autocomplete-lua/blob/master/lib/options/empty.js

### `dispose()`

Optional function. `dispose()` is called when your provider is not needed anymore.

### `getOptions(request, getPreviousOptions, utils, cache)`

This function is called when your provider is expected to return a new set of options.

`request` comes [directly from Autocomplete+](https://github.com/atom/autocomplete-plus/wiki/Provider-API#the-suggestion-requests-options-object),
with the addition of `request.filePath`, the absolute path to the current file.

The return value is an object of the form `{ options }`. The same object is passed
to `getOptions()` as `cache` the next time the function is called on the same file,
so you can store additional arbitrary properties on it that you'd like to receive
in `cache`. Returning a promise to this object is also supported.

It's strongly encouraged to always return the same `options` object if nothing
changed from the last call. Read on about `utils.mergeOptionsCached()` for
a simple way to do this.

### `utils.reviveOptions(options)`

Takes an options object and resolves all references to named types. (Replaces `{ type: 'ref', name: 'myRef' }` with `namedTypes.myRef`). This should be called after you read the
options object from permanent storage.

Returns the same `options` object.

### `utils.mergeOptions(previousOptions, newOptions)`

Takes 2 options objects, merges them and returns the result.

Fields in `newOptions` overwrite fields in `previousOptions`. The `global` fields are deeply merged.

### `utils.mergeOptionsCached(previousOptions, newOptions, cache[, merger])`

Uses `mergeOptions()` to merge `previousOptions` and `newOptions` if any of the
two are different from `cache.previousOptions` and `cache.newOptions`, else
returns `cache.options`.

If the merge takes place, `merger(mergedOptions, previousOptions, newOptions)`
is called on the newly merged object to do additional custom merging work.

Returns an object `{ options, previousOptions, newOptions }` suitable for returning
as the cache object from `getOptions()`.

A recommended pattern is the following:

```javascript
getOptions = async (request, getPreviousOptions, utils, cache) => {
  if (providerIsNotApplicableToTheCurrentFile) {
    return { options: await getPreviousOptions() }
  }
  const newOptions = conjureABunchOfNewOptions()
  const previousOptions = await getPreviousOptions()
  return utils.mergeOptionsCached(previousOptions, newOptions, cache, mergedOptions => {
    mergedOptions.oneMoreThing = 'this thing'
  })
}
```

### `util.<typename>New()`

Creates a new type definition for a `<typename>`. Available functions are:
`tableNew()`, `booleanNew()`, `functionNew()`, `numberNew()`, `unknownNew()`, `nilNew()`

### `util.tableSet(table, key, value)`

Sets the field identified by `key` in the table type definition `table` to the
type definition `value`.

### `util.tableGet(table, key)`

Gets the type definition corresponding to the field identified by `key` in the
table type definition `table`.

### `util.tableSetMetatable(table, metatable)`

Sets the metatable type definition in the table type definition `table` to the
type definition `metatable`.

### `util.tableGetMetatable(table)`

Gets the type definition of the metatable of the table type definition `table`.
