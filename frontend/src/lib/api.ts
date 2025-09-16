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
    const headers: any = {
      ...options.headers,
    };

    // Only add Content-Type for JSON requests
    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'API request failed');
    }

    const result = await response.json();
    return result.data || result;
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
    profile?: {
      name?: string;
      message?: string;
    };
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData),
    });
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

  async updateUserProfile(userData: any) {
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
}

export const apiClient = new ApiClient();