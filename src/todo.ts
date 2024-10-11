import { TokenType, Token } from "./lexer/token";
/*
TODO change how we represent tokens to handle tokens that can represent more than 1 thing, or tokens that span multiple other tokens
	ex: `name<2s>` can be 'identifier(name) lifetime(2s)' or 'string(name<2s>)' or multiple other things. We need to be able to represent all of them.

instead of creating tokens that are only 1 type, we create tokens with multiple types (each token can fulfill more than 1 type)
some tokens can span more than 1 element (ex: strings or symbols like +=). For these, we don't just have a bool, we have a ref to the next token/we know the start and end token


? Do we define the tokens there, or do we define them when we need them in the create AST/parsing functions?
	I think we should have some way to define tokens using a function that returns whether or not the token is that type.
	we have 2 types of tokens:
		1. they are always the same ('+', '=', ...) and we just need to see if they appear.
		2. they have more complicated rules, like function

		most tokens are option 1, so it needs to be decently easy to create those



Maybe we don't tokenise first?
We could have tokens, but only tokenise when called and only tokenise for the types that are being looked for?




for the parser/tokens, its the same idea as before, but with multiple possibilities
		its: get char, find a way to parse it (first match), add the token
		it becomes: get char, find a way to parse it (parse it in ALL the ways it works), add the token






with the whitespace thing, it becomes harder to parse tokens.
We might need to wrap symbols to detect grouping groups?
	No, what we can do is have a special token parser that, when matching, takes precedence over the rest of the tokens
	That way, when we find the start/end of a group (look at spaces before and after)
	No, we don't need that. Just parse one of the possible token as a open/close group



A token is identified by its starting position
Then we get its meaning and add it to the token
	add end position

get char, find pattern (for things like "+", we remove whitespace), then add to current token, then go to next token.

also parse tabs the same way. If we find a tab, if its the same size, do nothing, if its bigger, create a token with indent + size (when parsing, if we get to a new context and we don't already have an indent for it, the first indent  >= than the l;ast is the indent for the context)
if smaller, create a token 'end of indent' with like both size or something. Then when parsing we can look at it and know its the end of a block.

we might need some token to take priority over any other interpretation. For example, '=====' should not be interpreted as a bunch of equal, but as a file delimiter.


















If you want to use whitespace in a regex, use its char code. Or we could allow to escape it, but then when creating a variable like 'name\ ' we need to add one more space because we are escaping it. (could be very cursed)
Do we count tabs? New lines?


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



fns call
	js: fn(...args)
	db: --fn arg1, arg2, arg3,--
	I don't really know how it can be done. TODO later.
		token: function arg ',' and a total number of spaces




What we have:

lexer: Need rework to accommodate more complicated tokens

astNodes: most of them are done, we just need to create them.

lookups: updated version works well, we just need to add missing parsing function when we make them.
		maybe add the BP to the entries themselves so we don't have to handle them in the parsing functions.

parser: new version works well, we just need to change how expect/optional/findToken to be better using the new tokens

parserFunctions: need to update them to the new parsing functions, and to use significant whitespace


checkpoint: need utils to create checkpoints and memo

BranchManager: kinda awkward to use.

global: its a shit way of doing it. We need a better way. Singleton getLookup or export a var?






*/





import { tokenize } from "./lexer/lexer";
/*
TODO
change how our lexer works to handle our new tokens
*/


import Lookups from "./parser/lookups";
/*
TODO
Implement new changes from parserFunctionNew to the lookups.
Add all the missing Nud/Led/Stmt handler in the lookup table and use the new tokens to match them.
*/


import Parser from "./parser/parser";
/*
TODO
The parser needs quite a lot, but the most important part is to change the expect/optional/findToken to use the new tokens.
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
They memoize the result at that point and returns it without needing to recalculate everything (it returns a reference to the result to reduce memory).
*/


import { parseStatement } from "./parser/parserFunctions";
//TODO recreate all the parsing functions with the new system (should be pretty straightforward)
//! We need a good way to handle creating and getting the values from Checkpoints

// The functions should be completely deterministic based on the state of the parser and only offer different results when the parser is called and it creates a new branch
// At any other point, it needs to parse the exact same and we need a way to tell the code which possibility we are doing at the moment.


import { AstNodeKind } from "./parser/astNodes";
// TODO need a little bit of cleanup + implement missing AST nodes