import { http } from "@/infrastructure/api/http";
export interface SupportRequestDto {
  requestId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  language: string;
}
export const supportClient = {
  async submit(request: SupportRequestDto): Promise<{ requestId: string }> {
    return (await http.post<{ requestId: string }>("/support/requests", request)).data;
  },
};
