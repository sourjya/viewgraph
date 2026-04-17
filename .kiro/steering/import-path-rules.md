---
inclusion: always
---

# Import Path Rules

## Absolute Rule: No Deep Relative Imports

**NEVER use `../../` or deeper relative paths in any import statement.** This applies to both Python backend and TypeScript frontend.

Relative imports beyond one level (`../`) create fragile, unreadable code that breaks on refactors. Use path aliases instead.

## Python Backend

Use `#src/` subpath imports or absolute package imports. Never `../../`.

### Allowed
```python
# Absolute package imports (preferred)
from packages.common.models import Ingredient
from packages.evidence.src.scoring import ConsensusScorer

# Same-package relative (one level only, for tightly coupled files)
from .models import Ingredient
from ..core import config
```

### Forbidden
```python
# BANNED - deep relative imports
from ...common.models import Ingredient
from ....evidence.src.scoring import ConsensusScorer
```

### Configuration
Each package's `pyproject.toml` declares itself as an installable package. Cross-package imports use the package name directly, resolved by uv workspaces.

## TypeScript Frontend

Use `@/` path alias for all imports. Never `../../`.

### Allowed
```typescript
// Path alias (preferred for all cross-directory imports)
import { useAnalysis } from '@/features/analysis/hooks/useAnalysis'
import { Button } from '@/shared/components/Button'
import { api } from '@/services/api'
import type { Ingredient } from '@/types/ingredient'

// Same-directory relative (only for tightly coupled files in the same feature)
import { IngredientCard } from './IngredientCard'
```

### Forbidden
```typescript
// BANNED - any relative import crossing directory boundaries
import { Button } from '../../shared/components/Button'
import { api } from '../../../services/api'
```

### Configuration

**vite.config.ts:**
```typescript
resolve: {
  alias: { '@': path.resolve(__dirname, './src') }
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}
```

## Enforcement

- Code review catches violations
- ESLint `no-restricted-imports` rule bans `../..` patterns in frontend
- Ruff import sorting keeps Python imports clean
- When touching existing files with deep relative imports, fix them opportunistically
