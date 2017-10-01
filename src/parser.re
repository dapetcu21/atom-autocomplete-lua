external parse : string => Syntax.block =
  "parse" [@@bs.module "../../../js/parser"];

external parse_rule : string => string => 'a =
  "parseRule" [@@bs.module "../../../js/parser"];

let parse = parse;

let parse_rule = parse_rule;
