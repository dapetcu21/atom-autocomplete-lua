'use babel'

/*
 * Utility functions for working with type definitions
 */

export const tableNew = () => ({
  type: 'table',
  fields: {}
})

export const unknownNew = () => ({ type: 'unknown' })
export const numberNew = () => ({ type: 'number' })
export const stringNew = () => ({ type: 'string' })
export const booleanNew = () => ({ type: 'boolean' })
export const nilNew = () => ({ type: 'nil' })
export const functionNew = () => ({ type: 'function' })

export const tableSet = (table, key, type) => {
  table.fields[key] = type
}

export const tableGet = (table, key) => {
  return table.fields[key]
}

export const tableSetMetatable = (table, metatable) => {
  table.metatable = metatable
}

export const tableGetMetatable = (table, metatable) => {
  return table.metatable
}

export const tableResolve = (table, field, returnParent) => {
  if (!table || table.type !== 'table') { return }

  const value = tableGet(table, field)
  if (value) { return returnParent ? table : value }

  const metatable = tableGetMetatable(table)
  if (metatable && metatable.type === 'table') {
    return tableResolve(tableGet(metatable, '__index'), field, returnParent)
  }
}

export const tableSearch = (table, prefix) => {
  const results = []
  const search = (table) => {
    if (!table || table.type !== 'table') {
      return
    }
    for (let key in table.fields) {
      if (key.indexOf(prefix) !== 0) { continue }
      results.push({ key, typeDef: table.fields[key] })
    }
    const metatable = tableGetMetatable(table)
    if (metatable && metatable.type === 'table') {
      search(tableGet(metatable, '__index'))
    }
  }
  search(table)
  return results
}

