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
  keyName, keyExpression,
  nop,
  cons, empty, pair,
} = require('../lib/js/src/syntax')

class LuaParser extends Parser {
  constructor (input, config) {
    super(input, tokenVocabulary, config)
    const $ = this
    let tableNumericIndex = 0

    this.tableField = $.RULE('tableField', () => {
      return $.OR([
        {ALT: () => {
          const name = $.CONSUME(Name)
          $.CONSUME2(Assign)
          const expr = $.SUBRULE($.expression)
          return pair(keyName(name.image), expr)
        }},
        {ALT: () => {
          $.CONSUME(LeftBracket)
          const key = $.SUBRULE2($.expression)
          $.CONSUME3(RightBracket)
          $.CONSUME4(Assign)
          const expr = $.SUBRULE3($.expression)
          return pair(keyExpression(key), expr)
        }},
        {ALT: () => {
          const expr = $.SUBRULE4($.expression)
          return pair(
            keyExpression(literal(number_((tableNumericIndex++).toString()))),
            expr
          )
        }}
      ])
    })

    this.nameList = $.RULE('nameList', () => {
      const first = $.CONSUME(Name).image
      const items = $.MANY(() => {
        $.CONSUME2(Comma)
        return $.CONSUME3(Name).image
      }).reduceRight(cons, empty)
      return cons(items, first)
    })

    this.argList = $.RULE('argList', () => {
      let items = empty
      let vararg = false
      $.OPTION1(() => {
        $.OR([
          {ALT: () => { $.CONSUME(Vararg); vararg = true }},
          {ALT: () => {
            const first = $.CONSUME(Name).image
            items = $.MANY(() => {
              $.CONSUME2(Comma)
              return $.CONSUME3(Name).image
            }).reduceRight(cons, empty)
            items = cons(items, first)

            $.OPTION2(() => {
              $.CONSUME4(Comma)
              $.CONSUME5(Vararg)
              vararg = true
            })
          }}
        ])
      })
      return [items, vararg]
    })

    const leftAssociate = (x, [f, y]) => f(x, y)
    const lValueDynIndex = (a, b) => lValue(dynIndex(a, b))
    const lValueIndex = (a, b) => lValue(index(a, b))

    this.prefixExp = $.RULE('prefixExp', () => {
      const first = $.OR1([
        {ALT: () => lValue(name($.CONSUME(Name).image))},
        {ALT: () => {
          $.CONSUME(LeftParen)
          const expr = $.SUBRULE($.expression)
          $.CONSUME(RightParen)
          return expr
        }}
      ])
      return $.MANY(() => $.OR2([
        {ALT: () => {
          $.CONSUME(LeftBracket)
          const index = $.SUBRULE2($.expression)
          $.CONSUME(RightBracket)
          return [lValueDynIndex, index]
        }},
        {ALT: () => {
          $.CONSUME(Period)
          const index = $.CONSUME2(Name).image
          return [lValueIndex, index]
        }}
      ])).reduce(leftAssociate, first)
    })

    this.term1 = $.RULE('term1', () => {
      return $.OR($.ct1 = $.ct1 || [
        {ALT: () => { $.CONSUME(Nil); return literal(nil) }},
        {ALT: () => { $.CONSUME(False); return literal(false_) }},
        {ALT: () => { $.CONSUME(True); return literal(true_) }},
        {ALT: () => { return literal(number_($.CONSUME(Number).image)) }},
        {ALT: () => { return literal(string_($.CONSUME(String).image)) }},
        {ALT: () => { return literal(string_($.CONSUME(BlockString).image)) }},
        {ALT: () => { $.CONSUME(Vararg); return literal(vararg) }},
        {ALT: () => {
          $.CONSUME(Function)
          $.CONSUME2(LeftParen)
          const [args, vararg] = $.SUBRULE($.argList)
          $.CONSUME3(RightParen)
          const block = $.SUBRULE($.block)
          $.CONSUME4(End)
          return literal(function_(args, vararg, block))
        }},
        {ALT: () => $.SUBRULE($.prefixExp)},
        {ALT: () => {
          $.CONSUME(LeftBrace)

          let items = empty
          $.OPTION(() => {
            tableNumericIndex = 1
            const first = $.SUBRULE($.tableField)
            items = $.MANY(() => {
              $.CONSUME2(Comma)
              return $.SUBRULE2($.tableField)
            }).reduceRight(cons, empty)
            items = cons(items, first)
          })

          $.CONSUME3(RightBrace)
          return literal(table(items))
        }}
      ])
    })

    this.expression = $.RULE('expression', () => {
      return $.SUBRULE($.term1)
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
