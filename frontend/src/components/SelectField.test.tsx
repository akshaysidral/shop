import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectField from "./SelectField";

const OPTIONS = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }];

describe("SelectField", () => {
  it("is labelled and lists its options", () => {
    render(<SelectField id="x" label="Letter" value="a" onChange={() => {}} options={OPTIONS} />);
    const select = screen.getByLabelText("Letter");
    expect(select).toHaveValue("a");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Alpha", "Beta"]);
  });

  it("reports the chosen value", async () => {
    const onChange = vi.fn();
    render(<SelectField id="x" label="Letter" value="a" onChange={onChange} options={OPTIONS} />);
    await userEvent.selectOptions(screen.getByLabelText("Letter"), "b");
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("accepts numeric option values", () => {
    render(<SelectField id="n" label="Qty" value={2} onChange={() => {}} options={[{ value: 1, label: "1" }, { value: 2, label: "2" }]} />);
    expect(screen.getByLabelText("Qty")).toHaveValue("2");
  });
});
