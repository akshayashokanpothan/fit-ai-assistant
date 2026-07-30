declare module "razorpay" {
  export interface SubscriptionParams {
    plan_id: string;
    customer_notify: number;
    total_count: number;
    notes?: Record<string, string>;
  }

  export interface Subscription {
    id: string;
    entity: string;
    plan_id: string;
    status: string;
    notes: Record<string, string>;
  }

  export default class Razorpay {
    constructor(options: { key_id: string; key_secret: string });

    subscriptions: {
      create(params: SubscriptionParams): Promise<Subscription>;
    };

    static validateWebhookSignature(
      body: string,
      signature: string,
      secret: string
    ): boolean;
  }
}
