open Jest;

let _ =
  describe
    "Labeled AST"
    (
      fun () => {
        open Expect;
        test "first test" (fun () => expect (1 + 2) |> toBe 3);
        test "second test" (fun () => expect (1 + 2) |> toBe 3)
      }
    );
