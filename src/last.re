type number =
  | Float float
  | Int int;

type binop_arithmetic =
  | Addition
  | Subtraction
  | Multiplication
  | FloatDivision
  | FloorDivision
  | Modulo
  | Exponentiation
  | BitwiseAnd
  | BitwiseOr
  | BitwiseXor
  | ShiftRight
  | ShiftLeft;

type binop_relational =
  | Equality
  | Inequality
  | Less
  | Greater
  | LessEq
  | GreaterEq;

type binop =
  | Arithmetic binop_arithmetic
  | Relational binop_relational
  | And
  | Or
  | Concat;

type unop =
  | UnaryMinus
  | BitwiseNot
  | Length
  | LogicalNot;

type literal =
  | Nil
  | False
  | True
  | Number number
  | String string
  | Vararg
  | Table (list (expression, expression))
  | Function (list string) bool block
and lvalue =
  | Name string
  | Index expression string
  | DynIndex expression expression
and call =
  | FunctionCall expression (list expression)
  | MethodCall expression string (list expression)
and expression =
  | Literal literal
  | LValue lvalue
  | UnOp unop expression
  | BinOp binop expression expression
  | Call call
and statement =
  | If expression block block
  | WhileDo expression block
  | DoEnd block
  | ForStep string expression expression (option expression) block
  | ForIn (list string) (list expression) block
  | Assign (list lvalue) (list expression)
  | LocalAssign (list string) (list expression)
  | Return (list expression)
  | CallStatement call
  | WhileDoEnd expression block
  | RepeatUntil block expression
  | Nop
and block = list statement;
