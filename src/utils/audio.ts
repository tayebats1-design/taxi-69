/**
 * Audio synthesis helper using Web Audio API for taxi alert sounds
 */
class SoundPlayer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Driver incoming ride request alert (urgent double beep)
   */
  playDriverAlert() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.22, 0.44].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx % 2 === 0 ? 880 : 1046.5, now + offset); // A5 / C6

        gain.gain.setValueAtTime(0.3, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.16);
      });
    } catch {
      // Audio playback fails gracefully if browser policy blocks
    }
  }

  /**
   * Driver arrival chime for customer
   */
  playArrivalChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.25, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.45);
      });
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Trip complete celebration chime (triumphant rising chord)
   */
  playSuccessSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.25, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.85);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Trip start sound (dynamic rising engine pitch + cheerful double chime)
   */
  playTripStartSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Rising engine-like hum sweep
      const oscSweep = ctx.createOscillator();
      const gainSweep = ctx.createGain();
      oscSweep.type = 'sawtooth';
      oscSweep.frequency.setValueAtTime(220, now);
      oscSweep.frequency.exponentialRampToValueAtTime(587.33, now + 0.28); // A3 to D5
      gainSweep.gain.setValueAtTime(0.12, now);
      gainSweep.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      oscSweep.connect(gainSweep);
      gainSweep.connect(ctx.destination);
      oscSweep.start(now);
      oscSweep.stop(now + 0.33);

      // Cheerful dual confirmation tone
      [440, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.18 + idx * 0.14);
        gain.gain.setValueAtTime(0.22, now + 0.18 + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18 + idx * 0.14 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.18 + idx * 0.14);
        osc.stop(now + 0.18 + idx * 0.14 + 0.36);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Driver arrived sound (distinct luxury hotel / taxi bell chime: 2-tone doorbell ding-dong)
   */
  playDriverArrivedSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Ding (High)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.65);

      // Dong (Harmonic lower chime)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.32); // E5
      gain2.gain.setValueAtTime(0.28, now + 0.32);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.32);
      osc2.stop(now + 1.15);
    } catch {
      // Ignore
    }
  }

  /**
   * Trip cancellation sound (gentle descending tone)
   */
  playRideCancelledSound() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [659.25, 493.88, 369.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.18, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.3);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Subtle radar scan pulse
   */
  playRadarPing() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore
    }
  }

  private lastAlertedRideId: string | null = null;
  private lastAcceptedAlertRideId: string | null = null;
  private lastDriverProximityAlertRideId: string | null = null;
  private lastCustomerProximityAlertRideId: string | null = null;
  private lastTripStartedAlertRideId: string | null = null;
  private lastTripArrivedAlertRideId: string | null = null;
  private lastTripCompletedAlertRideId: string | null = null;

  /**
   * Speak arbitrary Arabic text using browser's Speech Synthesis
   */
  speakArabic(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser environment');
      return;
    }

    try {
      // Cancel previous speech if ongoing
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA'; // Standard Arabic
      utterance.rate = 0.93; // Clear cadence for noisy in-car environment
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        return (
          voices.find(v => v.lang === 'ar-SA') ||
          voices.find(v => v.lang.startsWith('ar')) ||
          voices.find(v => v.name.toLowerCase().includes('arabic') || v.name.includes('عربي'))
        );
      };

      const arVoice = pickVoice();
      if (arVoice) {
        utterance.voice = arVoice;
      } else if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          const v = pickVoice();
          if (v) utterance.voice = v;
        };
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis speak failed:', err);
    }
  }

  /**
   * Customer ride accepted voice alert:
   * "لقد تم قبول طلبك من طرف [اسم السائق]، سيارة [اسم السيارة] لونها [لون السيارة]"
   */
  speakRideAcceptedCustomerAlert(
    rideId: string | undefined,
    driverName: string,
    carModel: string,
    carColor: string,
    force = false
  ) {
    if (!force && rideId && this.lastAcceptedAlertRideId === rideId) {
      return; // Prevent duplicate voice alerts for the same accepted ride
    }

    if (rideId) {
      this.lastAcceptedAlertRideId = rideId;
    }

    // 1. Play joyful arrival/acceptance chime sound
    this.playArrivalChime();

    // 2. Clean parenthesized French/English text if present so Arabic voice sounds smooth and authentic
    const cleanDriver = driverName?.trim() || 'سائق التاكسي';
    const cleanCar = carModel?.replace(/\s*\([^)]*\)/g, '').trim() || 'سيارة التاكسي';
    const cleanColor = carColor?.replace(/\s*\([^)]*\)/g, '').trim() || '';

    // Exactly as requested: "لقد تم قبول طلبك من طرف ويذكر له اسم السائق واسم السيارة ولونها"
    let announcement = `لقد تم قبول طلبك من طرف ${cleanDriver}، سيارة ${cleanCar}`;
    if (cleanColor) {
      announcement += `، لونها ${cleanColor}`;
    }

    // 3. Small delay (450ms) so chime finishes nicely before speech begins
    setTimeout(() => {
      this.speakArabic(announcement);
    }, 450);
  }

  /**
   * Test customer voice alert to verify audio output
   */
  testCustomerVoiceAlert(driverName = 'عمي لخضر بوعمامة', carModel = 'رونو سيمبول', carColor = 'أبيض ناصع') {
    this.speakRideAcceptedCustomerAlert(undefined, driverName, carModel, carColor, true);
  }

  /**
   * Driver proximity alert when approaching customer via GPS:
   * Alert says to the driver: "لقد اقتربت من الزبون"
   */
  speakDriverProximityAlert(rideId?: string, force = false) {
    if (!force && rideId && this.lastDriverProximityAlertRideId === rideId) {
      return; // Prevent repeating alert for the same ride approach
    }
    if (rideId) {
      this.lastDriverProximityAlertRideId = rideId;
    }

    // 1. Play alert chime
    this.playArrivalChime();

    // 2. Speak the exact requested message: "لقد اقتربت من الزبون"
    setTimeout(() => {
      this.speakArabic('لقد اقتربت من الزبون');
    }, 450);
  }

  /**
   * Customer proximity alert when driver approaches customer via GPS:
   * Alert says to the customer: "سيارة الأجرة اقتربت"
   */
  speakCustomerProximityAlert(rideId?: string, force = false) {
    if (!force && rideId && this.lastCustomerProximityAlertRideId === rideId) {
      return; // Prevent repeating alert for the same ride approach
    }
    if (rideId) {
      this.lastCustomerProximityAlertRideId = rideId;
    }

    // 1. Play alert chime
    this.playArrivalChime();

    // 2. Speak the exact requested message: "سيارة الأجرة اقتربت"
    setTimeout(() => {
      this.speakArabic('سيارة الأجرة اقتربت');
    }, 450);
  }

  /**
   * Test driver proximity voice alert
   */
  testDriverProximityAlert() {
    this.speakDriverProximityAlert(undefined, true);
  }

  /**
   * Test customer proximity voice alert
   */
  testCustomerProximityAlert() {
    this.speakCustomerProximityAlert(undefined, true);
  }

  /**
   * Reset proximity alerts for a new ride
   */
  resetProximityAlert(rideId?: string) {
    if (!rideId || this.lastDriverProximityAlertRideId === rideId) {
      this.lastDriverProximityAlertRideId = null;
    }
    if (!rideId || this.lastCustomerProximityAlertRideId === rideId) {
      this.lastCustomerProximityAlertRideId = null;
    }
  }

  /**
   * Driver incoming ride alert:
   * 1. Plays audible taxi alert beeps
   * 2. Synthesizes clear Arabic speech: "هناك طلب جديد! موقع الزبون: [اسم الحي]"
   */
  speakRideRequestAlert(rideId: string | undefined, pickupDistrictName: string, dropoffDistrictName?: string, force = false) {
    if (!force && rideId && this.lastAlertedRideId === rideId) {
      return; // Prevent duplicate voice alerts for the same incoming ride
    }

    if (rideId) {
      this.lastAlertedRideId = rideId;
    }

    // 1. Play alert beeps immediately
    this.playDriverAlert();

    // 2. Format Arabic announcement text
    const cleanPickup = pickupDistrictName?.trim() || 'الأبيض سيدي الشيخ';
    let announcement = `هناك طلب جديد! موقع الزبون: ${cleanPickup}`;
    if (dropoffDistrictName && dropoffDistrictName.trim()) {
      announcement += `. والوجهة: إلى ${dropoffDistrictName.trim()}`;
    }

    // 3. Small timeout (450ms) so beep sounds finish before speech begins
    setTimeout(() => {
      this.speakArabic(announcement);
    }, 450);
  }

  /**
   * Test driver voice alert to verify audio output
   */
  testDriverVoiceAlert() {
    this.speakRideRequestAlert(
      undefined,
      'حي الزاوية الشيخية',
      'مستشفى الأبيض سيدي الشيخ',
      true
    );
  }

  /**
   * Driver arrived voice & chime alert:
   * Distinct chime followed by voice announcement for customer and/or driver
   */
  speakDriverArrivedAlert(rideId?: string, isDriver = false, force = false) {
    if (!force && rideId && this.lastTripArrivedAlertRideId === rideId) {
      return;
    }
    if (rideId) {
      this.lastTripArrivedAlertRideId = rideId;
    }

    this.playDriverArrivedSound();

    setTimeout(() => {
      if (isDriver) {
        this.speakArabic('لقد وصلت إلى موقع الزبون بالأبيض سيدي الشيخ، يرجى انتظار الركوب');
      } else {
        this.speakArabic('وصلت سيارة الأجرة إلى موقعك الآن، يرجى الخروج للركوب');
      }
    }, 450);
  }

  /**
   * Trip started voice & chime alert:
   * Dynamic ascending chime followed by safety and departure wishing
   */
  speakTripStartedAlert(rideId?: string, isDriver = false, force = false) {
    if (!force && rideId && this.lastTripStartedAlertRideId === rideId) {
      return;
    }
    if (rideId) {
      this.lastTripStartedAlertRideId = rideId;
    }

    this.playTripStartSound();

    setTimeout(() => {
      if (isDriver) {
        this.speakArabic('انطلقت الرحلة نحو الوجهة، نتمنى لكم سياقة آمنة وموفقة');
      } else {
        this.speakArabic('انطلقت الرحلة، نتمنى لكم تنقلاً مريحاً وآمناً في الأبيض سيدي الشيخ');
      }
    }, 400);
  }

  /**
   * Ride completed voice & celebration chime alert
   */
  speakRideCompletedAlert(rideId?: string, fare = 250, isDriver = false, force = false) {
    if (!force && rideId && this.lastTripCompletedAlertRideId === rideId) {
      return;
    }
    if (rideId) {
      this.lastTripCompletedAlertRideId = rideId;
    }

    this.playSuccessSound();

    setTimeout(() => {
      if (isDriver) {
        this.speakArabic(`تم إنهاء الرحلة بنجاح! استلم ${fare} دينار جزائري من الزبون`);
      } else {
        this.speakArabic(`الحمد لله على سلامتكم، تم الوصول بنجاح. الأجرة: ${fare} دينار جزائري`);
      }
    }, 550);
  }

  /**
   * Ride cancelled alert
   */
  speakRideCancelledAlert() {
    this.playRideCancelledSound();
    setTimeout(() => {
      this.speakArabic('تم إلغاء الرحلة');
    }, 400);
  }
}

export const sounds = new SoundPlayer();
