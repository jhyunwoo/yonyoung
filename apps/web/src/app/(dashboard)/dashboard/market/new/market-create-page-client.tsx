"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "../../../../../lib/admin-api/resources";
import { PRESIGN_PATHS } from "../../../../../lib/admin-api/upload";
import { uploadFilesWithPresign } from "../../../../../lib/admin-api/upload-batch";
import type {
  ApiCreateMarketItemInput,
  ApiMarketConditionGrade,
} from "../../../../../lib/admin-api/types";
import { useImageUploadState } from "../../../../../lib/use-image-upload-state";
import SortableImageGrid from "../../../_components/sortable-image-grid";
import UploadProgressBar from "../../../_components/upload-progress-bar";
import {
  CONDITION_OPTIONS,
  MARKET_MAX_IMAGES,
  type MarketViewer,
  readMarketErrorMessage,
} from "../market-shared";

export default function MarketCreatePageClient({ viewer }: { viewer: MarketViewer }) {
  const router = useRouter();
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [productCode, setProductCode] = useState("");
  const [conditionGrade, setConditionGrade] = useState<"" | ApiMarketConditionGrade>("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const { items: imageItems, appendExistingUrls, removeItemById, reorderByIds } =
    useImageUploadState({ maxItems: MARKET_MAX_IMAGES });

  const imageUrls = useMemo(
    () => imageItems.map((imageItem) => imageItem.imageUrl),
    [imageItems],
  );

  const handleUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    const remainingSlots = MARKET_MAX_IMAGES - imageUrls.length;
    if (remainingSlots <= 0) {
      setErrorMessage(`이미지는 최대 ${MARKET_MAX_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }

    const uploadTargets = files.slice(0, remainingSlots);
    setIsUploadingImage(true);
    setUploadProgressPercent(0);
    setErrorMessage(null);

    try {
      const uploadedUrls = await uploadFilesWithPresign({
        presignPath: PRESIGN_PATHS.marketImage,
        files: uploadTargets,
        onProgress: setUploadProgressPercent,
      });
      appendExistingUrls(uploadedUrls);
    } catch (error) {
      setErrorMessage(readMarketErrorMessage(error));
    } finally {
      setIsUploadingImage(false);
      setUploadProgressPercent(null);
    }
  };

  const handleCreateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const numericPrice = Number(price);
    if (!trimmedName) {
      setErrorMessage("판매물건 이름은 필수입니다.");
      return;
    }
    if (imageUrls.length === 0 || imageUrls.length > MARKET_MAX_IMAGES) {
      setErrorMessage(`상품 이미지는 1장 이상, 최대 ${MARKET_MAX_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }
    if (!Number.isInteger(numericPrice) || numericPrice < 0) {
      setErrorMessage("가격은 0 이상의 원 단위 정수여야 합니다.");
      return;
    }

    const payload: ApiCreateMarketItemInput = {
      name: trimmedName,
      imageUrls,
      manufacturer: manufacturer.trim() || null,
      productCode: productCode.trim() || null,
      conditionGrade: conditionGrade || null,
      description: description.trim() || null,
      price: numericPrice,
    };

    setIsSavingItem(true);
    setErrorMessage(null);
    try {
      await adminResourceApi.createMarketItem(payload);
      router.push("/dashboard/market");
      router.refresh();
    } catch (error) {
      setErrorMessage(readMarketErrorMessage(error));
    } finally {
      setIsSavingItem(false);
    }
  };

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
            Market
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">판매글 작성</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
            판매글은 인증된 연영회 구성원만 등록할 수 있습니다.
          </p>
          <p className="mt-1 text-sm text-slate-500">작성자: {viewer.displayName}</p>
          <div className="mt-4">
            <Link
              href="/dashboard/market"
              className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              장터 목록으로 돌아가기
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <form
            data-testid="market-create-form"
            className="space-y-4"
            onSubmit={handleCreateItem}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="판매물건 이름"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={isSavingItem || isUploadingImage}
              />
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="가격(원)"
                inputMode="numeric"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={isSavingItem || isUploadingImage}
              />
              <input
                value={manufacturer}
                onChange={(event) => setManufacturer(event.target.value)}
                placeholder="제조사 (선택)"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={isSavingItem || isUploadingImage}
              />
              <input
                value={productCode}
                onChange={(event) => setProductCode(event.target.value)}
                placeholder="제품 코드 (선택)"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={isSavingItem || isUploadingImage}
              />
              <select
                value={conditionGrade}
                onChange={(event) =>
                  setConditionGrade(event.target.value as "" | ApiMarketConditionGrade)
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                disabled={isSavingItem || isUploadingImage}
              >
                {CONDITION_OPTIONS.map((option) => (
                  <option key={option || "none"} value={option}>
                    {option ? `상태 등급 ${option}` : "상태 등급 (선택)"}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="제품 설명 (선택)"
              className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              disabled={isSavingItem || isUploadingImage}
            />

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">
                  사진 업로드
                  <input
                    data-testid="market-image-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUploadImage}
                    disabled={
                      isSavingItem || isUploadingImage || imageUrls.length >= MARKET_MAX_IMAGES
                    }
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-500">최소 1장, 최대 {MARKET_MAX_IMAGES}장</p>
              </div>
              <UploadProgressBar
                progressPercent={uploadProgressPercent}
                label="장터 이미지 업로드 진행률"
              />
              <div className="mt-3">
                <SortableImageGrid
                  items={imageItems.map((image, index) => ({
                    id: image.id,
                    imageUrl: image.imageUrl,
                    label: `상품 이미지 ${index + 1}`,
                    alt: "상품 이미지",
                  }))}
                  onReorder={(nextItems) => reorderByIds(nextItems.map((item) => item.id))}
                  onRemoveItem={removeItemById}
                  disabled={isSavingItem || isUploadingImage}
                  emptyMessage="등록된 상품 이미지가 없습니다."
                />
              </div>
            </div>

            <button
              type="submit"
              data-testid="market-create-submit"
              disabled={isSavingItem || isUploadingImage}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingItem ? "등록 중..." : "판매글 등록"}
            </button>
          </form>
        </section>

        {errorMessage ? (
          <p
            data-testid="market-error-message"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
