-- Sweet Home database (SQL Server / T-SQL)
-- Run in SSMS. GO separates batches.

IF DB_ID('sweethome') IS NULL CREATE DATABASE sweethome;
GO
USE sweethome;
GO

-- ---------- Accounts ----------
CREATE TABLE users(
    usid       INT IDENTITY(1,1) PRIMARY KEY,
    fullname   VARCHAR(100) NOT NULL,
    email      VARCHAR(170) NOT NULL UNIQUE,
    phone      VARCHAR(30)  NULL,
    passwords  VARCHAR(250) NOT NULL,              -- stores a bcrypt hash, never the real password
    role       VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    createdat  DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
);

-- ---------- Listings (the "products" of the shop) ----------
CREATE TABLE houses(
    hid           INT IDENTITY(1,1) PRIMARY KEY,
    usid          INT NOT NULL FOREIGN KEY REFERENCES users(usid),   -- the seller
    adress        VARCHAR(250) NOT NULL,
    rooms         INT NULL,
    price         DECIMAL(12,0) NOT NULL,                            -- UGX, no decimals
    descriptions  VARCHAR(1000) NULL,
    stock         INT NOT NULL DEFAULT 1
);

CREATE TABLE hotels(
    hoid    INT IDENTITY(1,1) PRIMARY KEY,
    adress  VARCHAR(250) NOT NULL,
    roomsa  INT NULL
);

CREATE TABLE resto(
    resid    INT IDENTITY(1,1) PRIMARY KEY,
    adress   VARCHAR(250) NOT NULL,
    receipt  VARCHAR(1000) NULL
);

-- One table for all photos: each row belongs to exactly one house, hotel or restaurant
CREATE TABLE images(
    himg       INT IDENTITY(1,1) PRIMARY KEY,
    hid        INT NULL FOREIGN KEY REFERENCES houses(hid) ON DELETE CASCADE,
    hoid       INT NULL FOREIGN KEY REFERENCES hotels(hoid) ON DELETE CASCADE,
    resid      INT NULL FOREIGN KEY REFERENCES resto(resid) ON DELETE CASCADE,
    imagepath  VARCHAR(300) NOT NULL,
    CONSTRAINT one_owner CHECK (
        (CASE WHEN hid  IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN hoid IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN resid IS NOT NULL THEN 1 ELSE 0 END) = 1)
);

-- ---------- Shop: orders and payments ----------
CREATE TABLE orders(
    oid         INT IDENTITY(1,1) PRIMARY KEY,
    usid        INT NOT NULL FOREIGN KEY REFERENCES users(usid),
    txref       VARCHAR(60) NOT NULL UNIQUE,        -- reference sent to Flutterwave
    phone       VARCHAR(30) NULL,
    total       DECIMAL(12,0) NOT NULL,
    currency    CHAR(3) NOT NULL DEFAULT 'UGX',
    status      VARCHAR(15) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','failed','paid','processing','shipped','delivered','cancelled')),
    gatewayid   VARCHAR(60) NULL,                   -- Flutterwave transaction id
    createdat   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    paidat      DATETIME2 NULL
);

CREATE TABLE order_items(
    oiid   INT IDENTITY(1,1) PRIMARY KEY,
    oid    INT NOT NULL FOREIGN KEY REFERENCES orders(oid) ON DELETE CASCADE,
    hid    INT NULL FOREIGN KEY REFERENCES houses(hid) ON DELETE SET NULL,
    name   VARCHAR(250) NOT NULL,                   -- copy of the name at purchase time
    price  DECIMAL(12,0) NOT NULL,                  -- copy of the price at purchase time
    qty    INT NOT NULL CHECK (qty > 0)
);

CREATE TABLE order_history(
    ohid    INT IDENTITY(1,1) PRIMARY KEY,
    oid     INT NOT NULL FOREIGN KEY REFERENCES orders(oid) ON DELETE CASCADE,
    status  VARCHAR(15) NOT NULL,
    at      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
