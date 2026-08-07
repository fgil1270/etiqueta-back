-- Ejecutar conectado a SQL Server con un usuario con permisos de administrador (ej. sa)
-- Crea la base de datos db_etiqueta, el login/usuario etp y le otorga permisos sobre la base.

USE master;
GO

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'db_etiqueta')
BEGIN
    CREATE DATABASE db_etiqueta;
END
GO

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'etp')
BEGIN
    CREATE LOGIN etp WITH PASSWORD = N'System058db..', CHECK_POLICY = OFF;
END
GO

USE db_etiqueta;
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = N'etp')
BEGIN
    CREATE USER etp FOR LOGIN etp;
    ALTER ROLE db_owner ADD MEMBER etp;
END
GO
