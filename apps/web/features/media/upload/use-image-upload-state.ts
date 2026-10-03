import { useCallback, useEffect, useRef, useState } from "react";
import {
  createExistingUploadImageItem,
  createNewUploadImageItem,
  readFileList,
  readUploadFileFingerprint,
  reorderUploadImageItems,
  revokeUploadImageItem,
  revokeUploadImageItems,
  type UploadImageItem,
} from "@/features/media/upload/image-upload-state";

const readRemovedItems = (
  previousItems: UploadImageItem[],
  nextItems: UploadImageItem[],
): UploadImageItem[] => {
  const nextItemIdSet = new Set(nextItems.map((item) => item.id));
  return previousItems.filter((item) => !nextItemIdSet.has(item.id));
};

type UseImageUploadStateOptions = {
  initialItems?: UploadImageItem[];
  maxItems?: number;
};

const readItemIdentityKey = (item: UploadImageItem): string => {
  if (item.source === "existing") {
    return `existing:${item.imageUrl}`;
  }

  if (item.file) {
    return `new:${readUploadFileFingerprint(item.file)}`;
  }

  return `new:${item.imageUrl}`;
};

const clampItemsByMaxCount = (
  items: UploadImageItem[],
  maxItems: number | undefined,
): UploadImageItem[] => {
  if (!maxItems || maxItems <= 0) {
    return items;
  }
  return items.slice(0, maxItems);
};

const dedupeItemsByIdentity = (items: UploadImageItem[]): UploadImageItem[] => {
  const deduped: UploadImageItem[] = [];
  const seenKeys = new Set<string>();

  for (const item of items) {
    const key = readItemIdentityKey(item);
    if (seenKeys.has(key)) {
      revokeUploadImageItem(item);
      continue;
    }
    seenKeys.add(key);
    deduped.push(item);
  }

  return deduped;
};

const normalizeItems = (
  items: UploadImageItem[],
  maxItems: number | undefined,
): UploadImageItem[] => {
  const dedupedItems = dedupeItemsByIdentity(items);
  const limitedItems = clampItemsByMaxCount(dedupedItems, maxItems);
  if (limitedItems.length < dedupedItems.length) {
    revokeUploadImageItems(dedupedItems.slice(limitedItems.length));
  }
  return limitedItems;
};

export const useImageUploadState = (options: UseImageUploadStateOptions = {}) => {
  // 정규화는 objectURL 해제를 동반하므로 첫 렌더에서 딱 한 번만 수행해야 한다.
  const [items, setItems] = useState<UploadImageItem[]>(() =>
    normalizeItems(options.initialItems ?? [], options.maxItems),
  );
  // 언마운트 정리에서 최신 목록을 읽어야 하는데 cleanup은 클로저가 낡을 수 있다.
  const itemsRef = useRef<UploadImageItem[]>(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      revokeUploadImageItems(itemsRef.current);
    };
  }, []);

  const replaceItems = useCallback(
    (nextItems: UploadImageItem[]) => {
      const normalizedItems = normalizeItems(nextItems, options.maxItems);
      const removedItems = readRemovedItems(itemsRef.current, normalizedItems);
      revokeUploadImageItems(removedItems);
      itemsRef.current = normalizedItems;
      setItems(normalizedItems);
    },
    [options.maxItems],
  );

  const appendFiles = useCallback(
    (files: FileList | File[] | null) => {
      const nextFiles = Array.isArray(files) ? files : readFileList(files);
      if (nextFiles.length === 0) {
        return;
      }

      const nextItems = nextFiles.map((file) => createNewUploadImageItem(file));
      setItems((previousItems) =>
        normalizeItems([...previousItems, ...nextItems], options.maxItems),
      );
    },
    [options.maxItems],
  );

  const appendExistingUrls = useCallback(
    (urls: string[]) => {
      const normalizedUrls = urls
        .map((url) => url.trim())
        .filter((url) => url.length > 0);
      if (normalizedUrls.length === 0) {
        return;
      }

      const nextItems = normalizedUrls.map((url) =>
        createExistingUploadImageItem({
          id: `existing-${crypto.randomUUID()}`,
          imageUrl: url,
        }),
      );
      setItems((previousItems) =>
        normalizeItems([...previousItems, ...nextItems], options.maxItems),
      );
    },
    [options.maxItems],
  );

  const removeItemById = useCallback((itemId: string) => {
    setItems((previousItems) => {
      const target = previousItems.find((item) => item.id === itemId);
      if (target) {
        revokeUploadImageItem(target);
      }
      return previousItems.filter((item) => item.id !== itemId);
    });
  }, []);

  const reorderByIds = useCallback((orderedIds: string[]) => {
    setItems((previousItems) => reorderUploadImageItems(previousItems, orderedIds));
  }, []);

  /**
   * 서버에 등록된 새 사진을 "existing" 항목으로 바꾼다 (id는 서버 id, 미리보기는 공개 URL).
   * 저장이 도중에 실패해도 다시 저장할 때 같은 사진이 중복 등록되지 않게 한다.
   */
  const markItemsPersisted = useCallback(
    (persisted: ReadonlyMap<string, { id: string; imageUrl: string }>) => {
      if (persisted.size === 0) {
        return;
      }

      setItems((previousItems) =>
        previousItems.map((item) => {
          const saved = persisted.get(item.id);
          if (!saved) {
            return item;
          }
          revokeUploadImageItem(item);
          return createExistingUploadImageItem(saved);
        }),
      );
    },
    [],
  );

  const clear = useCallback(() => {
    setItems((previousItems) => {
      revokeUploadImageItems(previousItems);
      return [];
    });
  }, []);

  return {
    items,
    replaceItems,
    appendFiles,
    appendExistingUrls,
    removeItemById,
    reorderByIds,
    markItemsPersisted,
    clear,
  };
};
