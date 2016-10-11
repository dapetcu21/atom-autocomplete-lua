# atom-autocomplete-lua

Atom Autocomplete+ provider for Lua.

This package aims to parse Lua files with [oxyc/luaparse](https://github.com/oxyc/luaparse) and generate context-aware completions through syntactic analysis.

## Features

* Limited type inference mechanism
* Table member completions

## Planned features

* Scope-aware variable name suggestions
* Autocomplete `require`d modules
* `.luacompleterc` file to define globals and doc-strings
* Configuration service for other packages to programatically define globals
* Completion for the Lua standard library
* [Defold](http://defold.com) integration (or separate package)