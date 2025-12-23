# Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) format for commit messages. Commitlint will automatically validate your commit messages.

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

## Examples

```bash
feat(auth): add JWT authentication
fix(api): resolve validation error in user endpoint
docs(readme): update installation instructions
```
