# Command: /review

Review the specified file or the most recent changes for code quality.

Steps:
1. If $ARGUMENTS is a filename, read that file
2. If no argument, run `git diff HEAD~1` to get recent changes
3. Apply the code-review skill to produce a structured review
4. End with: "What would you like to address first?"

$ARGUMENTS
