const Parser = require('chevrotain').Parser
const { tokenVocabulary, lex } = require('./lexer')

const {
  Name, BlockString, Number, String,
  And, Break, Do, Else, Elseif, End, False, For, Function, Goto, If, In, Local,
  Nil, Not, Or, Repeat, Return, Then, True, Until, While,
  Plus, Minus, Times, Div, Mod, Pow, Length,
  Equal, NotEqual, LessThanEqual, GreaterThanEqual, LessThan, GreaterThan,
  Assign, LeftParen, RightParen, LeftBrace, RightBrace, LeftBracket, RightBracket,
  Label, Semicolon, Colon, Comma, Vararg, Concat, Period,
} = tokenVocabulary

const {
  addition, subtraction, multiplication, floatDivision, floorDivision, modulo, exponentiation,
  bitwiseAnd, bitwiseOr, bitwiseXor, shiftRight, shiftLeft,
  equality, inequality, less, greater, lessEq, greaterEq,
  arithmetic, relational,
  and_, or_,
  concat,
  unaryMinus, bitwiseNot, length, logicalNot,
  nil, false_, true_, number_, string_,
  vararg, table, function_,
  name, index, dynIndex,
  functionCall, methodCall, literal, lValue,
  unOp, binOp, call, if_, whileDo, doEnd, forStep, forIn,
  assign, localAssign,
  return_, callStatement, whileDoEnd, repeatUntil,
  nop,
  cons, empty,
} = require('../lib/js/src/syntax')

class LuaParser extends Parser {
  constructor (input, config) {
    super(input, tokenVocabulary, config)
    const $ = this

    this.expression = $.RULE('expression', () => {
      return $.OR($.cExpr = $.cExpr || [
        {ALT: () => { return lValue(name($.CONSUME(Name).image)) }},
        {ALT: () => { $.CONSUME(Nil); return literal(nil) }},
        {ALT: () => { $.CONSUME(False); return literal(false_) }},
        {ALT: () => { $.CONSUME(True); return literal(true_) }},
        {ALT: () => { return literal(number_($.CONSUME(Number).image)) }},
        {ALT: () => { return literal(string_($.CONSUME(String).image)) }},
        {ALT: () => { return literal(string_($.CONSUME(BlockString).image)) }}
      ])
    })

    this.return = $.RULE('return', () => {
      $.CONSUME(Return)

      let items = empty
      $.OPTION(() => {
        const first = $.SUBRULE($.expression)
        items = $.MANY(() => {
          $.CONSUME(Comma)
          return $.SUBRULE2($.expression)
        }).reduceRight(cons, empty)
        items = cons(items, first)
      })

      return return_(items)
    })

    this.statement = $.RULE('statement', () => {
      return $.OR([
        {ALT: () => $.SUBRULE($.return)}
      ])
    })

    this.block = $.RULE('block', () => {
      const statements = $.MANY(() => {
        const statement = $.SUBRULE($.statement)
        $.OPTION(() => { $.CONSUME(Semicolon) })
        return statement
      })
      return statements.reduceRight(cons, empty)
    })

    Parser.performSelfAnalysis(this)
  }
}

const parserInstance = new LuaParser([])

function parseRule (inputText, rule) {
  const lexingResult = lex(inputText)

  parserInstance.input = lexingResult.tokens
  parserInstance.errors = []
  const value = parserInstance[rule]()

  if (parserInstance.errors.length > 0) {
    throw Error(parserInstance.errors[0].message)
  }

  return value
}

const parse = inputText => parseRule(inputText, 'block')

module.exports = { parserInstance, parseRule, parse }
