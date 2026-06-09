import { EventEmitter } from "node:events";

export type RealtimeEvent =
    | {
        kind: "order.created";
        orderId: string;
        tableId: string | null;
        serviceType: "DELIVERY" | "LOCAL";
    }
    | {
        kind: "order.updated";
        orderId: string;
        tableId: string | null;
        serviceType: "DELIVERY" | "LOCAL";
    }
    | {
        kind: "table.updated";
        tableId: string;
    }
    | {
        kind: "table.deleted";
        tableId: string;
    }
    | {
        kind: "bill.closed";
        tableId: string;
        billId: string;
    };

class OrgEventBus {
    private readonly emitter = new EventEmitter();

    constructor() {
        this.emitter.setMaxListeners(0);
    }

    emit(organizationId: string, event: RealtimeEvent): void {
        this.emitter.emit(organizationId, event);
    }

    subscribe(
        organizationId: string,
        listener: (event: RealtimeEvent) => void,
    ): () => void {
        this.emitter.on(organizationId, listener);
        return () => {
            this.emitter.off(organizationId, listener);
        };
    }
}

export const orgEventBus = new OrgEventBus();
