/* eslint-env jest */

const Lexer = require('../lexer')
const fs = require('fs')
const path = require('path')

const tokensByType = []
Object.keys(Lexer.tokenVocabulary).forEach(tokenName => {
  const token = Lexer.tokenVocabulary[tokenName]
  tokensByType[token.tokenType] = token
})
const tokenName = token => tokensByType[token.tokenType].tokenName
const getTokenNames = lexResult => lexResult.tokens.map(tokenName)

describe('Lexer', () => {
  test('lexes simple code', () => {
    const code = 'local x = 12'
    expect(Lexer.lex(code)).toMatchSnapshot()
  })

  const numberLiterals = [
    '3', '3.0', '3.1416', '314.16e-2', '0.31416E1',
    '0xff', '0x0.1E', '0xA23p-4', '0X1.921FB54442D18P+1'
  ]
  numberLiterals.forEach(literal => {
    test(`lexes number literal ${literal}`, () => {
      expect(getTokenNames(Lexer.lex(literal))).toEqual(['Number'])
    })
  })

  const stringLiterals = [
    '\'foo\'',
    '"foo"',
    '\'foo\\\'bar\\"baz\'',
    '"foo\\\'bar\\"baz"',
    '\'foo\\\\\''
  ]
  stringLiterals.forEach(literal => {
    test(`lexes string literal ${literal}`, () => {
      expect(getTokenNames(Lexer.lex(literal))).toEqual(['String'])
    })
  })

  const blockStringLiterals = [
    '[[foo]]',
    '[[fo]=]o]]',
    '[==[fo]]o]==]',
    '[[foo\nbar]]'
  ]

  blockStringLiterals.forEach(literal => {
    test(`lexes block string literal ${literal}`, () => {
      expect(getTokenNames(Lexer.lex(literal))).toEqual(['BlockString'])
    })
  })

  test('lexes name cat', () => {
    expect(getTokenNames(Lexer.lex('cat'))).toEqual(['Name'])
  })

  test('lexes name fortify', () => {
    expect(getTokenNames(Lexer.lex('fortify'))).toEqual(['Name'])
  })

  test('ignores line comments', () => {
    const code = `for --while then\nend`
    expect(getTokenNames(Lexer.lex(code))).toEqual(['For', 'End'])
  })

  test('ignores block comments', () => {
    const code = `for --[==[while]]\nthen]==]end`
    expect(getTokenNames(Lexer.lex(code))).toEqual(['For', 'End'])
  })

  test('lexes real world code', () => {
    const realWorldCode = fs.readFileSync(path.join(__dirname, 'real_world.lua'), 'utf8')
    expect(Lexer.lex(realWorldCode)).toMatchSnapshot()
  })
})
