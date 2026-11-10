import { ratingGestureStorage } from "@/infrastructure/storage/ratingGesture.storage";
import { RATING_GESTURE_LESSONS, ratingGestureService } from "./ratingGesture.service";

jest.mock("@/infrastructure/storage/ratingGesture.storage", () => ({
  ratingGestureStorage: { readCount: jest.fn(), writeCount: jest.fn() },
}));

const storage = ratingGestureStorage as jest.Mocked<typeof ratingGestureStorage>;

describe("ratingGestureService", () => {
  beforeEach(() => jest.resetAllMocks());

  it("keeps teaching the gesture until the third rating", async () => {
    expect(RATING_GESTURE_LESSONS).toBe(3);
    storage.readCount.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    await expect(ratingGestureService.isLearned()).resolves.toBe(false);
    await expect(ratingGestureService.isLearned()).resolves.toBe(true);
  });

  it("counts one more rating, and stops counting once learned", async () => {
    storage.readCount.mockResolvedValueOnce(1).mockResolvedValueOnce(3);
    await ratingGestureService.recordRating();
    expect(storage.writeCount).toHaveBeenCalledWith(2);
    await ratingGestureService.recordRating();
    expect(storage.writeCount).toHaveBeenCalledTimes(1);
  });

  it("treats unreadable storage as still learning and ignores failed writes", async () => {
    storage.readCount.mockRejectedValue(new Error("storage unavailable"));
    await expect(ratingGestureService.isLearned()).resolves.toBe(false);
    await expect(ratingGestureService.recordRating()).resolves.toBeUndefined();
  });
});
