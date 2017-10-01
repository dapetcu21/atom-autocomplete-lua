/* type binop_arithmetic =
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
     | GreaterEq; */
type binop =
  | Arithmetic string
  | Relational string
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
  | Number string
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
  | If expression block (option block)
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

/* let addition = Addition;

   let subtraction = Subtraction;

   let multiplication = Multiplication;

   let floatDivision = FloatDivision;

   let floorDivision = FloorDivision;

   let modulo = Modulo;

   let exponentiation = Exponentiation;

   let bitwiseAnd = BitwiseAnd;

   let bitwiseOr = BitwiseOr;

   let bitwiseXor = BitwiseXor;

   let shiftRight = ShiftRight;

   let shiftLeft = ShiftLeft;

   let equality = Equality;

   let inequality = Inequality;

   let less = Less;

   let greater = Greater;

   let lessEq = LessEq;

   let greaterEq = GreaterEq; */
let arithmetic x => Arithmetic x;

let relational x => Relational x;

let and_ = And;

let or_ = Or;

let concat = Concat;

let unaryMinus = UnaryMinus;

let bitwiseNot = BitwiseNot;

let length = Length;

let logicalNot = LogicalNot;

let nil = Nil;

let false_ = False;

let true_ = True;

let number_ x => Number x;

let string_ x => String x;

let vararg = Vararg;

let table x => Table x;

let function_ x y z => Function x y z;

let name x => Name x;

let index x y => Index x y;

let dynIndex x y => DynIndex x y;

let functionCall x y => FunctionCall x y;

let methodCall x y z => MethodCall x y z;

let literal x => Literal x;

let lValue x => LValue x;

let unOp x y => UnOp x y;

let binOp x y z => BinOp x y z;

let call x => Call x;

let if_ x y z => If x y z;

let whileDo x y => WhileDo x y;

let doEnd x => DoEnd x;

let forStep x y z t w => ForStep x y z t w;

let forIn x y z => ForIn x y z;

let assign x y => Assign x y;

let localAssign x y => LocalAssign x y;

let return_ x => Return x;

let callStatement x => CallStatement x;

let whileDoEnd x y => WhileDoEnd x y;

let repeatUntil x y => RepeatUntil x y;

let nop = Nop;

let empty = [];

let cons l x => [x, ...l];
