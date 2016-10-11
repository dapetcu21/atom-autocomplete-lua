'use babel'

export const tableNew = () => ({
  type: 'table',
  fields: {}
})

export const tableSet = (table, key, type) => {
  table.fields[key] = type
}

export const tableResolve = (table, field) => {
  if (!table || table.type !== 'table') { return }

  const value = table.fields[field]
  if (value) { return value }

  if (table.metatable && table.metatable.type === 'table') {
    return tableResolve(table.metatable.fields.__index, field)
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
      results.push({ key, type: table.fields[key] })
    }
    if (table.metatable && table.metatable.type === 'table') {
      search(table.metatable.fields.__index)
    }
  }
  search(table)
  return results
}
