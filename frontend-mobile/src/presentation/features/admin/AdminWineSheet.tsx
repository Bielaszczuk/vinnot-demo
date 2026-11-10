/**
 * AdminWineSheet — create/edit a catalog wine. Built on the shared entity-form pattern:
 * EntityFormSheet shell, collapsible FormSections that open on error, the domain resolver,
 * one save at a time and a guard against losing unsaved changes.
 */
import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { AdminWine } from "@/domain/admin/admin.types";
import { EntityFormSheet } from "@/presentation/components/forms";
import { FormSection } from "@/presentation/components/ui/FormSection";
import {
  AdminWineCompositionFields,
  AdminWineDescriptionFields,
  AdminWineGeneralFields,
  AdminWineMediaFields,
  AdminWineTasteFields,
} from "./AdminWineSheetSections";
import { useAdminWineForm } from "./forms/useAdminWineForm";

interface AdminWineSheetProps {
  visible: boolean;
  editingWine?: AdminWine | null;
  onClose: () => void;
  onOpenAiProfile?: (wineId: string) => void;
}

export function AdminWineSheet({ visible, editingWine, onClose, onOpenAiProfile }: AdminWineSheetProps) {
  const { t } = useTranslation();
  const wine = useAdminWineForm({ visible, editingWine, onClose });
  const { form, sections, isEdit } = wine;
  const [name, wineryName, wineType, vintage, grapes, allergens, descriptionEs, descriptionEn, priceMin, priceMax] =
    useWatch({
      control: form.control,
      name: [
        "name",
        "wineryName",
        "wineType",
        "vintage",
        "grapes",
        "allergens",
        "descriptionEs",
        "descriptionEn",
        "priceMin",
        "priceMax",
      ],
    });
  const general = [wineryName, t(`wines.types.${wineType}`), vintage].filter(Boolean).join(" · ");
  const composition = grapes.length
    ? grapes.join(", ")
    : allergens.length
      ? t("admin.wines.summaries.allergensOnly", { count: allergens.length })
      : t("admin.wines.summaries.noGrapes");
  const descriptions = [descriptionEs.trim() && "ES", descriptionEn.trim() && "EN"].filter(Boolean).join(" · ");
  const prices = [priceMin.trim(), priceMax.trim()].filter(Boolean).join(" – ");

  return (
    <EntityFormSheet
      visible={visible}
      onClose={onClose}
      title={t(isEdit ? "admin.wines.editWine" : "admin.wines.newWine")}
      subtitle={name.trim() || t("admin.wines.completeData")}
      dirty={wine.dirty}
      busy={wine.busy}
      saving={wine.saving}
      submitLabel={t(isEdit ? "common.saveChanges" : "admin.wines.createWine")}
      onSubmit={wine.submit}
      errorSummary={wine.errorSummary}
      scrollRef={wine.scrollRef}
    >
      <FormSection
        title={t("admin.wines.sections.general")}
        summary={general || t("admin.wines.summaries.general")}
        {...sections.section("general")}
      >
        <AdminWineGeneralFields form={form} isEdit={isEdit} disabled={wine.saving} />
      </FormSection>
      <FormSection
        title={t("admin.wines.sections.composition")}
        summary={composition}
        {...sections.section("composition")}
      >
        <AdminWineCompositionFields form={form} disabled={wine.saving} />
      </FormSection>
      <FormSection
        title={t("admin.wines.sections.descriptions")}
        summary={descriptions || t("admin.wines.summaries.noDescriptions")}
        {...sections.section("descriptions")}
      >
        <AdminWineDescriptionFields form={form} disabled={wine.saving} />
      </FormSection>
      <FormSection
        title={t("admin.wines.sections.media")}
        summary={prices ? `$ ${prices}` : t("admin.wines.summaries.media")}
        {...sections.section("media")}
        disabled={wine.imageUploading}
      >
        <AdminWineMediaFields
          form={form}
          active={visible}
          onImageBusyChange={wine.setImageUploading}
          disabled={wine.saving}
        />
      </FormSection>
      <FormSection
        title={t("admin.wines.sections.taste")}
        summary={t("admin.wines.summaries.taste")}
        {...sections.section("taste")}
      >
        <AdminWineTasteFields
          form={form}
          editingWineId={isEdit ? editingWine?.id : undefined}
          onOpenAiProfile={onOpenAiProfile}
        />
      </FormSection>
    </EntityFormSheet>
  );
}
