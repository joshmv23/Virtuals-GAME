# Adding a New Tool to LAW

## Prerequisites
- LAW repository installed and set up
- Basic understanding of Zod schemas
- Dependencies installed (`pnpm install` already run)

## Video Tutorial

[![Lit Agent Wallet - New Tools](https://img.youtube.com/vi/I_Mfn3333jU/0.jpg)](https://www.youtube.com/watch?v=I_Mfn3333jU)

## Generating the Tool Structure

1. From the repository root:
```bash
pnpm new-tool [tool-name]
```

2. Follow interactive prompts for:
   - Tool name (kebab-case)
   - Execution parameters (name, type, description, Zod schema)
   - Policy parameters (name, type, description)

3. Select build configuration matching existing tools:
   - Bundler: `tsc`
   - Linter: `eslint` 
   - Test runner: `jest`

Generated location: `packages/aw-tools-[tool-name]`

## Implementing Tool Logic

### 1. Utility Functions
- Add helper functions to:  
  `src/lib/lit-actions/utils/`

### 2. Policy Validation
- Implement policies in:  
  `src/lib/lit-actions/policies.ts`

### 3. Core Implementation
1. Import required utilities in:  
   `src/lib/lit-actions/tool.ts`
2. Add execution logic at the marked section

## Post-Installation

1. Clean build artifacts:
```bash
pnpm clean
```

2. Reinstall dependencies:
```bash
pnpm install
```

3. Test execution:
```bash
pnpm start:cli
```