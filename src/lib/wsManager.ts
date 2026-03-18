// import { WS_BASE } from './config';


export type WSState = 'IDLE' | 'CONNECTING' | 'OPEN' | 'CLOSED';
export type WSEventType = 'message' | 'open' | 'close' | 'error' | 'statusChange' | 'sync';

export interface WSData {
    purpose?: string;
    type?: string;
    serverTime?: number;
    t1?: number;
    [key: string]: unknown;
}

export interface WSMessage extends WSData {
    message?: string;
    message_text?: string;
    sender?: string;
    session_id?: string;
    is_typing?: boolean;
}

export interface WSEvent {
    type: string;
    data?: WSData;
}

type EventCallback = (data: WSMessage) => void;

class WSManager {
    private static instance: WSManager;
    private sockets: Map<string, WebSocket> = new Map();
    private states: Map<string, WSState> = new Map();
    private urls: Map<string, string> = new Map();
    private listeners: Record<string, Set<EventCallback>> = {};
    private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
    private isConnecting: Map<string, boolean> = new Map();

    private constructor() {
        console.log('[WSManager] Initialized Singleton');
    }

    public static getInstance(): WSManager {
        if (!WSManager.instance) {
            WSManager.instance = new WSManager();
        }
        return WSManager.instance;
    }

    private setState(purpose: string, newState: WSState) {
        if (this.states.get(purpose) !== newState) {
            console.log(`[WSManager][${purpose}] STATE: ${this.states.get(purpose) || 'IDLE'} -> ${newState}`);
            this.states.set(purpose, newState);
            this.emit('statusChange', { purpose, state: newState });
        }
    }

    public connect(url: string, purpose = 'default') {
        const existingUrl = this.urls.get(purpose);
        const existingState = this.states.get(purpose);
        const isCurrentlyConnecting = this.isConnecting.get(purpose);

        if (existingUrl === url && (existingState === 'OPEN' || existingState === 'CONNECTING' || isCurrentlyConnecting)) {
            return;
        }

        console.log(`[WSManager][${purpose}] CONNECT CALLED: ${url}`);
        console.trace(`[WSManager][${purpose}] CONNECT STACK TRACE:`);

        if (existingUrl !== url && this.sockets.has(purpose)) {
            console.log(`[WSManager][${purpose}] Switching context: ${existingUrl} -> ${url}`);
            this.disconnect(purpose, false);
        }

        this.urls.set(purpose, url);
        this.isConnecting.set(purpose, true);
        this._establishConnection(purpose);
    }

    private _establishConnection(purpose: string) {
        const url = this.urls.get(purpose);
        if (!url) {
            this.isConnecting.set(purpose, false);
            return;
        }

        let socket = this.sockets.get(purpose);
        if (socket) {
            socket.close();
            this.sockets.delete(purpose);
        }

        this.setState(purpose, 'CONNECTING');

        try {
            socket = new WebSocket(url);
            this.sockets.set(purpose, socket);
        } catch (error) {
            console.error(`[WSManager][${purpose}] Failed to create WebSocket:`, error);
            this.isConnecting.set(purpose, false);
            this.setState(purpose, 'CLOSED');
            return;
        }

        socket.onopen = () => {
            this.isConnecting.set(purpose, false);
            this.setState(purpose, 'OPEN');
            this.emit('open', { purpose });
            this._startHeartbeat(purpose);
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'pong') {
                    const t1 = Date.now();
                    if (data.server_time_utc) {
                        const serverTime = new Date(data.server_time_utc).getTime();
                        // Minimal sync logic here if needed, or emit for components
                        this.emit('sync', { purpose, serverTime, t1 });
                    }
                    return;
                }
                this.emit('message', { purpose, ...data });
            } catch {
                this.emit('message', { purpose, raw: event.data });
            }
        };

        socket.onclose = (event) => {
            this.isConnecting.set(purpose, false);
            this.setState(purpose, 'CLOSED');
            this.emit('close', { purpose, event });
            this._stopHeartbeat(purpose);
        };

        socket.onerror = (error) => {
            this.isConnecting.set(purpose, false);
            this.emit('error', { purpose, error });
        };
    }

    private _startHeartbeat(purpose: string) {
        this._stopHeartbeat(purpose);
        const timer = setInterval(() => {
            if (this.states.get(purpose) === 'OPEN') {
                this.send({ type: 'ping' }, purpose);
            }
        }, 30000);
        this.heartbeatTimers.set(purpose, timer);
    }

    private _stopHeartbeat(purpose: string) {
        const timer = this.heartbeatTimers.get(purpose);
        if (timer) {
            clearInterval(timer);
            this.heartbeatTimers.delete(purpose);
        }
    }

    public disconnect(purpose = 'default', intentional = true) {
        console.log(`[WSManager][${purpose}] DISCONNECT CALLED (intentional: ${intentional})`);
        console.trace(`[WSManager][${purpose}] DISCONNECT STACK TRACE:`);

        this.isConnecting.set(purpose, false);
        this._stopHeartbeat(purpose);
        const socket = this.sockets.get(purpose);
        if (socket) {
            socket.onopen = null;
            socket.onmessage = null;
            socket.onerror = null;
            socket.onclose = null;
            socket.close();
            this.sockets.delete(purpose);
        }
        if (intentional) {
            this.urls.delete(purpose);
            this.setState(purpose, 'IDLE');
        } else {
            this.setState(purpose, 'CLOSED');
        }
    }

    public send(data: string | Record<string, unknown>, purpose = 'default') {
        const socket = this.sockets.get(purpose);
        if (socket?.readyState === WebSocket.OPEN) {
            const payload = typeof data === 'string' ? data : JSON.stringify(data);
            socket.send(payload);
        }
    }

    public subscribe(event: WSEventType, callback: EventCallback) {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set();
        }
        this.listeners[event].add(callback);

        return () => {
            this.listeners[event]?.delete(callback);
        };
    }

    private emit(event: WSEventType, data: WSMessage) {
        this.listeners[event]?.forEach(callback => callback(data));
    }

    public getStatus(purpose = 'default'): WSState {
        return this.states.get(purpose) || 'IDLE';
    }

    public getUrl(purpose = 'default'): string | null {
        return this.urls.get(purpose) || null;
    }

    public isCurrentlyConnecting(purpose = 'default'): boolean {
        return this.isConnecting.get(purpose) || false;
    }
}

export const wsManager = WSManager.getInstance();



