/**
 * AdminWinerySheet — create/edit a catalog winery. Built on the shared entity-form pattern:
 * EntityFormSheet shell, collapsible FormSections that open on error, the domain resolver,
 * one save at a time and a guard against losing unsaved changes. Geocoding and the map stay;
 * raw coordinates sit behind "Advanced".
 */
import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { AdminWinery } from "@/domain/admin/admin.types";
import { EntityFormSheet } from "@/presentation/components/forms";
import { FormSection } from "@/presentation/components/ui/FormSection";
import {
  WineryContactFields,
  WineryIdentityFields,
  WineryImageFields,
  WineryLocationFields,
} from "./AdminWinerySheetFields";
import { useAdminWineryForm } from "./forms/useAdminWineryForm";
import { useWineryLocation } from "./forms/useWineryLocation";

interface AdminWinerySheetProps {
  visible: boolean;
  editingWinery?: AdminWinery | null;
  onClose: () => void;
}

export function AdminWinerySheet({ visible, editingWinery, onClose }: AdminWinerySheetProps) {
  const { t } = useTranslation();
  const winery = useAdminWineryForm({ visible, editingWinery, onClose });
  const { form, sections, isEdit } = winery;
  const location = useWineryLocation(form, visible);
  const [name, year, descriptionEs, descriptionEn, phone, email, website, logoUrl, imageUrl] = useWatch({
    control: form.control,
    name: ["name", "establishedYear", "descriptionEs", "descriptionEn", "phone", "email", "website", "logoUrl", "imageUrl"],
  });
  const identity = [
    year && `${t("admin.wineries.established")} ${year}`,
    descriptionEs.trim() && "ES",
    descriptionEn.trim() && "EN",
  ]
    .filter(Boolean)
    .join(" · ");
  const place = [location.region?.label, location.country?.label].filter(Boolean).join(", ");
  const contact = [phone, email.trim(), website.trim()].filter(Boolean).join(" · ");
  const images = [logoUrl && t("admin.wineries.logo"), imageUrl && t("admin.wineries.cover")]
    .filter(Boolean)
    .join(" · ");

  return (
    <EntityFormSheet
      visible={visible}
      onClose={onClose}
      title={t(isEdit ? "admin.wineries.editWinery" : "admin.wineries.newWinery")}
      subtitle={name.trim() || t("admin.wineries.completeData")}
      dirty={winery.dirty}
      busy={winery.busy}
      saving={winery.saving}
      submitLabel={t(isEdit ? "common.saveChanges" : "admin.wineries.createWinery")}
      onSubmit={winery.submit}
      errorSummary={winery.errorSummary}
      scrollRef={winery.scrollRef}
    >
      <FormSection
        title={t("admin.wineries.sections.identity")}
        summary={identity || t("admin.wineries.summaries.identity")}
        {...sections.section("identity")}
      >
        <WineryIdentityFields form={form} disabled={winery.saving} />
      </FormSection>
      <FormSection
        title={t("admin.wineries.sections.location")}
        summary={place || t("admin.wineries.summaries.location")}
        {...sections.section("location")}
      >
        <WineryLocationFields form={form} location={location} disabled={winery.saving} />
      </FormSection>
      <FormSection
        title={t("admin.wineries.sections.contact")}
        summary={contact || t("admin.wineries.summaries.contact")}
        {...sections.section("contact")}
      >
        <WineryContactFields form={form} wineryKey={editingWinery?.id ?? "new"} disabled={winery.saving} />
      </FormSection>
      <FormSection
        title={t("admin.wineries.sections.images")}
        summary={images || t("admin.wineries.summaries.images")}
        {...sections.section("images")}
        disabled={winery.imageUploading}
      >
        <WineryImageFields
          form={form}
          active={visible}
          onBusyChange={winery.setImageUploading}
          disabled={winery.saving}
        />
      </FormSection>
    </EntityFormSheet>
  );
}
