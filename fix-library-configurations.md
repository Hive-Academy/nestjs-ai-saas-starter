# 🚀 LIBRARY CONFIGURATION FIX GUIDE

## PHASE 1: IMMEDIATE FIX (30 minutes) - FIX BUILD/PUBLISH

### Step 1: Fix ALL Library package.json Files

Run this script to fix all entry points:

```bash
# Create backup first
cp -r libs libs.backup

# Fix all package.json entry points
for pkg in libs/*/package.json libs/*/*/package.json; do
  if [ -f "$pkg" ]; then
    echo "Fixing: $pkg"
    # Update main, module, types to point to dist
    sed -i 's|"main": "./src/index.js"|"main": "./dist/index.js"|g' "$pkg"
    sed -i 's|"module": "./src/index.js"|"module": "./dist/index.js"|g' "$pkg"
    sed -i 's|"types": "./src/index.d.ts"|"types": "./dist/index.d.ts"|g' "$pkg"

    # Fix exports paths
    sed -i 's|"./src/index.ts"|"./src/index.ts"|g' "$pkg"  # Keep development as-is
    sed -i 's|"import": "./src/index.js"|"import": "./dist/index.js"|g' "$pkg"
    sed -i 's|"default": "./src/index.js"|"default": "./dist/index.js"|g' "$pkg"
  fi
done
```

Or manually update each library:

```json
{
  "name": "@hive-academy/[library-name]",
  "version": "0.0.1",
  "main": "./dist/index.js", // ✅ FIXED
  "module": "./dist/index.js", // ✅ FIXED
  "types": "./dist/index.d.ts", // ✅ FIXED
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "development": "./src/index.ts", // Keep for local dev
      "types": "./dist/index.d.ts", // ✅ FIXED
      "import": "./dist/index.js", // ✅ FIXED
      "default": "./dist/index.js" // ✅ FIXED
    }
  },
  "files": ["dist", "README.md", "CHANGELOG.md"]
}
```

## PHASE 2: STANDARDIZE BUILD CONFIGURATION (2 hours)

### Step 2: Update ALL project.json Files to Use Rollup

For each library's `project.json`:

```json
{
  "name": "library-name",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/library-name/src",
  "projectType": "library",
  "tags": ["type:data-access"],
  "targets": {
    "build": {
      "executor": "@nx/rollup:rollup", // ✅ Changed from @nx/js:tsc
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/library-name",
        "main": "libs/library-name/src/index.ts",
        "tsConfig": "libs/library-name/tsconfig.lib.json",
        "assets": [
          "libs/library-name/*.md",
          {
            "input": "./libs/library-name",
            "glob": "package.json",
            "output": "."
          }
        ],
        "project": "libs/library-name/package.json",
        "compiler": "tsc",
        "format": ["cjs", "esm"],
        "generateExportsField": true,
        "buildableProjectDepsInPackageJsonType": "dependencies"
      },
      "configurations": {
        "production": {
          "optimization": true,
          "extractLicenses": true,
          "inspect": false
        }
      }
    },
    "publish": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npm publish dist/libs/library-name --access public"
      },
      "dependsOn": ["build"]
    }
  }
}
```

### Step 3: Install Required Packages

```bash
npm install --save-dev @nx/rollup rollup
```

## PHASE 3: FIX TYPESCRIPT CONFIGURATION (1 hour)

### Step 4: Fix tsconfig.base.json

Remove `composite: true` if not using project references:

```json
{
  "compilerOptions": {
    // "composite": true,  // Remove this
    "declaration": true,
    "declarationMap": true
    // ... rest of config
  }
}
```

### Step 5: Standardize Library tsconfig.lib.json

Each library should have:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "declaration": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

## PHASE 4: TESTING & VALIDATION (30 minutes)

### Step 6: Test Build Pipeline

```bash
# Clean everything
nx reset
rm -rf dist/

# Build all libraries
nx run-many -t build --projects=@hive-academy/*

# Check output structure
ls -la dist/libs/nestjs-chromadb/
# Should see: dist/, package.json, README.md

# Test local import
cd apps/dev-brand-api
npm link ../../dist/libs/nestjs-chromadb
```

### Step 7: Validate Publishing (Dry Run)

```bash
# Test publish without actually publishing
cd dist/libs/nestjs-chromadb
npm publish --dry-run

# Check what files would be published
npm pack --dry-run
```

## CONFIGURATION TEMPLATES

### Standard Publishable Library Structure

```
libs/my-library/
├── src/
│   ├── index.ts          # Main export file
│   └── lib/              # Library code
├── package.json          # Minimal, with correct paths
├── project.json          # Nx build configuration
├── tsconfig.json         # Base config
├── tsconfig.lib.json     # Build config
├── tsconfig.spec.json    # Test config
├── jest.config.ts        # Test runner
├── README.md             # Documentation
└── CHANGELOG.md          # Version history
```

### Standard package.json Template

```json
{
  "name": "@hive-academy/my-library",
  "version": "0.0.1",
  "description": "Library description",
  "author": "Hive Academy Team",
  "license": "MIT",
  "main": "./dist/index.js",
  "module": "./dist/index.esm.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "CHANGELOG.md"],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/hive-academy/nestjs-ai-saas-starter.git",
    "directory": "libs/my-library"
  },
  "peerDependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0"
  },
  "dependencies": {
    "tslib": "^2.3.0"
  }
}
```

## SUCCESS METRICS

After applying these fixes:

✅ `nx build [library]` creates correct dist structure  
✅ `npm publish dist/libs/[library]` works without errors  
✅ Local development still works with TypeScript paths  
✅ Published packages can be installed and imported  
✅ All libraries follow same configuration pattern

## TROUBLESHOOTING

### If build fails after changes:

```bash
nx reset
rm -rf dist/ node_modules/.cache
nx run-many -t build --skip-nx-cache
```

### If imports break locally:

- Ensure tsconfig.base.json paths still point to source
- Check that TypeScript service is restarted in IDE
- Run `nx graph` to validate dependency graph

### If publish fails:

- Check npm login: `npm whoami`
- Verify package name is available
- Ensure version is bumped if republishing
- Check .npmignore doesn't exclude needed files
