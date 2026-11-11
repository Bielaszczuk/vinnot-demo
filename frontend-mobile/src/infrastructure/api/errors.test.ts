import type { AxiosError } from "axios";
import { mapAxiosError, NetworkError, type BackendError } from "./errors";

describe("mapAxiosError", () => {
  it("preserves request timeouts as a distinct network failure", () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = {
      code: "ECONNABORTED",
      message: "timeout exceeded",
      config: { baseURL: "http://localhost:8080/api", url: "/wines/compare" },
      request: { _response: "The request timed out." },
    } as AxiosError<BackendError>;

    const mapped = mapAxiosError(error);

    expect(mapped).toBeInstanceOf(NetworkError);
    expect((mapped as NetworkError).code).toBe("TIMEOUT");
    expect(mapped.message).toBe("authErrors.timeout");
    warning.mockRestore();
  });

  it("keeps other transport failures classified as network errors", () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = {
      code: "ERR_NETWORK",
      message: "Network Error",
      config: { baseURL: "http://localhost:8080/api", url: "/wines/compare" },
    } as AxiosError<BackendError>;

    const mapped = mapAxiosError(error);

    expect(mapped).toBeInstanceOf(NetworkError);
    expect((mapped as NetworkError).code).toBe("NETWORK_ERROR");
    expect(mapped.message).toBe("authErrors.offline");
    warning.mockRestore();
  });

  it("returns translation keys instead of Spanish text for messageless failures", () => {
    expect(new NetworkError().message).toBe("authErrors.offline");
    const mapped = mapAxiosError({
      response: { status: 500, data: {}, headers: {} },
    } as unknown as AxiosError<BackendError>);
    expect(mapped.message).toBe("authErrors.unexpected");
    expect((mapped as { code: string }).code).toBe("HTTP_500");
  });
});
