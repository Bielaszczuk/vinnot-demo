import { http } from "@/infrastructure/api/http";
import type {
  CommunityOverviewDto,
  ReportCountsDto,
  ReviewPublicationDto,
  PublicationDecisionDto,
  ReportRequestDto,
  ReportReceiptDto,
  ModerationReportDto,
  BlockedUserDto,
  CommunityPageDto,
} from "@/infrastructure/api/dto/community.dto";

export const communityClient = {
  async overview() {
    return (await http.get<CommunityOverviewDto>("/community/overview")).data;
  },
  async moderationOverview() {
    return (await http.get<ReportCountsDto>("/admin/community/reports/overview")).data;
  },
  async publications(page: number) {
    return (
      await http.get<CommunityPageDto<ReviewPublicationDto>>("/admin/review-publications", {
        params: { page, size: 20 },
      })
    ).data;
  },
  async decidePublication(input: PublicationDecisionDto) {
    const { type, id, ...body } = input;
    await http.post(`/admin/review-publications/${type}/${encodeURIComponent(id)}`, body);
  },
  async report(input: ReportRequestDto) {
    return (await http.post<ReportReceiptDto>("/community/reports", input)).data;
  },
  async reports(page: number) {
    return (
      await http.get<CommunityPageDto<ReportReceiptDto>>("/community/reports/mine", {
        params: { page, size: 20 },
      })
    ).data;
  },
  async blocks(page: number) {
    return (
      await http.get<CommunityPageDto<BlockedUserDto>>("/community/blocks", {
        params: { page, size: 20 },
      })
    ).data;
  },
  async block(userId: string) {
    await http.put(`/community/blocks/${encodeURIComponent(userId)}`);
  },
  async unblock(userId: string) {
    await http.delete(`/community/blocks/${encodeURIComponent(userId)}`);
  },
  async moderation(page: number, status: ReportReceiptDto["status"]) {
    return (
      await http.get<CommunityPageDto<ModerationReportDto>>("/admin/community/reports", {
        params: { page, size: 20, status },
      })
    ).data;
  },
  async remove(id: string, decision: string) {
    await http.post(`/admin/community/reports/${encodeURIComponent(id)}/remove-content`, {
      status: "RESOLVED",
      decision,
    });
  },
  async decide(id: string, status: ReportReceiptDto["status"], decision: string) {
    return (
      await http.patch<ModerationReportDto>(`/admin/community/reports/${encodeURIComponent(id)}`, {
        status,
        decision,
      })
    ).data;
  },
};
