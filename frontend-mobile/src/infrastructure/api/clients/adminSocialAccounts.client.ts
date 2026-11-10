/**
 * Admin social accounts API client (#510): the connection state of each network the posts publish to. Connecting
 * and disconnecting an OAuth network happen in the web admin, whose page the OAuth callback returns to.
 * @architecture: Capa 4 — Infraestructura HTTP
 */
import { http } from "@/infrastructure/api/http";
import type { SocialAccountDto } from "@/infrastructure/api/dto/adminSocialAccounts.dto";

export const adminSocialAccountsClient = {
  async list(): Promise<SocialAccountDto[]> {
    return (await http.get<SocialAccountDto[]>("/admin/social-accounts")).data;
  },
};
