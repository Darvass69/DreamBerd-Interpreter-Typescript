/* -------------------------------------------------------------------------- */
/*                                 START TODO                                 */
/* -------------------------------------------------------------------------- */

/*
p.exec is now async
it resolves when all branches has reached
	when each parser gets in the exec method, add their promise to the list.
	when we are ready to release them, resolve all the promise in the list
		we would need an event in the branch manager that triggers each checkpoint with position <= to current position so they can release their parsers
	


for this to work, we just need to make sure branches are only created when needed so we don't have duplicates (it shouldn't be a problem, but we need to watch out for it)



*/

/*
checkpoint needs to know
	position
	handler choices past the current position (i'm pretty sure we will never have those)
	token choices past the current position
	nb spaces?
	bp?
	left?

redo the logs
*/

/*
parse grouping whitespace
*/









/* -------------------------------------------------------------------------- */
/*                                  END TODO                                  */
/* -------------------------------------------------------------------------- */
/*
What we have:
checkpoint: create and use checkpoints dynamically.

parser: I think its (almost) done (see checkpoints)

astNodes: most of them are done, we just need to create them.
parserFunctions: create all the new parsing functions to parse all the AST nodes we have and significant whitespace in grouping and expression
lookups: we just need to add missing parsing function when we make them.

references: its a shit way of doing it. We need a better way. Singleton getLookup?

BranchManager: done
*/


import { TokenType, Token } from "./lexer/token";
/*
Improvements:
	- On demand tokens. Allow to search only for the selected types.


If you want to use whitespace in a regex, use its char code. Or we could allow to escape it, but then when creating a variable like 'name\ ' we need to add one more space because we are escaping it. (could be very cursed)
Do we count tabs? New lines? They could be spaces. Then when you want to break an expression over multiple lines, you need to take that into account. It could be very fun.

we might need some token to take priority over any other interpretation. For example, '=====' should not be interpreted as a bunch of equal, but as a file delimiter.


The string theory
'Something'
"Something"
"'" -> '
"'A'" -> A
"'A" -> 'A
"'We write something like "this"'" -> 'We write something like 

I think we do:
	Take all starting quotes (' and ")
	We get them in order.
	To close the string, we must have the exact same sequence in the reverse order.
	If we do "'" -> we expect somewhere to close it with "'".
	If we want a string with just the character/ starting with the character ', we need to escape it "\'"

*/


import Parser from "./parser/parser";
/*
TODO
Whitespace
! ALL OF THIS IS NOW GOING TO BE DONE IN parseExpression

in expect: not really a problem. Expect is to see if a specific token is there, so we can just handle the whitespace explicitly.
nud and led: when we use get NUD/get LED, we need to check the whitespace.
	we first arrive right after the previous token (_-NUD-LED-NUD--). We get the space. Then we get the NUd and the space after it.
		we check both spaces.
			If left == right: eat the space (--_UD--LED--NUD--), then eat the NUD (--NUD_-LED--NUD--) and do things as usual
			If left > right: eat the space (--_UD-LED-NUD--), create a grouping token and use that to find the NUD. Then when we continue, we will already be past the space (what about things like 1+1?)
			If left < right: eat the space (-_UD-LED-NUD--), then eat the NUD (-NUD_-LED--NUD--) and do things as usual. 
				!!! how do we close it. Here we should return a ungroup token, but how can we know we need to ungroup? We need to set the next token to something, or an internal flag, to close the group instead of parsing a LED.
			LED only has 1 case that doesn't error, and its when left == right

	All of this is implemented in the parser, not in the lexer.



If we hit a different size while looking for a led, we close/open a new parentheses. (basically offset by 1 from parentheses)
	(space around led need to be identical, significant whitespace basically mean only the exact same amount of space can be on both side of a LED)
If we hit more, we close the current paren.
If we hit less, we create a new paren with the previous token.


its when using parentheses, but instead of looking for a parenthesis, we are looking for a change of number of whitespace
		how it works: each time we would look for a parenthesis (this.nud(TokenType.OpenParen, BindingPower.grouping, parseGroupingExpression)) we look for spacing
			this means: when we look for a NUD, we look on both side of that NUD
			if the right is the same: everything is good, ignore the spaces
			if the right is the same (*_x_+): we don't do anything special, return the handler for the NUD
			if the right is smaller (*__x_+): we found a grouping start token (its a NUD), get the handler parseGroupingExpression
			if the right is bigger  (*_x__+): we found a grouping end token, it has no uses (not LED and not NUD). We return/exit.
		when we look for a LED, we look on both side of that LED
				if the right is not the same: there is no LED (this happens naturally as we get a groupingToken that is not a LED)


a   +   a+a + a  +  a   +   a -> inf, a, 3, +, 3, a, +, a, 1, +, 1, a, 2, +, 2, a, 3, +, 3, a inf
p0: "a", before infinity, right 3; paren created, parse NUD, next (N1)
p1: "+", left 3, right 3; LED ok; parse LED, next (L1)
p3: "a", left 3, right 0; parse grouping (eats space) (N2)
p4: "a", before 3, right 0; paren created, parse NUD, next (N1)
p5: "+", before 0, right 0; LED ok; parse LED, next (L1)
p6: "a", before 0, right 1; 

check for every token type individually, (identifier counts as as many token type as there are possible identifier from that position)

a  +  a + a  +  a -> 
a  +  a + a+a



fns call
	js: fn(...args)
	db: --fn arg1, arg2, arg3--
	I don't really know how it can be done. TODO later.
		token: function arg ',' and a total number of spaces
*/








