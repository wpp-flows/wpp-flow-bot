import { apiCall } from '@/instances/api';
import type {
  AcceptInvitationPayload,
  Invitation,
  InvitationTokenInfo,
} from '@/types';

export const invitationService = {
  validate(token: string): Promise<InvitationTokenInfo> {
    return apiCall<InvitationTokenInfo>({
      endpoint: `/api/invitations/${encodeURIComponent(token)}`,
    });
  },

  accept(payload: AcceptInvitationPayload): Promise<{ email: string }> {
    return apiCall<{ email: string }>({
      endpoint: '/api/invitations/accept',
      method: 'POST',
      body: payload,
    });
  },

  listAdmin(): Promise<Invitation[]> {
    return apiCall<Invitation[]>({ endpoint: '/api/admin/invitations' });
  },

  createAdmin(email: string): Promise<Invitation> {
    return apiCall<Invitation>({
      endpoint: '/api/admin/invitations',
      method: 'POST',
      body: { email },
    });
  },

  revokeAdmin(id: string): Promise<Invitation> {
    return apiCall<Invitation>({
      endpoint: `/api/admin/invitations/${id}/revoke`,
      method: 'POST',
    });
  },
};
