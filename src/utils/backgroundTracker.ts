/**
 * Background Tracker & Screen Wake Lock Utility
 * Keeps the screen awake during trips and keeps GPS location fresh
 * even when the driver or customer switches tabs or locks the screen.
 */

class BackgroundTracker {
  private wakeLockSentinel: any = null;
  private isWakeLockRequested = false;
  private heartbeatInterval: any = null;
  private callbacks: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Re-acquire wake lock automatically when tab becomes visible again
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isWakeLockRequested) {
          this.acquireWakeLock();
        }
        // Trigger all background listeners to wake up immediately
        this.notifyCallbacks();
      });

      // Handle pageshow/pagehide (mobile Safari and Chrome)
      window.addEventListener('pageshow', () => {
        if (this.isWakeLockRequested) {
          this.acquireWakeLock();
        }
        this.notifyCallbacks();
      });
    }
  }

  /**
   * Request Screen Wake Lock so driver screen does not sleep while navigating
   */
  async enableWakeLock(): Promise<boolean> {
    this.isWakeLockRequested = true;
    return this.acquireWakeLock();
  }

  private async acquireWakeLock(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      if (this.wakeLockSentinel && !this.wakeLockSentinel.released) {
        return true;
      }
      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      this.wakeLockSentinel.addEventListener('release', () => {
        // Sentinel was released
        this.wakeLockSentinel = null;
      });
      return true;
    } catch (err) {
      console.warn('Wake Lock request could not be granted:', err);
      return false;
    }
  }

  /**
   * Release Screen Wake Lock when trip completes or driver goes offline
   */
  async disableWakeLock(): Promise<void> {
    this.isWakeLockRequested = false;
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch {
        // Ignore
      }
      this.wakeLockSentinel = null;
    }
  }

  /**
   * Register a callback to execute whenever the app returns from background or periodic tick
   */
  registerKeepAliveListener(cb: () => void): () => void {
    this.callbacks.add(cb);
    if (!this.heartbeatInterval && typeof window !== 'undefined') {
      // Periodic heartbeat to prevent browser background throttling
      this.heartbeatInterval = setInterval(() => {
        this.notifyCallbacks();
      }, 8000);
    }

    return () => {
      this.callbacks.delete(cb);
      if (this.callbacks.size === 0 && this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    };
  }

  private notifyCallbacks() {
    this.callbacks.forEach((cb) => {
      try {
        cb();
      } catch {
        // Ignore individual callback error
      }
    });
  }

  isWakeLockActive(): boolean {
    return !!(this.wakeLockSentinel && !this.wakeLockSentinel.released);
  }
}

export const backgroundTracker = new BackgroundTracker();
