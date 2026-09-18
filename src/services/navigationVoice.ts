import { sounds } from '../utils/audio';

export type TurnType =
  | 'straight'
  | 'slight_right'
  | 'right'
  | 'sharp_right'
  | 'slight_left'
  | 'left'
  | 'sharp_left'
  | 'uturn'
  | 'arrived';

export interface NavigationStep {
  turnType: TurnType;
  instructionAr: string;
  distanceMeters: number;
  etaMinutes: number;
  relativeTurnDeg: number;
  targetBearingDeg: number;
  currentHeadingDeg: number;
  targetName: string;
}

/**
 * Calculates bearing from point A to point B in degrees (0 - 360°)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;
  return Math.round(bearing);
}

/**
 * Difference between driver heading and target bearing (-180° to +180°)
 */
export function calculateRelativeTurn(
  driverHeading: number,
  targetBearing: number
): number {
  let diff = targetBearing - driverHeading;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return Math.round(diff);
}

/**
 * Generates turn type and clear Arabic spoken instruction
 */
export function evaluateNavigationStep(
  driverLat: number,
  driverLng: number,
  targetLat: number,
  targetLng: number,
  targetName: string,
  driverHeading: number = 0,
  speedKmH: number = 0
): NavigationStep {
  // 1. Calculate direct distance in meters
  const R = 6371000;
  const φ1 = (driverLat * Math.PI) / 180;
  const φ2 = (targetLat * Math.PI) / 180;
  const Δφ = ((targetLat - driverLat) * Math.PI) / 180;
  const Δλ = ((targetLng - driverLng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = Math.round(R * c);

  // 2. ETA in minutes (assuming city speed ~ 30 km/h)
  const currentSpeed = speedKmH > 5 ? speedKmH : 30;
  const etaMinutes = Math.max(1, Math.round((distanceMeters / 1000 / currentSpeed) * 60));

  // 3. Bearing & Relative Turn
  const targetBearing = calculateBearing(driverLat, driverLng, targetLat, targetLng);
  const relativeTurn = calculateRelativeTurn(driverHeading, targetBearing);

  let turnType: TurnType = 'straight';
  let instructionAr = '';

  const cleanTarget = targetName || 'موقع الزبون';

  if (distanceMeters <= 35) {
    turnType = 'arrived';
    instructionAr = `لقد وصلت إلى موقع الزبون في ${cleanTarget}! الزبون بانتظارك.`;
  } else if (distanceMeters <= 100) {
    turnType = 'arrived';
    instructionAr = `اقتربت جداً من موقع الزبون (${distanceMeters} متر). خفف السرعة وابحث عن الزبون.`;
  } else if (relativeTurn >= -25 && relativeTurn <= 25) {
    turnType = 'straight';
    instructionAr = `واصل السير للأمام مباشرة نحو ${cleanTarget} لمسافة ${formatArabicDistance(distanceMeters)}`;
  } else if (relativeTurn > 25 && relativeTurn <= 70) {
    turnType = 'slight_right';
    instructionAr = `انعطف يميناً بشكل خفيف باتجاه ${cleanTarget}`;
  } else if (relativeTurn > 70 && relativeTurn <= 130) {
    turnType = 'right';
    instructionAr = `انعطف يميناً باتجاه ${cleanTarget}`;
  } else if (relativeTurn > 130) {
    turnType = 'uturn';
    instructionAr = `استدر للخلف (دوران كامل) نحو ${cleanTarget}`;
  } else if (relativeTurn < -25 && relativeTurn >= -70) {
    turnType = 'slight_left';
    instructionAr = `انعطف يساراً بشكل خفيف باتجاه ${cleanTarget}`;
  } else if (relativeTurn < -70 && relativeTurn >= -130) {
    turnType = 'left';
    instructionAr = `انعطف يساراً باتجاه ${cleanTarget}`;
  } else {
    turnType = 'uturn';
    instructionAr = `استدر للخلف (دوران كامل) نحو ${cleanTarget}`;
  }

  return {
    turnType,
    instructionAr,
    distanceMeters,
    etaMinutes,
    relativeTurnDeg: relativeTurn,
    targetBearingDeg: targetBearing,
    currentHeadingDeg: driverHeading,
    targetName: cleanTarget,
  };
}

function formatArabicDistance(meters: number): string {
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(1);
    return `${km} كيلومتر`;
  }
  return `${meters} متر`;
}

/**
 * Singleton Voice Guidance Engine
 */
class NavigationVoiceEngine {
  private isVoiceEnabled = true;
  private lastSpokenMilestone: number | null = null;
  private lastSpokenTime = 0;
  private lastTurnType: TurnType | null = null;

  setVoiceEnabled(enabled: boolean) {
    this.isVoiceEnabled = enabled;
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  isVoiceActive(): boolean {
    return this.isVoiceEnabled;
  }

  /**
   * Evaluates step and speaks turn-by-turn guidance without spamming
   */
  processStepAndSpeak(step: NavigationStep, forceSpeak = false) {
    if (!this.isVoiceEnabled && !forceSpeak) return;

    const now = Date.now();
    const timeSinceLastSpoken = now - this.lastSpokenTime;

    // Determine distance milestones: 1000m, 500m, 200m, 100m, 35m
    let currentMilestone: number | null = null;
    if (step.distanceMeters <= 35) currentMilestone = 35;
    else if (step.distanceMeters <= 100) currentMilestone = 100;
    else if (step.distanceMeters <= 250) currentMilestone = 250;
    else if (step.distanceMeters <= 500) currentMilestone = 500;
    else if (step.distanceMeters <= 1000) currentMilestone = 1000;

    const isNewMilestone = currentMilestone !== null && currentMilestone !== this.lastSpokenMilestone;
    const isNewTurn = step.turnType !== this.lastTurnType && step.turnType !== 'straight';
    const isArrived = step.turnType === 'arrived';

    // Speak if: forced OR arrived OR milestone crossed OR (turn changed AND at least 8s passed)
    if (forceSpeak || isArrived || isNewMilestone || (isNewTurn && timeSinceLastSpoken > 8000)) {
      this.lastSpokenTime = now;
      if (currentMilestone !== null) {
        this.lastSpokenMilestone = currentMilestone;
      }
      this.lastTurnType = step.turnType;

      // Play cue beep and speak in Arabic
      sounds.playTripStartSound();
      setTimeout(() => {
        sounds.speakArabic(step.instructionAr);
      }, 350);
    }
  }

  reset() {
    this.lastSpokenMilestone = null;
    this.lastSpokenTime = 0;
    this.lastTurnType = null;
  }
}

export const navigationVoiceEngine = new NavigationVoiceEngine();
