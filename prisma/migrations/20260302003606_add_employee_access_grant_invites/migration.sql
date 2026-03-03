-- CreateTable
CREATE TABLE "EmployeeAccessGrantInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "assignmentsJson" JSONB NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeAccessGrantInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAccessGrantInvite_tokenHash_key" ON "EmployeeAccessGrantInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "EmployeeAccessGrantInvite_email_expiresAt_idx" ON "EmployeeAccessGrantInvite"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "EmployeeAccessGrantInvite_invitedByUserId_consumedAt_idx" ON "EmployeeAccessGrantInvite"("invitedByUserId", "consumedAt");
