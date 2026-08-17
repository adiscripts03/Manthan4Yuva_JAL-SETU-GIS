import { reportsData, civicLedgerData, rainfallData, mappingData, telemetryData, networkAssetsData, topographyData } from '../data/mockData';

// Simulated delay to mimic network request
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const apiService = {
  getReportByWard: async (ward: string) => {
    await delay(800);
    return reportsData.find(r => r.ward.includes(ward)) || reportsData[0];
  },
  getCivicLedgerEntry: async (id: string) => {
    await delay(600);
    return civicLedgerData.find(c => c.id === id) || civicLedgerData[0];
  },
  getRainfallData: async () => {
    await delay(500);
    return rainfallData;
  },
  getTelemetryData: async () => {
    await delay(600);
    return telemetryData;
  },
  getWards: async () => {
    await delay(300);
    return mappingData.wards;
  },
  getNetworkAsset: async (id: string) => {
    await delay(400);
    return networkAssetsData.find(n => n.assetId === id) || networkAssetsData[0];
  },
  getTopographyData: async (area: string) => {
    await delay(700);
    return topographyData.find(t => t.area.includes(area)) || topographyData[0];
  }
};
