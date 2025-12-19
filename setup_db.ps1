$ErrorActionPreference = "Stop"

Write-Host "Setting up local PostgreSQL database..."
Write-Host "You may be prompted for your 'postgres' user password."

# Create User and Database
$setupSql = @"
DO
`$body`$
BEGIN
   IF NOT EXISTS (
      SELECT *
      FROM   pg_catalog.pg_roles
      WHERE  rolname = 'user') THEN

      CREATE ROLE "user" LOGIN PASSWORD 'password';
   END IF;
END
`$body`$;

SELECT 'CREATE DATABASE badminton_db OWNER "user"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'badminton_db')\gexec
"@

$setupSql | psql -U postgres

# Run Schema
Write-Host "Initializing Schema..."
psql -U user -d badminton_db -f schema.sql

# Run Seed
Write-Host "Seeding Data..."
psql -U user -d badminton_db -f seed.sql

Write-Host "Database setup complete!"
Write-Host "Please restart your backend server: stop 'npm start' and run it again."
