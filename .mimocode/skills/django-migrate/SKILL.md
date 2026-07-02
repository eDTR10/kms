---
name: django-migrate
description: Use when adding or modifying Django model fields, creating new models, or making any schema change that requires makemigrations + migrate + check. Covers the full cycle: edit models → generate migrations → apply → verify.
---

# Django Model Migration Workflow

Use this skill whenever you need to add a field, create a model, or modify the Django schema. This ensures the full migration cycle is completed correctly every time.

## When to use

- Adding a new field to an existing model
- Creating a new model
- Changing field types, constraints, or options
- Removing a field or model
- Any change to `models.py` files

## Procedure

### 1. Identify scope

- Determine which Django app(s) are affected (`offices`, `documents`, etc.)
- Read the relevant `models.py` file(s) to understand existing schema

### 2. Edit models

- Make the changes to `models.py`
- Follow existing conventions (field naming, ordering, `__str__`, `Meta`)
- If adding a ForeignKey, ensure the related model exists

### 3. Generate migrations

```bash
cd <django_project_dir> && <venv_python> manage.py makemigrations <app_names> 2>&1
```

- If no changes detected, check that your model edits are saved
- If multiple apps affected, pass all app names

### 4. Verify migration plan

```bash
cd <django_project_dir> && <venv_python> manage.py makemigrations --check --dry-run <app_names> 2>&1
```

- Should show "No changes detected" if migrations were already generated
- If changes detected, go back to step 3

### 5. Apply migrations

```bash
cd <django_project_dir> && <venv_python> manage.py migrate <app_names> 2>&1
```

- For a specific migration: `manage.py migrate <app> <migration_name>`
- Check output for errors

### 6. Run Django check

```bash
cd <django_project_dir> && <venv_python> manage.py check 2>&1
```

- Must output "System check identified no issues (0 silenced)"
- If errors appear, fix and re-check

### 7. Optional: Verify via shell

For complex changes, verify the data model works:

```bash
cd <django_project_dir> && <venv_python> manage.py shell -c "
from <app>.models import <Model>
print([f.name for f in <Model>._meta.get_fields()])
" 2>&1
```

### 8. Update downstream files

After the migration is applied, update:

- **Serializers** (`serializers.py`) — add new fields to serializer classes
- **Views** (`views.py`) — update view logic if needed
- **URLs** (`urls.py`) — add new endpoints if needed
- **Admin** (`admin.py`) — register new fields if needed

### 9. Frontend sync (if full-stack)

If the backend change exposes new API fields:

- Update TypeScript types/interfaces in the frontend
- Update API service files (`api.ts`)
- Update components that consume the changed endpoints
- Run TypeScript check: `npx tsc --noEmit`
- Run build: `npx vite build`

## Common pitfalls

- **Missing migration**: If `makemigrations` says "No changes detected" but you edited `models.py`, check for syntax errors or that the file is saved
- **Migration conflicts**: If multiple branches added migrations to the same app, merge migrations before applying
- **Field default**: If adding a non-nullable field to a table with existing rows, provide a `default` or `null=True`
- **Foreign key cascade**: Consider `on_delete` behavior when adding ForeignKey fields
