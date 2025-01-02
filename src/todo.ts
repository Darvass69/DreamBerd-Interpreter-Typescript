/* -------------------------------------------------------------------------- */
/*                                 START TODO                                 */
/* -------------------------------------------------------------------------- */
/*
next steps:
	- fix small problems (comments)
	- add whitespace and significant whitespace to every parsing functions
	- fix parsing that ends at different places creates a slightly different copy of the whole thing.
	- various improvements to help with parsing functions (exec with multiple handlers, better BranchingStatement type)
	- tests
*/



/*
~ Need fixing
Comments don't work. (when we make a comment, we remove the characters, but we don't change the remaining tokens, this makes it so their start and end have a gap)

*/


/*
* Parser/parsing functions improvements
  - p.executeHandler should allow to give multiple handlers that we then create a choice for each. This way we can execute any combinations.
		+ a way to easily create parseExpression or any other handler (like a centralized place).

	- better way to handle BranchingStatement type? A way to define a branching and the value at the same time? Equivalent to `Branching<T> | T`

	- a way to filter nodes in branching so we can verify that branching only has some specific types of nodes (ex: we can only assign a value to symbol and member expressions, so we want to filter for them)

	- Most of the parsing functions don't take whitespace into account. Fix that + clean up.
		How and when should we take care of whitespace?
		What about new lines and indent?
		How do we make them consistent between everything?
			- Whitespace
			- end of line/end of statement/end of file
*/


/*
~ Ast visualiser
create a web page with vite (and react?)

advanced ast view:
  be able to log the AST into a better looking way
  ex: ["1" | #1 | 1]
      +
      ...

*/


/*
~ Small improvements
better/more comments?

unit tests to make sure things work well. Could also be done before we try to make it work. It will reduce the debug time by a lot.

*/

/* ------------------------------- Whitespace ------------------------------- */
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

/* -------------------------------------------------------------------------- */
/*                                  END TODO                                  */
/* -------------------------------------------------------------------------- */
import { TokenType, Token } from "./lexer/token.ts";
/*
I think most of the tokens work like we want to.

  TODO clean up identifiers before returning. We want to make sure all identifiers start and end somewhere that isn't just identifiers.
  TODO don't create identifiers with only "!" and similar.
	TODO string interpolation

~ On demand tokens
	- On demand tokens. Allow to search only for the selected types.

~ Whitespace (special use case)
If you want to use whitespace in a regex, use its char code. Or we could allow to escape it, but then when creating a variable like 'name\ ' we need to add one more space because we are escaping it. (could be very cursed)
Do we count tabs? New lines? They could be spaces. Then when you want to break an expression over multiple lines, you need to take that into account. It could be very fun.

~ Token priority
we might need some token to take priority over any other interpretation. For example, '=====' (outside an explicit string) should never be interpreted as a bunch of equal, but as a file delimiter.

~ Strings with any delimiters
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



/* ---------------------------------- Other --------------------------------- */
/*
Could generator functions be useful? Could it be used instead of async for parsing functions?
(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/GeneratorFunction)


*/