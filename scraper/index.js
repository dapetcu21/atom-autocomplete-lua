#!/usr/bin/env node
'use strict'

const jsdom = require('jsdom')
const includes = require('lodash.includes')
const fs = require('fs')
const path = require('path')
const luaVersion = '5.2'
const blacklist = ['basic', '_G']

const pagesToCrawl = {}
const symbols = []
function onSymbol (name, link) {
  if (includes(blacklist, name)) { return }
  const split = link.split('#')
  const page = split[0]
  const hash = split[1]

  if (!pagesToCrawl[page]) {
    pagesToCrawl[page] = []
  }
  const symbol = { name, link, page, hash }
  pagesToCrawl[page].push(symbol)
  symbols.push(symbol)
}

function onEnd () {
  Promise
    .all(Object.keys(pagesToCrawl).map(page =>
      new Promise((resolve, reject) => {
        jsdom.env(page, (err, window) => {
          if (err) { reject(err); return }
          pagesToCrawl[page].forEach(symbol => {
            const a = window.document.getElementsByName(symbol.hash)[0]
            symbol.title = a.textContent
            const description = a.parentElement.nextElementSibling.textContent
            symbol.description = description.replace(/^\s*|\s*$/g, '')
          })
          resolve()
        })
      })
    ))
    .then(processSymbols)
}

function processSymbols () {
  const options = { global: { type: 'table', fields: {} } }
  const _setField = (table, components, value) => {
    if (components.length === 1) {
      table.fields[components[0]] = value
      return
    }
    let nextTable = table.fields[components[0]]
    if (!nextTable) {
      nextTable = table.fields[components[0]] = { type: 'table', fields: {} }
    }
    if (nextTable.type !== 'table') {
      nextTable.type = 'table'
      nextTable.fields = {}
    }
    _setField(nextTable, components.slice(1), value)
  }
  const setField = (name, value) => _setField(options.global, name.split('.'), value)

  symbols.forEach(symbol => {
    const match = symbol.title.match(/\((.*)\)$/)
    let type = 'unknown'
    let args, argsDisplay

    if (match) {
      type = 'function'
      argsDisplay = match[1]
      args = argsDisplay
        .split('[')[0]
        .replace(/[\[\]]/g, '')
        .split(',')
        .map(s => ({ name: s.replace(/^\s*|\s*$/g, '') }))
        .filter(arg => arg.name.replace(/[^a-zA-Z0-9]/g, '').length)
    }

    setField(symbol.name, {
      link: symbol.link,
      description: symbol.description,
      type,
      args,
      argsDisplay
    })
  })

  const filePath = path.join(__dirname, '..', 'lib', 'stdlib', `${luaVersion.replace(/\./g, '_')}.json`)
  fs.writeFile(filePath, JSON.stringify(options))
}

let parsingFunctions = false
jsdom.env(`http://lua.org/manual/${luaVersion}/`, (err, window) => {
  if (err) {
    console.log(err)
    return
  }

  Array.from(window.document.querySelectorAll('h2 + table')).forEach(table => {
    Array.from(table.querySelectorAll('td')).forEach(column => {
      Array.from(column.children).forEach(element => {
        if (element.tagName === 'H3') {
          if (!element.textContent.replace(/\s/g, '').length) { return }
          parsingFunctions = (element.children[0] && element.children[0].name === 'functions')
          return
        }
        if (!parsingFunctions) { return }
        Array.from(element.querySelectorAll('a')).forEach(linkEl => {
          const name = linkEl.textContent
          const link = linkEl.href
          onSymbol(name, link)
        })
      })
    })
  })

  onEnd()
})
