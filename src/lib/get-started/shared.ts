export const GET_STARTED_OPEN_EVENT = "dcc:get-started:open";

export type GetStartedMode = "OWNER_SETUP" | "EMPLOYEE_JOIN";

export type GetStartedSnapshot = {
  mode: GetStartedMode;
  organizationsCount: number;
  teamsCount: number;
  hasAdditionalMember: boolean;
  hasPendingInvite: boolean;
  hasSimulatorTelemetry: boolean;
  hasIncident: boolean;
  hasRunbook: boolean;
  employeeAccessRequestLink: string | null;
};
