export const STORY_TTL_MS = 12 * 60 * 60 * 1000;
export const STORY_MAX_SECONDS = 30;
export const STORY_IMAGE_SECONDS = 7;
export const STORY_GUEST_KEY = "sd-story-guest-v1";
export const ADMIN_STORY_STORE_ID = "__admin__";

export type StoryMediaType = "VIDEO" | "IMAGE";
export type StoryActionType = "ORDER_PRODUCT" | "CONTACT_US" | "EXTERNAL_LINK";

export interface PublicStory {
  id: string;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeLat: number | null;
  storeLng: number | null;
  storeTypeId: string;
  title: string;
  description: string;
  videoUrl: string;
  mediaType: StoryMediaType;
  duration: number;
  isOrderable: boolean;
  isAdminAd: boolean;
  actionType: StoryActionType;
  contactNumber: string | null;
  externalLink: string | null;
  productId: string | null;
  productName: string | null;
  productImage: string | null;
  price: number | null;
  viewsCount: number;
  likesCount: number;
  liked: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface PublicStoryStore {
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeCoverImage: string | null;
  storePhone: string | null;
  storeAddress: string | null;
  storeCity: string | null;
  storeTypeId: string;
  storeTypeName: string | null;
  isAdminAd: boolean;
  latestAt: string;
  stories: PublicStory[];
}

export interface VendorStoryRecord {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  mediaType: StoryMediaType;
  duration: number;
  isOrderable: boolean;
  isAdminAd: boolean;
  actionType: StoryActionType;
  contactNumber: string | null;
  externalLink: string | null;
  productId: string | null;
  productName: string | null;
  price: number | null;
  viewsCount: number;
  likesCount: number;
  expiresAt: string;
  createdAt: string;
  active: boolean;
}

export interface StoryWriteInput {
  title: string;
  description?: string;
  videoUrl?: string;
  mediaType?: StoryMediaType;
  duration?: number;
  isOrderable?: boolean;
  isAdminAd?: boolean;
  actionType?: StoryActionType;
  contactNumber?: string | null;
  externalLink?: string | null;
  productId?: string | null;
  price?: number | null;
  expiresAt?: Date;
}

export function asMediaType(value: string | null | undefined): StoryMediaType {
  return value === "IMAGE" ? "IMAGE" : "VIDEO";
}

export function asActionType(value: string | null | undefined): StoryActionType {
  if (value === "CONTACT_US" || value === "EXTERNAL_LINK" || value === "ORDER_PRODUCT") {
    return value;
  }
  return "ORDER_PRODUCT";
}

export function storyDurationMs(story: Pick<PublicStory, "mediaType" | "duration">): number {
  if (story.mediaType === "IMAGE") {
    return STORY_IMAGE_SECONDS * 1000;
  }
  return Math.max(1, story.duration) * 1000;
}
