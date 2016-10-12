# atom-autocomplete-lua

Atom Autocomplete+ provider for Lua.

This package aims to parse Lua files with [oxyc/luaparse](https://github.com/oxyc/luaparse) and generate scope and type-aware completions with syntactic analysis.

![](https://cloud.githubusercontent.com/assets/428060/19273399/0c29a55a-8fd5-11e6-90ce-76972345aa86.png)

## Features

* Limited type inference mechanism
* Table member completions
* `.luacompleterc` file to define additional globals

## Planned features

* Scope-aware variable name suggestions
* Autocomplete `require`d modules
* Doc-strings in `.luacompleterc`
* Configuration service for other packages to programatically define globals
* Completion for the Lua standard library
* [Defold](http://defold.com) integration (or separate package)

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
  }
}
```
