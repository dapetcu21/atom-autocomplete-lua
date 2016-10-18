'use babel'

/*
 * Utility functions for working with type definitions
 */

let tableDiffCount = 0

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
  if (table.readOnly) {
    if (table.diffCount !== tableDiffCount) {
      table.diffCount = tableDiffCount
      table.extraFields = {}
      table.extraMetatable = undefined
    }
    table.extraFields[key] = type
  } else {
    table.fields[key] = type
  }
}

export const tableGet = (table, key) => {
  if (table.readOnly && table.diffCount === tableDiffCount) {
    const extraValue = table.extraFields[key]
    if (extraValue !== undefined) { return extraValue }
  }
  return table.fields[key]
}

export const tableSetMetatable = (table, metatable) => {
  if (table.readOnly) {
    if (table.diffCount !== tableDiffCount) {
      table.diffCount = tableDiffCount
      table.extraFields = {}
    }
    table.extraMetatable = metatable || null
  } else {
    table.metatable = metatable
  }
}

export const tableGetMetatable = (table, metatable) => {
  if (table.readOnly && table.diffCount === tableDiffCount) {
    const extraMetatable = table.extraMetatable
    if (extraMetatable !== undefined) { return extraMetatable }
  }
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

export function* tableIterate (table) {
  if (!table) { return }
  if (!table.readOnly || table.diffCount !== tableDiffCount) {
    for (let key in table.fields) {
      yield [key, table.fields[key]]
    }
  } else {
    for (let key in table.extraFields) {
      yield [key, table.extraFields[key]]
    }
    for (let key in table.fields) {
      if (table.extraFields[key] === undefined) {
        yield [key, table.fields[key]]
      }
    }
  }
}

export const tableSearch = (table, prefix) => {
  const results = []
  const search = (table) => {
    if (!table || table.type !== 'table') {
      return
    }
    for (let [key, value] of tableIterate(table)) {
      if (key.indexOf(prefix) !== 0) { continue }
      results.push({ key, typeDef: value })
    }
    const metatable = tableGetMetatable(table)
    if (metatable && metatable.type === 'table') {
      search(tableGet(metatable, '__index'))
    }
  }
  search(table)
  return results
}

export function tableInvalidateDiffs () {
  tableDiffCount++
}

export function tableFreeze (table) {
  if (!table || table.readOnly || table.type !== 'table') { return }
  table.readOnly = true
  table.extraFields = {}
  table.diffCount = tableDiffCount
  tableFreeze(table.metatable)
  for (let k in table.fields) {
    tableFreeze(table.fields[k])
  }
}

const typePriority = {
  'nil': 0,
  'unknown': 1,
  'boolean': 2,
  'number': 2,
  'string': 2,
  'userdata': 2,
  'thread': 3,
  'function': 4,
  'table': 5
}

export function mergeTypeKnowledge (oldType, newType) {
  if (oldType === newType) { return oldType }
  const oldPriority = typePriority[oldType ? oldType.type : 'nil']
  const newPriority = typePriority[newType ? newType.type : 'nil']
  if (oldPriority === newPriority && newPriority === 5) { // table
    for (let [key, newValue] of tableIterate(newType)) {
      const oldValue = tableGet(oldType, key)
      const mergedValue = mergeTypeKnowledge(oldValue, newValue)
      if (mergedValue !== oldValue) {
        tableSet(oldType, key, mergedValue)
      }
    }
    const oldValue = tableGetMetatable(oldType)
    const newValue = tableGetMetatable(newType)
    const mergedValue = mergeTypeKnowledge(oldValue, newValue)
    if (mergedValue !== oldValue) {
      tableSetMetatable(oldType, mergedValue)
    }
  }
  return newPriority > oldPriority ? newType : oldType
}

const metatableKey = Symbol()
export function tableDiffShallow (table) {
  if (!table || !table.readOnly || table.type !== 'table') { return }
  const actual = table.diffCount === tableDiffCount
  const extraFields = actual ? table.extraFields : {}
  const extraMetatable = actual ? table.extraMetatable : undefined
  return { extraFields, extraMetatable, children: [] }
}

export function tableDiff (table) {
  if (!table || !table.readOnly || table.type !== 'table') { return }
  const actual = table.diffCount === tableDiffCount
  const extraFields = actual ? table.extraFields : {}
  const extraMetatable = actual ? table.extraMetatable : undefined
  // TODO: Deeply check for changes. Avoid cycles
  return { extraFields, extraMetatable, children: [] }
}

export function tableApplyDiff (table, diff) {
  if (!table || !diff || table.type !== 'table') { return }
  const { extraFields, extraMetatable, children } = diff
  for (let key in extraFields) {
    tableSet(table, key, mergeTypeKnowledge(tableGet(table, key), extraFields[key]))
  }
  if (extraMetatable) {
    tableSetMetatable(table, mergeTypeKnowledge(tableGetMetatable(table), extraMetatable))
  }
  children.forEach(({ key, childDiff }) => {
    const child = key === metatableKey ? tableGetMetatable(table) : tableGet(key)
    tableApplyDiff(child, childDiff)
  })
}
