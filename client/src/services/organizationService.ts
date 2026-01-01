import api from './api';

/**
 * Organization Service
 * Handles all organization-related API calls
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  isOwner: boolean;
  memberCount: number;
  createdAt: string;
}

export interface OrganizationDetail extends Organization {
  members: Array<{
    user: {
      id: string;
      name: string;
      email: string;
    };
    role: 'viewer' | 'editor' | 'admin';
    addedAt: string;
  }>;
  userRole: 'owner' | 'viewer' | 'editor' | 'admin';
}

export interface OrganizationListResponse {
  success: boolean;
  data: {
    organizations: Organization[];
  };
}

export interface OrganizationResponse {
  success: boolean;
  data: {
    organization: OrganizationDetail;
  };
}

export interface CreateOrganizationData {
  name: string;
  description?: string;
}

export interface AddMemberData {
  email: string;
  role?: 'viewer' | 'editor' | 'admin';
}

/**
 * Create a new organization
 */
export const createOrganization = async (
  data: CreateOrganizationData
): Promise<OrganizationResponse> => {
  const response = await api.post<OrganizationResponse>('/organizations', data);
  return response.data;
};

/**
 * Get all organizations for current user
 */
export const getMyOrganizations = async (): Promise<OrganizationListResponse> => {
  const response = await api.get<OrganizationListResponse>('/organizations');
  return response.data;
};

/**
 * Get single organization by ID
 */
export const getOrganization = async (
  organizationId: string
): Promise<OrganizationResponse> => {
  const response = await api.get<OrganizationResponse>(`/organizations/${organizationId}`);
  return response.data;
};

/**
 * Add member to organization
 */
export const addMember = async (
  slugOrId: string,
  data: AddMemberData
): Promise<{ success: boolean; message: string; data: { member: any } }> => {
  const response = await api.post(`/organizations/${slugOrId}/members`, data);
  return response.data;
};

/**
 * Remove member from organization
 */
export const removeMember = async (
  slugOrId: string,
  memberId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/organizations/${slugOrId}/members/${memberId}`);
  return response.data;
};

/**
 * Update member role in organization
 */
export const updateMemberRole = async (
  slugOrId: string,
  memberId: string,
  role: 'viewer' | 'editor' | 'admin'
): Promise<{ success: boolean; message: string }> => {
  const response = await api.put(`/organizations/${slugOrId}/members/${memberId}`, { role });
  return response.data;
};

