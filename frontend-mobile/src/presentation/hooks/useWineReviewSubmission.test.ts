import { act, renderHook } from "@testing-library/react-native";
import type { WineReview } from "@/domain/wine/wine.types";
import { useWineReviewSubmission } from "./useWineReviewSubmission";

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
}));
jest.mock("./queries/wine/useWines", () => ({
  useCreateWineReview: () => ({ mutateAsync: mockCreate }),
  useUpdateWineReview: () => ({ mutateAsync: mockUpdate }),
}));

const review = { id: "review-1", rating: 4, vintage: 2018 } as WineReview;

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({});
  mockUpdate.mockResolvedValue({});
});

async function submit(existing: WineReview | null, vintage: number | null) {
  const { result } = renderHook(() => useWineReviewSubmission("wine-1", existing));
  await act(async () => {
    await result.current({ rating: 4, title: "", comment: "Texto", vintage });
  });
}

it("creates a review with the selected vintage", async () => {
  await submit(null, 2019);
  expect(mockCreate).toHaveBeenCalledWith({ wineId: "wine-1", rating: 4, title: undefined, comment: "Texto", vintage: 2019 });
});

it("creates a review without a vintage key when none was chosen", async () => {
  await submit(null, null);
  expect(mockCreate.mock.calls[0]?.[0]).not.toHaveProperty("vintage");
});

it("sends a cleared vintage as null on update", async () => {
  await submit(review, null);
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ reviewId: "review-1", vintage: null }));
});

it("sends a changed vintage on update", async () => {
  await submit(review, 2020);
  expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ reviewId: "review-1", vintage: 2020 }));
});

it("leaves an untouched vintage out of the update", async () => {
  await submit(review, 2018);
  expect(mockUpdate.mock.calls[0]?.[0]).not.toHaveProperty("vintage");
  expect(mockUpdate.mock.calls[0]?.[0]).toMatchObject({ wineId: "wine-1", reviewId: "review-1", rating: 4, comment: "Texto" });
});
