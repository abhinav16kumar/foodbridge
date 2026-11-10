IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        UserId INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_Users PRIMARY KEY,

        FullName NVARCHAR(100) NOT NULL,

        Email NVARCHAR(254) NOT NULL
            CONSTRAINT UQ_Users_Email UNIQUE,

        PasswordHash NVARCHAR(255) NOT NULL,

        Role VARCHAR(20) NOT NULL,

        Phone NVARCHAR(20) NULL,

        IsActive BIT NOT NULL
            CONSTRAINT DF_Users_IsActive DEFAULT (1),

        IsVerified BIT NOT NULL
            CONSTRAINT DF_Users_IsVerified DEFAULT (0),

        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_Users_CreatedAt
            DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT CK_Users_Role
            CHECK (Role IN ('donor', 'ngo', 'volunteer', 'admin'))
    );
END;

SELECT
    UserId,
    FullName,
    Email,
    Role,
    Phone,
    IsActive,
    IsVerified,
    CreatedAt
FROM dbo.Users;

IF OBJECT_ID(N'dbo.FoodListings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.FoodListings (
        ListingId INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_FoodListings PRIMARY KEY,

        DonorUserId INT NOT NULL,

        Title NVARCHAR(150) NOT NULL,

        Description NVARCHAR(1000) NULL,

        FoodType VARCHAR(30) NOT NULL,

        Quantity DECIMAL(10,2) NOT NULL,

        Unit VARCHAR(20) NOT NULL,

        PickupAddress NVARCHAR(500) NOT NULL,

        City NVARCHAR(100) NOT NULL,

        PreparedAt DATETIME2(0) NULL,

        ExpiresAt DATETIME2(0) NOT NULL,

        StorageConditions NVARCHAR(500) NOT NULL,

        AllergenInfo NVARCHAR(500) NULL,

        Status VARCHAR(20) NOT NULL
            CONSTRAINT DF_FoodListings_Status
            DEFAULT ('available'),

        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_FoodListings_CreatedAt
            DEFAULT (SYSUTCDATETIME()),

        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_FoodListings_UpdatedAt
            DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT FK_FoodListings_Users
            FOREIGN KEY (DonorUserId)
            REFERENCES dbo.Users(UserId),

        CONSTRAINT CK_FoodListings_Quantity
            CHECK (Quantity > 0),

        CONSTRAINT CK_FoodListings_FoodType
            CHECK (
                FoodType IN (
                    'cooked',
                    'produce',
                    'bakery',
                    'packaged',
                    'other'
                )
            ),

        CONSTRAINT CK_FoodListings_Unit
            CHECK (
                Unit IN (
                    'kg',
                    'litres',
                    'portions',
                    'items'
                )
            ),

        CONSTRAINT CK_FoodListings_Status
            CHECK (
                Status IN (
                    'available',
                    'reserved',
                    'completed',
                    'cancelled',
                    'expired'
                )
            ),

        CONSTRAINT CK_FoodListings_TimeOrder
            CHECK (
                PreparedAt IS NULL
                OR ExpiresAt > PreparedAt
            )
    );
END;
SELECT TOP (10)
    ListingId,
    DonorUserId,
    Title,
    FoodType,
    Quantity,
    Unit,
    City,
    ExpiresAt,
    Status
FROM dbo.FoodListings;

IF OBJECT_ID(N'dbo.DonationRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DonationRequests (
        RequestId INT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_DonationRequests PRIMARY KEY,

        ListingId INT NOT NULL,

        NgoUserId INT NOT NULL,

        Message NVARCHAR(1000) NULL,

        Status VARCHAR(20) NOT NULL
            CONSTRAINT DF_DonationRequests_Status
            DEFAULT ('pending'),

        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_DonationRequests_CreatedAt
            DEFAULT (SYSUTCDATETIME()),

        UpdatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_DonationRequests_UpdatedAt
            DEFAULT (SYSUTCDATETIME()),

        CONSTRAINT FK_DonationRequests_FoodListings
            FOREIGN KEY (ListingId)
            REFERENCES dbo.FoodListings(ListingId),

        CONSTRAINT FK_DonationRequests_Users
            FOREIGN KEY (NgoUserId)
            REFERENCES dbo.Users(UserId),

        CONSTRAINT UQ_DonationRequests_Listing_Ngo
            UNIQUE (ListingId, NgoUserId),

        CONSTRAINT CK_DonationRequests_Status
            CHECK (
                Status IN (
                    'pending',
                    'accepted',
                    'rejected',
                    'cancelled'
                )
            )
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.DonationRequests')
      AND name = N'UX_DonationRequests_OneAcceptedPerListing'
)
BEGIN
    CREATE UNIQUE INDEX UX_DonationRequests_OneAcceptedPerListing
        ON dbo.DonationRequests (ListingId)
        WHERE Status = 'accepted';
END;

SELECT
    RequestId,
    ListingId,
    NgoUserId,
    Message,
    Status,
    CreatedAt,
    UpdatedAt
FROM dbo.DonationRequests;