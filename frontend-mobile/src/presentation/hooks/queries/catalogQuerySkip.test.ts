import { skipToken } from "@reduxjs/toolkit/query";
import { useRegions } from "./wine/useRegions";
import { useWineries } from "./winery";

const mockQuery = jest.fn();
const mockQueryList = jest.fn();

jest.mock("@/presentation/store/api", () => ({
  useTypedQuery: (request: unknown) => mockQuery(request),
  useTypedQueryList: (request: unknown) => mockQueryList(request),
  useExecuteMutationMutation: () => [jest.fn(), {}],
}));
jest.mock("@/presentation/store/mutationAdapter", () => ({ useMutationAdapter: jest.fn() }));

it("keeps the existing region and winery requests by default", () => {
  useRegions();
  useRegions("ar");
  useWineries({ search: "catena" }, 1, 5);

  expect(mockQueryList).toHaveBeenNthCalledWith(1, { key: "ref.regions", params: undefined });
  expect(mockQueryList).toHaveBeenNthCalledWith(2, { key: "ref.regions", params: { countryId: "ar" } });
  expect(mockQuery).toHaveBeenLastCalledWith({
    key: "winery.list",
    params: { filter: { search: "catena" }, page: 1, pageSize: 5 },
  });
});

it("skips the request when disabled", () => {
  useRegions(undefined, false);
  useWineries(undefined, 0, 10, false);

  expect(mockQueryList).toHaveBeenLastCalledWith(skipToken);
  expect(mockQuery).toHaveBeenLastCalledWith(skipToken);
});
