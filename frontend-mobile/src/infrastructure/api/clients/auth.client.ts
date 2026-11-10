/**
 * Auth API client — Layer 4 (HTTP infrastructure).
 *
 * Only responsibility: build URL, send request, return raw DTO.
 * No domain transformation. No business logic.
 *
 * @contract: keep in sync with frontend-react/src/api/clients/auth.client.ts
 */
import { http } from "@/infrastructure/api/http";
import { resolveUserAssetUrls } from "@/infrastructure/api/resolveApiAssetUrl";
import type {
  LoginRequestDto,
  RegisterRequestDto,
  RefreshTokenRequestDto,
  LogoutRequestDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  VerifyEmailRequestDto,
  ResendVerificationRequestDto,
  SocialLoginRequestDto,
  ReauthenticationRequestDto,
  AuthResponseDto,
  RegistrationResponseDto,
  RefreshTokenResponseDto,
  MeResponseDto,
  AuthMessageResponseDto,
  PasswordResetTokenStatusResponseDto,
} from "@/infrastructure/api/dto/auth.dto";

export const authClient = {
  async reauthenticate(credential: ReauthenticationRequestDto): Promise<{ proof: string }> {
    return (await http.post<{ proof: string }>("/auth/reauthenticate", credential)).data;
  },
  login: async (data: LoginRequestDto): Promise<AuthResponseDto> => {
    const res = await http.post<AuthResponseDto>("/auth/login", data);
    return { ...res.data, user: resolveUserAssetUrls(res.data.user) };
  },

  register: async (data: RegisterRequestDto): Promise<RegistrationResponseDto> => {
    const res = await http.post<RegistrationResponseDto>("/auth/register", data);
    return res.data;
  },

  socialLogin: async (data: SocialLoginRequestDto): Promise<AuthResponseDto> => {
    const res = await http.post<AuthResponseDto>("/auth/social", data);
    return { ...res.data, user: resolveUserAssetUrls(res.data.user) };
  },

  refreshToken: async (data: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> => {
    const res = await http.post<RefreshTokenResponseDto>("/auth/refresh", data);
    return res.data;
  },

  logout: async (data?: LogoutRequestDto): Promise<AuthMessageResponseDto> => {
    const res = await http.post<AuthMessageResponseDto>("/auth/logout", data);
    return res.data;
  },

  getCurrentUser: async (accessToken?: string): Promise<MeResponseDto> => {
    const res = await http.get<MeResponseDto>("/auth/me", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    return resolveUserAssetUrls(res.data);
  },

  forgotPassword: async (data: ForgotPasswordRequestDto): Promise<AuthMessageResponseDto> => {
    const res = await http.post<AuthMessageResponseDto>("/auth/forgot-password", data);
    return res.data;
  },

  resetPassword: async (data: ResetPasswordRequestDto): Promise<AuthMessageResponseDto> => {
    const res = await http.post<AuthMessageResponseDto>("/auth/reset-password", data);
    return res.data;
  },

  validatePasswordResetToken: async (token: string): Promise<PasswordResetTokenStatusResponseDto> => {
    const res = await http.post<PasswordResetTokenStatusResponseDto>(
      "/auth/reset-password/validate",
      { token },
    );
    return res.data;
  },

  verifyEmail: async (data: VerifyEmailRequestDto): Promise<AuthMessageResponseDto> => {
    const res = await http.post<AuthMessageResponseDto>("/auth/verify-email", data);
    return res.data;
  },

  resendVerificationEmail: async (
    data: ResendVerificationRequestDto,
  ): Promise<AuthMessageResponseDto> => {
    const res = await http.post<AuthMessageResponseDto>("/auth/resend-verification", data);
    return res.data;
  },
};
