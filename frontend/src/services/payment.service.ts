import axios, { AxiosError } from 'axios';
import { API_URL } from '@/config';
import { getAuthToken } from './auth.service';
import { SubscriptionPlan, CurrentSubscription } from './subscription.service';

export interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  isDefault: boolean;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  subscriptionId: string;
  requiresAction?: boolean;
  status: string;
  paymentIntentId: string;
}

export interface SetupIntentResponse {
  clientSecret: string;
  status: string;
  setupIntentId: string;
}

export interface BillingDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface CreatePaymentMethodParams {
  paymentMethodId: string;
  billingDetails?: BillingDetails;
  makeDefault?: boolean;
}

export interface UpdatePaymentMethodParams {
  billingDetails?: BillingDetails;
  card?: {
    exp_month: number;
    exp_year: number;
  };
  default?: boolean;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  paid: boolean;
  pdfUrl?: string;
  hostedInvoiceUrl?: string;
  number: string;
  periodStart: number;
  periodEnd: number;
  subscriptionId?: string;
  subscriptionItemId?: string;
}

class PaymentService {
  private static instance: PaymentService;
  
  private constructor() {}
  
  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  private getAuthHeader() {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const message = error.response.data?.message || error.response.statusText;
        throw new Error(`Payment error: ${message}`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response received from the payment server');
      }
    }
    // Something happened in setting up the request that triggered an Error
    throw new Error(error instanceof Error ? error.message : 'An unknown payment error occurred');
  }

  public async createPaymentIntent(planId: string): Promise<PaymentIntentResponse> {
    try {
      const response = await axios.post<PaymentIntentResponse>(
        `${API_URL}/payment/create-payment-intent`,
        { planId },
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await axios.get<{ data: PaymentMethod[] }>(
        `${API_URL}/payment/payment-methods`,
        { headers: this.getAuthHeader() }
      );
      return response.data.data || [];
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    try {
      const response = await axios.post<{ data: PaymentMethod }>(
        `${API_URL}/payment/payment-methods`,
        { paymentMethodId },
        { headers: this.getAuthHeader() }
      );
      return response.data.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async createSetupIntent(): Promise<SetupIntentResponse> {
    try {
      const response = await axios.post<SetupIntentResponse>(
        `${API_URL}/payment/create-setup-intent`,
        {},
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async confirmPayment(paymentIntentId: string, paymentMethodId?: string): Promise<{ status: string; subscription?: any }> {
    try {
      const response = await axios.post(
        `${API_URL}/payment/confirm-payment`,
        { paymentIntentId, paymentMethodId },
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async retrievePaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_URL}/payment/payment-intent/${paymentIntentId}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await axios.post(
        `${API_URL}/payment/set-default-payment-method`,
        { paymentMethodId },
        { headers: this.getAuthHeader() }
      );
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async removePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await axios.delete(
        `${API_URL}/payment/payment-methods/${paymentMethodId}`,
        { headers: this.getAuthHeader() }
      );
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async getInvoices(limit: number = 10, startingAfter?: string): Promise<{ data: Invoice[]; hasMore: boolean }> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (startingAfter) params.append('starting_after', startingAfter);

      const response = await axios.get(
        `${API_URL}/payment/invoices?${params.toString()}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async getUpcomingInvoice(): Promise<Invoice | null> {
    try {
      const response = await axios.get(
        `${API_URL}/payment/upcoming-invoice`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.handleError(error);
      throw error;
    }
  }

  public async createSubscription(priceId: string, paymentMethodId?: string): Promise<{ subscriptionId: string; status: string }> {
    try {
      const response = await axios.post(
        `${API_URL}/subscriptions`,
        { priceId, paymentMethodId },
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async cancelSubscription(subscriptionId: string): Promise<{ status: string; canceledAt: string }> {
    try {
      const response = await axios.post(
        `${API_URL}/subscriptions/${subscriptionId}/cancel`,
        {},
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async updateSubscription(subscriptionId: string, updates: { priceId?: string; quantity?: number }): Promise<{ status: string }> {
    try {
      const response = await axios.put(
        `${API_URL}/subscriptions/${subscriptionId}`,
        updates,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async getSubscription(subscriptionId: string): Promise<CurrentSubscription> {
    try {
      const response = await axios.get(
        `${API_URL}/subscriptions/${subscriptionId}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      const response = await axios.get(
        `${API_URL}/subscriptions/plans`,
        { headers: this.getAuthHeader() }
      );
      return response.data.plans || [];
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async applyCoupon(code: string): Promise<{ valid: boolean; message?: string; discount?: any }> {
    try {
      const response = await axios.post(
        `${API_URL}/payment/apply-coupon`,
        { code },
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    try {
      const response = await axios.get(
        `${API_URL}/payment/payment-methods/${paymentMethodId}`,
        { headers: this.getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
}

export const paymentService = PaymentService.getInstance();
