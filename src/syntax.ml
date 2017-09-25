type block = stat list * retstat option

and stat =
  | Assign           of var list * exp list
  | FunctionCall     of functioncall
  | Label            of name
  | Break
  | Goto             of name
  | DoEnd            of block
  | WhileDoEnd       of exp * block
  | RepeatUntil      of block * exp
  | If               of (exp * block) list * block option
  | ForStep          of name * exp * exp * exp option * block
  | ForIn            of name list * exp list * block
  | LocalAssign      of name list * exp list option

and funcname = name list (* * name option *)

and funcbody = name list * unit option * block 

and retstat = exp list

and name = string

and exp =
  | Nil
  | False
  | True
  | Integer        of int
  | Float          of float
  | LiteralString  of string
  | Vararg
  | FunctionDef    of funcbody
  | PrefixExp      of prefixexp
  | Table          of tableconstr
  | BinOp          of binop * exp * exp
  | UnOp           of unop * exp

and tableconstr = (exp option * exp) list

and functioncall =
  | Function of prefixexp * args
  | Method   of prefixexp * name * args

and prefixexp =
  | Var             of var
  | FunctionCallExp of functioncall
  | Exp             of exp

and var =
  | Name       of name
  | IndexTable of prefixexp * exp

and args = exp list

and binop =
  (* arithmetic operators *)
  | Addition
  | Subtraction
  | Multiplication
  | FloatDivision
  | FloorDivision
  | Modulo
  | Exponentiation
  (* bitwise operators *)
  | BitwiseAnd
  | BitwiseOr
  | BitwiseXor
  | ShiftRight
  | ShiftLeft
  (* relational operators *)
  | Equality
  | Inequality
  | Less
  | Greater
  | LessEq
  | GreaterEq
  (* logical operators *)
  | LogicalAnd
  | LogicalOr
  (* string concatenation *)
  | Concat

and unop =
  | UnaryMinus
  | BitwiseNot
  | Length
  | LogicalNot
