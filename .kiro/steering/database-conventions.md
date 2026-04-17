---
inclusion: always
---

# Database Conventions

Database architecture, credential management, migration rules, and ORM conventions.

## Architecture Principles

1. **One database per project** - no sharing databases across projects
2. **Separate test database** - tests never touch the application database
3. **All connection strings in `.env`** - never hardcode host, port, database name, or credentials
4. **Test database is disposable** - tests may truncate/recreate tables freely

## Credential Management

- **Admin/root credentials** are for migrations and schema changes only - stored in `.env`
- **App user** gets DML privileges only (SELECT, INSERT, UPDATE, DELETE) - no CREATE/DROP in production
- **Test user** gets full privileges on the test database only
- **Never prompt for passwords** - always read from `.env`
- **Never use root for application connections** - root is for admin operations only

### .env Structure

```bash
# Admin (migrations, schema changes)
DB_ADMIN_URL=<engine>://<admin_user>:<admin_password>@localhost:<port>/<project>

# Application (runtime)
DATABASE_URL=<engine>://<project>_app:<app_password>@localhost:<port>/<project>

# Test
TEST_DATABASE_URL=<engine>://<project>_test:<test_password>@localhost:<port>/<project>_test
```

## Migration Rules

- Migrations run with **admin credentials** - they need DDL privileges
- Application code connects with the **app user** - limited to DML
- **Never modify already-applied migrations** - create new ones to alter schema
- **No business logic in migrations** - migrations are schema changes only
- **Migrations must be reversible** where possible - include downgrade/rollback steps

## ORM Conventions

- **No N+1 queries** - use eager loading, joins, or batch queries
- **Review ORM-generated SQL** for new endpoints - check query plans for performance
- **Parameterized queries only** - never string interpolation for SQL
- **Explicit timeouts** on all database calls - no indefinite waits
- **Index every column** used in WHERE, JOIN, or ORDER BY for frequent queries - document index decisions
- **Don't fight the ORM** - if the ORM handles it, don't drop to raw SQL unless there's a measurable performance reason

## Transaction Boundaries

- **Explicit, not implicit** - wrap multi-step operations in explicit transactions
- **Keep transactions short** - don't hold transactions open across network calls or user interactions
- **Handle rollback** - every transaction must have a clear rollback path on failure

## Connection Pooling

- Use connection pooling in production - never open a new connection per request
- Set pool size based on expected concurrency and database max connections
- Configure idle connection timeout to prevent stale connections
- Monitor pool exhaustion - log when pool is near capacity

## Common Pitfalls

- **Soft deletes vs hard deletes** - decide once per project, document in an ADR. Don't mix approaches.
- **Timestamps** - use `timezone.utc` for all database timestamps. Store as UTC, convert on display.
- **Large result sets** - always paginate. Never return unbounded query results.
- **Schema drift** - the migration tool is the single source of truth for schema. Never modify schema manually.

## Engine-Specific Notes


### PostgreSQL
- Use JSONB over JSON for queryable structured data
- Use advisory locks for distributed coordination
- Enable `pg_stat_statements` for query performance monitoring
- Use `EXPLAIN ANALYZE` to verify query plans for new endpoints

### MySQL
- Set `charset=utf8mb4` and `collation=utf8mb4_unicode_ci` as defaults
- Enable strict mode (`STRICT_TRANS_TABLES`)
- Be aware of implicit type conversions in WHERE clauses

### SQLite
- Enable WAL mode for concurrent read/write access
- Be aware of single-writer limitation - not suitable for high-concurrency production
- Use for development, testing, and single-user applications
