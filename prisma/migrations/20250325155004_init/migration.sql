-- CreateTable
CREATE TABLE "SelectedCountry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SelectedCountry_countryCode_key" ON "SelectedCountry"("countryCode");
