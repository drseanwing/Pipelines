# GitHub Copilot Instructions

## Project Context
[Same project overview as CLAUDE.md]

## Coding Standards

### General Principles
1. Write self-documenting code with clear naming
2. Add comments for complex logic only
3. Follow existing patterns in the codebase
4. Prefer composition over inheritance
5. Keep functions small and focused (< 50 lines)

### Language-Specific Guidelines

#### Python
- Use type hints for all function signatures
- Prefer dataclasses or Pydantic models over dicts
- Use pathlib for file operations
- Use contextlib for resource management

#### JavaScript/TypeScript
- Use TypeScript strict mode
- Prefer const over let, never use var
- Use async/await over callbacks/promises
- Destructure when accessing multiple properties

### Testing
- Write tests alongside implementation
- Use descriptive test names: `test_should_[expected]_when_[condition]`
- Mock external dependencies
- Use fixtures for common test data

### Security
- Validate all inputs
- Sanitise outputs
- Use parameterised queries
- Never hardcode credentials

## Commit Message Format
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

Types: feat, fix, docs, style, refactor, test, chore
