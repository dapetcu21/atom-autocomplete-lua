/* @flow */

/*
 * Utility functions for working with type definitions
 */

export const TYPE_NIL = 0
export const TYPE_UNKNOWN = 1
export const TYPE_BOOLEAN = 2
export const TYPE_NUMBER = 3
export const TYPE_STRING = 4
export const TYPE_FUNCTION = 5
export const TYPE_TABLE = 6
export const KEY_METATABLE = Symbol('metatable')

const _KEY_ARGUMENT = []
export const KEY_ARGUMENT = (index: number): Symbol => {
  let symbol = _KEY_ARGUMENT[index]
  if (!symbol) { _KEY_ARGUMENT[index] = symbol = Symbol('argument #' + index) }
  return symbol
}

const _KEY_RETURN = []
export const KEY_RETURN = (index: number): Symbol => {
  let symbol = _KEY_RETURN[index]
  if (!symbol) { _KEY_RETURN[index] = symbol = Symbol('return #' + index) }
  return symbol
}

type TypeDefPrimitiveType = 0 | 1 | 2 | 3 | 4
type TypeDefStructuredType = 5 | 6
type TypeDefType = TypeDefPrimitiveType | TypeDefStructuredType
type FieldKey = string | Symbol

type TypeDefPrimitive = {
  type: TypeDefPrimitiveType,
  fields: null,
  docs: Object | null,
  argCount: 0,
  returnCount: 0
}

type TypeDefFunction = {
  type: 5,
  fields: Map<FieldKey, TypeDef>,
  docs: Object | null,
  argCount: number,
  returnCount: number
}

type TypeDefTable = {
  type: 6,
  fields: Map<FieldKey, TypeDef>,
  docs: Object | null,
  argCount: 0,
  returnCount: 0
}

export type TypeDefStructured = TypeDefFunction | TypeDefTable
export type TypeDef = TypeDefPrimitive | TypeDefStructured

type TypeContext = {
  replacements: Map<TypeDef, TypeDef>
}

export const contextNew = (): TypeContext => ({
  replacements: new Map()
})

export const tableNew = (): TypeDefTable => ({
  type: TYPE_TABLE,
  fields: new Map(),
  docs: null,
  argCount: 0,
  returnCount: 0
})

export const functionNew = (): TypeDefFunction => ({
  type: TYPE_FUNCTION,
  fields: new Map(),
  docs: null,
  argCount: 0,
  returnCount: 0
})

const primitiveTypeNew = (type: TypeDefPrimitiveType) => (): TypeDefPrimitive => ({
  type,
  fields: null,
  docs: null,
  argCount: 0,
  returnCount: 0
})

export const unknownNew = primitiveTypeNew(TYPE_UNKNOWN)
export const numberNew = primitiveTypeNew(TYPE_NUMBER)
export const stringNew = primitiveTypeNew(TYPE_STRING)
export const booleanNew = primitiveTypeNew(TYPE_BOOLEAN)
export const nilNew = primitiveTypeNew(TYPE_NIL)

export function contextResolveType (context: TypeContext, type: ?TypeDef): ?TypeDef {
  const { replacements } = context
  if (!type) { return null }
  while (true) {
    let resolved = replacements.get(type)
    if (resolved === type || !resolved) { break }
    type = resolved
  }
  return type
}

export function typeDefSet (context: TypeContext, table: TypeDefStructured, key: FieldKey, type: ?TypeDef) {
  if (type) {
    table.fields.set(key, type)
  } else {
    table.fields.delete(key)
  }
}

export function typeDefGet (context: TypeContext, table: TypeDefStructured, key: FieldKey): ?TypeDef {
  return contextResolveType(context, table.fields.get(key))
}

export function functionPushArgumentType (context: TypeContext, func: TypeDefFunction, arg: TypeDef) {
  func.fields.set(KEY_ARGUMENT(func.argCount++), arg)
}

