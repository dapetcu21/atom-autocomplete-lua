open Jest;

let _ =
  describe
    "Parser"
    (
      fun () => {
        open Expect;
        open Syntax;
        open Parser;
        let ast_test code ast () => expect (Parser.parse code) |> toEqual ast;
        let ast_test_rule rule code ast () =>
          expect (Parser.parse_rule code rule) |> toEqual ast;
        let real_world_lua_input: string = [%bs.raw
          {| require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', 'js', '__tests__', 'real_world.lua'), 'utf8') |}
        ];
        test
          "parses number literal"
          (ast_test_rule "expression" "12" (Literal (Number "12")));
        test
          "parses string literal"
          (ast_test_rule "expression" "'meow'" (Literal (String "'meow'")));
        test
          "parses block string literal"
          (
            ast_test_rule "expression" "[[meow]]" (Literal (String "[[meow]]"))
          );
        test "parses nil" (ast_test_rule "expression" "nil" (Literal Nil));
        test "parses true" (ast_test_rule "expression" "true" (Literal True));
        test
          "parses false" (ast_test_rule "expression" "false" (Literal False));
        test
          "parses name" (ast_test_rule "expression" "a" (LValue (Name "a")));
        test
          "parses a + b"
          (
            ast_test_rule
              "expression"
              "a + b"
              (BinOp (Arithmetic "+") (LValue (Name "a")) (LValue (Name "b")))
          );
        test
          "ignores labels, gotos and break"
          (
            ast_test
              {|
                ::useless_label1::
                goto useless_label1
                break
              |}
              [Nop, Nop, Nop]
          );
        test
          "parses return statements"
          (
            ast_test
              {|
                return 12, 13, 14
              |}
              [
                Return [
                  Literal (Number "12"),
                  Literal (Number "13"),
                  Literal (Number "14")
                ]
              ]
          );
        test
          "parses tables"
          (
            ast_test
              {|
                return { a = "foo", "bar" }
              |}
              [
                Return [
                  Literal (
                    Table [
                      (Literal (String "a"), Literal (String "foo")),
                      (Literal (Number "1"), Literal (String "bar"))
                    ]
                  )
                ]
              ]
          );
        test
          "parses function call expressions"
          (
            ast_test
              {|
                return f(foo, "bar")
              |}
              [
                Return [
                  Call (
                    FunctionCall
                      (LValue (Name "f"))
                      [LValue (Name "foo"), Literal (String "bar")]
                  )
                ]
              ]
          );
        test
          "parses function call statements"
          (
            ast_test
              {|
                f(foo, "bar")
              |}
              [
                CallStatement (
                  FunctionCall
                    (LValue (Name "f"))
                    [LValue (Name "foo"), Literal (String "bar")]
                )
              ]
          );
        test
          "parses method call expressions"
          (
            ast_test
              {|
                return self:f(foo, "bar")
              |}
              [
                Return [
                  Call (
                    MethodCall
                      (LValue (Name "self"))
                      "f"
                      [LValue (Name "foo"), Literal (String "bar")]
                  )
                ]
              ]
          );
        test
          "parses method call statements"
          (
            ast_test
              {|
                self:f(foo, "bar")
              |}
              [
                CallStatement (
                  MethodCall
                    (LValue (Name "self"))
                    "f"
                    [LValue (Name "foo"), Literal (String "bar")]
                )
              ]
          );
        test
          "parses function definitions"
          (
            ast_test
              {|
                return function (a, b) return a end
              |}
              [
                Return [
                  Literal (
                    Function ["a", "b"] false [Return [LValue (Name "a")]]
                  )
                ]
              ]
          );
        test
          "parses function definitions with varargs"
          (
            ast_test
              {|
                return function (a, b, ...) return a end
              |}
              [
                Return [
                  Literal (
                    Function ["a", "b"] true [Return [LValue (Name "a")]]
                  )
                ]
              ]
          );
        test
          "parses local statements"
          (
            ast_test
              {|
                local a, b
              |}
              [LocalAssign ["a", "b"] []]
          );
        test
          "parses local assignments"
          (
            ast_test
              {|
                local a, b, c = "foo", unpack()
              |}
              [
                LocalAssign
                  ["a", "b", "c"]
                  [
                    Literal (String "foo"),
                    Call (FunctionCall (LValue (Name "unpack")) [])
                  ]
              ]
          );
        test
          "parses assignment"
          (
            ast_test
              {|
                a, b = c, d
              |}
              [
                Assign
                  [Name "a", Name "b"] [LValue (Name "c"), LValue (Name "d")]
              ]
          );
        test
          "parses if"
          (
            ast_test
              {|
                if cond then
                  return "foo"
                end
              |}
              [
                If (LValue (Name "cond")) [Return [Literal (String "foo")]] None
              ]
          );
        test
          "parses if else"
          (
            ast_test
              {|
                if cond then
                  return "foo"
                else
                  return "bar"
                end
              |}
              [
                If
                  (LValue (Name "cond"))
                  [Return [Literal (String "foo")]]
                  (Some [Return [Literal (String "bar")]])
              ]
          );
        test
          "parses if elseif else"
          (
            ast_test
              {|
                if cond1 then
                  return "foo"
                elseif cond2 then
                  return "bar"
                else
                  return "baz"
                end
              |}
              [
                If
                  (LValue (Name "cond1"))
                  [Return [Literal (String "foo")]]
                  (
                    Some [
                      If
                        (LValue (Name "cond2"))
                        [Return [Literal (String "bar")]]
                        (Some [Return [Literal (String "baz")]])
                    ]
                  )
              ]
          );
        test
          "parses real world lua script with no errors"
          (
            fun () => {
              let ast = parse real_world_lua_input;
              expect (ast === []) |> toBe false
            }
          )
      }
    );
