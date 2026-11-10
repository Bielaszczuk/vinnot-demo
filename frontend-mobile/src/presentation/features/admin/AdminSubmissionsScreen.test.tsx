import { cleanup, render } from "@testing-library/react-native";
import { AdminSubmissionsScreen } from "./AdminSubmissionsScreen";

const mockViewModel = jest.fn();
jest.mock("./useAdminSubmissionsViewModel", () => ({ useAdminSubmissionsViewModel: () => mockViewModel() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/presentation/components/layout", () => ({ AppHeader: () => null }));
jest.mock("./AdminPageHero", () => ({ AdminPageHero: () => null }));
jest.mock("./AdminPaginationBar", () => ({ AdminPaginationBar: () => null }));
jest.mock("./submissions/SubmissionDecisionPanel", () => ({
  SubmissionDecisionPanel: () => {
    const { Text } = jest.requireActual("react-native");
    return <Text>decision-panel</Text>;
  },
}));
afterEach(cleanup);

it.each(["wine.contributor", null])("shows the submitter in the list and detail, including missing accounts (%s)", username => {
  const submission = {
    id: "submission-1", submittedBy: "private-user-uuid", submittedByUsername: username,
    wineName: "Reserva", wineryName: "Winery", status: "NEEDS_REVIEW", grapes: [],
  };
  mockViewModel.mockReturnValue({
    t: (key: string) => key, status: "NEEDS_REVIEW", search: "",
    list: { currentData: { items: [submission], totalItems: 1 } },
    detail: { currentData: submission }, selectedId: submission.id, catalogValues: [],
    image: {}, draft: {}, decision: "REJECT", page: 0, totalPages: 1,
  });
  const view = render(<AdminSubmissionsScreen />);
  const author = username ? `@${username}` : "admin.submissions.unknownAuthor";
  expect(view.getByText(`admin.submissions.status.NEEDS_REVIEW · admin.submissions.submittedBy: ${author}`)).toBeTruthy();
  expect(view.getByText(author)).toBeTruthy();
  expect(view.queryByText(submission.submittedBy)).toBeNull();
});

it("shows whether each submitted value is an existing catalog entry or a proposed new one", () => {
  const submission = {
    id: "submission-1", submittedBy: "user", submittedByUsername: "wine.contributor",
    wineName: "Reserva", wineryName: "Catena Zapata", status: "NEEDS_REVIEW", grapes: ["Uva Nueva"],
  };
  mockViewModel.mockReturnValue({
    t: (key: string) => key, status: "NEEDS_REVIEW", search: "",
    list: { currentData: { items: [submission], totalItems: 1 } },
    detail: { currentData: submission }, selectedId: submission.id,
    catalogValues: [
      { field: "winery", value: "Catena Zapata", proposed: false },
      { field: "grape", value: "Uva Nueva", proposed: true },
    ],
    image: {}, draft: {}, decision: "REJECT", page: 0, totalPages: 1,
  });
  const view = render(<AdminSubmissionsScreen />);
  expect(view.getByText("admin.submissions.catalog.title")).toBeTruthy();
  expect(view.getByText(
    "admin.submissions.catalog.winery: Catena Zapata (admin.submissions.catalog.existing)\n"
      + "admin.submissions.catalog.grape: Uva Nueva (admin.submissions.catalog.proposed)",
  )).toBeTruthy();
});

function renderDetail(overrides: Record<string, unknown>) {
  const submission = {
    id: "submission-1", submittedBy: "user", submittedByUsername: "wine.contributor",
    wineName: "Reserva", wineryName: "Winery", status: "NEEDS_REVIEW", grapes: [],
    wineType: "RED", vintage: 2020, reviewReason: null, reasonCode: null, ...overrides,
  };
  mockViewModel.mockReturnValue({
    t: (key: string, options?: { defaultValue?: string }) =>
      key.startsWith("submissionReasons.UNKNOWN") ? options?.defaultValue ?? key : key,
    status: "NEEDS_REVIEW", search: "",
    list: { currentData: { items: [submission], totalItems: 1 } },
    detail: { currentData: submission }, selectedId: submission.id, catalogValues: [],
    image: {}, draft: {}, decision: "REJECT", page: 0, totalPages: 1,
  });
  return render(<AdminSubmissionsScreen />);
}

it("names the wine type instead of showing its code", () => {
  const view = renderDetail({});
  expect(view.getByText("wines.types.red · 2020")).toBeTruthy();
  expect(view.queryByText("RED · 2020")).toBeNull();
});

it("translates an automatic review reason and keeps a moderator's own words", () => {
  const automatic = renderDetail({ reasonCode: "MODERATION_UNAVAILABLE", reviewReason: "Content moderation was unavailable" });
  expect(automatic.getByText("submissionReasons.MODERATION_UNAVAILABLE")).toBeTruthy();
  expect(automatic.queryByText("Content moderation was unavailable")).toBeNull();
  cleanup();
  const manual = renderDetail({ reasonCode: null, reviewReason: "Foto borrosa" });
  expect(manual.getByText("Foto borrosa")).toBeTruthy();
  cleanup();
  const unknown = renderDetail({ reasonCode: "UNKNOWN_NEW", reviewReason: "Server text" });
  expect(unknown.getByText("Server text")).toBeTruthy();
});

it("gives every status chip its visible label as accessible name", () => {
  const view = renderDetail({});
  expect(view.getByLabelText("admin.submissions.status.PENDING")).toBeTruthy();
});

it("offers the decision only while the submission is still open", () => {
  expect(renderDetail({}).getByText("decision-panel")).toBeTruthy();
  cleanup();
  expect(renderDetail({ status: "APPROVED" }).queryByText("decision-panel")).toBeNull();
});
