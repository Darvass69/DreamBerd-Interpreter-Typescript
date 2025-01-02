import { assertEquals } from "@std/assert";

Deno.test(function addTest() {
});

/*
newCheckpoint
	check if we create a new checkpoint when we need to and if we get existing checkpoints
		1.


submitTokenChoices/submitHandlerChoices/submitResultChoice
	check that we create the new states properly (the right number of states with the right things)


run
	we could test that, but its not that complex, we know it works, and we probably won't have to touch it. Low priority.



getResults
	the most complex because it has a lot of moving pieces. Probably the most important to test

*/
