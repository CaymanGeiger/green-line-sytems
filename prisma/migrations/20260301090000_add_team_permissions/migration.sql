-- CreateTable
CREATE TABLE "TeamPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamPermission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamPermission_teamId_userId_resource_action_key" ON "TeamPermission"("teamId", "userId", "resource", "action");

-- CreateIndex
CREATE INDEX "TeamPermission_teamId_userId_idx" ON "TeamPermission"("teamId", "userId");

-- CreateIndex
CREATE INDEX "TeamPermission_userId_resource_action_idx" ON "TeamPermission"("userId", "resource", "action");
