/**
 * AdminRouteSheet — create/edit a wine route. Built on the shared entity-form pattern:
 * EntityFormSheet shell, collapsible FormSections that open on error, the domain resolver,
 * one save at a time and a guard against losing unsaved changes. Stops can come from the
 * catalog, from a winery created on the spot, or be typed in by hand.
 */
import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { AdminRoute, AdminRouteStop } from "@/domain/admin/admin.types";
import { EntityFormSheet } from "@/presentation/components/forms";
import { FormSection } from "@/presentation/components/ui/FormSection";
import { AdminRouteSheetDetailsSection } from "./AdminRouteSheetDetailsSection";
import { RouteLocationFields, RouteMediaFields } from "./AdminRouteSheetFields";
import { AdminRouteSheetStopsSection } from "./AdminRouteSheetStopsSection";
import { useAdminRouteForm } from "./forms/useAdminRouteForm";
import { useRouteLocation } from "./forms/useRouteLocation";

/** Where the map starts before any stop has coordinates (Buenos Aires). */
const DEFAULT_MAP_CENTER = { latitude: -34.6037, longitude: -58.3816 };

interface AdminRouteSheetProps {
  visible: boolean;
  editingRoute?: AdminRoute | null;
  onClose: () => void;
}

export function AdminRouteSheet({ visible, editingRoute, onClose }: AdminRouteSheetProps) {
  const { t } = useTranslation();
  const route = useAdminRouteForm({ visible, editingRoute, onClose });
  const { form, sections, stops, isEdit } = route;
  const location = useRouteLocation(form);
  const [name, status, difficulty, recommendedWineTypes, subregion, imageUrl, mapEmbedUrl] = useWatch({
    control: form.control,
    name: ["name", "status", "difficulty", "recommendedWineTypes", "subregion", "imageUrl", "mapEmbedUrl"],
  });
  const coordinates = stops.stops.filter(
    (stop): stop is AdminRouteStop & { latitude: number; longitude: number } =>
      stop.latitude != null && stop.longitude != null,
  );

  const details = [
    status && t(`admin.routes.statusLabels.${status}`, { defaultValue: status }),
    difficulty && t(`admin.routes.difficulty.${difficulty}`, { defaultValue: difficulty }),
    recommendedWineTypes.length > 0 && recommendedWineTypes.map((type) => t(`wines.types.${type}`, { defaultValue: type })).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
  const place = [subregion.trim(), location.region?.label, location.country?.label].filter(Boolean).join(", ");
  const stopsSummary = stops.stops.length > 0
    ? t("admin.routes.summaries.stopsCount", { count: stops.stops.length })
    : t("admin.routes.summaries.stops");
  const media = [imageUrl && t("media.cover"), mapEmbedUrl.trim() && t("admin.routes.mapEmbedShort")].filter(Boolean).join(" · ");

  return (
    <EntityFormSheet
      visible={visible}
      onClose={onClose}
      title={t(isEdit ? "admin.routes.editRoute" : "admin.routes.newRoute")}
      subtitle={name.trim() || t("admin.routes.designRoute")}
      dirty={route.dirty}
      busy={route.busy}
      saving={route.saving}
      submitLabel={t(isEdit ? "common.saveChanges" : "admin.routes.createRoute")}
      onSubmit={route.submit}
      errorSummary={route.errorSummary}
      scrollRef={route.scrollRef}
    >
      <FormSection
        title={t("admin.routes.sections.details")}
        summary={details || t("admin.routes.summaries.details")}
        {...sections.section("details")}
      >
        <AdminRouteSheetDetailsSection form={form} disabled={route.saving} />
      </FormSection>
      <FormSection
        title={t("admin.routes.sections.location")}
        summary={place || t("admin.routes.summaries.location")}
        {...sections.section("location")}
      >
        <RouteLocationFields form={form} location={location} disabled={route.saving} />
      </FormSection>
      <FormSection
        title={t("admin.routes.sections.stops")}
        summary={stopsSummary}
        {...sections.section("stops")}
      >
        <AdminRouteSheetStopsSection
          winerySearch={stops.winerySearch}
          updateWinerySearch={stops.updateWinerySearch}
          wineryResults={stops.wineryResults}
          wineryLoading={stops.wineryLoading}
          selectWineryAsStop={stops.selectWineryAsStop}
          coordinates={coordinates}
          mapCenter={coordinates[0] ?? DEFAULT_MAP_CENTER}
          stops={stops.stops}
          geocodingStopIndex={stops.geocodingStopIndex}
          geocodeQuery={stops.geocodeQuery}
          updateGeocodingStopIndex={stops.updateGeocodingStopIndex}
          updateGeocodeQuery={stops.updateGeocodeQuery}
          geocodeStop={stops.geocodeStop}
          selectStopLocation={stops.selectStopLocation}
          isGeocoding={stops.isGeocoding}
          moveStop={stops.moveStop}
          removeStop={stops.removeStop}
          manualStop={stops.manualStop}
          manualErrors={stops.manualErrors}
          updateManualStop={stops.updateManualStop}
          addManualStop={stops.addManualStop}
          disabled={route.saving}
        />
      </FormSection>
      <FormSection
        title={t("admin.routes.sections.media")}
        summary={media || t("admin.routes.summaries.media")}
        {...sections.section("media")}
        disabled={route.imageUploading}
      >
        <RouteMediaFields
          form={form}
          imageUrl={imageUrl}
          active={visible}
          onBusyChange={route.setImageUploading}
          disabled={route.saving}
        />
      </FormSection>
    </EntityFormSheet>
  );
}
