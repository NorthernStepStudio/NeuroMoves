export type ContractorTradeProfile = "hvac" | "plumbing" | "electrical" | "renovation";

export interface CpeStructuredIntake {
  tradeProfile: ContractorTradeProfile;
  projectInfo: {
    jobType: string;
    squareFootage: number;
    units: number;
  };
  materialsEquipment: string;
  laborScope: string;
  allowances: string;
  timelineNotes: string;
  specialNotes: string;
}
