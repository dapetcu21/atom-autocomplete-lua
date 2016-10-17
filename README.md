# atom-autocomplete-lua

Atom Autocomplete+ provider for Lua.

This package aims to parse Lua files with [oxyc/luaparse](https://github.com/oxyc/luaparse) and generate scope and type-aware completions with syntactic analysis.

![](https://cloud.githubusercontent.com/assets/428060/19417900/ebb20426-93c0-11e6-98ef-c90b66fbf109.png)

## Features

* Limited type inference mechanism
* Scope-aware variable name suggestions
* Table member completions on `.` and `:`
* Snippets for function call arguments
* Aware of `setmetatable` and function return types
* Completion for the Lua standard library
* `.luacompleterc` file to define additional globals
* Doc-strings in `.luacompleterc`
* Configuration service for other packages to programmatically define globals

## Planned features

* Autocomplete `require`d modules

## Defold

For Defold completion with this package, check out [Defold IDE](http://atom.io/packages/defold-ide)

## Configuration

Besides what you can configure in Atom preferences, `atom-autocomplete-lua`
looks for a `.luacompleterc` file in the parent directories of the current file.

If you need to define additional global symbols for your specific Lua environment,
place a `.luacompleterc` file in your project root. It looks like this:

```javascript
{
  "global": {
    "type": "table",
    "fields": {
      "my_global_var": { /* type definition */ },
      /* ... */
    }
  }
}
```

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