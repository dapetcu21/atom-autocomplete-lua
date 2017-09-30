open Jest;

let _ =
  describe
    "Lua parser and labeler"
    (
      fun () => {
        open Expect;
        open Label;
        open Last;
        let ast_test code ast () => expect (parse code) |> toEqual ast;
        let real_world_lua_input: string = [%bs.raw
          {| require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..', 'js', '__tests__', 'real_world.lua'), 'utf8') |}
        ];
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
                  Literal (Number (Int 12)),
                  Literal (Number (Int 13)),
                  Literal (Number (Int 14))
                ]
              ]
          );
        test
          "parses a + b"
          (
            ast_test
              {|
                return a + b
              |}
              [
                Return [
                  BinOp
                    (Arithmetic Addition)
                    (LValue (Name "a"))
                    (LValue (Name "b"))
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
                      (Literal (Number (Int 1)), Literal (String "bar"))
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
