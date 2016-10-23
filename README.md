# atom-autocomplete-lua

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

## Defold

For Defold completion with this package, check out [Defold IDE](http://atom.io/packages/defold-ide)

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

All options are optional. Here's what each option does

|Option|Default|Description|
|-|-|-|
|`global`|`{ type: 'table', fields: {} }`|The type definition of the global environment. Define additional fields on this table to declare globals available in your Lua environment. Read the [Type definitions](#type-definitions) section for more info.
|`namedTypes`|`{}`|To avoid deep nesting and allow multiple places to reference a single type, you can define named types. Read the [Type definitions](#type-definitions) section for more info.
|`luaVersion`|`"5.2"`|The version of Lua your code is targeting. Valid values are `"5.1"`, `"5.2"` and `"5.3"`.
|`packagePath`|`"./?.lua"`|The value of `LUA_PATH` used when resolving required modules.
|`cwd`|`.`|The current directory used to resolve relative paths in `packagePath`. If `cwd` is relative, it's considered relative to the parent directory of `.luacompleterc`.


## Type definitions

They look like this:

```javascript
{
  "type": "type_name", // one of "function", "table", "number", "boolean", "string" or "unknown"
  "fields": { // just for "table"s. an object describing the fields this table might contain
    "member_name": { /* type definition for table member */ }
    /* ... */
  },
  "description": "Optional short description of your symbol",
  "link": "http://optional.link/to/full/api/docs"
}
```

## Option providers

> TODO