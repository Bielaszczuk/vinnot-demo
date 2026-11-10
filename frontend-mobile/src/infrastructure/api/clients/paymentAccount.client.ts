import { http } from '../http';
const base = '/payments/mercadopago/account';
/** The commission fields are absent on an API older than #482. */
export interface PaymentAccountStatusDto {
  connected: boolean;
  commissionBasisPoints?: number;
  commissionPercent?: number;
}
export const paymentAccountClient = {
  async status(): Promise<PaymentAccountStatusDto> { return (await http.get<PaymentAccountStatusDto>(base)).data; },
  async connect(): Promise<{ authorizationUrl: string }> {
    return (await http.post<{ authorizationUrl: string }>(`${base}/connect`, { returnToApp: true })).data;
  },
};
