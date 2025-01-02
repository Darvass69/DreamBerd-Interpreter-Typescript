// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence#table

export enum BindingPower {
  default_bp,
  comma,
  assignment, // and function declaration? for arrow functions?
  logical_or,
  logical_and,
  bitwise_or,
  bitwise_xor, // **
  bitwise_and,
  equality, // ==, ;=, ===, ;==, ====, ;===
  relational, // <, >, >=, <=
  bitwise_shift, // <<, >>
  additive, // +, -
  multiplicative, // /, *, %
  exponentiation, // ^
  prefix, // --, ++, ;, ~, +, -,
  postfix, // --, ++
  new, //! I'm not sure this does anything
  access_call_new, // x.y, x[y], new x(y), x(y), import
  grouping,
  primary,
}