/*
Change our logs to be able to better see what is really happening inside the parser.

advanced logging:
  be able to log the AST into a better looking way
  ex: ["1" | #1 | 1]
      +
      ...
  
  
  better represent choices
    when starting new branch, print the choices for that branch
      ex: 
        parseExpressionStatement
          parsePrimaryExpression: Identifier(1)
          parseBinaryExpression: Add()
          parsePrimaryExpression: Identifier(1)
          parseBinaryExpression: Add()
          parsePrimaryExpression: Identifier(1)
        Position: 9



Later, we might want to improve performance by parsing the code line by line and then cleaning the memory of the source code we don't need anymore (like by using a file reader and reading parts by parts).
For that, when we call something like `parseProgram` or `parseBlockStatement`, we can do something like
export function parseProgram(p: Parser): BlockStatement {
  const body: Statement[] = [];

	runLater((p: Parser) => {
		while (p.hasToken()) {
			body.push(parseStatement(p));
		}
	})
 
  return createAstNode(AstNodeKind.BlockStatement, {body});
}
We would then get an empty body, that we will then fill in later as we traverse the file.
*/


/*
The idea with the parser is that it abstracts all the complexity from multiple valid interpretation of the same part of code by creating parallel branches that
parse the same parts, but slightly differently. When parsing, the parser will always react like there is only 1 branch (the current one), but anytime it could 
answer more than 1 way (it has more than 1 choice), it creates a new branch in the background for each other possibility that wasn't explored. When we reach the
end of a branch, we save the result and continue parsing other branches. If a possibility leads to incorrect or invalid code, the branch is aborted and we continue
parsing other branches.

We also have Checkpoints that make sure that when multiple parsers go over the same part of the code in the same way, they don't have to do the same work twice.
They memoize the result at that point and returns it without needing to recalculate everything.
*/

import { parseStatement } from "./parser/parserFunctions";
//TODO recreate all the parsing functions with the new system (should be pretty straightforward)
//! We need a good way to handle creating and getting the values from Checkpoints

// The functions should be completely deterministic based on the state of the parser and only offer different results when the parser is called and it creates a new branch
// At any other point, it needs to parse the exact same and we need a way to tell the code which possibility we are doing at the moment.


import { AstNodeKind } from "./parser/astNodes";
// TODO need a little bit of cleanup + implement missing AST nodes





/*
Parser logs:
expected
	getChoice
	expected
optional
	getChoice
	optional

getStmt
	optional spaces
	getChoice
	stmt
getNud
	optional spaces
	expected token
	getChoice
	nud
getLed
	optional spaces
	getChoice
	stmt

Created branche with ...
expected: Identifier of [...]
optional: Identifier of [...]
optional: None of [...]

Stmt: parseExpressionStatement
Nud: ...
Led: ...


NUD/LED
	-> space
	-> type
	-> space


*/