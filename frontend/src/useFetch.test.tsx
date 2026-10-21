import { act, renderHook, waitFor } from "@testing-library/react";
import { api } from "./api";
import { useFetch } from "./useFetch";

const ok = (data: unknown) => vi.mocked(api.get).mockResolvedValue({ data } as never);

describe("useFetch", () => {
  it("loads data and stops loading", async () => {
    ok(["a", "b"]);
    const { result } = renderHook(() => useFetch<string[]>("/things"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(["a", "b"]);
    expect(result.current.error).toBe("");
  });

  it("sends the params and drops undefined ones", async () => {
    ok([]);
    renderHook(() => useFetch("/things", { q: "mouse", categoryId: undefined }));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith("/things", { params: { q: "mouse" } });
  });

  it("reports a failure", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useFetch("/things"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Request failed");
    expect(result.current.data).toBeNull();
  });

  it("does nothing when the path is null", () => {
    const { result } = renderHook(() => useFetch(null));
    expect(result.current.loading).toBe(false);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("fetches again on reload()", async () => {
    ok([1]);
    const { result } = renderHook(() => useFetch<number[]>("/things"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.reload());
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it("fetches again when the params change", async () => {
    ok([]);
    const { rerender } = renderHook(({ q }) => useFetch("/things", { q }), { initialProps: { q: "a" } });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    rerender({ q: "b" });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(api.get).toHaveBeenLastCalledWith("/things", { params: { q: "b" } });
  });

  it("ignores a response that arrives after unmount", async () => {
    let resolve: (v: unknown) => void = () => {};
    vi.mocked(api.get).mockReturnValue(new Promise((r) => { resolve = r; }) as never);
    const { result, unmount } = renderHook(() => useFetch<string[]>("/slow"));
    unmount();
    await act(async () => { resolve({ data: ["late"] }); });
    expect(result.current.data).toBeNull();
  });
});
