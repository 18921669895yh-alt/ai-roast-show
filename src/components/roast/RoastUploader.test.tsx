import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RoastUploader from "./RoastUploader";

const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xdb])], "photo.jpg", { type: "image/jpeg" });
const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "photo.png", { type: "image/png" });
const webp = () => new File([new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])], "photo.webp", { type: "image/webp" });

describe("RoastUploader", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
      revokeObjectURL: vi.fn(),
    });
  });

  it("previews a valid image and revokes object URLs on replace and unmount", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn();
    const { unmount } = render(<RoastUploader value={null} onChange={onChange} />);
    const input = screen.getByLabelText("上传照片");
    const first = new File([new Uint8Array([0xff, 0xd8, 0xff])], "first.jpg", { type: "image/jpeg" });
    const second = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "second.png", { type: "image/png" });

    await user.upload(input, first);
    expect(await screen.findByRole("img", { name: "已上传照片预览" })).toHaveAttribute("src", "blob:first.jpg");
    await user.upload(input, second);
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first.jpg"));
    expect(screen.getByText("好，换证据了是吧？")).toBeVisible();
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:second.png");
  });

  it.each([
    [new File(["gif"], "x.gif", { type: "image/gif" }), "仅支持 JPG、PNG 或 WEBP"],
    [new File([new Uint8Array(10 * 1024 * 1024 + 1)], "huge.jpg", { type: "image/jpeg" }), "照片不能超过 10MB"],
  ])("rejects invalid files", async (file, message) => {
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn();
    render(<RoastUploader value={null} onChange={onChange} />);
    await user.upload(screen.getByLabelText("上传照片"), file);
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("accepts drag and drop and lets keyboard users open the picker", async () => {
    const onChange = vi.fn();
    render(<RoastUploader value={null} onChange={onChange} />);
    const dropzone = screen.getByRole("button", { name: /把喜剧素材交出来/ });
    const file = webp();
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(file));
    fireEvent.keyDown(dropzone, { key: "Enter" });
    expect(screen.getByLabelText("上传照片")).toHaveFocus();
  });

  it.each([
    [new File(["not-jpeg"], "spoof.jpg", { type: "image/jpeg" })],
    [new File(["not-png"], "spoof.png", { type: "image/png" })],
    [new File(["not-webp"], "spoof.webp", { type: "image/webp" })],
  ])("rejects a spoofed image header", async (file) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoastUploader value={null} onChange={onChange} />);
    await user.upload(screen.getByLabelText("上传照片"), file);
    expect(await screen.findByRole("alert")).toHaveTextContent("照片内容和文件类型不一致");
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([jpeg(), png(), webp()])("accepts real minimal image headers", async (file) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoastUploader value={null} onChange={onChange} />);
    await user.upload(screen.getByLabelText("上传照片"), file);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(file));
  });

  it("lets a newer invalid selection cancel an older pending header validation", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn();
    class DeferredReader {
      static latest: DeferredReader | undefined;
      result: ArrayBuffer | null = null;
      error: DOMException | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
      readAsArrayBuffer() { DeferredReader.latest = this; }
    }
    vi.stubGlobal("FileReader", DeferredReader);
    render(<RoastUploader value={null} onChange={onChange} />);
    const input = screen.getByLabelText("上传照片");
    await user.upload(input, jpeg());
    expect(DeferredReader.latest).toBeDefined();
    await user.upload(input, new File(["gif"], "newer.gif", { type: "image/gif" }));
    expect(screen.getByRole("alert")).toHaveTextContent("仅支持 JPG、PNG 或 WEBP");
    DeferredReader.latest!.result = new Uint8Array([0xff, 0xd8, 0xff]).buffer;
    await act(async () => {
      DeferredReader.latest!.onload?.(new ProgressEvent("load") as ProgressEvent<FileReader>);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("deletes the image and announces the evidence joke", async () => {
    const user = userEvent.setup();
    const file = jpeg();
    const onChange = vi.fn();
    render(<RoastUploader value={file} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "删除照片" }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByText("当事人正在尝试销毁喜剧证据。")).toBeVisible();
  });
});
