const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_V2_BASE_URL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/v2` : 'http://localhost:5000/api/v2';

export class ApiClient {
  private baseURL: string;
  private v2BaseURL: string;
  private token: string | null = null;
  private firebaseToken: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.v2BaseURL = API_V2_BASE_URL;

    // Try to restore token from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('jwt_token');
      this.firebaseToken = localStorage.getItem('firebase_token');
    }
  }

  setAuthToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('jwt_token', token);
    }
  }

  setFirebaseToken(token: string) {
    this.firebaseToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('firebase_token', token);
    }
  }

  clearTokens() {
    this.token = null;
    this.firebaseToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('firebase_token');
    }
  }

  getAuthToken(): string | null {
    return this.token;
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
      displayName?: string;
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

  // NEW: Multi-Account Authentication Methods

  async loginWithMobile(mobileNumber: string, password: string) {
    const url = `${this.baseURL}/auth/login/mobile`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Login failed');
    }

    return response.json();
  }

  async loginWithEmail(email: string, password: string) {
    const url = `${this.baseURL}/auth/login/email`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Login failed');
    }

    return response.json();
  }

  async loginWithUserId(uniqueUserId: string, password: string) {
    const url = `${this.baseURL}/auth/login/userid`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uniqueUserId, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Login failed');
    }

    return response.json();
  }

  async selectAccount(uniqueUserId: string, tempToken: string) {
    const url = `${this.baseURL}/auth/select-account`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uniqueUserId, tempToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Account selection failed');
    }

    return response.json();
  }

  async registerNew(registrationData: {
    registrationType: 'mobile' | 'email';
    mobileNumber?: string;
    email?: string;
    password: string;
    name: string;
    displayName?: string;
    role: 'customer' | 'shopkeeper';
    referralCode?: string;
  }) {
    const url = `${this.baseURL}/auth/register/new`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Registration failed');
    }

    return response.json();
  }

  async getSwitchableAccounts() {
    return this.request('/auth/switchable-accounts');
  }

  async switchAccount(uniqueUserId: string) {
    const url = `${this.baseURL}/auth/switch-account`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uniqueUserId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Account switch failed');
    }

    return response.json();
  }

  async checkAccounts(identifier: string, type: 'mobile' | 'email') {
    const url = `${this.baseURL}/auth/check-accounts`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, type }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Check failed');
    }

    return response.json();
  }

  // ===== NEW V2 FIREBASE-FIRST AUTH METHODS =====

  async firebaseLogin(firebaseToken: string) {
    const url = `${this.v2BaseURL}/auth/firebase-login`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Firebase login failed');
    }

    return response.json();
  }

  async selectProfile(firebaseToken: string, uniqueUserId: string) {
    const url = `${this.v2BaseURL}/auth/select-profile`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify({ uniqueUserId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Profile selection failed');
    }

    return response.json();
  }

  async createProfile(firebaseToken: string, profileData: {
    name: string;
    profileName: string;
    role: 'customer' | 'shopkeeper';
    inviteToken?: string;
    referralCode?: string;
  }) {
    const url = `${this.v2BaseURL}/auth/create-profile`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Profile creation failed');
    }

    return response.json();
  }

  async getMyProfiles() {
    return this.request('/v2/auth/my-profiles');
  }

  async switchProfile(uniqueUserId: string) {
    const url = `${this.v2BaseURL}/auth/switch-profile`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uniqueUserId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Profile switch failed');
    }

    return response.json();
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

  // Admin user activation methods
  async getPendingUsers() {
    const url = `${this.baseURL}/admin/users/pending`;
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch pending users');
    }

    return response.json(); // Return full response with { success, data, count }
  }

  async getAllUsers() {
    const url = `${this.baseURL}/admin/users/all`;
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch all users');
    }

    return response.json(); // Return full response with { success, data, count }
  }

  async activateUser(userId: string) {
    return this.request(`/admin/users/${userId}/activate`, {
      method: 'POST',
    });
  }

  async deactivateUser(userId: string) {
    return this.request(`/admin/users/${userId}/deactivate`, {
      method: 'POST',
    });
  }

  // Admin order approval methods
  async getPendingOrders() {
    const url = `${this.baseURL}/admin/orders/pending`;
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch pending orders');
    }

    return response.json(); // Return full response with { success, data, count }
  }

  async approveOrder(orderId: string, adminNotes?: string) {
    return this.request(`/admin/orders/${orderId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ adminNotes }),
    });
  }

  async rejectOrder(orderId: string, reason: string) {
    return this.request(`/admin/orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
}

export const apiClient = new ApiClient();