export function functionPushReturnType (context: TypeContext, func: TypeDefFunction, ret: TypeDef) {
  func.fields.set(KEY_RETURN(func.returnCount++), ret)
}

export function functionGetArgumentTypes (context: TypeContext, func: TypeDefFunction): Array<TypeDef> {
  const result = []
  for (let i = 0, n = func.argCount; i < n; i++) {
    const value = typeDefGet(context, func, KEY_ARGUMENT(i))
    if (value) { result[i] = value }
  }
  return result
}

export function functionGetReturnTypes (context: TypeContext, func: TypeDefFunction): Array<TypeDef> {
  const result = []
  for (let i = 0, n = func.returnCount; i < n; i++) {
    const value = typeDefGet(context, func, KEY_RETURN(i))
    if (value) { result[i] = value }
  }
  return result
}

export const tableGet: (context: TypeContext, table: TypeDefTable, key: FieldKey) => ?TypeDef = typeDefGet
export const tableSet: (context: TypeContext, table: TypeDefTable, key: FieldKey, type: ?TypeDef) => void = typeDefSet
export const tableGetMetatable = (context: TypeContext, table: TypeDefTable) =>
  ((tableGet(context, table, KEY_METATABLE): any): ?TypeDefTable)
export const tableSetMetatable = (context: TypeContext, table: TypeDefTable, metatable: ?TypeDefTable) =>
  tableSet(context, table, KEY_METATABLE, metatable)

export const tableResolve = (context: TypeContext, table: TypeDefTable, key: FieldKey, returnParent: boolean) => {
  const value = tableGet(context, table, key)
  if (value) { return returnParent ? table : value }

  const metatable = tableGetMetatable(context, table)
  if (metatable && metatable.type === TYPE_TABLE) {
    const meta: TypeDefTable = metatable
    const indexTable = (tableGet(context, meta, '__index'): any)
    if (!indexTable || indexTable.type !== TYPE_TABLE) { return null }
    return tableResolve(context, ((indexTable: any): TypeDefTable), key, returnParent)
  }
}

export function* tableIterate (context: TypeContext, table: TypeDefTable): Iterable<[string, TypeDef]> {
  for (let [key: FieldKey, value: TypeDef] of table.fields) {
    if (typeof key === 'string') {
      yield ([((key: any): string), value])
    }
  }
}

export function tableSearch (context: TypeContext, table: TypeDefTable, prefix: string): Array<{ key: string, typeDef: TypeDef }> {
  const results = []
  const search = (table_) => {
    if (!table_ || table_.type !== TYPE_TABLE) { return }
    const table: TypeDefTable = (table_: any)

    for (let [key, value] of tableIterate(context, table)) {
      if (key.indexOf(prefix) !== 0) { continue }
      results.push({ key, typeDef: value })
    }

    const metatable = tableGetMetatable(context, table)
    if (metatable && metatable.type === TYPE_TABLE) {
      search(tableGet(context, metatable, '__index'))
    }
  }
  search(table)
  return results
}

export function mergeTypeKnowledge (context: TypeContext, oldType: ?TypeDef, newType: ?TypeDef): ?TypeDef {
  if (oldType === newType) { return oldType }
  const oldPriority = oldType ? oldType.type : TYPE_NIL
  const newPriority = newType ? newType.type : TYPE_NIL
  if (oldPriority === newPriority && newPriority === TYPE_TABLE) {
    const newTable: TypeDefTable = (newType: any)
    const oldTable: TypeDefTable = (oldType: any)

    for (let [key: FieldKey, newValue: TypeDef] of newTable.fields) {
      const oldValue = tableGet(context, oldTable, key)
      const mergedValue = mergeTypeKnowledge(context, oldValue, newValue)
      if (mergedValue !== oldValue) {
        tableSet(context, oldTable, key, mergedValue)
      }
    }

    context.replacements.set(newTable, oldTable)
    return oldTable
  }
  return newPriority > oldPriority ? newType : oldType
}
