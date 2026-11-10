/**
 * Partner events dashboard — mobile event ABM for partner accounts.
 */
import { Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ClipboardList } from "lucide-react-native";
import { AppHeader } from "@/presentation/components/layout";
import { EmptyState, Skeleton } from "@/presentation/components/ui/Feedback";
import { QueryErrorState } from "@/presentation/components/ui/QueryErrorState";
import { AdminPaginationBar, AdminSearchBar } from "@/presentation/features/admin";
import {
  PartnerDashboardHero,
  PartnerEventRow,
  PartnerEventSheet,
  screenStyles,
} from "@/presentation/features/partner";
import { usePartnerEventsViewModel } from "@/presentation/features/partner/usePartnerEventsViewModel";
import { CancelEventSheet, EventRegistrationsManagerSheet } from "@/presentation/features/event";
import type { PartnerEvent } from "@/domain/partner/partner.types";
import { layout, radii } from "@/shared/theme/tokens";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { BrandRefreshControl } from "@/presentation/components/ui/BrandRefreshControl";

export default function PartnerScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const vm = usePartnerEventsViewModel();

  return (
    <View style={screenStyles.screen}>
      <AppHeader title={t("partner.title")} showBack onBack={vm.goBack} />
      <FlashList<PartnerEvent>
        data={vm.isLoading || vm.isError ? [] : vm.items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <BrandRefreshControl
            refreshing={vm.refreshing}
            onRefresh={vm.refresh}
          />
        }
        renderItem={({ item }) => (
          <PartnerEventRow
            item={item}
            editPending={vm.loadingEditId === item.id}
            onManageRegistrations={() => vm.openRegistrations(item)}
            onEdit={() => void vm.openEdit(item)}
            onDelete={() => vm.confirmDelete(item)}
          />
        )}
        ListHeaderComponent={
          <View style={screenStyles.header}>
            <PartnerDashboardHero
              title={t("partner.heroTitle")}
              subtitle={t("partner.heroSubtitle")}
              onAction={vm.openCreate}
              actionLabel={t("partner.createEvent")}
            />
            <View style={screenStyles.metricCard}>
              <View style={screenStyles.metricIcon}>
                <ClipboardList size={18} color={vinnotColors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={screenStyles.metricTitle}>{t("partner.metricTitle")}</Text>
                <Text style={screenStyles.metricText}>
                  {vm.totalItems} {t("partner.eventsManaged")}
                </Text>
              </View>
            </View>
            <AdminSearchBar
              value={vm.search}
              onChangeText={vm.changeSearch}
              placeholder={t("partner.searchPlaceholder")}
              resultCount={vm.isLoading || vm.isError ? undefined : vm.totalItems}
            />
            {vm.isLoading && (
              <View style={screenStyles.skeletons}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} height={116} radius={radii.md} />
                ))}
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          vm.isError ? null : (
            <AdminPaginationBar
              page={vm.page}
              totalPages={vm.totalPages}
              totalItems={vm.totalItems}
              countKey="partner.eventCount"
              onPageChange={vm.setPage}
            />
          )
        }
        ListEmptyComponent={
          vm.isError ? (
            <QueryErrorState error={vm.error} onRetry={vm.retry} />
          ) : !vm.isLoading ? (
            <EmptyState
              illustration={vm.search.trim() ? "event" : "partnerEvents"}
              title={t(vm.search.trim() ? "partner.noSearchResults" : "partner.noEvents")}
              description={t(vm.search.trim() ? "partner.noSearchResultsDesc" : "partner.noEventsDesc")}
            />
          ) : null
        }
        contentContainerStyle={{
          paddingHorizontal: layout.screenHorizontalPadding,
          paddingBottom: insets.bottom + 28,
        }}
        ItemSeparatorComponent={() => <View style={screenStyles.separator} />}
        showsVerticalScrollIndicator={false}
      />
      <PartnerEventSheet
        visible={vm.sheetVisible}
        editingEvent={vm.editingEvent}
        onClose={vm.closeSheet}
      />
      <CancelEventSheet {...vm.cancellation.sheet} />
      {vm.registrationsEvent ? (
        <EventRegistrationsManagerSheet
          eventId={vm.registrationsEvent.id}
          eventTitle={vm.registrationsEvent.title}
          onClose={vm.closeRegistrations}
        />
      ) : null}
    </View>
  );
}
