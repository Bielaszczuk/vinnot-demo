import { skipToken } from "@reduxjs/toolkit/query";
import { renderHook } from "@testing-library/react-native";
import { useOrganizedEventCount } from "./index";

const mockUseTypedQuery = jest.fn();
jest.mock("@/presentation/store/api", () => ({
  useTypedQuery: (arg: unknown) => mockUseTypedQuery(arg),
  useExecuteMutationMutation: () => [jest.fn(), {}],
}));
jest.mock("@/presentation/store/mutationAdapter", () => ({ useMutationAdapter: jest.fn() }));

it("reads the organizer's event total from one page of their events", () => {
  mockUseTypedQuery.mockReturnValue({ data: { items: [], totalItems: 7 } });
  const { result } = renderHook(() => useOrganizedEventCount(true));
  expect(mockUseTypedQuery).toHaveBeenCalledWith({ key: "partner.events", params: { page: 0, size: 1 } });
  expect(result.current).toBe(7);
});

it("asks nothing for people who do not organize events", () => {
  mockUseTypedQuery.mockReturnValue({ data: undefined });
  const { result } = renderHook(() => useOrganizedEventCount(false));
  expect(mockUseTypedQuery).toHaveBeenCalledWith(skipToken);
  expect(result.current).toBeUndefined();
});
