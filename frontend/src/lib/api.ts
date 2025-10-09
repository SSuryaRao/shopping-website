const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  setAuthToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      ...options.headers,
    } as Record<string, string>;

    // Only add Content-Type for JSON requests
    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error: unknown) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }

      // Re-throw other errors
      throw error;
    }
  }

  // Auth methods
  async verifyToken(token: string) {
    return this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async register(registrationData: {
    role: 'customer' | 'shopkeeper';
    inviteToken?: string;
    referralCode?: string;
    profile?: {
      name?: string;
      message?: string;
    };
  }) {
    // For register, we need the full response, not just data
    const url = `${this.baseURL}/auth/register`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(registrationData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      // Return full response including status, message, etc.
      return result;
    } catch (error: unknown) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  // Product methods
  async getProducts() {
    return this.request('/products');
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  // Admin product methods
  async createProduct(productData: FormData) {
    return this.request('/admin/products', {
      method: 'POST',
      headers: {},
      body: productData,
    });
  }

  async updateProduct(id: string, productData: FormData) {
    return this.request(`/admin/products/${id}`, {
      method: 'PUT',
      headers: {},
      body: productData,
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/admin/products/${id}`, {
      method: 'DELETE',
    });
  }

  // User methods
  async getUserProfile() {
    return this.request('/user/profile');
  }

  async updateUserProfile(userData: Record<string, unknown>) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async getUserOrders() {
    return this.request('/user/orders');
  }

  // Order methods
  async createOrder(orderData: { items: Array<{ productId: string; quantity: number }>; pointsToRedeem?: number }) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  // Points methods
  async getUserPoints() {
    return this.request('/user/points');
  }

  async calculatePointsDiscount(amount: number, subtotal: number) {
    return this.request('/user/points/calculate-discount', {
      method: 'POST',
      body: JSON.stringify({ amount, subtotal }),
    });
  }

  // Admin invite methods
  async generateInviteToken(data: { expiresInHours?: number; note?: string }) {
    return this.request('/admin/invites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInviteTokens() {
    return this.request('/admin/invites');
  }

  async getShopkeeperRequests() {
    return this.request('/admin/shopkeeper-requests');
  }

  async approveShopkeeperRequest(requestId: string) {
    return this.request('/admin/approve-shopkeeper', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    });
  }

  async rejectShopkeeperRequest(requestId: string, reason?: string) {
    return this.request('/admin/reject-shopkeeper', {
      method: 'POST',
      body: JSON.stringify({ requestId, reason }),
    });
  }

  async getAllRequests(params?: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString();
    return this.request(`/admin/all-requests${query ? `?${query}` : ''}`);
  }

  // Admin order methods
  async getAllOrders() {
    return this.request('/admin/orders');
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.request(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const apiClient = new ApiClient();