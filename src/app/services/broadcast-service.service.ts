// src/app/services/broadcast-service.service.ts
import { Injectable } from '@angular/core';

export interface BroadcastMessage {
  type: 'PDF_NAVIGATE' | 'EXCEL_ROW_SELECTED' | 'WINDOW_SPLIT' | 'WINDOW_CLOSING' | 'WINDOWS_COMBINED' | 'PING' | 'PONG';
  page?: number;
  selectedData?: any;
  mode?: string;
  pdfWindow?: boolean;
  excelWindow?: boolean;
  timestamp?: number;
  windowId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BroadcastService {
  private channel = new BroadcastChannel('pdf-excel-sync');
  private windowId: string;

  constructor() {
    // Generate unique window ID
    this.windowId = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Listen for page visibility changes to handle window focus
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Window became visible, send ping to announce presence
        this.sendMessage({
          type: 'PING',
          windowId: this.windowId,
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Send a message to all other windows/tabs
   */
  sendMessage(message: BroadcastMessage): void {
    const enhancedMessage: BroadcastMessage = {
      ...message,
      windowId: this.windowId,
      timestamp: message.timestamp || Date.now()
    };

    console.log('📡 Broadcasting message:', enhancedMessage);
    this.channel.postMessage(enhancedMessage);
  }

  /**
   * Listen for messages from other windows/tabs
   */
  onMessage(callback: (msg: BroadcastMessage) => void): void {
    this.channel.onmessage = (event) => {
      const message = event.data as BroadcastMessage;

      // Ignore messages from this same window
      if (message.windowId === this.windowId) {
        return;
      }

      console.log('📨 Received message:', message);
      callback(message);
    };
  }

  /**
   * Ping other windows to check if they're alive
   */
  pingOtherWindows(): Promise<BroadcastMessage[]> {
    return new Promise((resolve) => {
      const responses: BroadcastMessage[] = [];
      const timeout = 1000; // 1 second timeout

      // Listen for PONG responses
      const tempHandler = (event: MessageEvent) => {
        const message = event.data as BroadcastMessage;
        if (message.type === 'PONG' && message.windowId !== this.windowId) {
          responses.push(message);
        }
      };

      this.channel.addEventListener('message', tempHandler);

      // Send PING
      this.sendMessage({ type: 'PING' });

      // Wait for responses
      setTimeout(() => {
        this.channel.removeEventListener('message', tempHandler);
        resolve(responses);
      }, timeout);
    });
  }

  /**
   * Get unique window ID
   */
  getWindowId(): string {
    return this.windowId;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.channel.close();
  }
}