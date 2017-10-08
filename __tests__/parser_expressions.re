open Jest;

let _ =
  describe
    "Parser"
    (
      fun () => {
        open Expect;
        open Syntax;
        let test_expression code ast () =>
          expect (Parser.parse_rule code "expression") |> toEqual ast;
        test
          "parses number literal"
          (test_expression "12" (Literal (Number "12")));
        test
          "parses string literal"
          (test_expression "'meow'" (Literal (String "'meow'")));
        test
          "parses block string literal"
          (test_expression "[[meow]]" (Literal (String "[[meow]]")));
        test "parses nil" (test_expression "nil" (Literal Nil));
        test "parses true" (test_expression "true" (Literal True));
        test "parses false" (test_expression "false" (Literal False));
        test "parses vararg" (test_expression "..." (Literal Vararg));
        test "parses name" (test_expression "a" (LValue (Name "a")));
        test
          "parses table"
          (
            test_expression
              {| { a = 11, 12, [13] = 14 } |}
              (
                Literal (
                  Table [
                    (KeyName "a", Literal (Number "11")),
                    (
                      KeyExpression (Literal (Number "1")),
                      Literal (Number "12")
                    ),
                    (
                      KeyExpression (Literal (Number "13")),
                      Literal (Number "14")
                    )
                  ]
                )
              )
          );
        test
          "parses function definition"
          (
            test_expression
              {| function () return 12 end |}
              (Literal (Function [] false [Return [Literal (Number "12")]]))
          );
        test
          "parses function definition with args"
          (
            test_expression
              {| function (x, y) return x, y end |}
              (
                Literal (
                  Function
                    ["x", "y"]
                    false
                    [Return [LValue (Name "x"), LValue (Name "y")]]
                )
              )
          );
        test
          "parses function definition with varargs"
          (
            test_expression
              {| function (x, y, ...) end |}
              (Literal (Function ["x", "y"] true []))
          );
        test
          "parses index chain"
          (
            test_expression
              {| a.b["c"].d |}
              (
                LValue (
                  Index
                    (
                      LValue (
                        DynIndex
                          (LValue (Index (LValue (Name "a")) "b"))
                          (Literal (String "\"c\""))
                      )
                    )
                    "d"
                )
              )
          );
        test
          "parses index chain with paran expression"
          (
            test_expression {| (a).b |} (LValue (Index (LValue (Name "a")) "b"))
          );
        test
          "parses function call expressions"
          (
            test_expression
              {| f(foo, "bar") |}
              (
                Call (
                  FunctionCall
                    (LValue (Name "f"))
                    [LValue (Name "foo"), Literal (String "\"bar\"")]
                )
              )
          );
        test
          "parses method call expressions"
          (
            test_expression
              {| self:f(foo, "bar") |}
              (
                Call (
                  MethodCall
                    (LValue (Name "self"))
                    "f"
                    [LValue (Name "foo"), Literal (String "\"bar\"")]
                )
              )
          );
        test
          "parses a ^ b ^ c"
          (
            test_expression
              {| a ^ b ^ c |}
              (
                BinOp
                  (Arithmetic "^")
                  (LValue (Name "a"))
                  (
                    BinOp
                      (Arithmetic "^") (LValue (Name "b")) (LValue (Name "c"))
                  )
              )
          );
        test
          "parses not ~ - # x"
          (
            test_expression
              {| not ~ - # x |}
              (
                UnOp
                  LogicalNot
                  (
                    UnOp
                      BitwiseNot
                      (UnOp UnaryMinus (UnOp Length (LValue (Name "x"))))
                  )
              )
          );
        test
          "parses a * b / c // d % e"
          (
            test_expression
              {| a * b / c // d % e |}
              (
                BinOp
                  (Arithmetic "%")
                  (
                    BinOp
                      (Arithmetic "//")
                      (
                        BinOp
                          (Arithmetic "/")
                          (
                            BinOp
                              (Arithmetic "*")
                              (LValue (Name "a"))
                              (LValue (Name "b"))
                          )
                          (LValue (Name "c"))
                      )
                      (LValue (Name "d"))
                  )
                  (LValue (Name "e"))
              )
          );
        test
          "parses a + b - c"
          (
            test_expression
              {| a + b - c |}
              (
                BinOp
                  (Arithmetic "-")
                  (
                    BinOp
                      (Arithmetic "+") (LValue (Name "a")) (LValue (Name "b"))
                  )
                  (LValue (Name "c"))
              )
          );
        test
          "parses string concatenation"
          (
            test_expression
              {| "foo" .. "bar" .. "baz" |}
              (
                BinOp
                  Concat
                  (Literal (String "\"foo\""))
                  (
                    BinOp
                      Concat
                      (Literal (String "\"bar\""))
                      (Literal (String "\"baz\""))
                  )
              )
          );
        test
          "parses bitwise shift operators"
          (
            test_expression
              {| a << b >> c |}
              (
                BinOp
                  (Arithmetic ">>")
                  (
                    BinOp
                      (Arithmetic "<<") (LValue (Name "a")) (LValue (Name "b"))
                  )
                  (LValue (Name "c"))
              )
          );
        test
          "parses bitwise and"
          (
            test_expression
              {| a & b |}
              (BinOp (Arithmetic "&") (LValue (Name "a")) (LValue (Name "b")))
          );
        test
          "parses bitwise xor"
          (
            test_expression
              {| a ~ b |}
              (BinOp (Arithmetic "~") (LValue (Name "a")) (LValue (Name "b")))
          );
        test
          "parses bitwise or"
          (
            test_expression
              {| a | b |}
              (BinOp (Arithmetic "|") (LValue (Name "a")) (LValue (Name "b")))
          );
        test
          "parses relational operators"
          (
            test_expression
              {| a < b > c <= d >= e ~= f == g |}
              (
                BinOp
                  (Relational "==")
                  (
                    BinOp
                      (Relational "~=")
                      (
                        BinOp
                          (Relational ">=")
                          (
                            BinOp
                              (Relational "<=")
                              (
                                BinOp
                                  (Relational ">")
                                  (
                                    BinOp
                                      (Relational "<")
                                      (LValue (Name "a"))
                                      (LValue (Name "b"))
                                  )
                                  (LValue (Name "c"))
                              )
                              (LValue (Name "d"))
                          )
                          (LValue (Name "e"))
                      )
                      (LValue (Name "f"))
                  )
                  (LValue (Name "g"))
              )
          );
        test
          "parses and"
          (
            test_expression
              {| a and b |} (BinOp And (LValue (Name "a")) (LValue (Name "b")))
          );
        test
          "parses or"
          (
            test_expression
              {| a or b |} (BinOp Or (LValue (Name "a")) (LValue (Name "b")))
          )
      }
    );
