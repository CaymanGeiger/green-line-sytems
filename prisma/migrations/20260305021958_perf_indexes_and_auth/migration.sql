-- CreateIndex
CREATE INDEX "ActionItem_postmortemId_idx" ON "ActionItem"("postmortemId");

-- CreateIndex
CREATE INDEX "DeployEvent_serviceId_simulated_createdAt_idx" ON "DeployEvent"("serviceId", "simulated", "createdAt");

-- CreateIndex
CREATE INDEX "DeployEvent_environmentId_simulated_createdAt_idx" ON "DeployEvent"("environmentId", "simulated", "createdAt");

-- CreateIndex
CREATE INDEX "DeployEvent_simulated_createdAt_idx" ON "DeployEvent"("simulated", "createdAt");

-- CreateIndex
CREATE INDEX "Incident_teamId_simulated_startedAt_idx" ON "Incident"("teamId", "simulated", "startedAt");

-- CreateIndex
CREATE INDEX "Incident_teamId_simulated_status_startedAt_idx" ON "Incident"("teamId", "simulated", "status", "startedAt");

-- CreateIndex
CREATE INDEX "Incident_teamId_simulated_severity_startedAt_idx" ON "Incident"("teamId", "simulated", "severity", "startedAt");

-- CreateIndex
CREATE INDEX "SavedView_userId_scope_updatedAt_idx" ON "SavedView"("userId", "scope", "updatedAt");
