const Parser = require('chevrotain').Parser
const { tokenVocabulary, lex } = require('./lexer')

const {
  Name, BlockString, Number, String,
  And, Break, Do, Else, Elseif, End, False, For, Function, Goto, If, In, Local,
  Nil, Not, Or, Repeat, Return, Then, True, Until, While,
  Plus, Minus, Times, Div, FloorDiv, Mod, Pow, Length,
  Equal, NotEqual, LessThanEqual, GreaterThanEqual, LessThan, GreaterThan,
  Assign, LeftParen, RightParen, LeftBrace, RightBrace, LeftBracket, RightBracket,
  Label, Semicolon, Colon, Comma, Vararg, Concat, Period,
  BitwiseNot, BitwiseOr, BitwiseAnd, LeftShift, RightShift
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

    this.expressionList = $.RULE('expressionList', () => {
      const first = $.SUBRULE1($.expression)
      const items = $.MANY(() => {
        $.CONSUME(Comma)
        return $.SUBRULE2($.expression)
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
    const functionCallExpr = (a, b) => call(functionCall(a, b))
    const methodCallExpr = (a, [name, args]) => call(methodCall(a, name, args))

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
        }},
        {ALT: () => {
          $.CONSUME2(LeftParen)
          let args = empty
          $.OPTION(() => {
            args = $.SUBRULE3($.expressionList)
          })
          $.CONSUME2(RightParen)
          return [functionCallExpr, args]
        }},
        {ALT: () => {
          $.CONSUME(Colon)
          const name = $.CONSUME3(Name).image
          $.CONSUME3(LeftParen)
          let args = empty
          $.OPTION2(() => {
            args = $.SUBRULE4($.expressionList)
          })
          $.CONSUME3(RightParen)
          return [methodCallExpr, [name, args]]
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

    const powRight = (y, x) => binOp(arithmetic('^'), x, y)

    this.term2 = $.RULE('term2', () => {
      const first = $.SUBRULE1($.term1)
      const postfixes = $.MANY(() => {
        $.CONSUME(Pow)
        return $.SUBRULE2($.term1)
      })
      if (!postfixes.length) { return first }
      return powRight(postfixes.reduceRight(powRight), first)
    })

    this.term3 = $.RULE('term3', () => {
      return $.OR([
        {ALT: () => {
          $.CONSUME(Length)
          return unOp(length, $.SUBRULE1($.term3))
        }},
        {ALT: () => {
          $.CONSUME(Minus)
          return unOp(unaryMinus, $.SUBRULE2($.term3))
        }},
        {ALT: () => {
          $.CONSUME(Not)
          return unOp(logicalNot, $.SUBRULE3($.term3))
        }},
        {ALT: () => {
          $.CONSUME(BitwiseNot)
          return unOp(bitwiseNot, $.SUBRULE4($.term3))
        }},
        {ALT: () => $.SUBRULE($.term2)}
      ])
    })

    const arithmeticMultiplication = (x, y) => binOp(arithmetic('*'), x, y)
    const arithmeticFloatDivision = (x, y) => binOp(arithmetic('/'), x, y)
    const arithmeticFloorDivision = (x, y) => binOp(arithmetic('//'), x, y)
    const arithmeticModulo = (x, y) => binOp(arithmetic('%'), x, y)

    this.term4 = $.RULE('term4', () => {
      const first = $.SUBRULE1($.term3)
      const postfixes = $.MANY(() => {
        const func = $.OR([
          {ALT: () => { $.CONSUME(Times); return arithmeticMultiplication }},
          {ALT: () => { $.CONSUME(Div); return arithmeticFloatDivision }},
          {ALT: () => { $.CONSUME(FloorDiv); return arithmeticFloorDivision }},
          {ALT: () => { $.CONSUME(Mod); return arithmeticModulo }}
        ])
        const arg = $.SUBRULE2($.term3)
        return [func, arg]
      })
      return postfixes.reduce(leftAssociate, first)
    })

    const arithmeticAddition = (x, y) => binOp(arithmetic('+'), x, y)
    const arithmeticSubtraction = (x, y) => binOp(arithmetic('-'), x, y)

    this.term5 = $.RULE('term5', () => {
      const first = $.SUBRULE1($.term4)
      const postfixes = $.MANY(() => {
        const func = $.OR([
          {ALT: () => { $.CONSUME(Plus); return arithmeticAddition }},
          {ALT: () => { $.CONSUME(Minus); return arithmeticSubtraction }}
        ])
        const arg = $.SUBRULE2($.term4)
        return [func, arg]
      })
      return postfixes.reduce(leftAssociate, first)
    })

    this.expression = $.RULE('expression', () => {
      return $.SUBRULE($.term5)
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
