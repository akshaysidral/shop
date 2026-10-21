import { AxiosError } from "axios";
import { errMsg } from "./api";

describe("errMsg", () => {
  it("returns the server message for axios errors", () => {
    const e = new AxiosError("bad");
    e.response = { data: { message: "Insufficient stock" } } as AxiosError["response"];
    expect(errMsg(e, "fallback")).toBe("Insufficient stock");
  });

  it("falls back for axios errors without a message", () => {
    expect(errMsg(new AxiosError("bad"), "fallback")).toBe("fallback");
  });

  it("falls back for non-axios errors", () => {
    expect(errMsg(new Error("x"), "fallback")).toBe("fallback");
    expect(errMsg("weird", "fallback")).toBe("fallback");
  });
});
