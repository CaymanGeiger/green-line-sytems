-- CreateTable
CREATE TABLE "UiPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "preferenceKey" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UiPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UiPreference_userId_idx" ON "UiPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UiPreference_userId_preferenceKey_key" ON "UiPreference"("userId", "preferenceKey");
