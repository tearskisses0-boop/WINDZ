import { ALGERIAN_WILAYAS } from './wilayas';
import { ALGERIAN_COMMUNES } from './communes';

export interface LocationValidationReport {
  wilayasTotal: number;
  expectedWilayasTotal: number;
  communesTotal: number;
  duplicateWilayaIds: number[];
  duplicateWilayaCodes: string[];
  missingWilayaNames: number[];
  duplicateCommuneIds: string[];
  orphanCommunes: string[]; // communes with wilaya_id not in wilayas
  missingPostalCodes: string[];
  wilayasWithoutCommunes: number[];
  isValid: boolean;
  generatedAt: string;
}

export function validateAlgerianLocations(): LocationValidationReport {
  const wilayaIdSet = new Set<number>();
  const wilayaCodeSet = new Set<string>();
  const duplicateWilayaIds: number[] = [];
  const duplicateWilayaCodes: string[] = [];
  const missingWilayaNames: number[] = [];

  for (const w of ALGERIAN_WILAYAS) {
    if (wilayaIdSet.has(w.id)) {
      duplicateWilayaIds.push(w.id);
    }
    wilayaIdSet.add(w.id);

    if (wilayaCodeSet.has(w.code)) {
      duplicateWilayaCodes.push(w.code);
    }
    wilayaCodeSet.add(w.code);

    if (!w.name_ar || !w.name_fr || !w.name_en) {
      missingWilayaNames.push(w.id);
    }
  }

  const communeIdSet = new Set<string>();
  const duplicateCommuneIds: string[] = [];
  const orphanCommunes: string[] = [];
  const missingPostalCodes: string[] = [];
  const wilayasWithCommunes = new Set<number>();

  for (const c of ALGERIAN_COMMUNES) {
    if (communeIdSet.has(c.id)) {
      duplicateCommuneIds.push(c.id);
    }
    communeIdSet.add(c.id);

    if (!wilayaIdSet.has(c.wilaya_id)) {
      orphanCommunes.push(c.id);
    } else {
      wilayasWithCommunes.add(c.wilaya_id);
    }

    if (!c.postal_code || c.postal_code.trim() === '') {
      missingPostalCodes.push(c.id);
    }
  }

  const wilayasWithoutCommunes: number[] = [];
  for (const w of ALGERIAN_WILAYAS) {
    if (!wilayasWithCommunes.has(w.id)) {
      wilayasWithoutCommunes.push(w.id);
    }
  }

  const isValid = 
    duplicateWilayaIds.length === 0 &&
    duplicateWilayaCodes.length === 0 &&
    missingWilayaNames.length === 0 &&
    duplicateCommuneIds.length === 0 &&
    orphanCommunes.length === 0;

  return {
    wilayasTotal: ALGERIAN_WILAYAS.length,
    expectedWilayasTotal: 69,
    communesTotal: ALGERIAN_COMMUNES.length,
    duplicateWilayaIds,
    duplicateWilayaCodes,
    missingWilayaNames,
    duplicateCommuneIds,
    orphanCommunes,
    missingPostalCodes,
    wilayasWithoutCommunes,
    isValid,
    generatedAt: new Date().toISOString(),
  };
}
