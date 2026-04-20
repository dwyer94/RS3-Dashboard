# Command: /commit

Stage all changes, write a conventional commit message based on the diff, and commit.

Steps:
1. Run `git diff --staged` (and `git diff` if nothing staged) to understand changes
2. Write a commit message following the commit-message skill format
3. Show me the proposed message and ask for confirmation before committing
4. Run `git commit -m "<message>"` after confirmation

$ARGUMENTS
